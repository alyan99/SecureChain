const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { transactionData } = require("../crypto/signature");

const DEFAULTS = Object.freeze({
    largeTransferAmount: 1000, frequencyCount: 5, frequencyWindowMs: 60000
});
const TYPES = {
    INVALID_SIGNATURE: "high", INVALID_NONCE: "medium", REPLAY_ATTEMPT: "high",
    DOUBLE_SPEND_ATTEMPT: "high", INSUFFICIENT_BALANCE: "medium",
    INVALID_TRANSACTION: "low", INVALID_BLOCK: "high", INVALID_CHAIN: "high",
    LARGE_TRANSFER: "medium", HIGH_FREQUENCY: "medium", NEW_RECIPIENT: "low"
};
function transactionId(tx) {
    return crypto.createHash("sha256").update(transactionData(tx)).digest("hex");
}
function sanitizeEvent(event) {
    if (!event || !Object.hasOwn(TYPES, event.type) || event.severity !== TYPES[event.type] ||
        !["alert", "rejected"].includes(event.outcome) ||
        !["transaction", "sync", "block", "mining"].includes(event.source) ||
        typeof event.id !== "string" || !/^[0-9a-f-]{36}$/.test(event.id) ||
        !Number.isFinite(Date.parse(event.timestamp))) throw new Error("Invalid security event");
    const clean = {
        id: event.id, timestamp: new Date(event.timestamp).toISOString(),
        type: event.type, severity: event.severity, outcome: event.outcome, source: event.source
    };
    for (const key of ["sender", "receiver"]) {
        if (typeof event[key] === "string" && /^SC_[0-9a-f]{40}$/.test(event[key])) clean[key] = event[key];
    }
    for (const key of ["amount", "nonce"]) {
        if (Number.isSafeInteger(event[key]) && event[key] >= 0) clean[key] = event[key];
    }
    return clean;
}

class SecurityMonitor {
    constructor({ thresholds = {}, logFile, now = Date.now, maxEvents = 10000, store } = {}) {
        this.config = { ...DEFAULTS };
        this.configure({ ...store?.setting("thresholds"), ...thresholds });
        this.logFile = logFile;
        this.now = now;
        this.maxEvents = maxEvents;
        this.events = [];
        this.observed = new Map();
        this.unpersisted = new Map();
        this.storageError = null;
        const persisted = store?.queryEvents({ limit: maxEvents }).reverse() || [];
        if (logFile && fs.existsSync(logFile)) {
            for (const line of fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).slice(-maxEvents)) {
                try { persisted.push(JSON.parse(line)); }
                catch { this.storageError = "Some saved security events could not be recovered"; }
            }
        }
        for (const event of persisted) {
            try { this.events.push(sanitizeEvent(event)); }
            catch { this.storageError = "Some saved security events could not be recovered"; }
        }
        for (const [id, observation] of store?.setting("observations") || []) {
            if (/^[0-9a-f]{64}$/.test(id) &&
                /^SC_[0-9a-f]{40}$/.test(observation?.sender) &&
                /^SC_[0-9a-f]{40}$/.test(observation?.receiver) &&
                (observation.time === null || Number.isSafeInteger(observation.time))) {
                this.observed.set(id, { ...observation, time: observation.time ?? -Infinity });
            }
        }
        this.store = store;
    }

    snapshot() {
        return structuredClone({
            config: this.config, events: this.events, observed: this.observed,
            unpersisted: this.unpersisted, storageError: this.storageError
        });
    }

    restore(snapshot) {
        Object.assign(this, snapshot);
    }

    configure(patch) {
        if (!patch || typeof patch !== "object" || Array.isArray(patch) ||
            Object.keys(patch).some(key => !Object.hasOwn(DEFAULTS, key) ||
                !Number.isSafeInteger(patch[key]) || patch[key] < 1)) {
            throw new Error("Thresholds must be positive safe integers with supported names");
        }
        const next = { ...this.config, ...patch };
        if (this.store) this.store.write(() => this.store.setSetting("thresholds", next));
        this.config = next;
        return { ...this.config };
    }

    flush() {
        for (const event of this.unpersisted.values()) this.store.appendEvent(event);
        if (this.unpersisted.size) this.storageError = null;
        this.unpersisted.clear();
    }

    record(type, outcome, tx, source) {
        const event = sanitizeEvent({
            sender: tx?.sender, receiver: tx?.receiver, amount: tx?.amount, nonce: tx?.nonce,
            id: crypto.randomUUID(), timestamp: new Date(this.now()).toISOString(),
            type, severity: TYPES[type], outcome, source
        });
        this.events.push(event);
        if (this.events.length > this.maxEvents) this.events.shift();
        if (this.store) {
            const waiting = new Map(this.unpersisted);
            try {
                this.store.write(() => {
                    this.flush();
                    this.store.appendEvent(event);
                });
                this.storageError = null;
            } catch (error) {
                if (this.store.inTransaction) throw error;
                this.unpersisted = waiting;
                this.unpersisted.set(event.id, event);
                if (this.unpersisted.size > this.maxEvents) {
                    this.unpersisted.delete(this.unpersisted.keys().next().value);
                }
                this.storageError = "Security log persistence failed";
            }
        } else if (this.logFile) {
            try {
                fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
                fs.appendFileSync(this.logFile, JSON.stringify(event) + "\n");
                this.storageError = null;
            } catch {
                this.storageError = "Security log persistence failed";
            }
        }
        return event;
    }

    rejected(error, tx, blockchain, source) {
        const transfer = error.transaction || tx;
        let type = Object.hasOwn(TYPES, error.code) ? error.code : "INVALID_TRANSACTION";
        if (type === "INVALID_NONCE") {
            if (transfer?.nonce < blockchain.getConfirmedNonce(transfer.sender)) type = "REPLAY_ATTEMPT";
            else if (blockchain.pendingTransactions.some(item =>
                item.sender === transfer?.sender && item.nonce === transfer?.nonce)) type = "DOUBLE_SPEND_ATTEMPT";
        }
        if (type === "INSUFFICIENT_BALANCE" &&
            blockchain.getBalance(transfer.sender) >= transfer.amount) type = "DOUBLE_SPEND_ATTEMPT";
        this.record(type, "rejected", transfer, source);
    }

    observe(tx, source) {
        const id = transactionId(tx);
        if (this.observed.has(id)) return;
        const time = this.now();
        const history = [...this.observed.values()];
        const knownRecipient = history.some(item => item.sender === tx.sender && item.receiver === tx.receiver);
        const count = history.filter(item => item.sender === tx.sender &&
            item.time > time - this.config.frequencyWindowMs).length + 1;
        this.observed.set(id, { sender: tx.sender, receiver: tx.receiver, time });
        if (this.observed.size > this.maxEvents) this.observed.delete(this.observed.keys().next().value);
        if (tx.amount >= this.config.largeTransferAmount) this.record("LARGE_TRANSFER", "alert", tx, source);
        if (count >= this.config.frequencyCount) this.record("HIGH_FREQUENCY", "alert", tx, source);
        if (!knownRecipient) this.record("NEW_RECIPIENT", "alert", tx, source);
    }

    seed(transactions) {
        for (const tx of transactions) {
            const id = transactionId(tx);
            if (!this.observed.has(id)) {
                this.observed.set(id, { sender: tx.sender, receiver: tx.receiver, time: -Infinity });
            }
            if (this.observed.size > this.maxEvents) this.observed.delete(this.observed.keys().next().value);
        }
    }

    query({ severity, type, outcome, limit = 100 } = {}) {
        const count = Number(limit);
        if (!Number.isInteger(count) || count < 1 || count > 1000 ||
            (severity !== undefined && !["low", "medium", "high"].includes(severity)) ||
            (outcome !== undefined && !["alert", "rejected"].includes(outcome)) ||
            (type !== undefined && !Object.hasOwn(TYPES, type))) throw new Error("Invalid security log filter");
        const matches = event => (severity === undefined || event.severity === severity) &&
            (type === undefined || event.type === type) && (outcome === undefined || event.outcome === outcome);
        if (this.store) {
            try {
                const saved = this.store.queryEvents({ severity, type, outcome, limit: count }).map(sanitizeEvent);
                const waiting = [...this.unpersisted.values()].filter(matches).reverse();
                const ids = new Set(waiting.map(event => event.id));
                return structuredClone(waiting.concat(saved.filter(event => !ids.has(event.id))).slice(0, count));
            } catch {
                this.storageError = "Security log retrieval failed";
            }
        }
        return structuredClone(this.events.filter(matches).slice(-count).reverse());
    }
}
module.exports = { SecurityMonitor, transactionId };


