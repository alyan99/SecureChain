const fs = require("fs");
const os = require("os");
const path = require("path");
const PeerNode = require("../src/network/PeerNode");
const { createApp } = require("../src/api/server");
const Wallet = require("../src/crypto/wallet");
const Transaction = require("../src/blockchain/Transaction");
const Block = require("../src/blockchain/Block");

let nodes, servers, alice, bob, directory;
async function post(node, route, body = {}) {
    const response = await fetch(node.url + route, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
}
function payment(amount = 20, nonce = 0) {
    return new Transaction(alice.address, bob.address, amount, nonce).sign(alice);
}
beforeEach(async () => {
    alice = new Wallet();
    bob = new Wallet();
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-"));
    nodes = [0, 1, 2].map(id => new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 },
        storageFile: path.join(directory, String(id), "state.json"), timeout: 300
    }));
    servers = [];
    for (const node of nodes) {
        const server = createApp(node).listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        servers.push(server);
        node.url = "http://127.0.0.1:" + server.address().port;
    }
});
afterEach(async () => {
    nodes.forEach(node => node.stop());
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    fs.rmSync(directory, { recursive: true, force: true });
});

test("three independent HTTP nodes propagate signed transactions and blocks through a cycle", async () => {
    await nodes[0].connect(nodes[1].url);
    await nodes[1].connect(nodes[2].url);
    await nodes[2].connect(nodes[0].url);
    const tx = payment();
    expect((await post(nodes[0], "/transactions", tx)).data.accepted).toBe(true);
    expect(nodes.map(node => node.blockchain.pendingTransactions.length)).toEqual([1, 1, 1]);
    expect((await post(nodes[2], "/transactions", tx)).data.accepted).toBe(false);
    expect((await post(nodes[1], "/mine")).status).toBe(200);
    expect(nodes.map(node => node.blockchain.getBalance(bob.address))).toEqual([20, 20, 20]);
    expect(new Set(nodes.map(node => node.blockchain.getLatestBlock().hash)).size).toBe(1);
    const competing = payment(90, 1);
    expect((await post(nodes[0], "/transactions", competing)).status).toBe(400);
    expect(nodes.every(node => node.blockchain.pendingTransactions.length === 0)).toBe(true);
});

test("offline node reconnects, synchronizes history and recovers its own saved state", async () => {
    await nodes[0].connect(nodes[1].url);
    await nodes[0].submit(payment());
    await nodes[0].mine();
    expect(nodes[2].blockchain.chain).toHaveLength(1);
    await nodes[2].connect(nodes[1].url);
    expect(nodes[2].blockchain.getBalance(bob.address)).toBe(20);
    const restored = new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 },
        storageFile: nodes[2].storageFile
    });
    expect(restored.snapshot()).toEqual(nodes[2].snapshot());
    await post(nodes[2], "/peers", { url: nodes[0].url });
    await fetch(nodes[2].url + "/peers", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nodes[0].url })
    });
    expect(nodes[2].peers.has(nodes[0].url)).toBe(false);
});

test("equal work converges on the lower tip hash and a heavier valid chain supersedes it", async () => {
    await nodes[0].mine();
    await nodes[1].mine();
    const winner = nodes[0].blockchain.getLatestBlock().hash < nodes[1].blockchain.getLatestBlock().hash
        ? nodes[0] : nodes[1];
    await nodes[0].connect(nodes[1].url);
    await nodes[1].sync();
    expect(nodes[0].blockchain.getLatestBlock().hash).toBe(winner.blockchain.getLatestBlock().hash);
    expect(nodes[1].blockchain.getLatestBlock().hash).toBe(winner.blockchain.getLatestBlock().hash);
    await nodes[2].mine();
    await nodes[2].mine();
    await nodes[0].connect(nodes[2].url);
    await nodes[1].sync();
    expect(nodes[0].blockchain.chain).toHaveLength(3);
    expect(nodes[1].blockchain.getLatestBlock().hash).toBe(nodes[2].blockchain.getLatestBlock().hash);
    expect(nodes[0].blockchain.getCumulativeWork()).toBe(48n);
});

test("received blocks require valid proof, signatures, balances, nonce and configured genesis", async () => {
    const before = nodes[0].snapshot();
    const block = new Block(1, Date.now(), [payment(101)], before.chain[0].hash, 1);
    block.mineBlock();
    expect((await post(nodes[0], "/blocks", block)).status).toBe(400);
    block.transactions = [payment()];
    block.transactions[0].signature = "abcd";
    block.hash = block.calculateHash();
    block.mineBlock();
    expect((await post(nodes[0], "/blocks", block)).status).toBe(400);
    expect(nodes[0].snapshot()).toEqual(before);
    const foreign = new PeerNode({ difficulty: 1 });
    expect(() => nodes[0].blockchain.replaceChain(foreign.blockchain.chain)).toThrow();
});

test("orphaned transfers are requeued, while a rejected replacement preserves current state", async () => {
    await nodes[0].submit(payment());
    await nodes[0].mine();
    await nodes[1].mine();
    await nodes[1].mine();
    nodes[0].blockchain.replaceChain(nodes[1].blockchain.chain);
    expect(nodes[0].blockchain.pendingTransactions).toHaveLength(1);
    const before = nodes[0].snapshot();
    const forged = structuredClone(before.chain);
    forged[1].difficulty = 0;
    expect(() => nodes[0].blockchain.replaceChain(forged)).toThrow();
    expect(nodes[0].snapshot()).toEqual(before);
});

test("pending transfers survive restart and failed disk writes roll back changes", async () => {
    await nodes[0].submit(payment());
    const restored = new PeerNode({
        difficulty: 1, allocations: { [alice.address]: 100 }, storageFile: nodes[0].storageFile
    });
    expect(restored.blockchain.pendingTransactions).toHaveLength(1);
    const before = nodes[1].snapshot();
    nodes[1].storageFile = directory; // A directory cannot be replaced by a state file.
    await expect(nodes[1].submit(payment())).rejects.toThrow();
    expect(nodes[1].snapshot()).toEqual(before);
});

test("an unavailable peer cannot prevent local confirmation", async () => {
    const offlineUrl = nodes[2].url;
    await new Promise(resolve => servers[2].close(resolve));
    nodes[0].register(offlineUrl);
    await nodes[0].submit(payment());
    await nodes[0].mine();
    expect(nodes[0].blockchain.getBalance(bob.address)).toBe(20);
    expect(nodes[0].peers.has(offlineUrl)).toBe(true);
});

test("nodes reject extra transaction fields carrying private key data", async () => {
    const tx = { ...payment(), privateKey: alice.privateKey };
    expect((await post(nodes[0], "/transactions", tx)).status).toBe(400);
    expect(nodes[0].blockchain.pendingTransactions).toEqual([]);
});
