const path = require("path");
const argument = path.basename(process.argv[1] || "") === "server.js" ? process.argv[2] : undefined;
const port = Number(process.env.PORT || argument || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid port");
}
module.exports = { port };

