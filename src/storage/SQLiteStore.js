const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { transactionId } = require("../security/SecurityMonitor");
const ValidationError = require("../blockchain/ValidationError");

function storageError(cause) {
    const error = new Error("Node storage is unavailable. Check the node database and retry.");
    error.code = "STORAGE_ERROR";
    error.status = 503;
    error.cause = cause;
    return error;
}

class SQLiteStore {
    constructor(filename) {
        this.filename = filename;
        this.inTransaction = false;
        this.revision = 0;
        this.error = null;
        try {
            fs.mkdirSync(path.dirname(filename), { recursive: true });
            this.db = new DatabaseSync(filename, { timeout: 1000 });
            this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
            const version = this.db.prepare("PRAGMA user_version").get().user_version;
            if (version !== 0 && version !== 1) throw new Error("Unsupported database schema");
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
                CREATE TABLE IF NOT EXISTS blocks (
                    height INTEGER PRIMARY KEY, hash TEXT NOT NULL UNIQUE, data TEXT NOT NULL
                ) STRICT;
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('confirmed','pending')),
                    block_height INTEGER REFERENCES blocks(height) ON DELETE CASCADE,
                    position INTEGER NOT NULL, sender TEXT, nonce INTEGER, data TEXT NOT NULL,
                    CHECK((status = 'pending' AND block_height IS NULL) OR
                          (status = 'confirmed' AND block_height IS NOT NULL)),
                    UNIQUE(sender, nonce)
                ) STRICT;
                CREATE TABLE IF NOT EXISTS security_events (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
                    severity TEXT NOT NULL, type TEXT NOT NULL, outcome TEXT NOT NULL,
                    data TEXT NOT NULL
                ) STRICT;
                CREATE INDEX IF NOT EXISTS events_filter ON security_events(outcome, severity, sequence);
                PRAGMA user_version = 1;
            `);
            this.revision = this.setting("revision") ?? 0;
            if (!Number.isSafeInteger(this.revision) || this.revision < 0) {
                throw new Error("Invalid database revision");
            }
        } catch (cause) {
            this.db?.close();
            throw storageError(cause);
        }
    }

    setting(key) {
        const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
        return row ? JSON.parse(row.value) : undefined;
    }

    setSetting(key, value) {
        this.db.prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
            .run(key, JSON.stringify(value));
    }

    write(change) {
        if (this.inTransaction) return change();
        try {
            this.db.exec("BEGIN IMMEDIATE");
            this.inTransaction = true;
            if ((this.setting("revision") ?? 0) !== this.revision) {
                throw new Error("Another process changed this node database. Restart with a separate data directory.");
            }
            const result = change();
            this.setSetting("revision", this.revision + 1);
            this.db.exec("COMMIT");
            this.revision++;
            this.error = null;
            return result;
        } catch (cause) {
            if (this.inTransaction) {
                try { this.db.exec("ROLLBACK"); } catch { /* Preserve the original failure. */ }
            }
            if (cause instanceof ValidationError) throw cause;
            this.error = "Node database write failed";
            throw storageError(cause);
        } finally {
            this.inTransaction = false;
        }
    }

    loadState() {
        try {
            const blocks = this.db.prepare("SELECT * FROM blocks ORDER BY height").all();
            if (!blocks.length) {
                if (this.setting("initialized")) throw new Error("Saved chain is missing");
                return null;
            }
            const chain = blocks.map((row, index) => {
                const header = JSON.parse(row.data);
                if (row.height !== index || header.index !== row.height || header.hash !== row.hash) {
                    throw new Error("Invalid block header storage");
                }
                return { ...header, transactions: [] };
            });
            const pending = [];
            const rows = this.db.prepare(
                "SELECT * FROM transactions ORDER BY status, block_height, position").all();
            for (const row of rows) {
                const target = row.status === "pending" ? pending : chain[row.block_height]?.transactions;
                if (!target || row.position !== target.length) throw new Error("Invalid transaction order");
                target.push(JSON.parse(row.data));
            }
            return { chain, pending };
        } catch (cause) {
            throw storageError(cause);
        }
    }

    saveState(snapshot, monitor, peers) {
        this.db.exec("DELETE FROM transactions; DELETE FROM blocks;");
        const addBlock = this.db.prepare("INSERT INTO blocks(height, hash, data) VALUES(?, ?, ?)");
        const addTransaction = this.db.prepare(
            "INSERT INTO transactions(id,status,block_height,position,sender,nonce,data) VALUES(?,?,?,?,?,?,?)");
        for (const block of snapshot.chain) {
            const { transactions, ...header } = block;
            addBlock.run(block.index, block.hash, JSON.stringify(header));
            transactions.forEach((tx, position) => {
                const id = block.index === 0 ? block.hash + ":" + position : transactionId(tx);
                addTransaction.run(id, "confirmed", block.index, position,
                    tx.sender ?? null, tx.nonce ?? null, JSON.stringify(tx));
            });
        }
        snapshot.pending.forEach((tx, position) => {
            addTransaction.run(transactionId(tx), "pending", null, position,
                tx.sender, tx.nonce, JSON.stringify(tx));
        });
        this.setSetting("initialized", true);
        this.setSetting("thresholds", monitor.config);
        this.setSetting("observations", [...monitor.observed.entries()]);
        this.setSetting("peers", [...peers]);
    }

    appendEvent(event) {
        const append = () => this.db.prepare(
            "INSERT OR IGNORE INTO security_events(id,severity,type,outcome,data) VALUES(?,?,?,?,?)")
            .run(event.id, event.severity, event.type, event.outcome, JSON.stringify(event));
        return this.inTransaction ? append() : this.write(append);
    }

    queryEvents({ severity, type, outcome, limit = 100 } = {}) {
        const filters = [];
        const values = [];
        for (const [key, value] of Object.entries({ severity, type, outcome })) {
            if (value !== undefined) {
                filters.push(key + " = ?");
                values.push(value);
            }
        }
        const where = filters.length ? " WHERE " + filters.join(" AND ") : "";
        return this.db.prepare("SELECT data FROM security_events" + where +
            " ORDER BY sequence DESC LIMIT ?").all(...values, Number(limit))
            .map(row => JSON.parse(row.data));
    }

    close() {
        if (this.closed) return;
        this.db.close();
        this.closed = true;
    }
}
module.exports = { SQLiteStore, storageError };




