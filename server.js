const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const registerLaunchRoutes = require("./launch-routes");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const APP_SECRET = process.env.APP_SECRET || crypto.randomBytes(32).toString("hex");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "RIVAYAT <orders@rivayat.in>";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const RETURN_STATUSES = ["Pending", "Approved", "Rejected", "Resolved"];
const DEFAULT_ADMIN = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD ? {
  username: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL,
  name: process.env.ADMIN_NAME || "Rivayat Owner",
  email: process.env.ADMIN_EMAIL.toLowerCase(),
  phone: process.env.ADMIN_PHONE || "",
  password: process.env.ADMIN_PASSWORD
} : null;
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
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB error:", err.message));
} else {
  console.error("MONGO_URI is required for database-backed features.");
}
if (!process.env.APP_SECRET) {
  console.warn("APP_SECRET is not set; login sessions will reset when the server restarts.");
}

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  password: { type: String, default: "" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: Array, default: [] },
  emailVerified: { type: Boolean, default: true },
  authProvider: { type: String, enum: ["password", "google", "hybrid"], default: "password" },
  googleSub: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: "" },
  lastLoginAt: { type: Date, default: null },
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
  razorpayOrderId: { type: String, default: "", index: true },
  razorpayPaymentId: { type: String, default: "" },
  paymentSignature: { type: String, default: "" },
  statusHistory: { type: Array, default: [] },
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
  title: { type: String, default: "" },
  reviewerName: { type: String, default: "" },
  reviewerEmail: { type: String, default: "", lowercase: true, index: true },
  verifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
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
const EmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  codeHash: { type: String, required: true },
  kind: { type: String, default: "login" },
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
const EmailVerification = mongoose.model("EmailVerification", EmailVerificationSchema);

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();
const slugify = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `product-${Date.now()}`;
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  addresses: user.addresses || [],
  emailVerified: user.emailVerified !== false,
  authProvider: user.authProvider || "password",
  avatar: user.avatar || ""
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

function requestEmail(req) {
  return normalizeEmail(authContext(req).email || req.body?.email || req.get("x-user-email"));
}
function isBcryptHash(value = "") {
  return /^\$2[aby]\$\d{2}\$/.test(String(value));
}
async function safePasswordCompare(plain = "", stored = "") {
  if (!stored) return false;
  if (String(plain) === String(stored)) return true;
  try {
    return await bcrypt.compare(String(plain), String(stored));
  } catch {
    return false;
  }
}
function hashOtpCode(email, code, kind = "login") {
  return crypto.createHmac("sha256", APP_SECRET).update(`${kind}:${normalizeEmail(email)}:${String(code).trim()}`).digest("hex");
}
async function issueFourDigitOtp(email, kind = "login", { throttle = true } = {}) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }
  if (throttle) {
    const recent = await EmailVerification.findOne({
      email: cleanEmail,
      usedAt: null,
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) }
    }).sort({ createdAt: -1 });
    if (recent) {
      const error = new Error("Please wait 30 seconds before requesting another code.");
      error.statusCode = 429;
      throw error;
    }
  }
  const code = String(crypto.randomInt(1000, 10000));
  await EmailVerification.updateMany({ email: cleanEmail, usedAt: null }, { $set: { usedAt: new Date() } });
  await EmailVerification.create({
    email: cleanEmail,
    codeHash: hashOtpCode(cleanEmail, code, kind),
    kind,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  const emailResult = await sendEmail({
    to: cleanEmail,
    subject: kind === "verify" ? "Verify your RIVAYAT email" : "Your RIVAYAT sign-in code",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h1 style="letter-spacing:5px">RIVAYAT</h1><p>Use this 4-digit code to continue:</p><div style="font-size:42px;font-weight:900;letter-spacing:14px;margin:28px 0">${code}</div><p>This code expires in 10 minutes.</p></div>`
  });
  return {
    delivered: Boolean(emailResult.success),
    email: emailResult,
    code: process.env.NODE_ENV !== "production" && !emailResult.success ? code : undefined
  };
}
async function consumeFourDigitOtp(email, code, kind = "login") {
  const cleanEmail = normalizeEmail(email);
  const row = await EmailVerification.findOne({
    email: cleanEmail,
    kind,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
  if (!row || !sameHash(row.codeHash, hashOtpCode(cleanEmail, code, kind))) return null;
  row.usedAt = new Date();
  await row.save();
  return row;
}
function orderStatusEmail(order) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111;background:#fff;padding:28px"><div style="letter-spacing:5px;font-weight:900;font-size:22px">RIVAYAT</div><p>Order update</p><h1>Your order is ${String(order.status || "Pending")}.</h1><p>Order <strong>${String(order.id || "")}</strong></p><pre style="white-space:pre-wrap;background:#f6f4ef;padding:14px;border-radius:12px">${orderPlainText(order)}</pre></div>`;
}
async function lookupIndiaPostPincode(pincode = "") {
  const pin = String(pincode || "").replace(/\D/g, "").slice(0, 6);
  if (!/^\d{6}$/.test(pin)) {
    const error = new Error("Enter a valid 6-digit Indian PIN code.");
    error.statusCode = 400;
    throw error;
  }
  const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
    headers: { Accept: "application/json", "User-Agent": "RIVAYAT/1.0" }
  });
  if (!response.ok) {
    const error = new Error(`India Post PIN lookup failed (${response.status}).`);
    error.statusCode = 502;
    throw error;
  }
  const data = await response.json();
  const result = Array.isArray(data) ? data[0] : data;
  const offices = Array.isArray(result?.PostOffice) ? result.PostOffice : [];
  if (!offices.length || String(result?.Status || "").toLowerCase() !== "success") {
    const error = new Error("No India Post location found for this PIN code.");
    error.statusCode = 404;
    throw error;
  }
  const deliveryOffice = offices.find((office) => /delivery/i.test(String(office.DeliveryStatus || ""))) || offices[0];
  return {
    pincode: pin,
    city: deliveryOffice.District || deliveryOffice.Region || deliveryOffice.Division || "",
    district: deliveryOffice.District || "",
    state: deliveryOffice.State || "",
    country: deliveryOffice.Country || "India",
    postOffice: deliveryOffice.Name || "",
    deliveryStatus: deliveryOffice.DeliveryStatus || "",
    offices: offices.slice(0, 12).map((office) => ({
      name: office.Name || "",
      branchType: office.BranchType || "",
      deliveryStatus: office.DeliveryStatus || "",
      district: office.District || "",
      state: office.State || "",
      pincode: office.Pincode || pin
    }))
  };
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
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Email error ${response.status}${detail ? `: ${detail.slice(0, 220)}` : ""}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
async function ensureDefaultData() {
  if (DEFAULT_ADMIN) {
    const existingAdmin = await User.findOne({ $or: [{ email: DEFAULT_ADMIN.email }, { username: DEFAULT_ADMIN.username }] });
    if (!existingAdmin) {
      await User.create({
        username: DEFAULT_ADMIN.username,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        phone: DEFAULT_ADMIN.phone,
        password: await bcrypt.hash(DEFAULT_ADMIN.password, 10),
        role: "admin",
        emailVerified: true,
        authProvider: "password"
      });
    } else {
      let changed = false;
      if (existingAdmin.role !== "admin") { existingAdmin.role = "admin"; changed = true; }
      if (!existingAdmin.username) { existingAdmin.username = DEFAULT_ADMIN.username; changed = true; }
      if (existingAdmin.emailVerified === false) { existingAdmin.emailVerified = true; changed = true; }
      if (!(await safePasswordCompare(DEFAULT_ADMIN.password, existingAdmin.password))) {
        existingAdmin.password = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
        changed = true;
      }
      if (changed) await existingAdmin.save();
    }
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
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/public-config", (req, res) => {
  const config = {
    googleClientId: GOOGLE_CLIENT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    razorpayKeyId: RAZORPAY_KEY_ID
  };
  res.json({ success: true, config, ...config });
});
app.get("/launch/diagnostics", (req, res) => res.json({
  success: true,
  backend: "connected",
  database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
  emailConfigured: Boolean(RESEND_API_KEY && EMAIL_FROM),
  razorpayConfigured: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
  apiVersion: "2026.08.18-commerce-repair"
}));
const RIVAYAT_TEAM = [
  { name: "Shashvat Shukla", role: "Founder", email: "houseofrivayat@gmail.com" },
  { name: "Swastik Shukla", role: "Manager" },
  { name: "Navneet Tiwari", role: "Operations Head" },
  { name: "Shantanu Shukla", role: "Business Team" }
];
app.get("/launch/about", (req, res) => res.json({
  success: true,
  brand: "RIVAYAT",
  story: "RIVAYAT is an independent Indian streetwear label focused on expressive products, useful details and dependable service.",
  people: RIVAYAT_TEAM,
  team: RIVAYAT_TEAM
}));

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
    const user = await User.create({ name, email: cleanEmail, phone: phone || "", password: await bcrypt.hash(password, 10), role: "customer", emailVerified: true, authProvider: "password" });
    res.json({ success: true, message: "Account created successfully!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post("/signup-v2", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email and password are required." });
    if (String(password).length < 4) return res.status(400).json({ success: false, message: "Password must be at least 4 characters." });
    const cleanEmail = normalizeEmail(email);
    let user = await User.findOne({ email: cleanEmail });
    if (user?.emailVerified !== false) return res.status(409).json({ success: false, message: "Email already registered. Please sign in." });
    if (!user) user = new User({ name: String(name).trim(), email: cleanEmail, phone: String(phone || "").trim(), role: "customer" });
    user.name = String(name).trim();
    user.phone = String(phone || "").trim();
    user.password = await bcrypt.hash(String(password), 10);
    user.emailVerified = false;
    user.authProvider = user.googleSub ? "hybrid" : "password";
    await user.save();
    const otp = await issueFourDigitOtp(cleanEmail, "verify", { throttle: false });
    if (!otp.delivered && process.env.NODE_ENV === "production") return res.status(503).json({ success: false, message: otp.email?.message || "Email delivery failed. Check RESEND_API_KEY and EMAIL_FROM." });
    res.json({ success: true, email: cleanEmail, requiresVerification: true, message: "We sent a 4-digit code to your email.", verificationCode: otp.code });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/verify-email-4", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!(await consumeFourDigitOtp(email, code, "verify"))) return res.status(400).json({ success: false, message: "Invalid or expired code." });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Account not found." });
    user.emailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ success: true, message: "Email verified.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/resend-verification-4", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If this account exists, a code has been sent." });
    if (user.emailVerified !== false) return res.json({ success: true, verified: true, message: "This email is already verified." });
    const otp = await issueFourDigitOtp(email, "verify", { throttle: true });
    if (!otp.delivered && process.env.NODE_ENV === "production") return res.status(503).json({ success: false, message: otp.email?.message || "Email delivery failed." });
    res.json({ success: true, message: "A new 4-digit code was sent.", verificationCode: otp.code });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const password = String(req.body.password || "");
    if (!identifier || !password) return res.status(400).json({ success: false, message: "Email/username and password are required." });
    const user = await User.findOne({ $or: [{ email: normalizeEmail(identifier) }, { username: identifier }] });
    if (!user) return res.status(401).json({ success: false, message: "No account found with this email/username." });
    if (!(await safePasswordCompare(password, user.password))) return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    if (!isBcryptHash(user.password)) user.password = await bcrypt.hash(password, 10);
    user.emailVerified = user.emailVerified !== false;
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ success: true, message: "Login successful!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.post("/login-v2", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const password = String(req.body.password || "");
    const user = await User.findOne({ $or: [{ email: normalizeEmail(identifier) }, { username: identifier }] });
    if (!user || !(await safePasswordCompare(password, user.password))) return res.status(401).json({ success: false, message: "Incorrect email/username or password." });
    if (user.emailVerified === false) {
      await issueFourDigitOtp(user.email, "verify", { throttle: true }).catch(() => null);
      return res.status(403).json({ success: false, requiresVerification: true, email: user.email, message: "Verify your email to continue." });
    }
    if (!isBcryptHash(user.password)) user.password = await bcrypt.hash(password, 10);
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ success: true, message: "Login successful.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/auth/email-otp/request", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });
    const otp = await issueFourDigitOtp(email, "login", { throttle: true });
    if (!otp.delivered && process.env.NODE_ENV === "production") return res.status(503).json({ success: false, message: otp.email?.message || "OTP email could not be sent." });
    res.json({ success: true, email, message: "A 4-digit RIVAYAT sign-in code has been sent.", verificationCode: otp.code });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/auth/email-otp/verify", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!(await consumeFourDigitOtp(email, code, "login"))) return res.status(400).json({ success: false, message: "Invalid or expired code." });
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: email.split("@")[0],
        email,
        phone: "",
        password: await bcrypt.hash(crypto.randomBytes(18).toString("hex"), 10),
        role: "customer",
        emailVerified: true,
        authProvider: "password",
        lastLoginAt: new Date()
      });
    } else {
      user.emailVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
    }
    res.json({ success: true, message: "Login successful.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.put("/profile", async (req, res) => {
  try {
    const email = requestEmail(req);
    if (!email) return res.status(401).json({ success: false, message: "Please login first." });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const { name, phone, addresses, avatar } = req.body || {};
    if (typeof name === "string") user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (Array.isArray(addresses)) user.addresses = addresses;
    if (typeof avatar === "string" && avatar.length < 2200000) user.avatar = avatar;
    await user.save();
    res.json({ success: true, message: "Profile updated successfully.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Server error." });
  }
});
app.put("/launch/profile", async (req, res) => {
  try {
    const email = requestEmail(req);
    if (!email) return res.status(401).json({ success: false, message: "Please login first." });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const { name, phone, addresses, avatar } = req.body || {};
    if (typeof name === "string") user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (Array.isArray(addresses)) user.addresses = addresses;
    if (typeof avatar === "string" && avatar.length < 2200000) user.avatar = avatar;
    await user.save();
    res.json({ success: true, message: "Profile updated successfully.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Server error." });
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
app.get("/launch/legal-settings", async (req, res) => {
  const setting = await SiteSetting.findOne({ key: "legal" });
  res.json({ success: true, settings: setting?.value || {
    operator: "RIVAYAT",
    privacyEmail: "houseofrivayat@gmail.com",
    grievanceEmail: "houseofrivayat@gmail.com",
    returnDays: 7
  } });
});
app.put("/launch/legal-settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const value = {
    operator: String(req.body.operator || "RIVAYAT").slice(0, 160),
    businessAddress: String(req.body.businessAddress || "").slice(0, 500),
    privacyEmail: String(req.body.privacyEmail || req.body.email || "houseofrivayat@gmail.com").slice(0, 160),
    supportPhone: String(req.body.supportPhone || "").slice(0, 40),
    grievanceOfficer: String(req.body.grievanceOfficer || "").slice(0, 160),
    grievanceEmail: String(req.body.grievanceEmail || req.body.privacyEmail || "houseofrivayat@gmail.com").slice(0, 160),
    gstin: String(req.body.gstin || "").slice(0, 40),
    returnDays: Math.max(1, Math.min(30, Number(req.body.returnDays || 7)))
  };
  const setting = await SiteSetting.findOneAndUpdate({ key: "legal" }, { key: "legal", value, updatedAt: new Date() }, { upsert: true, new: true });
  res.json({ success: true, settings: setting.value });
});

app.get("/products", async (req, res) => res.json({ success: true, products: await Product.find({ active: { $ne: false } }).sort({ createdAt: -1 }) }));
app.get("/products/:slugOrId", async (req, res) => {
  const value = req.params.slugOrId;
  const product = await Product.findOne({ $or: [{ id: value }, { slug: value }] });
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
});
async function saveProductFromBody(body = {}) {
  const id = body.id || slugify(body.name);
  return Product.findOneAndUpdate(
    { id },
    { ...body, id, slug: body.slug || slugify(body.name), updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
app.post("/products", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const product = await saveProductFromBody(req.body || {});
  res.json({ success: true, product });
});
app.post("/launch/products", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const product = await saveProductFromBody(req.body || {});
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

registerLaunchRoutes({
  app,
  Product,
  Order,
  Review,
  User,
  authContext,
  requireAdmin,
  publicUser,
  createToken,
  normalizeEmail,
  deliveryChargeByPincode,
  orderPlainText,
  orderStatusEmail,
  sendEmail,
  sendTelegramMessage,
  ORDER_STATUSES,
  GOOGLE_CLIENT_ID,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET
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
    if (order.email) sendEmail({ to: order.email, subject: `RIVAYAT order confirmed: ${order.id}`, html: `<pre>${orderPlainText(order)}</pre>` }).catch(() => {});
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
  if (order.email) sendEmail({ to: order.email, subject: `RIVAYAT order ${order.id}: ${order.status}`, html: orderStatusEmail(order) }).catch(() => {});
  res.json({ success: true, message: "Order status updated successfully", order });
});
app.patch("/launch/orders/:id/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = req.body.status;
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid order status" });
  const order = await Order.findOne({ id: req.params.id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  order.status = status;
  order.updatedAt = new Date();
  await order.save();
  if (order.email) sendEmail({ to: order.email, subject: `RIVAYAT order ${order.id}: ${order.status}`, html: orderStatusEmail(order) }).catch(() => {});
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
  if (request.customer?.email) sendEmail({ to: request.customer.email, subject: `RIVAYAT ${request.type || "return"} update: ${request.status}`, html: `<div style="font-family:Arial,sans-serif"><h1>RIVAYAT</h1><p>Your request for order ${request.orderId} is ${request.status}.</p></div>` }).catch(() => {});
  res.json({ success: true, request });
});
app.patch("/launch/returns/:id/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!RETURN_STATUSES.includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid return status" });
  const request = await ReturnRequest.findOneAndUpdate({ id: req.params.id }, { status: req.body.status, updatedAt: new Date() }, { new: true });
  if (!request) return res.status(404).json({ success: false, message: "Request not found" });
  if (request.customer?.email) sendEmail({ to: request.customer.email, subject: `RIVAYAT ${request.type || "return"} update: ${request.status}`, html: `<div style="font-family:Arial,sans-serif"><h1>RIVAYAT</h1><p>Your request for order ${request.orderId} is ${request.status}.</p></div>` }).catch(() => {});
  res.json({ success: true, request });
});

app.get("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(publicUser) });
});
app.get("/reviews", async (req, res) => {
  const query = authContext(req).role === "admin" ? {} : { status: "Approved" };
  res.json({ success: true, reviews: await Review.find(query).sort({ createdAt: -1 }) });
});
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
app.delete("/launch/account", async (req, res) => {
  try {
    const auth = authContext(req);
    if (!auth.email) return res.status(401).json({ success: false, message: "Please login first." });
    if (String(req.body?.confirmation || "") !== "DELETE") return res.status(400).json({ success: false, message: "Type DELETE to confirm account deletion." });
    const user = await User.findOne({ email: normalizeEmail(auth.email) });
    if (!user) return res.json({ success: true });
    if (user.role === "admin") return res.status(403).json({ success: false, message: "Admin accounts cannot be deleted from the storefront." });
    await Promise.all([User.deleteOne({ _id: user._id }), EmailVerification.deleteMany({ email: user.email }), PasswordReset.deleteMany({ email: user.email })]);
    res.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get("/api/pincode/:pincode", async (req, res) => {
  try {
    const location = await lookupIndiaPostPincode(req.params.pincode);
    res.json({ success: true, location });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});
app.post("/delivery/quote", async (req, res) => {
  const charge = deliveryChargeByPincode(req.body.pincode, req.body.subtotal);
  let location = null;
  try { location = await lookupIndiaPostPincode(req.body.pincode); } catch {}
  res.json({ success: true, charge, freeAbove: 999, location });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});