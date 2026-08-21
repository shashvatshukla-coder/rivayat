"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, before, test } = require("node:test");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/rivayat-test";
process.env.APP_SECRET = "test-only-rivayat-secret-that-is-longer-than-thirty-two-characters";
process.env.ALLOWED_ORIGINS = "https://rivayat.shop,http://localhost:3000";
delete process.env.GOOGLE_CLIENT_ID;

const { app, helpers, models, validateConfiguration } = require("../server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

function jsonOptions(method, body, token) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  };
}

function tokenFor(overrides = {}) {
  return helpers.createToken({
    _id: overrides.id || "test-user-id",
    email: overrides.email || "customer@example.com",
    name: overrides.name || "Test Customer",
    role: overrides.role || "customer"
  });
}

test("configuration and core helpers are deterministic", () => {
  assert.doesNotThrow(() => validateConfiguration());
  assert.equal(helpers.normalizeEmail("  SHOPPER@Example.COM "), "shopper@example.com");
  assert.equal(helpers.slugify(" India Blue Cricket Jersey "), "india-blue-cricket-jersey");
  assert.equal(helpers.deliveryChargeByPincode("226001", 500), 50);
  assert.equal(helpers.deliveryChargeByPincode("110001", 500), 120);
  assert.equal(helpers.deliveryChargeByPincode("110001", 999), 0);
  assert.match(helpers.randomFourDigitCode(), /^\d{4}$/);
  assert.equal(helpers.validImageDataUrl("https://example.com/not-an-upload.png"), null);
  assert.ok(helpers.validImageDataUrl("data:image/png;base64,aGVsbG8="));
  assert.equal(helpers.safeImageSource("javascript:alert(1)"), null);
  assert.equal(helpers.safeImageSource("https://cdn.example.com/product.webp"), "https://cdn.example.com/product.webp");
  assert.equal(helpers.safeCssBackground("red;position:fixed"), "");
});

test("session tokens verify and reject tampering", () => {
  const token = tokenFor();
  const payload = helpers.verifyToken(token);
  assert.equal(payload.email, "customer@example.com");
  assert.equal(payload.role, "customer");
  assert.equal(helpers.verifyToken(`${token}tampered`), null);
  assert.equal(helpers.verifyToken("not-a-token"), null);
});

test("health routes and security headers work", async () => {
  const api = await request("/api");
  assert.equal(api.status, 200);
  assert.equal(api.headers.get("x-content-type-options"), "nosniff");
  assert.equal(api.headers.get("x-frame-options"), "DENY");
  assert.match(api.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.deepEqual(await api.json(), { success: true, message: "Rivayat backend running" });
  assert.equal((await request("/health")).status, 200);
});

test("storefront files are served without exposing backend source", async () => {
  const homepage = await request("/");
  assert.equal(homepage.status, 200);
  const html = await homepage.text();
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /Send 4-digit OTP/);
  assert.match(html, /Profile photo/);
  assert.equal((await request("/shop")).status, 200);
  assert.equal((await request("/product/rivayat-half-pant-black")).status, 200);
  assert.equal((await request("/server.js")).status, 404);
  assert.equal((await request("/package.json")).status, 404);
  const robots = await request("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /sitemap\.xml/);
  const sitemap = await request("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /product\/rivayat-half-pant-black/);
  assert.doesNotMatch(sitemapXml, /electric-branch-hoodie/);

  const assetName = fs.readdirSync(path.resolve(__dirname, "../assets")).find((name) => name.endsWith(".webp"));
  assert.ok(assetName, "at least one optimized storefront image must exist");
  const asset = await request(`/assets/${assetName}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("cache-control"), /immutable/);
});

test("CORS accepts configured origins and rejects others", async () => {
  const allowed = await request("/health", { headers: { Origin: "https://rivayat.shop" } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://rivayat.shop");

  const blocked = await request("/health", { headers: { Origin: "https://attacker.example" } });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).success, false);
});

test("client role headers cannot impersonate an administrator", async () => {
  const headers = { "x-user-role": "admin", "x-user-email": "owner@rivayat.in" };
  for (const [path, method] of [
    ["/products", "POST"],
    ["/coupons", "POST"],
    ["/users", "GET"],
    ["/newsletter", "GET"],
    ["/admin/stats", "GET"],
    ["/telegram/test", "GET"]
  ]) {
    const response = await request(path, {
      method,
      headers: { ...headers, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: "{}" } : {})
    });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
});

test("account endpoints enforce 4-digit OTP and strong-password contracts", async () => {
  assert.equal((await request("/signup", jsonOptions("POST", {}))).status, 400);
  assert.equal((await request("/signup/verify", jsonOptions("POST", { email: "a@example.com", code: "123456" }))).status, 400);
  assert.equal((await request("/login", jsonOptions("POST", {}))).status, 400);
  assert.equal((await request("/forgot-password", jsonOptions("POST", {}))).status, 400);
  assert.equal((await request("/reset-password", jsonOptions("POST", { email: "a@example.com", code: "123456", password: "password" }))).status, 400);
  assert.equal((await request("/auth/google")).status, 404);
  assert.equal((await request("/auth/google", jsonOptions("POST", {}))).status, 503);
  const config = await request("/auth/google/config");
  assert.deepEqual(await config.json(), { success: true, clientId: null });
});

test("email OTP verification creates an account only after the 4-digit code", async () => {
  const originals = {
    userFindOne: models.User.findOne,
    userCreate: models.User.create,
    signupFindOne: models.SignupVerification.findOne,
    signupFindOneAndUpdate: models.SignupVerification.findOneAndUpdate,
    signupDeleteOne: models.SignupVerification.deleteOne
  };
  let pendingData;
  models.User.findOne = async () => null;
  models.SignupVerification.findOne = async () => null;
  models.SignupVerification.findOneAndUpdate = async (query, update) => {
    pendingData = update;
    return update;
  };
  models.SignupVerification.deleteOne = async () => ({ deletedCount: 1 });
  models.User.create = async (data) => ({ _id: "verified-user", ...data, addresses: [] });
  try {
    const requested = await request("/signup/request-otp", jsonOptions("POST", {
      name: "Verified Customer",
      email: "verified@example.com",
      phone: "9876543210",
      password: "strong-password"
    }));
    assert.equal(requested.status, 200);
    const requestBody = await requested.json();
    assert.match(requestBody.devOtp, /^\d{4}$/);
    assert.ok(pendingData.passwordHash);
    assert.notEqual(pendingData.passwordHash, "strong-password");

    const pending = { ...pendingData, attempts: 0, save: async () => pending };
    models.SignupVerification.findOne = async () => pending;
    const verified = await request("/signup/verify", jsonOptions("POST", {
      email: "verified@example.com",
      code: requestBody.devOtp
    }));
    assert.equal(verified.status, 201);
    const verifiedBody = await verified.json();
    assert.equal(verifiedBody.user.emailVerified, true);
    assert.match(verifiedBody.user.token, /^[^.]+\.[^.]+$/);
  } finally {
    models.User.findOne = originals.userFindOne;
    models.User.create = originals.userCreate;
    models.SignupVerification.findOne = originals.signupFindOne;
    models.SignupVerification.findOneAndUpdate = originals.signupFindOneAndUpdate;
    models.SignupVerification.deleteOne = originals.signupDeleteOne;
  }
});

test("profile route is registered independently and requires a signed token", async () => {
  const response = await request("/profile", jsonOptions("PUT", { name: "Test" }));
  assert.equal(response.status, 401);
});

test("protected mutation validation runs for real signed roles", async () => {
  const adminToken = tokenFor({ role: "admin", email: "admin@example.com" });
  const customerToken = tokenFor();

  assert.equal((await request("/products", jsonOptions("POST", { name: "No price" }, adminToken))).status, 400);
  assert.equal((await request("/coupons", jsonOptions("POST", { code: "BAD", type: "percent", value: 101 }, adminToken))).status, 400);
  assert.equal((await request("/settings/homepage", jsonOptions("PUT", { heroImage: "data:text/html;base64,PHNjcmlwdD4=" }, adminToken))).status, 400);
  assert.equal((await request("/reviews/example", jsonOptions("PATCH", { status: "Published" }, adminToken))).status, 400);
  assert.equal((await request("/orders/example/status", jsonOptions("PATCH", { status: "Unknown" }, customerToken))).status, 400);
  assert.equal((await request("/returns/example/status", jsonOptions("PATCH", { status: "Unknown" }, adminToken))).status, 400);
});

test("public input validation rejects malformed commerce requests", async () => {
  assert.equal((await request("/orders", jsonOptions("POST", {}))).status, 400);
  assert.equal((await request("/returns", jsonOptions("POST", {}))).status, 401);
  assert.equal((await request("/reviews", jsonOptions("POST", {}))).status, 401);
  assert.equal((await request("/newsletter", jsonOptions("POST", { email: "not-an-email" }))).status, 400);
  assert.equal((await request("/coupons/validate", jsonOptions("POST", { code: "VIBE10", subtotal: -1 }))).status, 400);
  assert.equal((await request("/referrals/validate", jsonOptions("POST", { subtotal: -1 }))).status, 400);
  assert.equal((await request("/delivery/quote", jsonOptions("POST", { pincode: "123", subtotal: 100 }))).status, 400);
  assert.equal((await request("/pincode/123")).status, 400);
});

test("order totals and inventory reservations are calculated on the server", async () => {
  const originals = {
    productFindOne: models.Product.findOne,
    productUpdateOne: models.Product.updateOne,
    orderFindOne: models.Order.findOne,
    orderCreate: models.Order.create
  };
  const updates = [];
  models.Order.findOne = async () => null;
  models.Product.findOne = async () => ({
    id: "jersey-1",
    slug: "india-cricket-jersey",
    name: "India Cricket Jersey",
    price: 500,
    sizes: ["M"],
    inventory: { M: 5 }
  });
  models.Product.updateOne = async (query, update) => {
    updates.push({ query, update });
    return { modifiedCount: 1 };
  };
  models.Order.create = async (data) => ({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  try {
    const response = await request("/orders", jsonOptions("POST", {
      orderId: "order-test-001",
      customerName: "Test Customer",
      phone: "9876543210",
      email: "customer@example.com",
      address: { line1: "1 Test Road", city: "Lucknow", state: "Uttar Pradesh", pincode: "226001" },
      items: [{ productId: "jersey-1", size: "M", qty: 2, price: 1 }],
      subtotal: 2,
      delivery: 0,
      price: 2,
      paymentMethod: "Online Payment",
      paymentStatus: "Paid"
    }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.order.subtotal, 1000);
    assert.equal(body.order.delivery, 0);
    assert.equal(body.order.price, 1000);
    assert.equal(body.order.paymentMethod, "COD");
    assert.equal(body.order.paymentStatus, "Pending");
    assert.deepEqual(updates[0].query["inventory.M"], { $gte: 2 });
    assert.equal(updates[0].update.$inc["inventory.M"], -2);
  } finally {
    models.Product.findOne = originals.productFindOne;
    models.Product.updateOne = originals.productUpdateOne;
    models.Order.findOne = originals.orderFindOne;
    models.Order.create = originals.orderCreate;
  }
});

test("cancelling an owned order restocks inventory once", async () => {
  const originals = { orderFindOne: models.Order.findOne, productUpdateOne: models.Product.updateOne };
  const order = {
    id: "order-cancel-1",
    email: "customer@example.com",
    status: "Pending",
    inventoryRestocked: false,
    items: [{ productId: "jersey-1", size: "M", qty: 2 }],
    save: async () => order
  };
  let inventoryUpdate;
  let restockCalls = 0;
  models.Order.findOne = async () => order;
  models.Product.updateOne = async (query, update) => {
    restockCalls += 1;
    inventoryUpdate = { query, update };
    return { modifiedCount: 1 };
  };
  try {
    const response = await request("/orders/order-cancel-1/status", jsonOptions("PATCH", { status: "Cancelled" }, tokenFor()));
    assert.equal(response.status, 200);
    assert.equal(order.status, "Cancelled");
    assert.equal(order.inventoryRestocked, true);
    assert.equal(inventoryUpdate.update.$inc["inventory.M"], 2);
    assert.equal(inventoryUpdate.update.$inc.soldCount, -2);
    const repeated = await request("/orders/order-cancel-1/status", jsonOptions("PATCH", { status: "Cancelled" }, tokenFor()));
    assert.equal(repeated.status, 200);
    assert.equal(restockCalls, 1);
  } finally {
    models.Order.findOne = originals.orderFindOne;
    models.Product.updateOne = originals.productUpdateOne;
  }
});

test("public review listing requests approved reviews only", async () => {
  const originalFind = models.Review.find;
  let receivedQuery;
  models.Review.find = (query) => {
    receivedQuery = query;
    return { sort: () => ({ limit: async () => [{
      id: "review-1",
      productId: "india-blue-cricket-jersey",
      name: "Customer",
      rating: 5,
      text: "Excellent jersey",
      status: "Approved",
      userId: "private-id",
      userEmail: "private@example.com",
      toObject() { return { ...this, toObject: undefined }; }
    }] }) };
  };
  try {
    const response = await request("/reviews?productId=india-blue-cricket-jersey");
    assert.equal(response.status, 200);
    assert.deepEqual(receivedQuery, { status: "Approved", productId: "india-blue-cricket-jersey" });
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.reviews.length, 1);
    assert.equal(body.reviews[0].userId, undefined);
    assert.equal(body.reviews[0].userEmail, undefined);
  } finally {
    models.Review.find = originalFind;
  }
});

test("catalogue and unauthenticated private lists return safe shapes", async () => {
  const originalProductFind = models.Product.find;
  models.Product.find = () => ({ sort: async () => [] });
  try {
    const products = await request("/products");
    assert.equal(products.status, 200);
    assert.deepEqual(await products.json(), { success: true, products: [] });
  } finally {
    models.Product.find = originalProductFind;
  }

  assert.deepEqual(await (await request("/orders")).json(), { success: true, orders: [] });
  assert.deepEqual(await (await request("/returns")).json(), { success: true, requests: [] });
});
