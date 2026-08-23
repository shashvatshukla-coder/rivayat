const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const products = require("../catalog");

assert.equal(products.length, 32, "The supplied catalogue must contain 32 unique products.");
assert.equal(new Set(products.map((product) => product.id)).size, products.length, "Product IDs must be unique.");
assert.equal(new Set(products.map((product) => product.slug)).size, products.length, "Product slugs must be unique.");
assert.ok(products.every((product) => product.rating === 0 && product.reviews === 0), "New products must not ship with fabricated ratings.");
assert.ok(products.every((product) => product.price > 0 && product.mrp >= product.price), "Every product needs a valid draft price and MRP.");

const hashes = new Set();
for (const product of products) {
  const file = path.join(__dirname, "..", product.image.replace(/^\//, ""));
  assert.ok(fs.existsSync(file), `Missing product image: ${product.image}`);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.ok(!hashes.has(hash), `Duplicate product bytes referenced by ${product.id}`);
  hashes.add(hash);
  assert.ok(Number(product.imageWidth) > 0 && Number(product.imageHeight) > 0, `${product.id} must preserve source dimensions.`);
  assert.ok(Object.values(product.inventory || {}).every((quantity) => Number.isInteger(quantity) && quantity >= 0), `${product.id} has invalid stock.`);
}
console.log(`Catalog OK: ${products.length} products and ${hashes.size} unique source images.`);
