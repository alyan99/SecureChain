const vm = require("vm");
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");
const { verifyTransaction, publicKeyToAddress } = require("../src/crypto/signature");
const PeerNode = require("../src/network/PeerNode");
const { createApp } = require("../src/api/server");

function browserWallet() {
    const context = vm.createContext({
        crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob, console
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/wallet.js"), "utf8"), context);
    return context.SecureChainWallet;
}
const password = "SecureChain test password";
test("browser signing derives Phase 3 addresses and produces compatible signatures", async () => {
    const wallet = browserWallet();
    const vault = await wallet.create(password);
    const session = await wallet.unlock(vault, password);
    expect(publicKeyToAddress(session.publicKey)).toBe(vault.address);
    const tx = session.sign("SC_" + "b".repeat(40), 35, 0);
    expect(verifyTransaction(tx)).toBe(true);
    const node = new PeerNode({ difficulty: 1, allocations: { [vault.address]: 100 } });
    await node.submit(tx);
    await node.mine();
    expect(node.blockchain.getBalance(tx.receiver)).toBe(35);
    expect(Object.keys(tx).sort()).toEqual(["amount", "nonce", "publicKey", "receiver", "sender", "signature"]);
    session.lock();
    expect(() => session.sign(tx.receiver, 1, 1)).toThrow(/Unlock/);
});
test("wallet encryption rejects wrong passwords, tampered data and invalid metadata", async () => {
    const wallet = browserWallet();
    const vault = await wallet.create(password);
    expect(JSON.stringify(vault)).not.toContain("PRIVATE");
    expect(Object.keys(vault).sort()).toEqual(["address", "ciphertext", "iterations", "iv", "salt", "version"]);
    await expect(wallet.unlock(vault, "wrong password")).rejects.toThrow(/Unable to unlock/);
    const changed = { ...vault, ciphertext: (vault.ciphertext.startsWith("00") ? "ff" : "00") + vault.ciphertext.slice(2) };
    await expect(wallet.unlock(changed, password)).rejects.toThrow(/Unable to unlock/);
    await expect(wallet.unlock({ ...vault, address: "SC_" + "f".repeat(40) }, password)).rejects.toThrow();
    expect(() => wallet.validateVault({ ...vault, iterations: 1 })).toThrow();
    await expect(wallet.create("short")).rejects.toThrow(/12 characters/);
});
test("encrypted backups round trip and generate different wallets", async () => {
    const wallet = browserWallet();
    const one = await wallet.create(password);
    const two = await wallet.create(password);
    expect(one.address).not.toBe(two.address);
    const restored = await wallet.unlock(JSON.parse(JSON.stringify(one)), password);
    expect(restored.address).toBe(one.address);
    expect(() => restored.sign("invalid", 1, 0)).toThrow();
    expect(() => restored.sign(two.address, 1.5, 0)).toThrow();
    restored.lock();
});
test("dashboard and local assets are served with a restricted content security policy", async () => {
    const node = new PeerNode({ difficulty: 1 });
    const server = createApp(node).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const origin = "http://127.0.0.1:" + server.address().port;
    try {
        const page = await fetch(origin + "/dashboard/");
        expect(page.status).toBe(200);
        expect(page.headers.get("content-security-policy")).toContain("script-src 'self'");
        const html = await page.text();
        expect(html).toContain("Sign &amp; send");
        for (const asset of ["style.css", "app.js", "wallet.js"]) {
            expect((await fetch(origin + "/dashboard/" + asset)).status).toBe(200);
        }
        const peers = await (await fetch(origin + "/network/peer-status")).json();
        expect(peers).toEqual([]);
        node.peers.add("http://127.0.0.1:1");
        expect((await (await fetch(origin + "/network/peer-status")).json())[0].online).toBe(false);
        expect((await fetch(origin + "/", { headers: { Accept: "text/html" }, redirect: "manual" })).status).toBe(302);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
