const fs = require("fs");
const os = require("os");
const path = require("path");
const PeerNode = require("../src/network/PeerNode");
const { SecurityMonitor } = require("../src/security/SecurityMonitor");
const { createApp } = require("../src/api/server");
const Wallet = require("../src/crypto/wallet");
const Transaction = require("../src/blockchain/Transaction");
const Block = require("../src/blockchain/Block");

let alice, bob, node, time;
function payment(amount = 10, nonce = 0, receiver = bob) {
    return new Transaction(alice.address, receiver.address, amount, nonce).sign(alice);
}
beforeEach(() => {
    alice = new Wallet();
    bob = new Wallet();
    time = 100000;
    node = new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 },
        security: { thresholds: { largeTransferAmount: 50, frequencyCount: 2, frequencyWindowMs: 1000 },
            now: () => time }
    });
});
test("forged signatures are rejected, logged with severity, and cannot leak private key data", async () => {
    const tx = payment();
    tx.signature = "abcd";
    tx.privateKey = alice.privateKey;
    await expect(node.submit(tx)).rejects.toThrow();
    delete tx.privateKey;
    await expect(node.submit(tx)).rejects.toThrow();
    const events = node.security.query();
    expect(events.map(event => event.type)).toEqual(["INVALID_SIGNATURE", "INVALID_TRANSACTION"]);
    expect(events[0]).toMatchObject({ severity: "high", outcome: "rejected", sender: alice.address });
    expect(JSON.stringify(events)).not.toContain(alice.privateKey);
    expect(JSON.stringify(events)).not.toContain("signature");
    expect(node.blockchain.pendingTransactions).toEqual([]);
});
test("insufficient balance, confirmed replay, conflicting nonce and pending overspend are classified", async () => {
    await expect(node.submit(payment(101))).rejects.toThrow();
    await node.submit(payment(60));
    await expect(node.submit(payment(5, 0))).rejects.toThrow();
    await expect(node.submit(payment(41, 1))).rejects.toThrow();
    await node.mine();
    await expect(node.submit(payment(1, 0))).rejects.toThrow();
    expect(node.security.query({ outcome: "rejected" }).map(event => event.type)).toEqual([
        "REPLAY_ATTEMPT", "DOUBLE_SPEND_ATTEMPT", "DOUBLE_SPEND_ATTEMPT", "INSUFFICIENT_BALANCE"
    ]);
});
test("an exact confirmed replay is suppressed and logged while ordinary pending duplicates are quiet", async () => {
    const tx = payment();
    await node.submit(tx);
    expect(await node.submit(tx)).toBe(false);
    expect(node.security.query({ outcome: "rejected" })).toEqual([]);
    await node.mine();
    expect(await node.submit(tx)).toBe(false);
    expect(node.security.query({ type: "REPLAY_ATTEMPT" })).toHaveLength(1);
});
test("large transfers, high frequency and new recipients alert without preventing valid transfers", async () => {
    await node.submit(payment(50));
    time += 1;
    await node.submit(payment(10, 1));
    expect(node.blockchain.pendingTransactions).toHaveLength(2);
    expect(node.security.query({ type: "LARGE_TRANSFER" })).toHaveLength(1);
    expect(node.security.query({ type: "HIGH_FREQUENCY" })).toHaveLength(1);
    expect(node.security.query({ type: "NEW_RECIPIENT" })).toHaveLength(1);
    const carol = new Wallet();
    time += 1001;
    await node.submit(payment(1, 2, carol));
    expect(node.security.query({ type: "NEW_RECIPIENT" })).toHaveLength(2);
    expect(node.security.query({ type: "HIGH_FREQUENCY" })).toHaveLength(1);
    await node.mine();
    expect(node.blockchain.getBalance(bob.address)).toBe(60);
    expect(node.security.query({ type: "LARGE_TRANSFER" })).toHaveLength(1);
});
test("runtime configuration is atomic and rejects unsupported values", () => {
    expect(() => node.security.configure({ frequencyCount: 0 })).toThrow();
    expect(() => node.security.configure({ largeTransferAmount: 2, frequencyCount: NaN })).toThrow();
    expect(() => node.security.configure({ unexpected: 3 })).toThrow();
    expect(node.security.config.largeTransferAmount).toBe(50);
    node.security.configure({ largeTransferAmount: 25 });
    expect(node.security.config.largeTransferAmount).toBe(25);
});
test("retrieval validates filters, limits results, and isolates returned objects", async () => {
    await node.submit(payment(50));
    const events = node.security.query({ limit: 1, severity: "medium" });
    expect(events).toHaveLength(1);
    events[0].type = "changed";
    expect(node.security.query({ type: "LARGE_TRANSFER" })[0].type).toBe("LARGE_TRANSFER");
    expect(() => node.security.query({ limit: 1001 })).toThrow();
    expect(() => node.security.query({ severity: "critical" })).toThrow();
});
test("block propagation and synchronization run detection without repeated alerts", async () => {
    const remote = new PeerNode({ difficulty: 1, allocations: { [alice.address]: 100 } });
    remote.blockchain.addBlock([payment(50)]);
    node.request = async () => remote.snapshot();
    node.peers.add("http://example.test");
    await node.sync();
    expect(node.security.query({ type: "LARGE_TRANSFER" })).toHaveLength(1);
    await node.sync();
    expect(node.security.query({ type: "LARGE_TRANSFER" })).toHaveLength(1);
    const second = new Block(2, Date.now(), [payment(1, 1)], node.blockchain.getLatestBlock().hash, 1);
    second.mineBlock();
    await node.receiveBlock(second);
    expect(node.security.query({ type: "HIGH_FREQUENCY" })).toHaveLength(1);
});
test("invalid blocks and peer chains are rejected and recorded", async () => {
    const tx = payment();
    tx.signature = "abcd";
    const block = new Block(1, Date.now(), [tx], node.blockchain.getLatestBlock().hash, 1);
    block.mineBlock();
    await expect(node.receiveBlock(block)).rejects.toThrow();
    expect(node.security.query({ type: "INVALID_SIGNATURE" })[0].source).toBe("block");
    expect(node.security.query({ type: "INVALID_BLOCK" })).toHaveLength(1);
    node.peers.add("http://example.test");
    node.request = async () => ({ chain: [block] });
    await node.sync();
    expect(node.security.query({ type: "INVALID_CHAIN" })).toHaveLength(1);
    expect(node.blockchain.chain).toHaveLength(1);
});
test("logs persist per node, recover on restart, tolerate damaged records and retain no secrets", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-security-"));
    try {
        const logFile = path.join(directory, "security.jsonl");
        node.security.logFile = logFile;
        await node.submit(payment(50));
        const raw = fs.readFileSync(logFile, "utf8");
        expect(raw).not.toContain("PRIVATE KEY");
        expect(raw).not.toContain("signature");
        fs.appendFileSync(logFile, "{incomplete");
        const restored = new SecurityMonitor({ logFile });
        expect(restored.query()).toEqual(node.security.query());
        expect(restored.storageError).toBeTruthy();
        const separate = new SecurityMonitor({ logFile: path.join(directory, "other.jsonl") });
        expect(separate.query()).toEqual([]);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
test("logging write failures preserve accepted transactions and expose storage status", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-security-"));
    try {
        node.security.logFile = directory;
        await expect(node.submit(payment(50))).resolves.toBe(true);
        expect(node.security.storageError).toBe("Security log persistence failed");
        expect(node.security.query({ type: "LARGE_TRANSFER" })).toHaveLength(1);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
test("bounded event retention keeps the most recent records", () => {
    const monitor = new SecurityMonitor({ maxEvents: 2 });
    for (let i = 0; i < 3; i++) monitor.record("INVALID_BLOCK", "rejected", undefined, "block");
    expect(monitor.query()).toHaveLength(2);
});
test("HTTP APIs expose logs, alerts and threshold updates with validation", async () => {
    const server = createApp(node).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const url = "http://127.0.0.1:" + server.address().port;
    try {
        const update = await fetch(url + "/security/config", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ largeTransferAmount: 5 })
        });
        expect(update.status).toBe(200);
        await node.submit(payment());
        expect((await (await fetch(url + "/security/alerts")).json()).length).toBe(2);
        expect((await (await fetch(url + "/security/logs?type=LARGE_TRANSFER")).json())[0].severity).toBe("medium");
        expect((await fetch(url + "/security/logs?limit=-1")).status).toBe(400);
        const config = await (await fetch(url + "/security/config")).json();
        expect(config.thresholds.largeTransferAmount).toBe(5);
        expect(config.storageError).toBeNull();
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test("a forged duplicate is still validated and stale synchronized pending data does not create replay noise", async () => {
    const tx = payment();
    await node.submit(tx);
    await expect(node.submit({ ...tx, signature: "abcd" })).rejects.toThrow();
    expect(node.security.query({ type: "INVALID_SIGNATURE" })).toHaveLength(1);
    await node.mine();
    node.seen.clear();
    node.peers.add("http://example.test");
    node.request = async () => ({ chain: node.snapshot().chain, pending: [tx] });
    await node.sync();
    expect(node.security.query({ type: "REPLAY_ATTEMPT" })).toHaveLength(0);
    expect(node.security.query({ type: "NEW_RECIPIENT" })).toHaveLength(1);
});
test("state storage failures roll back a transfer without a rejection alert", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-security-"));
    try {
        node.storageFile = directory;
        await expect(node.submit(payment(50))).rejects.toThrow();
        expect(node.blockchain.pendingTransactions).toEqual([]);
        expect(node.security.query()).toEqual([]);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
