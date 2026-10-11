const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");

function request(port, { path = "/", method = "GET", headers = {}, body = "" } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const home = await request(port);
    assert.equal(home.status, 200);
    assert.equal(home.headers["x-powered-by"], undefined, "Technology header must be disabled.");
    assert.equal(home.headers["x-frame-options"], "DENY");
    assert.equal(home.headers["x-content-type-options"], "nosniff");
    assert.match(home.headers["content-security-policy"], /object-src 'none'/);
    assert.match(home.headers["content-security-policy"], /upgrade-insecure-requests/);

    const cors = await request(port, { path: "/health", headers: { Origin: "https://attacker.invalid" } });
    assert.equal(cors.status, 403, "Unknown browser origins must be rejected.");
    assert.equal(cors.headers["access-control-allow-origin"], undefined);
    assert.doesNotMatch(cors.body, /Error:|node_modules|server\.js:/, "Error responses must not leak stack traces.");

    const protectedRoute = await request(port, { path: "/users", headers: { Authorization: "Bearer invalid-token" } });
    assert.equal(protectedRoute.status, 403, "Invalid tokens must not reach administrator data.");

    const traversal = await request(port, { path: "/assets/%2e%2e/server.js" });
    assert.notEqual(traversal.status, 200, "Encoded path traversal must not expose source files.");
    assert.doesNotMatch(traversal.body, /MONGO_URI|APP_SECRET|mongoose\.connect/);

    const invalidForgot = await request(port, {
      path: "/forgot-password",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" })
    });
    assert.equal(invalidForgot.status, 400, "Malformed recovery requests must fail before database work.");

    const oversized = await request(port, {
      path: "/forgot-password",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", padding: "x".repeat(1_100_000) })
    });
    assert.equal(oversized.status, 413, "Ordinary API requests must enforce the 1 MB body limit.");
    assert.doesNotMatch(oversized.body, /Error:|node_modules|server\.js:/);

    console.log("Controlled security checks passed: headers, CORS, auth boundary, path traversal, validation, request limits.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
