
const Blockchain = require("../src/blockchain/Blockchain");

describe("SecureChain Blockchain", () => {
    let blockchain;

    beforeEach(() => {
        blockchain = new Blockchain(2);
    });

    test("creates a valid genesis block", () => {
        expect(blockchain.chain.length).toBe(1);
        expect(blockchain.chain[0].index).toBe(0);
        expect(blockchain.isValidChain()).toBe(true);
    });

    test("mines and adds a new block", () => {
        const block = blockchain.addBlock([]);

        expect(blockchain.chain.length).toBe(2);
        expect(block.hash.startsWith("00")).toBe(true);
        expect(block.previousHash).toBe(blockchain.chain[0].hash);
        expect(blockchain.isValidChain()).toBe(true);
    });

    test("detects tampering with block data", () => {
        blockchain.addBlock([]);
        blockchain.chain[1].timestamp = 12345;

        expect(blockchain.isValidChain()).toBe(false);
    });

    test("detects an invalid previous hash", () => {
        blockchain.addBlock([]);
        blockchain.chain[1].previousHash = "fake-hash";

        expect(blockchain.isValidChain()).toBe(false);
    });

    test("detects an invalid proof of work", () => {
        blockchain.addBlock([]);
        blockchain.chain[1].hash = "invalid-hash";

        expect(blockchain.isValidChain()).toBe(false);
    });

    test("rejects an invalid genesis block", () => {
        blockchain.chain[0].timestamp = 12345;

        expect(blockchain.isValidChain()).toBe(false);
    });

    test("rejects invalid mining difficulty", () => {
        expect(() => new Blockchain(0)).toThrow();
        expect(() => new Blockchain(7)).toThrow();
    });
});
