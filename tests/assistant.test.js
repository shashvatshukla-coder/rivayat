const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "storefront.css"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

assert.match(server, /app\.post\("\/assistant\/chat"/);
assert.match(server, /ASSISTANT_MAX_MESSAGE_LENGTH/);
assert.match(server, /RIVAYAT Assistant/);
assert.match(server, /assistantFallback/);
assert.match(html, /assistantModal/);
assert.match(html, /AssistantService/);
assert.match(html, /openAssistant\(\)/);
assert.match(css, /\.assistant-panel/);
assert.match(css, /\[data-theme="dark"\] \.assistant-panel/);
assert.match(worker, /"\/assistant\/chat"/);

console.log("AI assistant contracts are valid.");
