const Blockchain = require("../src/blockchain/Blockchain");
const Block = require("../src/blockchain/Block");
const Wallet = require("../src/crypto/wallet");
const Transaction = require("../src/blockchain/Transaction");

let alice, bob, carol, chain;
function transfer(sender, receiver, amount, nonce) {
    return new Transaction(sender.address, receiver.address, amount, nonce).sign(sender);
}

beforeEach(() => {
    alice = new Wallet();
    bob = new Wallet();
    carol = new Wallet();
    chain = new Blockchain(1, { [alice.address]: 100 });
});

test("genesis is deterministic and independent of the caller's allocation object", () => {
    const funds = { [alice.address]: 50, [bob.address]: 10 };
    const first = new Blockchain(1, funds);
    const second = new Blockchain(1, { [bob.address]: 10, [alice.address]: 50 });
    funds[alice.address] = 90;
    expect(first.getLatestBlock().hash).toBe(second.getLatestBlock().hash);
    expect(first.getBalance(alice.address)).toBe(50);
    expect(first.getBalance(carol.address)).toBe(0);
});

test.each([0, -1, 1.5, "10", Infinity])("rejects invalid allocation %p", amount => {
    expect(() => new Blockchain(1, { [alice.address]: amount })).toThrow();
});

test("rejects malformed addresses and unsafe total supply", () => {
    expect(() => new Blockchain(1, { alice: 1 })).toThrow();
    expect(() => new Blockchain(1, {
        [alice.address]: Number.MAX_SAFE_INTEGER, [bob.address]: 1
    })).toThrow();
});

test("pool isolates signed data and settles dependent transfers in order", () => {
    const tx = transfer(alice, bob, 100, 0);
    chain.addTransaction(tx);
    tx.amount = 2;
    chain.pendingTransactions[0].amount = 7;
    chain.addTransaction(transfer(bob, carol, 30, 0));
    expect(chain.getBalance(bob.address)).toBe(0);
    expect(chain.getNextNonce(alice.address)).toBe(1);
    chain.minePendingTransactions();
    expect(chain.pendingTransactions).toEqual([]);
    expect([alice, bob, carol].map(w => chain.getBalance(w.address))).toEqual([0, 70, 30]);
    expect(chain.isValidChain()).toBe(true);
});

test("rejects nonce gaps, conflicting nonces, and overspending queued funds", () => {
    chain.addTransaction(transfer(alice, bob, 60, 0));
    expect(() => chain.addTransaction(transfer(alice, carol, 1, 0))).toThrow(/nonce/);
    expect(() => chain.addTransaction(transfer(alice, bob, 1, 2))).toThrow(/nonce/);
    expect(() => chain.addTransaction(transfer(alice, carol, 41, 1))).toThrow(/balance/);
    expect(chain.pendingTransactions).toHaveLength(1);
});

test("a rejected block leaves the chain and pool intact, and confirmed transfers cannot replay", () => {
    const tx = transfer(alice, bob, 60, 0);
    chain.addTransaction(tx);
    expect(() => chain.addBlock([tx, transfer(alice, carol, 41, 1)])).toThrow(/balance/);
    expect(chain.chain).toHaveLength(1);
    expect(chain.getBalance(alice.address)).toBe(100);
    expect(chain.pendingTransactions).toEqual([tx]);
    chain.minePendingTransactions();
    expect(() => chain.addBlock([tx])).toThrow(/nonce/);
    expect(() => chain.addTransaction(tx)).toThrow(/nonce/);
});

test("direct blocks reconcile conflicts and retain valid queued transactions", () => {
    chain.addTransaction(transfer(alice, bob, 60, 0));
    chain.addTransaction(transfer(bob, carol, 60, 0));
    const next = transfer(alice, bob, 30, 1);
    chain.addTransaction(next);
    chain.addBlock([transfer(alice, carol, 70, 0)]);
    expect(chain.pendingTransactions).toEqual([next]);
    chain.minePendingTransactions();
    expect(chain.getBalance(bob.address)).toBe(30);
});

test("self-transfers consume a nonce and preserve supply", () => {
    chain.addBlock([transfer(alice, alice, 100, 0)]);
    expect(chain.getBalance(alice.address)).toBe(100);
    expect(chain.getNextNonce(alice.address)).toBe(1);
});

test("rejects unsigned issuance and tampered signatures at both entry points", () => {
    const tx = transfer(alice, bob, 10, 0);
    tx.amount = 11;
    for (const invalid of [tx, ...chain.chain[0].transactions]) {
        expect(() => chain.addTransaction(invalid)).toThrow();
        expect(() => chain.addBlock([invalid])).toThrow();
    }
});

test("full validation rejects a correctly mined block with a replay", () => {
    const tx = transfer(alice, bob, 1, 0);
    const previous = chain.addBlock([tx]);
    const invalid = new Block(2, Date.now(), [tx], previous.hash, 1);
    invalid.mineBlock();
    chain.chain.push(invalid);
    expect(chain.isValidChain()).toBe(false);
    expect(() => chain.addBlock([])).toThrow();
});
