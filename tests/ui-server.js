const express = require("express");
const path = require("node:path");
const products = require("../catalog");

const app = express();
const root = path.resolve(__dirname, "..");
app.use(express.json({ limit: "16mb" }));
app.get("/products", (req, res) => res.json({ success: true, authoritative: true, catalogVersion: "visual-test", products }));
app.get("/products/:value", (req, res) => {
  const product = products.find((item) => item.id === req.params.value || item.slug === req.params.value);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  return res.json({ success: true, product });
});
app.get("/settings/homepage", (req, res) => res.json({ success: true, settings: {} }));
app.get("/settings/team", (req, res) => res.json({ success: true, team: [] }));
app.get("/reviews", (req, res) => res.json({ success: true, reviews: [] }));
app.get("/coupons", (req, res) => res.json({ success: true, coupons: [] }));
app.get("/auth/google/config", (req, res) => res.json({ success: true, clientId: null }));
app.use("/assets", express.static(path.join(root, "assets")));
for (const file of ["catalog.js", "storefront.css", "manifest.webmanifest", "service-worker.js", "sitemap.xml", "robots.txt", "llms.txt"]) {
  app.get(`/${file}`, (req, res) => res.sendFile(path.join(root, file)));
}
app.get("/*path", (req, res) => res.sendFile(path.join(root, "index.html")));
const server = app.listen(4173, "127.0.0.1", () => console.log("RIVAYAT visual test server: http://127.0.0.1:4173"));
process.on("SIGTERM", () => server.close());
