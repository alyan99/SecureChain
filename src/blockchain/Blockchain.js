const Block = require("./Block");
const { genesisEntries, Ledger } = require("./Ledger");

const GENESIS_TIMESTAMP = 1735689600000;
const GENESIS_PREVIOUS_HASH = "0".repeat(64);

class Blockchain {
    #allocations;
    #genesisHash;
    #pending = [];

    constructor(difficulty = 3, allocations = {}) {
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) {
            throw new Error("Invalid difficulty");
        }
        this.difficulty = difficulty;
        this.#allocations = genesisEntries(allocations);
        this.chain = [this.createGenesisBlock()];
        this.#genesisHash = this.chain[0].hash;
    }

    createGenesisBlock() {
        const genesis = new Block(0, GENESIS_TIMESTAMP, structuredClone(this.#allocations),
            GENESIS_PREVIOUS_HASH, this.difficulty);
        genesis.mineBlock();
        return genesis;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    #confirmedLedger(chain = this.chain) {
        const genesis = chain[0];
        if (!genesis || genesis.hash !== this.#genesisHash ||
            Block.prototype.calculateHash.call(genesis) !== this.#genesisHash ||
            genesis.difficulty !== this.difficulty) {
            throw new Error("Invalid genesis block");
        }
        const ledger = new Ledger(this.#allocations);
        for (let i = 1; i < chain.length; i++) {
            const block = chain[i];
            if (block.index !== i || block.difficulty !== this.difficulty ||
                block.previousHash !== chain[i - 1].hash ||
                !Number.isSafeInteger(block.nonce) || block.nonce < 0 ||
                !Array.isArray(block.transactions) ||
                block.hash !== Block.prototype.calculateHash.call(block) ||
                !block.hash.startsWith("0".repeat(this.difficulty))) {
                throw new Error("Invalid block");
            }
            for (const tx of block.transactions) ledger.apply(tx);
        }
        return ledger;
    }

    #projectedLedger() {
        const ledger = this.#confirmedLedger();
        for (const tx of this.#pending) ledger.apply(tx);
        return ledger;
    }

    getBalance(address) {
        return this.#confirmedLedger().balance(address);
    }

    getConfirmedNonce(address) {
        return this.#confirmedLedger().nonce(address);
    }

    getNextNonce(address) {
        return this.#projectedLedger().nonce(address);
    }

    get pendingTransactions() {
        return structuredClone(this.#pending);
    }

    addTransaction(transaction) {
        const tx = structuredClone(transaction);
        this.#projectedLedger().apply(tx);
        this.#pending.push(tx);
    }

    minePendingTransactions() {
        return this.addBlock(this.#pending);
    }

    addBlock(transactions = []) {
        if (!Array.isArray(transactions)) throw new Error("Expected a transaction array");
        const batch = structuredClone(transactions);
        const ledger = this.#confirmedLedger();
        for (const tx of batch) ledger.apply(tx);

        const block = new Block(this.chain.length, Date.now(), batch,
            this.getLatestBlock().hash, this.difficulty);
        block.mineBlock();

        // A direct block may confirm, supersede or invalidate queued transfers.
        const remaining = [];
        for (const tx of this.#pending) {
            try {
                ledger.apply(tx);
                remaining.push(tx);
            } catch {
                // Keep only transfers still executable in queue order.
            }
        }
        this.chain.push(block);
        this.#pending = remaining;
        return block;
    }

    getCumulativeWork(chain = this.chain) {
        this.#confirmedLedger(chain);
        return chain.reduce((work, block) => work + 16n ** BigInt(block.difficulty), 0n);
    }

    replaceChain(candidate) {
        if (!Array.isArray(candidate) || candidate.length === 0) {
            throw new Error("Expected a nonempty chain");
        }
        const incoming = structuredClone(candidate);
        const work = this.getCumulativeWork(incoming);
        const currentWork = this.getCumulativeWork();
        if (work < currentWork || (work === currentWork &&
            incoming.at(-1).hash >= this.getLatestBlock().hash)) return false;
        const ledger = this.#confirmedLedger(incoming);
        const pending = [];
        // Recover executable transfers from orphaned blocks before queued transfers.
        const candidates = this.chain.slice(1).flatMap(block => block.transactions)
            .concat(this.#pending);
        for (const tx of candidates) {
            try {
                ledger.apply(tx);
                pending.push(tx);
            } catch {
                // Confirmed, conflicting and unfunded transfers leave the pool.
            }
        }
        this.chain = incoming;
        this.#pending = pending;
        return true;
    }

    restoreState(snapshot) {
        const chain = structuredClone(snapshot.chain);
        if (!Array.isArray(chain) || !Array.isArray(snapshot.pending)) {
            throw new Error("Invalid saved state");
        }
        const ledger = this.#confirmedLedger(chain);
        const pending = [];
        for (const tx of snapshot.pending) {
            try {
                ledger.apply(tx);
                pending.push(structuredClone(tx));
            } catch {
                // Revalidate recovered pending data against the saved history.
            }
        }
        this.chain = chain;
        this.#pending = pending;
        return { droppedPending: snapshot.pending.length - pending.length };
    }

    isValidChain() {
        try {
            this.#confirmedLedger();
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = Blockchain;



