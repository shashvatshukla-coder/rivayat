const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://AdminRivayat:rivayatfashion@cluster0.wk2qecc.mongodb.net/rivayat?retryWrites=true&w=majority&appName=Cluster0";
const APP_SECRET = process.env.APP_SECRET || "change-this-rivayat-secret";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "RIVAYAT <orders@rivayat.in>";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8446716192";

const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const RETURN_STATUSES = ["Pending", "Approved", "Rejected", "Resolved"];
const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || "admin@rivayat",
  name: process.env.ADMIN_NAME || "Rivayat Owner",
  email: (process.env.ADMIN_EMAIL || "owner@rivayat.in").toLowerCase(),
  phone: process.env.ADMIN_PHONE || "8004109305",
  password: process.env.ADMIN_PASSWORD || "admin"
};
const DEFAULT_HOMEPAGE = {
  heroPill: "Premium Indian D2C Fashion - Launch Collection",
  heroTitle: "Own Your Vibe with RIVAYAT.",
  heroSubtitle: "A luxury-minimal menswear experience for clean fits, comfortable movement, and elevated daily style.",
  heroImage: "",
  heroOffer: "Half Pants from Rs 349 - Full Pant from Rs 359",
  primaryButtonText: "Shop Collection",
  secondaryButtonText: "Buy on WhatsApp"
};
const DEFAULT_COUPONS = [
  { id: "c1", code: "RIVAYAT150", type: "fixed", value: 150, minCart: 699, active: true, expiry: "2027-12-31", description: "Rs 150 off above Rs 699" },
  { id: "c2", code: "VIBE10", type: "percent", value: 10, minCart: 0, active: true, expiry: "2027-12-31", description: "10% off on all orders" },
  { id: "c3", code: "LAUNCH20", type: "percent", value: 20, minCart: 999, active: false, expiry: "2027-12-31", description: "20% launch discount above Rs 999" }
];

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use(express.static(__dirname));

mongoose.set("strictQuery", true);
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});
const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, default: "Half Pants" },
  color: { type: String, default: "Black" },
  badge: { type: String, default: "New Arrival" },
  mrp: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  sizes: { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
  inventory: { type: Object, default: () => ({ S: 10, M: 10, L: 10, XL: 10, XXL: 10 }) },
  rating: { type: Number, default: 4.7 },
  reviews: { type: Number, default: 0 },
  description: { type: String, default: "Official RIVAYAT product" },
  details: { type: [String], default: ["Official RIVAYAT product"] },
  image: { type: String, default: "" },
  gallery: { type: [String], default: [] },
  sizeChartImage: { type: String, default: "" },
  sizeChart: { type: Object, default: () => ({}) },
  bg: { type: String, default: "" },
  art: { type: String, default: "black" },
  type: { type: String, default: "short" },
  active: { type: Boolean, default: true },
  variants: { type: Array, default: [] },
  soldCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const CouponSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ["percent", "fixed"], default: "fixed" },
  value: { type: Number, required: true },
  minCart: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiry: { type: String, default: "2027-12-31" },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerName: String,
  phone: String,
  email: String,
  productName: String,
  size: String,
  quantity: Number,
  subtotal: Number,
  discount: Number,
  delivery: Number,
  price: Number,
  paymentMethod: { type: String, default: "COD" },
  paymentStatus: { type: String, default: "Pending" },
  status: { type: String, enum: ORDER_STATUSES, default: "Pending" },
  address: Object,
  items: Array,
  referralCode: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: String,
  name: String,
  rating: { type: Number, default: 5 },
  text: String,
  photo: { type: String, default: "" },
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ReturnRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, index: true },
  type: { type: String, enum: ["Return", "Exchange"], default: "Return" },
  reason: { type: String, default: "" },
  status: { type: String, enum: RETURN_STATUSES, default: "Pending" },
  customer: Object,
  items: Array,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const SiteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});
const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  source: { type: String, default: "Website" },
  createdAt: { type: Date, default: Date.now }
});
const ReferralSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  ownerEmail: { type: String, required: true, lowercase: true },
  uses: { type: Number, default: 0 },
  rewardValue: { type: Number, default: 50 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const PasswordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Product = mongoose.model("Product", ProductSchema);
const Coupon = mongoose.model("Coupon", CouponSchema);
const Order = mongoose.model("Order", OrderSchema);
const Review = mongoose.model("Review", ReviewSchema);
const ReturnRequest = mongoose.model("ReturnRequest", ReturnRequestSchema);
const SiteSetting = mongoose.model("SiteSetting", SiteSettingSchema);
const Newsletter = mongoose.model("Newsletter", NewsletterSchema);
const Referral = mongoose.model("Referral", ReferralSchema);
const PasswordReset = mongoose.model("PasswordReset", PasswordResetSchema);

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();
const slugify = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `product-${Date.now()}`;
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  addresses: user.addresses || []
});
function base64url(input) {
  return Buffer.from(input).toString("base64url");
}
function createToken(user) {
  const body = base64url(JSON.stringify({
    id: String(user._id),
    email: normalizeEmail(user.email),
    role: user.role || "customer",
    name: user.name || "",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  }));
  const sig = crypto.createHmac("sha256", APP_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken(token = "") {
  try {
    const [body, sig] = String(token).split(".");
    if (!body || !sig) return null;
    const expected = crypto.createHmac("sha256", APP_SECRET).update(body).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
function authContext(req) {
  const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return verifyToken(token) || {
    role: String(req.get("x-user-role") || "guest").toLowerCase(),
    email: normalizeEmail(req.get("x-user-email"))
  };
}
function requireAdmin(req, res) {
  if (authContext(req).role === "admin") return true;
  res.status(403).json({ success: false, message: "Admin access required. Please login as admin again." });
  return false;
}
function hashResetCode(email, code) {
  return crypto.createHmac("sha256", APP_SECRET).update(`${normalizeEmail(email)}:${String(code).trim()}`).digest("hex");
}
function sameHash(a = "", b = "") {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function deliveryChargeByPincode(pincode = "", subtotal = 0) {
  const pin = String(pincode || "").trim();
  const amount = Number(subtotal || 0);
  if (!pin || amount >= 999) return 0;
  if (pin.startsWith("226") || pin.startsWith("208")) return 50;
  if (/^(20|21|22|23|24|25|26|27|28)/.test(pin)) return 80;
  return 120;
}
function orderPlainText(order) {
  const items = (order.items || []).map((i) => `- ${i.name} ${i.size || ""} x${i.qty || i.quantity || 1} - Rs ${i.price || 0}`).join("\n");
  return `RIVAYAT ORDER\nOrder: ${order.id}\nCustomer: ${order.customerName || ""}\nPhone: ${order.phone || ""}\nEmail: ${order.email || ""}\nTotal: Rs ${order.price || 0}\nStatus: ${order.status || "Pending"}\nItems:\n${items}`;
}
async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { skipped: true, reason: "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID." };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: String(text).slice(0, 3900) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.description || `Telegram error ${response.status}`);
    return { success: true, result };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { skipped: true, reason: "Email is not configured. Add RESEND_API_KEY." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })
    });
    if (!response.ok) throw new Error(`Email error ${response.status}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
async function ensureDefaultData() {
  const existingAdmin = await User.findOne({ $or: [{ email: DEFAULT_ADMIN.email }, { username: DEFAULT_ADMIN.username }] });
  if (!existingAdmin) {
    await User.create({
      username: DEFAULT_ADMIN.username,
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      phone: DEFAULT_ADMIN.phone,
      password: await bcrypt.hash(DEFAULT_ADMIN.password, 10),
      role: "admin"
    });
  } else if (existingAdmin.role !== "admin") {
    existingAdmin.role = "admin";
    existingAdmin.username = existingAdmin.username || DEFAULT_ADMIN.username;
    await existingAdmin.save();
  }
  for (const coupon of DEFAULT_COUPONS) {
    await Coupon.findOneAndUpdate({ code: coupon.code }, { $setOnInsert: coupon }, { upsert: true });
  }
  await SiteSetting.findOneAndUpdate(
    { key: "homepage" },
    { $setOnInsert: { key: "homepage", value: DEFAULT_HOMEPAGE } },
    { upsert: true }
  );
}
mongoose.connection.once("open", () => ensureDefaultData().catch((err) => console.log("Seed skipped:", err.message)));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/api", (req, res) => res.json({ success: true, message: "Rivayat backend running" }));
app.get("/health", (req, res) => res.json({ success: true }));

app.post("/telegram/test", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await sendTelegramMessage(`RIVAYAT Telegram test successful\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\nChat ID: ${TELEGRAM_CHAT_ID}`);
  if (result.skipped) return res.status(400).json({ success: false, message: result.reason });
  if (!result.success) return res.status(500).json({ success: false, message: result.message });
  res.json({ success: true, message: "Telegram test message sent.", result });
});
app.get("/telegram/test", async (req, res) => {
  const result = await sendTelegramMessage("RIVAYAT Telegram browser test successful.");
  if (result.skipped) return res.status(400).send(result.reason);
  if (!result.success) return res.status(500).send(result.message);
  res.send("Telegram test message sent.");
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    const cleanEmail = normalizeEmail(email);
    if (await User.findOne({ email: cleanEmail })) return res.status(400).json({ success: false, message: "Email already registered. Please login." });
    const user = await User.create({ name, email: cleanEmail, phone: phone || "", password: await bcrypt.hash(password, 10), role: "customer" });
    res.json({ success: true, message: "Account created successfully!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const password = String(req.body.password || "");
    if (!identifier || !password) return res.status(400).json({ success: false, message: "Email/username and password are required." });
    const user = await User.findOne({ $or: [{ email: normalizeEmail(identifier) }, { username: identifier }] });
    if (!user) return res.status(401).json({ success: false, message: "No account found with this email/username." });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    res.json({ success: true, message: "Login successful!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.identifier);
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If this email is registered, a reset code has been sent." });

    const code = String(crypto.randomInt(100000, 1000000));
    await PasswordReset.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });
    await PasswordReset.create({ email, codeHash: hashResetCode(email, code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });

    const [emailResult, telegramResult] = await Promise.all([
      sendEmail({
        to: user.email,
        subject: "RIVAYAT password reset code",
        html: `<div style="font-family:Arial,sans-serif;color:#111"><h1>RIVAYAT</h1><p>Hi ${user.name || "Customer"}, your password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 15 minutes.</p></div>`
      }),
      sendTelegramMessage(["RIVAYAT password reset request", `Customer: ${user.name || "Customer"}`, `Email: ${email}`, `Phone: ${user.phone || "-"}`, `Code: ${code}`, "Expires in 15 minutes"].join("\n"))
    ]);
    const delivered = emailResult.success || telegramResult.success;
    if (!delivered) {
      const showCode = process.env.NODE_ENV !== "production";
      return res.status(showCode ? 200 : 503).json({
        success: showCode,
        message: showCode
          ? `Reset code generated for local testing: ${code}`
          : "Password reset is ready, but no delivery channel is configured. Add RESEND_API_KEY for email or TELEGRAM_BOT_TOKEN for Telegram.",
        resetCode: showCode ? code : undefined,
        email: emailResult,
        telegram: telegramResult
      });
    }
    res.json({ success: true, message: "If this email is registered, a reset code has been sent.", email: emailResult, telegram: telegramResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const password = String(req.body.password || "");
    if (!email || !code || !password) return res.status(400).json({ success: false, message: "Email, reset code, and new password are required." });
    if (password.length < 4) return res.status(400).json({ success: false, message: "Password must be at least 4 characters." });
    const reset = await PasswordReset.findOne({ email, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!reset || !sameHash(reset.codeHash, hashResetCode(email, code))) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    reset.usedAt = new Date();
    await reset.save();
    sendTelegramMessage(`RIVAYAT password reset completed\nCustomer: ${user.name || "Customer"}\nEmail: ${email}`).catch(() => {});
    res.json({ success: true, message: "Password updated. You can login now." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/settings/homepage", async (req, res) => {
  const setting = await SiteSetting.findOne({ key: "homepage" });
  res.json({ success: true, settings: { ...DEFAULT_HOMEPAGE, ...(setting?.value || {}) } });
});
app.put("/settings/homepage", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const value = { ...DEFAULT_HOMEPAGE, ...(req.body || {}) };
  const setting = await SiteSetting.findOneAndUpdate({ key: "homepage" }, { key: "homepage", value, updatedAt: new Date() }, { upsert: true, new: true });
  res.json({ success: true, settings: setting.value });
});

app.get("/products", async (req, res) => res.json({ success: true, products: await Product.find({ active: { $ne: false } }).sort({ createdAt: -1 }) }));
app.get("/products/:slugOrId", async (req, res) => {
  const value = req.params.slugOrId;
  const product = await Product.findOne({ $or: [{ id: value }, { slug: value }] });
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
});
app.post("/products", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const body = req.body || {};
  const product = await Product.findOneAndUpdate(
    { id: body.id || `product-${Date.now()}` },
    { ...body, id: body.id || `product-${Date.now()}`, slug: body.slug || slugify(body.name), updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, product });
});
app.delete("/products/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  await Product.findOneAndDelete({ id: req.params.id });
  res.json({ success: true, message: "Product deleted successfully" });
});

app.get("/coupons", async (req, res) => res.json({ success: true, coupons: await Coupon.find().sort({ createdAt: -1 }) }));
app.post("/coupons/validate", async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);
  const coupon = await Coupon.findOne({ code, active: true });
  if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found or inactive" });
  if (coupon.expiry && coupon.expiry < new Date().toISOString().slice(0, 10)) return res.status(400).json({ success: false, message: "Coupon expired" });
  if (subtotal < Number(coupon.minCart || 0)) return res.status(400).json({ success: false, message: `Minimum cart is Rs ${coupon.minCart}` });
  const discount = coupon.type === "percent" ? subtotal * Number(coupon.value || 0) / 100 : Number(coupon.value || 0);
  res.json({ success: true, coupon, discount: Math.min(discount, subtotal) });
});
app.post("/coupons", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const body = req.body || {};
  const coupon = await Coupon.findOneAndUpdate(
    { id: body.id || `coupon-${Date.now()}` },
    { ...body, id: body.id || `coupon-${Date.now()}`, code: String(body.code || "").toUpperCase(), updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, coupon });
});
app.delete("/coupons/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  await Coupon.findOneAndDelete({ id: req.params.id });
  res.json({ success: true, message: "Coupon deleted successfully" });
});

app.post("/orders", async (req, res) => {
  try {
    const body = req.body || {};
    const orderId = body.orderId || body.id;
    if (!orderId) return res.status(400).json({ success: false, message: "Order ID is required." });
    const existing = await Order.findOne({ id: orderId });
    if (existing) return res.json({ success: true, message: "Order already saved.", order: existing });
    const delivery = Number(body.delivery ?? deliveryChargeByPincode(body.address?.pincode, body.subtotal));
    const price = Number(body.price ?? (Number(body.subtotal || 0) - Number(body.discount || 0) + delivery));
    const order = await Order.create({
      id: orderId,
      customerName: body.customerName,
      phone: body.phone,
      email: normalizeEmail(body.email),
      productName: body.productName,
      size: body.size,
      quantity: body.quantity,
      subtotal: body.subtotal,
      discount: body.discount,
      delivery,
      price,
      paymentMethod: body.paymentMethod,
      paymentStatus: body.paymentStatus,
      status: "Pending",
      address: body.address,
      items: body.items,
      referralCode: String(body.referralCode || "").trim().toUpperCase()
    });
    if (order.referralCode) await Referral.findOneAndUpdate({ code: order.referralCode }, { $inc: { uses: 1 }, updatedAt: new Date() });
    sendTelegramMessage(`New RIVAYAT order\n${orderPlainText(order)}`).catch(() => {});
    if (order.email) {
      sendEmail({ to: order.email, subject: `RIVAYAT order confirmed: ${order.id}`, html: `<pre>${orderPlainText(order)}</pre>` }).catch(() => {});
    }
    res.json({ success: true, message: "Order saved successfully!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get("/orders", async (req, res) => {
  const auth = authContext(req);
  const query = auth.role === "admin" ? {} : { email: normalizeEmail(auth.email) };
  if (auth.role !== "admin" && !query.email) return res.json({ success: true, orders: [] });
  res.json({ success: true, orders: await Order.find(query).sort({ createdAt: -1 }) });
});
app.patch("/orders/:id/status", async (req, res) => {
  const status = req.body.status;
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid order status" });
  const order = await Order.findOne({ id: req.params.id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  const auth = authContext(req);
  if (auth.role !== "admin") {
    if (!auth.email || normalizeEmail(order.email) !== normalizeEmail(auth.email)) return res.status(403).json({ success: false, message: "You can only manage your own order." });
    if (status !== "Cancelled") return res.status(403).json({ success: false, message: "Customers can only cancel their own order." });
    if (order.status === "Delivered") return res.status(400).json({ success: false, message: "Delivered orders cannot be cancelled." });
  }
  order.status = status;
  order.updatedAt = new Date();
  await order.save();
  sendTelegramMessage(`RIVAYAT order status updated\nOrder: ${order.id}\nStatus: ${order.status}\nCustomer: ${order.customerName || ""}`).catch(() => {});
  res.json({ success: true, message: "Order status updated successfully", order });
});

app.get("/returns", async (req, res) => {
  const auth = authContext(req);
  const query = auth.role === "admin" ? {} : { "customer.email": normalizeEmail(auth.email) };
  if (auth.role !== "admin" && !query["customer.email"]) return res.json({ success: true, requests: [] });
  res.json({ success: true, requests: await ReturnRequest.find(query).sort({ createdAt: -1 }) });
});
app.post("/returns", async (req, res) => {
  const body = req.body || {};
  const request = await ReturnRequest.findOneAndUpdate(
    { id: body.id || `ret-${Date.now()}` },
    { ...body, id: body.id || `ret-${Date.now()}`, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  sendTelegramMessage(`RIVAYAT return/exchange request\nOrder: ${request.orderId}\nType: ${request.type}\nReason: ${request.reason || "-"}`).catch(() => {});
  res.json({ success: true, request });
});
app.patch("/returns/:id/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!RETURN_STATUSES.includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid return status" });
  const request = await ReturnRequest.findOneAndUpdate({ id: req.params.id }, { status: req.body.status, updatedAt: new Date() }, { new: true });
  if (!request) return res.status(404).json({ success: false, message: "Request not found" });
  res.json({ success: true, request });
});

app.get("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(publicUser) });
});
app.get("/reviews", async (req, res) => res.json({ success: true, reviews: await Review.find().sort({ createdAt: -1 }) }));
app.post("/reviews", async (req, res) => {
  const body = req.body || {};
  const review = await Review.findOneAndUpdate(
    { id: body.id || `review-${Date.now()}` },
    { ...body, id: body.id || `review-${Date.now()}`, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, review });
});
app.patch("/reviews/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const review = await Review.findOneAndUpdate({ id: req.params.id }, { ...req.body, updatedAt: new Date() }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  res.json({ success: true, review });
});
app.delete("/reviews/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  await Review.findOneAndDelete({ id: req.params.id });
  res.json({ success: true, message: "Review deleted successfully" });
});

app.post("/newsletter", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });
  const lead = await Newsletter.findOneAndUpdate(
    { email },
    { email, phone: req.body.phone || "", source: req.body.source || "Website" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  sendTelegramMessage(`New RIVAYAT newsletter lead\nEmail: ${email}\nPhone: ${lead.phone || "-"}`).catch(() => {});
  res.json({ success: true, message: "Subscribed successfully", lead });
});
app.get("/newsletter", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ success: true, leads: await Newsletter.find().sort({ createdAt: -1 }) });
});
app.post("/referrals/me", async (req, res) => {
  const auth = authContext(req);
  if (!auth.email) return res.status(401).json({ success: false, message: "Login required" });
  const code = `RIV${String(auth.email).split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}50`;
  const referral = await Referral.findOneAndUpdate(
    { code },
    { code, ownerEmail: auth.email, rewardValue: 50, active: true, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, referral });
});
app.get("/referrals", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ success: true, referrals: await Referral.find().sort({ createdAt: -1 }) });
});
app.post("/referrals/validate", async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);
  const referral = await Referral.findOne({ code, active: true });
  if (!referral) return res.status(404).json({ success: false, message: "Referral code not found" });
  const discount = Math.min(Number(referral.rewardValue || 50), subtotal);
  res.json({ success: true, referral, discount });
});
app.get("/admin/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [orders, products, customers, returnRequests] = await Promise.all([Order.find(), Product.find(), User.find({ role: "customer" }), ReturnRequest.find()]);
  res.json({
    success: true,
    stats: {
      revenue: orders.reduce((sum, order) => sum + Number(order.price || 0), 0),
      orders: orders.length,
      pending: orders.filter((o) => o.status === "Pending").length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      cancelled: orders.filter((o) => o.status === "Cancelled").length,
      products: products.length,
      lowStock: products.filter((p) => Object.values(p.inventory || {}).reduce((sum, qty) => sum + Number(qty || 0), 0) <= 5).length,
      customers: customers.length,
      returnRequests: returnRequests.length,
      pendingReturns: returnRequests.filter((r) => r.status === "Pending").length
    }
  });
});
app.post("/delivery/quote", (req, res) => res.json({ success: true, charge: deliveryChargeByPincode(req.body.pincode, req.body.subtotal), freeAbove: 999 }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
