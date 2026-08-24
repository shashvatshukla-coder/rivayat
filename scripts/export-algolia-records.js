const fs = require("node:fs");
const path = require("node:path");
const products = require("../catalog");

const baseUrl = process.env.BASE_URL || "https://www.rivayat.shop";

function absoluteUrl(value) {
  const source = String(value || "");
  if (/^https?:\/\//i.test(source)) return source;
  return `${baseUrl}${source.startsWith("/") ? "" : "/"}${source}`;
}

function totalStock(product) {
  return Object.values(product.inventory || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function searchKeywords(product) {
  return [
    product.name,
    product.category,
    product.color,
    product.badge,
    "RIVAYAT",
    "Indian streetwear",
    product.category === "Cricket Jerseys" ? "cricket jersey India fanwear" : "",
    product.category === "Football Jerseys" ? "football jersey fanwear" : "",
    product.category === "Women" ? "women fashion India" : ""
  ].filter(Boolean);
}

const records = products
  .filter((product) => product.active !== false)
  .map((product, position) => ({
    objectID: product.id,
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    color: product.color,
    badge: product.badge || "",
    description: product.description || "",
    price: Number(product.price || 0),
    mrp: Number(product.mrp || product.price || 0),
    discountPercent: Math.max(0, Math.round((1 - Number(product.price || 0) / Number(product.mrp || product.price || 1)) * 100)),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    sizes: product.sizes || [],
    inventory: product.inventory || {},
    inStock: totalStock(product) > 0,
    totalStock: totalStock(product),
    image: product.image,
    imageUrl: absoluteUrl(product.image),
    imageWidth: Number(product.imageWidth || 0),
    imageHeight: Number(product.imageHeight || 0),
    url: `${baseUrl}/product/${encodeURIComponent(product.slug)}`,
    searchableText: searchKeywords(product).join(" "),
    _tags: [
      "rivayat",
      "product",
      String(product.category || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      totalStock(product) > 0 ? "in-stock" : "out-of-stock"
    ],
    popularity: Math.max(1, products.length - position)
  }));

fs.writeFileSync(path.join(__dirname, "..", "algolia-records.json"), `${JSON.stringify(records)}\n`);
console.log(`Wrote ${records.length} Algolia records.`);
