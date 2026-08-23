const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server");

function request(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path: pathname }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
  });
}

(async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const routes = ["/", "/catalog.js", "/storefront.css", "/manifest.webmanifest", "/service-worker.js", "/sitemap.xml", "/robots.txt", "/llms.txt", "/assets/branding/rivayat-logo.png"];
    for (const pathname of routes) {
      const response = await request(port, pathname);
      assert.equal(response.status, 200, `${pathname} should return 200.`);
      assert.ok(response.body.length > 20, `${pathname} should have a response body.`);
    }
    const home = await request(port, "/");
    assert.match(home.body.toString("utf8"), /RIVAYAT \| Premium Indian Fashion/);
    assert.match(String(home.headers["content-security-policy"]), /frame-ancestors 'none'/);
    console.log(`HTTP smoke OK: ${routes.length} public assets and security headers.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
