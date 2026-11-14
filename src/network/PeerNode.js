const fs = require("fs");
const path = require("path");
const { SecurityMonitor, transactionId } = require("../security/SecurityMonitor");
const { validateSignedTransfer } = require("../blockchain/Ledger");
const Blockchain = require("../blockchain/Blockchain");
const { SQLiteStore } = require("../storage/SQLiteStore");

class PeerNode {
    constructor({ difficulty = 2, allocations = {}, storageFile, databaseFile,
        timeout = 2000, security = {} } = {}) {
        this.blockchain = new Blockchain(difficulty, allocations);
        this.storageFile = storageFile;
        this.timeout = timeout;
        this.peers = new Set();
        this.seen = new Set();
        this.url = null;
        this.timer = null;
        this.recovery = { migrated: false, droppedPending: 0 };
        try {
            this.store = databaseFile ? new SQLiteStore(databaseFile) : undefined;
            const saved = this.store?.loadState();
            const legacy = !saved && storageFile && fs.existsSync(storageFile)
                ? JSON.parse(fs.readFileSync(storageFile, "utf8")) : undefined;
            const recovered = saved || legacy;
            if (recovered) this.recovery.droppedPending = this.blockchain.restoreState(recovered).droppedPending;
            this.security = new SecurityMonitor({
                logFile: !saved && storageFile
                    ? path.join(path.dirname(storageFile), "security.jsonl") : undefined,
                ...security, store: this.store
            });
            if (!this.store?.setting("observations")) {
                this.security.seed(this.blockchain.chain.slice(1).flatMap(block => block.transactions));
                this.security.seed(this.blockchain.pendingTransactions);
            }
            for (const peer of this.store?.setting("peers") || []) this.peers.add(this.peerOrigin(peer));
            if (this.store) {
                this.recovery.migrated = Boolean(legacy);
                this.commit(() => {
                    if (!saved) {
                        for (const event of this.security.events) this.store.appendEvent(event);
                    }
                });
            }
        } catch (error) {
            this.store?.close();
            throw error;
        }
    }

    storageStatus() {
        return {
            backend: this.store ? "sqlite" : this.storageFile ? "json" : "memory",
            error: this.store?.error || null, securityError: this.security.storageError,
            recovery: this.recovery
        };
    }

    observeHistory(source, blocks = this.blockchain.chain.slice(1)) {
        for (const block of blocks) {
            for (const tx of block.transactions) this.security.observe(tx, source);
        }
    }

    snapshot() {
        return { chain: structuredClone(this.blockchain.chain),
            pending: this.blockchain.pendingTransactions };
    }

    commit(change) {
        const before = this.snapshot();
        const monitor = this.security.snapshot();
        const peers = new Set(this.peers);
        try {
            if (this.store) {
                return this.store.write(() => {
                    const result = change();
                    this.security.flush();
                    this.store.saveState(this.snapshot(), this.security, this.peers);
                    return result;
                });
            }
            const result = change();
            if (this.storageFile) {
                fs.mkdirSync(path.dirname(this.storageFile), { recursive: true });
                const temporary = this.storageFile + ".tmp";
                fs.writeFileSync(temporary, JSON.stringify(this.snapshot()));
                fs.renameSync(temporary, this.storageFile);
            }
            return result;
        } catch (error) {
            this.blockchain.restoreState(before);
            this.security.restore(monitor);
            this.peers = peers;
            throw error;
        }
    }

    peerOrigin(url) {
        const peer = new URL(url);
        if (peer.protocol !== "http:" || peer.username || peer.password ||
            peer.pathname !== "/" || peer.search || peer.hash) {
            throw new Error("Expected an HTTP peer origin");
        }
        return peer.origin;
    }

    register(url) {
        const origin = this.peerOrigin(url);
        if (origin !== this.url && !this.peers.has(origin)) {
            this.commit(() => this.peers.add(origin));
        }
        return origin;
    }

    removePeer(url) {
        const origin = this.peerOrigin(url);
        this.commit(() => this.peers.delete(origin));
    }

    async request(peer, route, body) {
        const response = await fetch(peer + route, {
            method: body === undefined ? "GET" : "POST",
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(this.timeout)
        });
        if (!response.ok) throw new Error("Peer rejected request: " + response.status);
        return response.json();
    }

    async connect(url) {
        const peer = this.register(url);
        await this.request(peer, "/network/peers", { url: this.url });
        await this.sync();
    }

    remember(id) {
        this.seen.add(id);
        if (this.seen.size > 10000) this.seen.delete(this.seen.values().next().value);
    }

    async broadcast(route, body) {
        await Promise.allSettled([...this.peers].map(peer => this.request(peer, route, body)));
    }

    acceptTransaction(tx, source = "transaction") {
        try {
            validateSignedTransfer(tx);
            const id = transactionId(tx);
            if (source === "sync" && tx.nonce < this.blockchain.getConfirmedNonce(tx.sender)) {
                return false;
            }
            const queued = this.blockchain.pendingTransactions.some(item => transactionId(item) === id);
            if (queued || (this.seen.has(id) &&
                tx.nonce < this.blockchain.getConfirmedNonce(tx.sender))) {
                if (source === "transaction" &&
                    tx.nonce < this.blockchain.getConfirmedNonce(tx.sender)) {
                    this.security.record("REPLAY_ATTEMPT", "rejected", tx, source);
                }
                return false;
            }
            this.commit(() => {
                this.blockchain.addTransaction(tx);
                this.security.observe(tx, source);
            });
            this.remember(id);
        } catch (error) {
            // Disk and operational errors must not be labeled as transaction fraud.
            if (error.code === "INVALID_SIGNATURE" || error.code === "INVALID_TRANSACTION" ||
                error.code === "INVALID_NONCE" || error.code === "INSUFFICIENT_BALANCE") {
                this.security.rejected(error, tx, this.blockchain, source);
            }
            throw error;
        }
        return true;
    }

    async submit(tx) {
        const accepted = this.acceptTransaction(tx);
        if (accepted) await this.broadcast("/transactions", tx);
        return accepted;
    }

    async receiveBlock(block) {
        if (!block || typeof block.hash !== "string") {
            this.security.record("INVALID_BLOCK", "rejected", undefined, "block");
            throw new Error("Invalid block");
        }
        if (this.blockchain.chain.some(item => item.hash === block.hash)) return false;
        const tip = this.blockchain.getLatestBlock();
        if (block.previousHash !== tip.hash) {
            // Missing ancestors and competing branches are fetched and fully validated.
            await this.sync();
            return false;
        }
        try {
            this.blockchain.getCumulativeWork([...this.blockchain.chain, block]);
        } catch (error) {
            this.security.record("INVALID_BLOCK", "rejected", undefined, "block");
            if (error.transaction) this.security.rejected(error, undefined, this.blockchain, "block");
            throw error;
        }
        const accepted = this.commit(() => {
            const adopted = this.blockchain.replaceChain([...this.blockchain.chain, block]);
            if (adopted) this.observeHistory("block", [block]);
            return adopted;
        });
        if (accepted) await this.broadcast("/blocks", block);
        return accepted;
    }

    async mine() {
        const block = this.commit(() => {
            const mined = this.blockchain.minePendingTransactions();
            this.observeHistory("mining", [mined]);
            return mined;
        });
        await this.broadcast("/blocks", block);
        return block;
    }

    async sync() {
        const results = await Promise.allSettled([...this.peers].map(peer =>
            this.request(peer, "/network/state")));
        // Each candidate is checked locally. Peer-reported work is never trusted.
        for (const result of results) {
            if (result.status !== "fulfilled") continue;
            try {
                if (!Array.isArray(result.value?.chain)) throw new Error("Missing chain");
                this.blockchain.getCumulativeWork(result.value.chain);
            } catch (error) {
                this.security.record("INVALID_CHAIN", "rejected", undefined, "sync");
                if (error.transaction) this.security.rejected(error, undefined, this.blockchain, "sync");
                continue;
            }
            try {
                const previousHashes = new Set(this.blockchain.chain.map(block => block.hash));
                this.commit(() => {
                    const adopted = this.blockchain.replaceChain(result.value.chain);
                    if (adopted) this.observeHistory("sync",
                        this.blockchain.chain.slice(1).filter(block => !previousHashes.has(block.hash)));
                });
            } catch {
                // Storage failures leave the local state intact and can be retried.
                continue;
            }
            for (const tx of Array.isArray(result.value.pending) ? result.value.pending : []) {
                try {
                    this.acceptTransaction(tx, "sync");
                } catch {
                    // Ignore already known or invalid pending transfers.
                }
            }
        }
    }

    startSync(interval = 3000) {
        let active = false;
        this.timer = setInterval(async () => {
            if (active) return;
            active = true;
            try { await this.sync(); } finally { active = false; }
        }, interval);
        this.timer.unref();
    }

    close() {
        this.stop();
        this.store?.close();
    }

    stop() {
        clearInterval(this.timer);
    }
}

module.exports = PeerNode;


