const express = require("express");
const { port } = require("../config");

const app = express();

app.use(express.json({ limit: "16kb" }));

app.get("/", (req, res) => {
    res.json({
        project: "SecureChain",
        message: "SecureChain API is running",
        phase: 1
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "online",
        node: `node-${port}`,
        port
    });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`SecureChain node running on port ${port}`);
    });
}

module.exports = app;