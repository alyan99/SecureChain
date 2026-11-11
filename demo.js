const Blockchain = require("./src/blockchain/Blockchain");

const blockchain = new Blockchain(3);

console.log("\nMining Block 1...");
blockchain.addBlock([]);

console.log("\nMining Block 2...");
blockchain.addBlock([]);

console.log("\nBlockchain valid:", blockchain.isValidChain());

console.log("\nBlockchain:");
console.log(JSON.stringify(blockchain.chain, null, 2));
console.log("\nTampering with Block 1...");

blockchain.chain[1].timestamp = 999999;

console.log("Blockchain valid:", blockchain.isValidChain());