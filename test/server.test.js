const app = require("../src/api/server");

describe("SecureChain API", () => {
    test("health endpoint returns online status", async () => {
        const server = app.listen(0);

        try {
            const address = server.address();
            const response = await fetch(
                `http://127.0.0.1:${address.port}/health`
            );

            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.status).toBe("online");
            expect(data.port).toBeGreaterThan(0);
        } finally {
            await new Promise(resolve => server.close(resolve));
        }
    });
});