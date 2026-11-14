const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const PeerNode = require("../src/network/PeerNode");
const Wallet = require("../src/crypto/wallet");
const Transaction = require("../src/blockchain/Transaction");
const { SQLiteStore } = require("../src/storage/SQLiteStore");
const { createApp } = require("../src/api/server");

let directory, alice, bob, filename, nodes;
function open(options = {}) {
    const node = new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 },
        databaseFile: filename, ...options
    });
    nodes.push(node);
    return node;
}
function transfer(amount = 10, nonce = 0) {
    return new Transaction(alice.address, bob.address, amount, nonce).sign(alice);
}
beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-sqlite-"));
    filename = path.join(directory, "node.sqlite");
    alice = new Wallet();
    bob = new Wallet();
    nodes = [];
});
afterEach(() => {
    nodes.forEach(node => node.close());
    fs.rmSync(directory, { recursive: true, force: true });
});

test("persists blocks, transactions, alerts, settings, peers and recent observations across restart", async () => {
    let time = 100000;
    const first = open({ security: {
        now: () => time, thresholds: { frequencyCount: 2, frequencyWindowMs: 1000 }
    } });
    first.security.configure({ largeTransferAmount: 5 });
    first.register("http://127.0.0.1:3002");
    first.acceptTransaction(transfer());
    const pending = first.snapshot();
    const logs = first.security.query();
    const rows = first.store.db.prepare("SELECT status FROM transactions").all();
    expect(rows.map(row => row.status).sort()).toEqual(["confirmed", "pending"]);
    first.close();
    time++;
    const restored = open({ security: { now: () => time } });
    expect(restored.snapshot()).toEqual(pending);
    expect(restored.security.query()).toEqual(logs);
    expect(restored.peers.has("http://127.0.0.1:3002")).toBe(true);
    expect(restored.security.config.largeTransferAmount).toBe(5);
    expect(restored.acceptTransaction(pending.pending[0])).toBe(false);
    expect(restored.security.query()).toEqual(logs);
    restored.acceptTransaction(transfer(5, 1));
    expect(restored.security.query({ type: "HIGH_FREQUENCY" })).toHaveLength(1);
    await restored.mine();
    expect(restored.blockchain.getBalance(bob.address)).toBe(15);
    restored.close();
    const confirmed = open();
    expect(confirmed.blockchain.getBalance(bob.address)).toBe(15);
    expect(confirmed.blockchain.getConfirmedNonce(alice.address)).toBe(2);
    expect(confirmed.blockchain.pendingTransactions).toEqual([]);
});

test("revalidates and removes invalid pending data on startup without losing valid history", () => {
    const node = open();
    node.acceptTransaction(transfer());
    node.store.db.prepare("UPDATE transactions SET data = ? WHERE status = 'pending'")
        .run(JSON.stringify({ ...transfer(), signature: "abcd" }));
    node.close();
    const restored = open();
    expect(restored.recovery.droppedPending).toBe(1);
    expect(restored.blockchain.pendingTransactions).toEqual([]);
    expect(restored.blockchain.getBalance(alice.address)).toBe(100);
    expect(restored.store.db.prepare("SELECT COUNT(*) total FROM transactions WHERE status='pending'").get().total).toBe(0);
});

test("corrupted confirmed history prevents startup and leaves saved data available for diagnosis", async () => {
    const node = open();
    node.acceptTransaction(transfer());
    await node.mine();
    node.store.db.prepare("UPDATE transactions SET data = ? WHERE sender IS NOT NULL")
        .run(JSON.stringify({ ...transfer(), amount: 99 }));
    node.close();
    expect(() => open()).toThrow();
    const db = new DatabaseSync(filename);
    expect(db.prepare("SELECT COUNT(*) total FROM blocks").get().total).toBe(2);
    db.close();
});

test("rejects a different genesis, missing history and unsupported database versions", () => {
    const node = open();
    node.close();
    expect(() => open({ allocations: {} })).toThrow(/genesis/);
    const db = new DatabaseSync(filename);
    db.exec("PRAGMA foreign_keys=OFF; DELETE FROM transactions; DELETE FROM blocks;");
    db.close();
    expect(() => open()).toThrow(/storage/);
    const foreign = path.join(directory, "future.sqlite");
    const future = new DatabaseSync(foreign);
    future.exec("PRAGMA user_version=99");
    future.close();
    expect(() => new SQLiteStore(foreign)).toThrow(/storage/);
});

test("imports validated legacy snapshots and logs once while preserving the original files", () => {
    const legacyFile = path.join(directory, "state.json");
    const legacy = new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 }, storageFile: legacyFile
    });
    legacy.acceptTransaction(transfer());
    const stateText = fs.readFileSync(legacyFile, "utf8");
    const logFile = path.join(directory, "security.jsonl");
    const logText = fs.readFileSync(logFile, "utf8");
    const migrated = open({ storageFile: legacyFile });
    expect(migrated.snapshot()).toEqual(legacy.snapshot());
    expect(migrated.recovery.migrated).toBe(true);
    expect(migrated.security.query()).toEqual(legacy.security.query());
    expect(fs.readFileSync(legacyFile, "utf8")).toBe(stateText);
    expect(fs.readFileSync(logFile, "utf8")).toBe(logText);
    migrated.close();
    // Once initialized, SQLite owns recovery even if legacy files later change.
    fs.writeFileSync(legacyFile, "{}");
    const restored = open({ storageFile: legacyFile });
    expect(restored.snapshot()).toEqual(legacy.snapshot());
    expect(restored.recovery.migrated).toBe(false);
    expect(restored.security.query()).toHaveLength(1);
});

test("failed batch writes roll back pending transfers, security alerts and observations together", () => {
    const node = open();
    const before = node.snapshot();
    node.store.db.exec("CREATE TRIGGER deny_transaction BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    expect(() => node.acceptTransaction(transfer())).toThrow(/storage/);
    expect(node.snapshot()).toEqual(before);
    expect(node.security.query()).toEqual([]);
    expect(node.security.observed.size).toBe(0);
    expect(node.store.error).toBeTruthy();
    node.store.db.exec("DROP TRIGGER deny_transaction");
    expect(node.acceptTransaction(transfer())).toBe(true);
    expect(node.store.error).toBeNull();
    expect(node.security.query()).toHaveLength(1);
});

test("security event failures abort acceptance and configuration failures preserve active thresholds", () => {
    const node = open();
    node.store.db.exec("CREATE TRIGGER deny_event BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    expect(() => node.acceptTransaction(transfer())).toThrow(/storage/);
    expect(node.blockchain.pendingTransactions).toEqual([]);
    expect(node.security.query()).toEqual([]);
    node.store.db.exec("DROP TRIGGER deny_event");
    const before = { ...node.security.config };
    node.store.db.exec("CREATE TRIGGER deny_setting BEFORE UPDATE ON settings BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    expect(() => node.security.configure({ largeTransferAmount: 1 })).toThrow(/storage/);
    expect(node.security.config).toEqual(before);
    node.store.db.exec("DROP TRIGGER deny_setting");
    expect(node.acceptTransaction(transfer())).toBe(true);
});

test("rejected attempts persist without changing balances and buffered logs retry after a failure", () => {
    const node = open();
    node.store.db.exec("CREATE TRIGGER deny_event BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    expect(() => node.acceptTransaction(transfer(101))).toThrow(/balance/);
    expect(node.security.storageError).toBeTruthy();
    expect(node.security.query({ outcome: "rejected" })).toHaveLength(1);
    node.store.db.exec("DROP TRIGGER deny_event");
    node.acceptTransaction(transfer());
    expect(node.security.storageError).toBeNull();
    node.close();
    const recovered = open();
    expect(recovered.security.query({ type: "INSUFFICIENT_BALANCE" })).toHaveLength(1);
    expect(recovered.blockchain.getBalance(alice.address)).toBe(100);
});

test("database locks are recoverable and stale writers cannot overwrite another node instance", () => {
    const node = open();
    const lock = new DatabaseSync(filename);
    lock.exec("BEGIN IMMEDIATE");
    expect(() => node.acceptTransaction(transfer())).toThrow(/storage/);
    expect(node.blockchain.pendingTransactions).toEqual([]);
    lock.exec("ROLLBACK");
    lock.close();
    expect(node.acceptTransaction(transfer())).toBe(true);
    const second = open();
    expect(() => node.acceptTransaction(transfer(5, 1))).toThrow(/storage/);
    expect(node.blockchain.pendingTransactions).toHaveLength(1);
    expect(second.blockchain.pendingTransactions).toHaveLength(1);
});

test("a persisted fork replacement recovers orphaned transfers after restart", async () => {
    const node = open();
    node.acceptTransaction(transfer());
    await node.mine();
    const remote = new PeerNode({ difficulty: 1, allocations: { [alice.address]: 100 } });
    await remote.mine();
    await remote.mine();
    node.commit(() => node.blockchain.replaceChain(remote.blockchain.chain));
    node.close();
    const recovered = open();
    expect(recovered.blockchain.chain).toHaveLength(3);
    expect(recovered.blockchain.pendingTransactions).toHaveLength(1);
    await recovered.mine();
    expect(recovered.blockchain.getBalance(bob.address)).toBe(10);
});

test("HTTP dashboard, signed transfers, alerts and storage status survive a node restart", async () => {
    const node = open();
    node.security.configure({ largeTransferAmount: 5 });
    let server = createApp(node).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    let origin = "http://127.0.0.1:" + server.address().port;
    async function post(route, body) {
        return fetch(origin + route, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body) });
    }
    try {
        expect((await fetch(origin + "/dashboard/")).status).toBe(200);
        expect((await post("/transactions", transfer())).status).toBe(200);
        expect((await post("/mine", {})).status).toBe(200);
        await new Promise(resolve => server.close(resolve));
        node.close();
        const restored = open();
        server = createApp(restored).listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        origin = "http://127.0.0.1:" + server.address().port;
        const account = await (await fetch(origin + "/balances/" + bob.address)).json();
        expect(account.balance).toBe(10);
        const alerts = await (await fetch(origin + "/security/alerts?type=LARGE_TRANSFER")).json();
        expect(alerts).toHaveLength(1);
        expect((await (await fetch(origin + "/storage/status")).json()).backend).toBe("sqlite");
        // Database errors reach the client as a retryable service response.
        restored.store.db.exec("CREATE TRIGGER deny_transaction BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT,'test'); END;");
        expect((await post("/transactions", transfer(5, 1))).status).toBe(503);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test("an interrupted SQLite write leaves the last committed chain recoverable", async () => {
    const { spawnSync } = require("child_process");
    const node = open();
    node.acceptTransaction(transfer());
    await node.mine();
    const expected = node.snapshot();
    node.close();
    const child = spawnSync(process.execPath, ["-e",
        "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);" +
        "db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; DELETE FROM transactions; DELETE FROM blocks;');" +
        "process.exit(23);", filename], { windowsHide: true, timeout: 5000 });
    expect(child.status).toBe(23);
    const restored = open();
    expect(restored.snapshot()).toEqual(expected);
    expect(restored.blockchain.getBalance(bob.address)).toBe(10);
});

test("malformed legacy state stops migration without committing an empty replacement", () => {
    const legacyFile = path.join(directory, "state.json");
    fs.writeFileSync(legacyFile, JSON.stringify({ chain: [], pending: [] }));
    expect(() => open({ storageFile: legacyFile })).toThrow();
    const db = new DatabaseSync(filename);
    expect(db.prepare("SELECT COUNT(*) total FROM blocks").get().total).toBe(0);
    db.close();
    const original = new PeerNode({ difficulty: 1, allocations: { [alice.address]: 100 } });
    fs.writeFileSync(legacyFile, JSON.stringify(original.snapshot()));
    const migrated = open({ storageFile: legacyFile });
    expect(migrated.blockchain.getBalance(alice.address)).toBe(100);
});

test("SQLite log retrieval validates filters and strips unexpected recovered fields", () => {
    const node = open();
    node.acceptTransaction(transfer());
    const event = node.security.query()[0];
    node.store.db.prepare("UPDATE security_events SET data=? WHERE id=?")
        .run(JSON.stringify({ ...event, privateKey: alice.privateKey }), event.id);
    expect(JSON.stringify(node.security.query())).not.toContain("PRIVATE KEY");
    expect(() => node.security.query({ type: "NEW_RECIPIENT' OR 1=1" })).toThrow();
    expect(node.security.query({ type: "NEW_RECIPIENT", severity: "low" })).toHaveLength(1);
});
