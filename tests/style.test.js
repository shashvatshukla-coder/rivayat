const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const merchantScript = fs.readFileSync(path.join(root, "scripts", "export-merchant-feed.js"), "utf8");

assert.match(server, /app\.post\("\/style\/recommendation"/);
assert.match(server, /GEMINI_API_KEY/);
assert.match(server, /STYLE_RECOMMENDATION_MAX_IMAGES/);
assert.match(server, /STYLE_RECOMMENDATION_MAX_BYTES/);
assert.doesNotMatch(server, /generateGeminiNotification|\/notifications\/daily/);
assert.doesNotMatch(html, /maybeDailyNotification|\/notifications\/daily/);
assert.match(html, /StyleService/);
assert.match(html, /styleImagesInput/);
assert.match(html, /Your images are sent only for this request/);
assert.match(worker, /"\/style"/);
assert.match(worker, /"\/style\/recommendation"/);
assert.match(html, /assets\/react\/rivayat-interactive\.js/);
assert.match(server, /MERCHANT_CENTER_ID/);
assert.match(server, /buildMerchantFeed/);
assert.match(merchantScript, /item_group_id/);
assert.match(merchantScript, /google_product_category/);
assert.equal(packageJson.scripts["build:react"], "node scripts/build-react.js");
assert.equal(packageJson.scripts["export:merchant"], "node scripts/export-merchant-feed.js");

console.log("Style Lab and AI-removal contracts are valid.");
