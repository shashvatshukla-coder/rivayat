const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const registerLaunchRoutes = require("../launch-routes");

function modelStub() {
  return {
    find() {},
    findOne() {},
    findOneAndUpdate() {},
    create() {},
    updateOne() {},
    deleteOne() {},
    exists() {}
  };
}

test("registers every storefront backend contract", () => {
  const registered = [];
  const app = {};
  for (const method of ["get", "post", "patch"]) {
    app[method] = (path, handler) => registered.push([method.toUpperCase(), path, typeof handler]);
  }
  registerLaunchRoutes({
    app,
    Product: modelStub(),
    Order: modelStub(),
    Review: modelStub(),
    User: modelStub(),
    authContext: () => ({ role: "guest", email: "" }),
    requireAdmin: () => false,
    publicUser: (user) => user,
    createToken: () => "token",
    normalizeEmail: (email) => String(email || "").toLowerCase().trim(),
    deliveryChargeByPincode: () => 0,
    orderPlainText: () => "",
    orderStatusEmail: () => "",
    sendEmail: async () => ({ success: true }),
    sendTelegramMessage: async () => ({ success: true }),
    ORDER_STATUSES: ["Pending", "Confirmed", "Delivered"]
  });
  assert.deepEqual(
    registered.map(([method, path]) => [method, path]),
    registerLaunchRoutes.expectedRoutes
  );
  assert.ok(registered.every((entry) => entry[2] === "function"));
});

test("accepts only the correct Razorpay HMAC signature", () => {
  const secret = "unit-test-secret";
  const orderId = "order_123";
  const paymentId = "pay_456";
  const signature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(registerLaunchRoutes.verifyRazorpaySignature(secret, orderId, paymentId, signature), true);
  assert.equal(registerLaunchRoutes.verifyRazorpaySignature(secret, orderId, paymentId, `${signature.slice(0, -1)}0`), false);
  assert.equal(registerLaunchRoutes.verifyRazorpaySignature("", orderId, paymentId, signature), false);
});
