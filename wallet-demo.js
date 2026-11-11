
const Wallet = require("./src/crypto/wallet");
const Transaction = require("./src/blockchain/Transaction");

const alice = new Wallet();
const bob = new Wallet();

console.log("\nAlice:", alice.getAddress());
console.log("Bob:", bob.getAddress());

const tx = new Transaction(
    alice.address,
    bob.address,
    100,
    0
);

tx.sign(alice);

console.log("\nTransaction:", {
    sender: tx.sender,
    receiver: tx.receiver,
    amount: tx.amount,
    nonce: tx.nonce
});

console.log("\nValid signature:", tx.isValid());

tx.amount = 500;

console.log("Valid after tampering:", tx.isValid());
