
const { verifyTransaction } = require("../crypto/signature");

class Transaction {
    constructor(sender, receiver, amount, nonce) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
        this.nonce = nonce;
    }

    sign(wallet) {
        const signed = wallet.sign(this);

        this.publicKey = signed.publicKey;
        this.signature = signed.signature;

        return this;
    }

    isValid() {
        return verifyTransaction(this);
    }
}

module.exports = Transaction;
