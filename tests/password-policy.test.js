const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { helpers } = require("../server");

assert.equal(helpers.isValidCustomerPassword("abcdef1!"), true);
assert.equal(helpers.isValidCustomerPassword("1234567!"), true);
assert.equal(helpers.isValidCustomerPassword("abcdefgh!"), false, "A number is required.");
assert.equal(helpers.isValidCustomerPassword("abcdefgh1"), false, "A symbol is required.");
assert.equal(helpers.isValidCustomerPassword("abcde1!"), false, "The password cannot be shorter than eight characters.");
assert.equal(helpers.isValidCustomerPassword("abcdefghijklm1!"), true, "Fifteen characters are allowed.");
assert.equal(helpers.isValidCustomerPassword("abcdefghijklmn1!"), false, "The password cannot be longer than fifteen characters.");
assert.equal(helpers.isValidCustomerPassword("abc def1!"), false, "Spaces are not valid password characters.");

const storefront = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(storefront, /password-strength-signup/);
assert.match(storefront, /password-strength-reset/);
assert.match(storefront, /minlength="8" maxlength="15"/);
assert.doesNotMatch(storefront, /name="password"[^>]*minlength="6"/);
assert.doesNotMatch(storefront, /Password must be exactly 6 characters/i);

const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
assert.match(server, /version: "customer-password-v2"/);
assert.match(server, /minLength: 8/);
assert.match(server, /maxLength: 15/);
assert.doesNotMatch(server, /Password must be exactly 6 characters/i);

assert.match(storefront, /\[data-theme="light"\] \.auth-shell \.card/);
assert.match(storefront, /--auth-text: #111111/);
assert.match(storefront, /--auth-muted: #5b564e/);
assert.match(storefront, /--auth-danger: #9b1c1c/);

function cssVariables(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = storefront.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] || "";
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]));
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

for (const [theme, variables] of [["light", cssVariables(":root")], ["dark", cssVariables('[data-theme="dark"]')]]) {
  for (const token of ["auth-text", "auth-muted", "auth-link", "auth-danger", "auth-success"]) {
    assert.ok(contrastRatio(variables[token], variables["auth-surface"]) >= 4.5, `${theme} ${token} must meet WCAG AA contrast.`);
  }
}

console.log("Password policy OK: customer passwords are 8–15 characters and require a number and symbol.");
