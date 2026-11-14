const { spawn } = require("child_process");
const net = require("net");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Wallet = require("../src/crypto/wallet");
const vm = require("vm");
const { webcrypto } = require("crypto");

test("three separate server processes use separate ports and storage and synchronize after restart", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "securechain-processes-"));
    const browser = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/wallet.js"), "utf8"), browser);
    const vault = await browser.SecureChainWallet.create("SecureChain integration password");
    const alice = await browser.SecureChainWallet.unlock(vault, "SecureChain integration password");
    const bob = new Wallet();
    const genesis = path.join(directory, "genesis.json");
    fs.writeFileSync(genesis, JSON.stringify({ [alice.address]: 100 }));
    const children = [];
    const ports = [];
    async function start(index) {
        const child = spawn(process.execPath, [path.resolve(__dirname, "../src/api/server.js"), String(ports[index])], {
            env: { ...process.env, PORT: "", DIFFICULTY: "1", GENESIS_FILE: genesis,
                DATA_DIR: path.join(directory, String(index)), PEERS: "",
                NODE_PATH: path.dirname(path.dirname(require.resolve("express/package.json"))) },
            stdio: ["ignore", "pipe", "pipe"], windowsHide: true
        });
        children[index] = child;
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Node startup timed out")), 5000);
            child.stdout.on("data", data => {
                if (data.toString().includes("running at")) { clearTimeout(timer); resolve(); }
            });
            child.once("error", error => { clearTimeout(timer); reject(error); });
            child.once("exit", code => { clearTimeout(timer); reject(new Error("Node exited " + code)); });
        });
    }
    async function stop(index) {
        const child = children[index];
        if (!child || child.exitCode !== null) return;
        await new Promise(resolve => { child.once("exit", resolve); child.kill(); });
    }
    async function request(index, route, body, method = "POST") {
        const response = await fetch("http://127.0.0.1:" + ports[index] + route, {
            method: body === undefined ? "GET" : method,
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
    try {
        for (let i = 0; i < 3; i++) {
            const server = net.createServer().listen(0, "127.0.0.1");
            await new Promise(resolve => server.once("listening", resolve));
            ports.push(server.address().port);
            await new Promise(resolve => server.close(resolve));
            await start(i);
        }
        expect(new Set(ports).size).toBe(3);
        for (let i = 0; i < 2; i++) {
            await request(i, "/peers", { url: "http://127.0.0.1:" + ports[i + 1] });
        }
        await request(0, "/security/config", { largeTransferAmount: 10 }, "PUT");
        await stop(2);
        const tx = alice.sign(bob.address, 25, 0);
        await request(0, "/transactions", tx);
        await request(0, "/mine", {});
        await start(2);
        await request(2, "/peers", { url: "http://127.0.0.1:" + ports[1] });
        const states = await Promise.all([0, 1, 2].map(i => request(i, "/network/state")));
        expect(new Set(states.map(state => state.chain.at(-1).hash)).size).toBe(1);
        expect((await request(2, "/balances/" + bob.address)).balance).toBe(25);
        expect([0, 1, 2].every(i => fs.existsSync(path.join(directory, String(i), "node.sqlite")))).toBe(true);
        await request(2, "/transactions", alice.sign(bob.address, 10, 1));
        for (let i = 0; i < 3; i++) {
            expect((await request(i, "/transactions")).length).toBe(1);
        }
        await Promise.all([0, 1, 2].map(stop));
        for (let i = 0; i < 3; i++) await start(i);
        // Saved peers reconnect on startup without manual peer registration.
        for (let i = 0; i < 3; i++) {
            expect((await request(i, "/transactions")).length).toBe(1);
            expect((await request(i, "/storage/status")).backend).toBe("sqlite");
        }
        expect((await request(0, "/security/config")).thresholds.largeTransferAmount).toBe(10);
        expect((await request(0, "/security/alerts?type=LARGE_TRANSFER")).length).toBe(2);
        await request(2, "/mine", {});
        for (let i = 0; i < 3; i++) {
            expect((await request(i, "/balances/" + bob.address)).balance).toBe(35);
            expect((await request(i, "/transactions")).length).toBe(0);
        }
        alice.lock();
    } finally {
        await Promise.all([0, 1, 2].map(stop));
        fs.rmSync(directory, { recursive: true, force: true });
    }
}, 40000);


