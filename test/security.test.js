const test = require("node:test");
const assert = require("node:assert/strict");

process.env.APP_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.MONGO_URI = "mongodb://example.invalid/rivayat";

const { authContext, createToken, verifyToken, deliveryChargeByPincode, validateConfig } = require("../server");

test("unsigned client headers cannot grant admin access", () => {
  const req = { get: (name) => ({ authorization: "", "x-user-role": "admin", "x-user-email": "owner@example.com" }[name.toLowerCase()] || "") };
  assert.deepEqual(authContext(req), { role: "guest", email: "" });
});

test("signed token round-trips and tampering is rejected", () => {
  const token = createToken({ _id: "user-1", email: "user@example.com", role: "customer", name: "User" });
  assert.equal(verifyToken(token).email, "user@example.com");
  assert.equal(verifyToken(`${token}x`), null);
});

test("delivery pricing follows configured zones", () => {
  assert.equal(deliveryChargeByPincode("226001", 500), 50);
  assert.equal(deliveryChargeByPincode("110001", 500), 120);
  assert.equal(deliveryChargeByPincode("110001", 999), 0);
});

test("required configuration is accepted", () => assert.doesNotThrow(validateConfig));
