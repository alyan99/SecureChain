
const crypto = require("crypto");

const {
    publicKeyToAddress,
    signTransaction
} = require("./signature");

class Wallet {
    constructor() {
        const keys = crypto.generateKeyPairSync("ec", {
            namedCurve: "secp256k1",
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem"
            }
        });

        this.publicKey = keys.publicKey;
        this.privateKey = keys.privateKey;
        this.address = publicKeyToAddress(this.publicKey);
    }

    sign(tx) {
        if (tx.sender !== this.address) {
            throw new Error("Sender does not match wallet");
        }

        return {
            ...tx,
            publicKey: this.publicKey,
            signature: signTransaction(tx, this.privateKey)
        };
    }

    getAddress() {
        return this.address;
    }
}

module.exports = Wallet;
