const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

assert.match(html, /id="resetFields"[\s\S]*name="code"[\s\S]*disabled[\s\S]*name="password"[\s\S]*disabled[\s\S]*name="confirmPassword"[\s\S]*disabled/, "Hidden reset controls must be disabled before the code request.");
assert.match(html, /resetFields\.querySelectorAll\('input'\)\.forEach\(input => \{ input\.disabled = false; input\.required = true; \}\)/, "Reset controls must only become required after the code request succeeds.");
assert.match(html, /AuthService\.forgotPassword\(email, fd\.get\('website'\)\)/, "Forgot-password requests must include the bot trap.");
assert.match(html, /minlength="8" maxlength="15"/, "Reset password inputs must expose the 8–15 character policy.");
assert.doesNotMatch(html, /id="resetFields"[^>]*>[\s\S]{0,700}<input[^>]*required[^>]*disabled/, "No hidden reset input may be both required and disabled in initial markup.");

console.log("Forgot-password UI contract is valid.");
