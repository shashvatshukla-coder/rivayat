const fs = require("fs");
const path = require("path");
const catalog = require("../catalog");

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function field(name, value) {
  return `<g:${name}>${xmlEscape(value)}</g:${name}>`;
}
function stock(product) {
  return Object.values(product.inventory || {}).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
}
function absoluteAsset(value, baseUrl) {
  const source = String(value || "").trim();
  if (!source) return "";
  try { return new URL(source, `${baseUrl}/`).href; } catch { return ""; }
}
function item(product, size, baseUrl) {
  const productUrl = `${baseUrl}/product/${encodeURIComponent(product.slug || product.id)}`;
  const image = absoluteAsset(product.image || product.gallery?.[0], baseUrl);
  const additionalImages = (Array.isArray(product.gallery) ? product.gallery : [])
    .map((value) => absoluteAsset(value, baseUrl))
    .filter((value) => value && value !== image)
    .slice(0, 3)
    .map((value) => field("additional_image_link", value))
    .join("");
  const description = product.description || `Shop ${product.name} from RIVAYAT.`;
  const variantId = size ? `${product.id}-${String(size).toLowerCase()}` : product.id;
  const variantTitle = size ? `${product.name} - Size ${size}` : product.name;
  const availableQuantity = size ? Number(product.inventory?.[size] || 0) : stock(product);
  return [
    "<item>",
    field("id", variantId),
    field("title", variantTitle),
    field("description", description),
    field("link", productUrl),
    field("image_link", image),
    additionalImages,
    field("availability", availableQuantity > 0 ? "in stock" : "out of stock"),
    field("price", `${Number(product.price || 0).toFixed(2)} INR`),
    field("condition", "new"),
    field("brand", "RIVAYAT"),
    field("google_product_category", "166"),
    field("product_type", product.category || "Clothing"),
    field("color", product.color || "Multicolour"),
    field("gender", "unisex"),
    field("age_group", "adult"),
    size ? field("item_group_id", product.id) : "",
    size ? field("size", size) : "",
    field("identifier_exists", "no"),
    field("adult", "no"),
    field("custom_label_0", "RIVAYAT"),
    "</item>"
  ].join("");
}

function buildMerchantFeed({ products = catalog, baseUrl = "https://www.rivayat.shop", merchantId = "10717371386" } = {}) {
  const cleanBaseUrl = String(baseUrl).replace(/\/+$/, "");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    "<title>RIVAYAT Fashion</title>",
    `<link>${xmlEscape(cleanBaseUrl)}/</link>`,
    `<description>Official RIVAYAT clothing catalogue for Google Merchant Center ${xmlEscape(merchantId)}</description>`,
    products.flatMap((product) => {
      const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [""];
      return sizes.map((size) => item(product, size, cleanBaseUrl));
    }).join(""),
    "</channel>",
    "</rss>",
    ""
  ].join("\n");
}

if (require.main === module) {
  const baseUrl = String(process.env.BASE_URL || "https://www.rivayat.shop").replace(/\/+$/, "");
  const merchantId = String(process.env.MERCHANT_CENTER_ID || "10717371386").trim();
  const output = path.join(__dirname, "..", "merchant-feed.xml");
  const xml = buildMerchantFeed({ products: catalog, baseUrl, merchantId });
  fs.writeFileSync(output, xml, "utf8");
  const itemCount = catalog.reduce((sum, product) => sum + (Array.isArray(product.sizes) && product.sizes.length ? product.sizes.length : 1), 0);
  console.log(`Wrote ${itemCount} Merchant Center product-size records for ${catalog.length} products to ${path.basename(output)}.`);
}

module.exports = { buildMerchantFeed };
