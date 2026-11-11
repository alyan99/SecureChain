
const crypto = require("crypto");

function publicKeyToAddress(publicKey) {
    const key = crypto.createPublicKey(publicKey);

    if (key.asymmetricKeyType !== "ec" ||
        key.asymmetricKeyDetails?.namedCurve !== "secp256k1") {
        throw new Error("Invalid public key type");
    }

    const der = key.export({
        type: "spki",
        format: "der"
    });

    const hash = crypto.createHash("sha256")
        .update(der)
        .digest("hex");

    return "SC_" + hash.slice(0, 40);
}

function transactionData(tx) {
    if (!tx || typeof tx !== "object") {
        throw new Error("Invalid transaction");
    }

    if (typeof tx.sender !== "string" ||
        typeof tx.receiver !== "string" ||
        !/^SC_[0-9a-f]{40}$/.test(tx.sender) ||
        !/^SC_[0-9a-f]{40}$/.test(tx.receiver) ||
        !Number.isSafeInteger(tx.amount) ||
        tx.amount <= 0 ||
        !Number.isSafeInteger(tx.nonce) ||
        tx.nonce < 0) {
        throw new Error("Invalid transaction fields");
    }

    return Buffer.from(JSON.stringify([
        "SecureChain-TX-v1",
        tx.sender,
        tx.receiver,
        tx.amount,
        tx.nonce
    ]));
}

function signTransaction(tx, privateKey) {
    const data = transactionData(tx);

    return crypto.sign("sha256", data, {
        key: privateKey,
        dsaEncoding: "der"
    }).toString("hex");
}

function verifyTransaction(tx) {
    try {
        if (typeof tx.publicKey !== "string" ||
            typeof tx.signature !== "string" ||
            !/^(?:[0-9a-f]{2})+$/.test(tx.signature)) {
            return false;
        }

        const derivedAddress = publicKeyToAddress(tx.publicKey);

        if (derivedAddress !== tx.sender) {
            return false;
        }

        return crypto.verify(
            "sha256",
            transactionData(tx),
            tx.publicKey,
            Buffer.from(tx.signature, "hex")
        );
    } catch {
        return false;
    }
}

module.exports = {
    publicKeyToAddress,
    transactionData,
    signTransaction,
    verifyTransaction
};
