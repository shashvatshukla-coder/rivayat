const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { helpers } = require("../server");

assert.equal(helpers.isValidCustomerPassword("abc1!x"), true);
assert.equal(helpers.isValidCustomerPassword("12345!"), true);
assert.equal(helpers.isValidCustomerPassword("abcde!"), false, "A number is required.");
assert.equal(helpers.isValidCustomerPassword("abc123"), false, "A symbol is required.");
assert.equal(helpers.isValidCustomerPassword("ab1!"), false, "The password cannot be shorter than six characters.");
assert.equal(helpers.isValidCustomerPassword("abcd1!x"), false, "The password cannot be longer than six characters.");
assert.equal(helpers.isValidCustomerPassword("ab 1!x"), false, "Spaces are not valid password characters.");

const storefront = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(storefront, /password-strength-signup/);
assert.match(storefront, /password-strength-reset/);
assert.match(storefront, /minlength="6" maxlength="6"/);
assert.doesNotMatch(storefront, /name="password"[^>]*minlength="8"/);

console.log("Password policy OK: exact six-character customer passwords require a number and symbol.");
