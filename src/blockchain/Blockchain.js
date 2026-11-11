
const Block = require("./Block");

const GENESIS_TIMESTAMP = 1735689600000;
const GENESIS_PREVIOUS_HASH = "0".repeat(64);

class Blockchain {
    constructor(difficulty = 3) {
        if (!Number.isInteger(difficulty) ||
            difficulty < 1 || difficulty > 6) {
            throw new Error("Invalid difficulty");
        }

        this.difficulty = difficulty;
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        const genesis = new Block(
            0,
            GENESIS_TIMESTAMP,
            [],
            GENESIS_PREVIOUS_HASH,
            this.difficulty
        );

        genesis.mineBlock();
        return genesis;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(transactions = []) {
        const previousBlock = this.getLatestBlock();

        const newBlock = new Block(
            this.chain.length,
            Date.now(),
            structuredClone(transactions),
            previousBlock.hash,
            this.difficulty
        );

        newBlock.mineBlock();

        this.chain.push(newBlock);
        return newBlock;
    }

    isValidChain() {
        const expectedGenesis = this.createGenesisBlock();
        const genesis = this.chain[0];

        if (!genesis ||
            JSON.stringify(genesis) !== JSON.stringify(expectedGenesis)) {
            return false;
        }

        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const previous = this.chain[i - 1];

            if (current.index !== i) return false;
            if (current.difficulty !== this.difficulty) return false;
            if (current.previousHash !== previous.hash) return false;

            if (!Number.isInteger(current.nonce) ||
                current.nonce < 0) return false;

            if (current.hash !== current.calculateHash()) return false;

            if (!current.hash.startsWith(
                "0".repeat(current.difficulty)
            )) return false;

            if (!Array.isArray(current.transactions)) return false;
        }

        return true;
    }
}

module.exports = Blockchain;
