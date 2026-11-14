const ValidationError = require("./ValidationError");
const { verifyTransaction, transactionData } = require("../crypto/signature");

function genesisEntries(allocations) {
    if (!allocations || typeof allocations !== "object" ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(allocations))) {
        throw new Error("Expected an address-to-amount object");
    }
    let supply = 0;
    return Object.keys(allocations).sort().map(receiver => {
        const amount = allocations[receiver];
        if (!/^SC_[0-9a-f]{40}$/.test(receiver) ||
            !Number.isSafeInteger(amount) || amount <= 0 ||
            !Number.isSafeInteger(supply + amount)) {
            throw new Error("Invalid genesis allocation");
        }
        supply += amount;
        return { type: "genesis", receiver, amount };
    });
}

function validateSignedTransfer(tx) {
    try {
        transactionData(tx);
    } catch {
        throw new ValidationError("INVALID_TRANSACTION", "Invalid transaction fields", tx);
    }
    if (Object.keys(tx).some(key => ![
        "sender", "receiver", "amount", "nonce", "publicKey", "signature"
    ].includes(key))) {
        throw new ValidationError("INVALID_TRANSACTION", "Unexpected transaction fields", tx);
    }
    if (typeof tx.publicKey !== "string" ||
        !tx.publicKey.startsWith("-----BEGIN PUBLIC KEY-----") || !verifyTransaction(tx)) {
        throw new ValidationError("INVALID_SIGNATURE", "Invalid signed transfer", tx);
    }
}

class Ledger {
    constructor(entries) {
        this.balances = new Map(entries.map(tx => [tx.receiver, tx.amount]));
        this.nonces = new Map();
    }

    balance(address) {
        return this.balances.get(address) ?? 0;
    }

    nonce(address) {
        return this.nonces.get(address) ?? 0;
    }

    apply(tx) {
        validateSignedTransfer(tx);
        if (tx.nonce !== this.nonce(tx.sender) || !Number.isSafeInteger(tx.nonce + 1)) {
            throw new ValidationError("INVALID_NONCE", "Invalid sender nonce", tx);
        }
        if (tx.amount > this.balance(tx.sender)) {
            throw new ValidationError("INSUFFICIENT_BALANCE", "Insufficient balance", tx);
        }
        this.balances.set(tx.sender, this.balance(tx.sender) - tx.amount);
        this.balances.set(tx.receiver, this.balance(tx.receiver) + tx.amount);
        this.nonces.set(tx.sender, tx.nonce + 1);
    }
}

module.exports = { genesisEntries, Ledger, validateSignedTransfer };
