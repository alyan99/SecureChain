const { secp256k1 } = require("@noble/curves/secp256k1.js");

const encoder = new TextEncoder();
const ITERATIONS = 600000;
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const bytes = value => Uint8Array.from(value.match(/../g), part => parseInt(part, 16));
const base64 = value => btoa(String.fromCharCode(...value));
const unbase64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

function publicIdentity(secret) {
    const publicBytes = secp256k1.getPublicKey(secret, false);
    const prefix = bytes("3056301006072a8648ce3d020106052b8104000a034200");
    const der = new Uint8Array(prefix.length + publicBytes.length);
    der.set(prefix);
    der.set(publicBytes, prefix.length);
    const encoded = base64(der).match(/.{1,64}/g).join("\n");
    return { der, publicKey: "-----BEGIN PUBLIC KEY-----\n" + encoded + "\n-----END PUBLIC KEY-----\n" };
}
async function identity(secret) {
    const { der, publicKey } = publicIdentity(secret);
    const hash = await crypto.subtle.digest("SHA-256", der);
    return { address: "SC_" + hex(new Uint8Array(hash)).slice(0, 40), publicKey };
}
async function passwordKey(password, salt, usage) {
    const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
        material, { name: "AES-GCM", length: 256 }, false, [usage]);
}
async function create(password) {
    if (typeof password !== "string" || password.length < 12) {
        throw new Error("Use a wallet password with at least 12 characters.");
    }
    const secret = secp256k1.utils.randomSecretKey();
    try {
        const info = await identity(secret);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await passwordKey(password, salt, "encrypt");
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv,
            additionalData: encoder.encode("SecureChain-Wallet-v1") }, key, secret);
        return { version: 1, address: info.address, iterations: ITERATIONS,
            salt: hex(salt), iv: hex(iv), ciphertext: hex(new Uint8Array(ciphertext)) };
    } finally {
        secret.fill(0);
    }
}
function validateVault(vault) {
    if (!vault || vault.version !== 1 || vault.iterations !== ITERATIONS ||
        !/^SC_[0-9a-f]{40}$/.test(vault.address) ||
        !/^[0-9a-f]{32}$/.test(vault.salt) || !/^[0-9a-f]{24}$/.test(vault.iv) ||
        !/^[0-9a-f]{96}$/.test(vault.ciphertext)) throw new Error("Invalid encrypted wallet file.");
    return { version: 1, address: vault.address, iterations: ITERATIONS,
        salt: vault.salt, iv: vault.iv, ciphertext: vault.ciphertext };
}
async function unlock(input, password) {
    const vault = validateVault(input);
    let secret;
    try {
        const key = await passwordKey(password, bytes(vault.salt), "decrypt");
        secret = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM",
            iv: bytes(vault.iv), additionalData: encoder.encode("SecureChain-Wallet-v1") },
        key, bytes(vault.ciphertext)));
        const info = await identity(secret);
        if (info.address !== vault.address) throw new Error("Address mismatch");
        let locked = false;
        return {
            ...info,
            lock() { secret.fill(0); locked = true; },
            sign(receiver, amount, nonce) {
                if (locked) throw new Error("Unlock the wallet before signing.");
                if (!/^SC_[0-9a-f]{40}$/.test(receiver) || !Number.isSafeInteger(amount) ||
                    amount < 1 || !Number.isSafeInteger(nonce) || nonce < 0) {
                    throw new Error("Enter a valid recipient and a positive whole amount.");
                }
                const data = encoder.encode(JSON.stringify([
                    "SecureChain-TX-v1", info.address, receiver, amount, nonce
                ]));
                const signature = secp256k1.sign(data, secret, { format: "der", prehash: true });
                return { sender: info.address, receiver, amount, nonce,
                    publicKey: info.publicKey, signature: hex(signature) };
            }
        };
    } catch {
        secret?.fill(0);
        throw new Error("Unable to unlock wallet. Check the password and wallet file.");
    }
}
module.exports = { create, unlock, validateVault };
