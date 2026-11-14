const express = require("express");
const fs = require("fs");
const path = require("path");
const { port } = require("../config");
const PeerNode = require("../network/PeerNode");

function createApp(node = new PeerNode()) {
    const app = express();
    app.locals.node = node;
    app.use(express.json({ limit: "1mb" }));
    app.use("/dashboard", (req, res, next) => {
        res.set("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Referrer-Policy", "no-referrer");
        next();
    }, express.static(path.resolve(__dirname, "../../public")));
    app.get("/", (req, res, next) => {
        if (req.accepts(["html", "json"]) === "html") return res.redirect("/dashboard/");
        next();
    });
    app.get("/", (req, res) => res.json({
        project: "SecureChain", message: "SecureChain API is running", phase: 8
    }));
    app.get("/health", (req, res) => res.json({
        status: "online", node: node.url || `node-${port}`, port
    }));
    app.get("/storage/status", (req, res) => res.json(node.storageStatus()));
    app.get("/security/logs", (req, res) => res.json(node.security.query(req.query)));
    app.get("/security/alerts", (req, res) =>
        res.json(node.security.query({ ...req.query, outcome: "alert" })));
    app.get("/security/config", (req, res) => res.json({
        thresholds: { ...node.security.config }, storageError: node.security.storageError
    }));
    app.put("/security/config", (req, res) =>
        res.json({ thresholds: node.security.configure(req.body) }));
    app.get("/network/state", (req, res) => res.json(node.snapshot()));
    app.get("/network/peer-status", async (req, res) => {
        const peers = await Promise.all([...node.peers].map(async url => {
            try {
                const status = await node.request(url, "/health");
                return { url, online: status.status === "online" };
            } catch {
                return { url, online: false };
            }
        }));
        res.json(peers);
    });
    app.get("/peers", (req, res) => res.json([...node.peers]));
    app.post("/network/peers", (req, res) => {
        node.register(req.body.url);
        res.json({ registered: true });
    });
    app.post("/peers", async (req, res) => {
        await node.connect(req.body.url);
        res.json({ connected: true });
    });
    app.delete("/peers", (req, res) => {
        node.removePeer(req.body.url);
        res.json({ removed: true });
    });
    app.get("/transactions", (req, res) => res.json(node.blockchain.pendingTransactions));
    app.post("/transactions", async (req, res) =>
        res.json({ accepted: await node.submit(req.body) }));
    app.post("/blocks", async (req, res) =>
        res.json({ accepted: await node.receiveBlock(req.body) }));
    app.post("/mine", async (req, res) => res.json(await node.mine()));
    app.post("/sync", async (req, res) => {
        await node.sync();
        res.json({ tip: node.blockchain.getLatestBlock().hash });
    });
    app.get("/balances/:address", (req, res) => res.json({
        balance: node.blockchain.getBalance(req.params.address),
        nextNonce: node.blockchain.getNextNonce(req.params.address)
    }));
    app.use((error, req, res, next) => {
        res.status(error.status || 400).json({
            error: error.type === "entity.parse.failed" ? "Invalid JSON body" : error.message
        });
    });
    return app;
}

const app = createApp();
if (require.main === module) {
    const allocations = process.env.GENESIS_FILE
        ? JSON.parse(fs.readFileSync(process.env.GENESIS_FILE, "utf8")) : {};
    const node = new PeerNode({
        difficulty: Number(process.env.DIFFICULTY || 2), allocations,
        security: {
            thresholds: process.env.SECURITY_CONFIG_FILE
                ? JSON.parse(fs.readFileSync(process.env.SECURITY_CONFIG_FILE, "utf8")) : {}
        },
        databaseFile: path.resolve(process.env.DATA_DIR || path.join("data", String(port)), "node.sqlite"),
        storageFile: path.resolve(process.env.DATA_DIR || path.join("data", String(port)), "state.json")
    });
    const server = createApp(node).listen(port, "127.0.0.1", async () => {
        node.url = `http://127.0.0.1:${port}`;
        const peers = new Set([...node.peers, ...(process.env.PEERS || "").split(",").filter(Boolean)]);
        for (const peer of peers) {
            try { await node.connect(peer); } catch (error) { console.error(error.message); }
        }
        node.startSync();
        console.log(`SecureChain node running at ${node.url}`);
    });
    function shutdown() {
        node.stop();
        server.close(() => node.close());
    }
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
module.exports = app;
module.exports.createApp = createApp;



