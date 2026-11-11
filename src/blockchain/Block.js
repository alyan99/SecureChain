
const crypto = require("crypto");

class Block {
    constructor(index, timestamp, transactions, previousHash, difficulty) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.difficulty = difficulty;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const data = JSON.stringify({
            index: this.index,
            timestamp: this.timestamp,
            transactions: this.transactions,
            previousHash: this.previousHash,
            difficulty: this.difficulty,
            nonce: this.nonce
        });

        return crypto.createHash("sha256")
            .update(data)
            .digest("hex");
    }

    mineBlock() {
        const target = "0".repeat(this.difficulty);

        while (!this.hash.startsWith(target)) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log(`Block ${this.index} mined: ${this.hash}`);
    }
}

module.exports = Block;
