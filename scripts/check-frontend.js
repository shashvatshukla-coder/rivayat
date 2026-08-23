"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const catalogue = require(path.join(root, "catalogue.js"));

const inlineScripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/application\/ld\+json/i.test(match[1]) && !/\bsrc\s*=/i.test(match[1]))
  .map((match) => match[2])
  .filter((source) => source.trim());

assert.ok(inlineScripts.length, "index.html must include application JavaScript");
inlineScripts.forEach((source, index) => {
  new vm.Script(source, { filename: `index-inline-${index}.js` });
});

const forbiddenPatterns = [
  [/mongodb\+srv:\/\/[^\s"']+:[^\s"']+@/i, "embedded MongoDB credentials"],
  [/Puppylampojasdad/i, "embedded administrator password"],
  [/x-user-role/i, "client-controlled role header"],
  [/x-user-email/i, "client-controlled email header"],
  [/express\.static\(__dirname\)/i, "public backend source directory"],
  [/https:\/\/https:\/\//i, "duplicated URL protocol"]
];

for (const [pattern, label] of forbiddenPatterns) {
  assert.doesNotMatch(`${html}\n${server}`, pattern, `Repository contains ${label}`);
}

const requiredFrontendMarkers = [
  "Send 4-digit OTP",
  "Continue with Google",
  "Profile photo",
  "schedulePincodeLookup",
  "Cricket Jerseys",
  "Football Jerseys",
  "Review Photo",
  "routeHashFromLocation",
  "returns-policy",
  "data-theme",
  "existingToken = auth.user?.token",
  "updateRouteSEO",
  "server-side payment verification",
  "AbortController",
  "BACKGROUND_READ_TIMEOUT_MS",
  "DEFAULT_API_BASE_URL",
  "/assets/",
  "scheduleStorefrontRefresh",
  "startup-shell",
  "renderSequence",
  "INITIAL_COUPONS",
  "registerRivayatServiceWorker",
  "renderErrorState",
  "Bug Desk",
  "Algolia Search",
  "Credit & Loyalty",
  "invoice.pdf",
  "Team Profiles",
  "Brand & Legal",
  "Manufacturer & Product Information",
  "legalManufacturer"
];

for (const marker of requiredFrontendMarkers) {
  assert.ok(html.includes(marker), `Missing frontend capability marker: ${marker}`);
}

const requiredBackendRoutes = [
  "/signup/request-otp",
  "/signup/verify",
  "/auth/google",
  "/profile",
  "/pincode/:pincode",
  "/reviews",
  "/orders",
  "/returns",
  "/admin/stats",
  "/team",
  "/bugs",
  "/settings/legal",
  "/admin/search/reindex",
  "/orders/:id/invoice.pdf"
];

for (const route of requiredBackendRoutes) {
  assert.ok(server.includes(route), `Missing backend route: ${route}`);
}

const requiredFiles = ["service-worker.js", "offline.html", "site.webmanifest", "favicon.svg", "catalogue.js"];
for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing production asset: ${file}`);

assert.equal(catalogue.length, 32, "Final catalogue must contain exactly the 32 supplied products");
assert.equal(new Set(catalogue.map((product) => product.id)).size, catalogue.length, "Product IDs must be unique");
assert.equal(new Set(catalogue.map((product) => product.slug)).size, catalogue.length, "Product slugs must be unique");
for (const product of catalogue) {
  assert.equal(Number(product.rating || 0), 0, `${product.id} must not ship with a fabricated rating`);
  assert.equal(Number(product.reviews || 0), 0, `${product.id} must not ship with fabricated reviews`);
  assert.ok(["Men", "Women", "Unisex"].includes(product.audience), `${product.id} must have a valid audience`);
  assert.ok(product.image.startsWith("/assets/products/final/") && product.image.endsWith(".png"), `${product.id} must use a supplied lossless PNG`);
  assert.ok(product.legal && typeof product.legal === "object", `${product.id} must expose a product-disclosure record`);
  assert.ok(fs.existsSync(path.join(root, product.image.slice(1))), `Missing product image: ${product.image}`);
  assert.ok(sitemap.includes(`https://rivayat.shop/product/${product.slug}`), `Sitemap is missing ${product.slug}`);
}
const sitemapProductUrls = [...sitemap.matchAll(/<loc>https:\/\/rivayat\.shop\/product\/([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(new Set(sitemapProductUrls), new Set(catalogue.map((product) => product.slug)), "Sitemap must contain only current products");

console.log(`Frontend syntax, ${requiredFrontendMarkers.length + requiredBackendRoutes.length} capability checks, 32 products and production assets passed.`);
