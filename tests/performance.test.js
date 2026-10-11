const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const products = require("../catalog");

const root = path.resolve(__dirname, "..");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
let productBytes = 0;

for (const product of products) {
  assert.match(product.image, /\.webp$/i, `${product.name} must use WebP.`);
  const filename = path.join(root, product.image.replace(/^\//, ""));
  const bytes = fs.statSync(filename).size;
  productBytes += bytes;
  assert.ok(bytes <= 300_000, `${product.name} image is too large (${bytes} bytes).`);
}

assert.ok(productBytes <= 4_000_000, `Product images exceed the 4 MB catalogue budget (${productBytes} bytes).`);
const coreAssets = serviceWorker.match(/const CORE_ASSETS = \[([\s\S]*?)\];/)?.[1] || "";
assert.doesNotMatch(coreAssets, /assets\/products|assets\/storefront\/hero|assets\/storefront\/categories/, "Large page images must not block service-worker installation.");
assert.equal((html.match(/<img[^>]+data-theme-hero/g) || []).length, 1, "Only the active theme hero should be rendered and downloaded.");

console.log(`Performance budgets OK: ${products.length} optimized product images, ${productBytes} bytes total.`);
