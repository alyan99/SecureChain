
const Wallet = require("../src/crypto/wallet");
const Transaction = require("../src/blockchain/Transaction");
const { verifyTransaction } = require("../src/crypto/signature");

describe("SecureChain Wallet Security", () => {
    let alice;
    let bob;
    let tx;

    beforeEach(() => {
        alice = new Wallet();
        bob = new Wallet();

        tx = new Transaction(
            alice.address,
            bob.address,
            100,
            0
        );

        tx.sign(alice);
    });

    test("generates unique wallet addresses", () => {
        expect(alice.address).not.toBe(bob.address);
        expect(alice.address).toMatch(/^SC_[0-9a-f]{40}$/);
    });

    test("verifies a valid signature", () => {
        expect(tx.isValid()).toBe(true);
    });

    test("rejects a modified amount", () => {
        tx.amount = 500;
        expect(tx.isValid()).toBe(false);
    });

    test("rejects a modified receiver", () => {
        tx.receiver = alice.address;
        expect(tx.isValid()).toBe(false);
    });

    test("rejects a modified nonce", () => {
        tx.nonce = 5;
        expect(tx.isValid()).toBe(false);
    });

    test("rejects a forged sender", () => {
        tx.sender = bob.address;
        expect(tx.isValid()).toBe(false);
    });

    test("rejects an incorrect signing wallet", () => {
        const otherTx = new Transaction(
            alice.address,
            bob.address,
            50,
            1
        );

        expect(() => otherTx.sign(bob)).toThrow();
    });

    test("rejects an invalid signature", () => {
        tx.signature = "abcd";
        expect(tx.isValid()).toBe(false);
    });

    test("rejects missing signatures", () => {
        delete tx.signature;
        expect(verifyTransaction(tx)).toBe(false);
    });

    test("rejects negative amounts", () => {
        const invalid = new Transaction(
            alice.address,
            bob.address,
            -100,
            1
        );

        expect(() => invalid.sign(alice)).toThrow();
    });

    test("rejects fractional amounts", () => {
        const invalid = new Transaction(
            alice.address,
            bob.address,
            1.5,
            1
        );

        expect(() => invalid.sign(alice)).toThrow();
    });
});
