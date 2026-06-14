try { require("dotenv").config(); } catch (_) {}

const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`❌ ${name} is missing. Add it in Render → Environment.`);
    process.exit(1);
  }
  return String(value).trim();
}

function optionalEnv(name, fallback = "") {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

const PORT = Number(optionalEnv("PORT", "3000"));
const MONGO_URI = requiredEnv("MONGO_URI");
const APP_SECRET = requiredEnv("APP_SECRET");
const RESEND_API_KEY = optionalEnv("RESEND_API_KEY");
const EMAIL_FROM = optionalEnv("EMAIL_FROM");
const TELEGRAM_BOT_TOKEN = optionalEnv("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = optionalEnv("TELEGRAM_CHAT_ID");
const RAZORPAY_KEY_ID = optionalEnv("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = optionalEnv("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = optionalEnv("RAZORPAY_WEBHOOK_SECRET");

const DEFAULT_ADMIN = {
  username: optionalEnv("ADMIN_USERNAME"),
  name: optionalEnv("ADMIN_NAME", "Rivayat Owner"),
  email: optionalEnv("ADMIN_EMAIL").toLowerCase(),
  phone: optionalEnv("ADMIN_PHONE"),
  password: optionalEnv("ADMIN_PASSWORD")
};

const DEFAULT_COUPONS = [
  { id: "c1", code: "RIVAYAT150", type: "fixed", value: 150, minCart: 699, active: true, expiry: "2027-12-31", description: "₹150 off above ₹699" },
  { id: "c2", code: "VIBE10", type: "percent", value: 10, minCart: 0, active: true, expiry: "2027-12-31", description: "10% off on all orders" },
  { id: "c3", code: "LAUNCH20", type: "percent", value: 20, minCart: 999, active: false, expiry: "2027-12-31", description: "20% launch discount above ₹999" }
];

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

const RETURN_STATUSES = ["Pending", "Approved", "Rejected", "Resolved"];

const DEFAULT_HOMEPAGE = {
  heroPill: "Premium Indian D2C Fashion • Launch Collection",
  heroTitle: "Own Your Vibe with RIVAYAT.",
  heroSubtitle: "A luxury-minimal menswear experience for clean fits, comfortable movement, and elevated daily style.",
  heroImage: "",
  heroOffer: "Half Pants from ₹349 • Full Pant from ₹359",
  primaryButtonText: "Shop Collection",
  secondaryButtonText: "Buy on WhatsApp"
};

const allowedOrigins = optionalEnv("ALLOWED_ORIGINS", "")
  .split(",")
  .map(origin => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = String(origin).trim().replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(express.json({
  limit: "5mb",
  verify: (req, res, buf) => {
    // Keep the exact raw JSON bytes for Razorpay webhook signature verification.
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));


mongoose.set("strictQuery", true);

async function connectDB() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI is missing. Add it in .env or Render Environment Variables.");
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    setTimeout(connectDB, 5000);
  }
}

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. The driver will keep trying to reconnect.");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

connectDB();

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  username:  { type: String, unique: true, sparse: true },
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: "" },
  password:  { type: String, required: true },
  role:      { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: Array,  default: [] },
  createdAt: { type: Date,   default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  slug:        { type: String, required: true, index: true },
  name:        { type: String, required: true },
  category:    { type: String, default: "Half Pants" },
  color:       { type: String, default: "Black" },
  badge:       { type: String, default: "New Arrival" },
  mrp:         { type: Number, required: true },
  price:       { type: Number, required: true },
  sizes:       { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
  inventory:   { type: Object, default: () => ({ S: 10, M: 10, L: 10, XL: 10, XXL: 10 }) },
  rating:      { type: Number, default: 4.7 },
  reviews:     { type: Number, default: 0 },
  description: { type: String, default: "Official RIVAYAT product" },
  details:     { type: [String], default: ["Official RIVAYAT product"] },
  image:       { type: String, default: "" },
  gallery:     { type: [String], default: [] },
  sizeChartImage: { type: String, default: "" },
  sizeChart:   { type: Object, default: () => ({
    S: "Waist 28-30 • Length 17",
    M: "Waist 30-32 • Length 18",
    L: "Waist 32-34 • Length 19",
    XL: "Waist 34-36 • Length 20",
    XXL: "Waist 36-38 • Length 21"
  }) },
  bg:          { type: String, default: "linear-gradient(135deg,#090909,#2d2923 55%,#d9c5a4)" },
  art:         { type: String, default: "black" },
  type:        { type: String, default: "short" },
  active:      { type: Boolean, default: true },
  variants:    { type: Array, default: [] },
  soldCount:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const CouponSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  code:        { type: String, required: true, unique: true, uppercase: true },
  type:        { type: String, enum: ["percent", "fixed"], default: "fixed" },
  value:       { type: Number, required: true },
  minCart:     { type: Number, default: 0 },
  active:      { type: Boolean, default: true },
  expiry:      { type: String, default: "2027-12-31" },
  description: { type: String, default: "Admin-created coupon" },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true },
  customerName:  String,
  phone:         String,
  email:         String,
  productName:   String,
  size:          String,
  quantity:      Number,
  subtotal:      Number,
  discount:      Number,
  delivery:      Number,
  price:         Number,
  paymentMethod: { type: String, default: "COD" },
  paymentStatus: { type: String, default: "Pending" },
  razorpayOrderId: { type: String, default: "", index: true },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },
  razorpayWebhookEvent: { type: String, default: "" },
  paidAt:        Date,
  status:        { type: String, enum: ORDER_STATUSES, default: "Pending" },
  address:       Object,
  items:         Array,
  createdAt:     { type: Date, default: Date.now },
  referralCode:  { type: String, default: "" },
  updatedAt:     { type: Date, default: Date.now }
});

const ReviewSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  productId: String,
  name:      String,
  rating:    { type: Number, default: 5 },
  text:      String,
  photo:     { type: String, default: "" },
  status:    { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ReturnRequestSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  orderId:   { type: String, required: true, index: true },
  type:      { type: String, enum: ["Return", "Exchange"], default: "Return" },
  reason:    { type: String, default: "" },
  status:    { type: String, enum: RETURN_STATUSES, default: "Pending" },
  customer:  Object,
  items:     Array,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SiteSettingSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

const NewsletterSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: "" },
  source:    { type: String, default: "Website" },
  createdAt: { type: Date, default: Date.now }
});

const ReferralSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true },
  ownerEmail:  { type: String, required: true, lowercase: true },
  uses:        { type: Number, default: 0 },
  rewardValue: { type: Number, default: 50 },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const slugify = (value = "") => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || `product-${Date.now()}`;

const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  addresses: user.addresses || []
});

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function createToken(user) {
  const payload = {
    id: String(user._id),
    email: normalizeEmail(user.email),
    role: user.role || "customer",
    name: user.name || "",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  };
  const body = base64url(JSON.stringify(payload));
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
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function authContext(req) {
  const bearer = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const tokenUser = verifyToken(bearer);
  return tokenUser || { role: "guest", email: "" };
}

const requestRole = (req) => String(authContext(req).role || "guest").toLowerCase().trim();
const requestEmail = (req) => normalizeEmail(authContext(req).email);
const isAdminRequest = (req) => requestRole(req) === "admin";

const requireAdmin = (req, res) => {
  if (isAdminRequest(req)) return true;
  res.status(403).json({ success: false, message: "Admin access required. Please login as admin again." });
  return false;
};

const normalizeProduct = (body = {}) => {
  const inventory = body.inventory || {};
  const sizes = Array.isArray(body.sizes) && body.sizes.length ? body.sizes : ["S", "M", "L", "XL", "XXL"];
  const safeInventory = sizes.reduce((acc, size) => {
    acc[size] = Math.max(0, Number(inventory[size] ?? 0));
    return acc;
  }, {});

  return {
    id: body.id || `product-${Date.now()}`,
    slug: body.slug || slugify(body.name),
    name: body.name,
    category: body.category || "Half Pants",
    color: body.color || "Black",
    badge: body.badge || "New Arrival",
    mrp: Number(body.mrp || 0),
    price: Number(body.price || 0),
    sizes,
    inventory: safeInventory,
    rating: Number(body.rating || 4.7),
    reviews: Number(body.reviews || 0),
    description: body.description || "Official RIVAYAT product",
    details: Array.isArray(body.details) ? body.details : ["Official RIVAYAT product"],
    image: body.image || "",
    gallery: Array.isArray(body.gallery) ? body.gallery.filter(Boolean) : [],
    sizeChartImage: body.sizeChartImage || "",
    sizeChart: body.sizeChart || {
      S: "Waist 28-30 • Length 17",
      M: "Waist 30-32 • Length 18",
      L: "Waist 32-34 • Length 19",
      XL: "Waist 34-36 • Length 20",
      XXL: "Waist 36-38 • Length 21"
    },
    bg: body.bg || "linear-gradient(135deg,#090909,#2d2923 55%,#d9c5a4)",
    art: body.art || "black",
    type: body.type || "short",
    active: body.active !== false,
    variants: Array.isArray(body.variants) ? body.variants : [],
    soldCount: Number(body.soldCount || 0),
    updatedAt: new Date()
  };
};

function orderPlainText(order) {
  const items = (order.items || []).map(i => `• ${i.name} ${i.size || ""} x${i.qty || i.quantity || 1} - ₹${i.price || 0}`).join("\n");
  return `RIVAYAT ORDER\nOrder: ${order.id}\nCustomer: ${order.customerName || ""}\nPhone: ${order.phone || ""}\nEmail: ${order.email || ""}\nTotal: ₹${order.price || 0}\nStatus: ${order.status || "Pending"}\nItems:\n${items}`;
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { skipped: true, reason: "Telegram env vars not set" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Plain text is safer than HTML parse_mode because product/customer text can contain symbols.
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: String(text).slice(0, 3900) })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.ok === false) {
      throw new Error(result.description || `Telegram error ${response.status}`);
    }

    return { success: true, result };
  } catch (error) {
    console.log("⚠️ Telegram notification failed:", error.message);
    return { success: false, message: error.message };
  }
}

async function sendOrderEmail(order) {
  if (!RESEND_API_KEY || !EMAIL_FROM || !order.email) return { skipped: true, reason: "Email env vars not set" };
  const subject = `RIVAYAT order confirmed: ${order.id}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:680px;margin:auto"><h1>RIVAYAT</h1><h2>Order confirmed</h2><p>Hi ${order.customerName || "Customer"}, your order <strong>${order.id}</strong> has been received.</p><p><strong>Total:</strong> ₹${order.price || 0}<br><strong>Status:</strong> ${order.status || "Pending"}<br><strong>Payment:</strong> ${order.paymentMethod || "COD"}</p><pre style="background:#f7f2e9;padding:14px;border-radius:12px;white-space:pre-wrap">${orderPlainText(order)}</pre><p>Thank you for shopping with RIVAYAT. Own Your Vibe.</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to: [order.email], subject, html })
    });
    if (!response.ok) throw new Error(`Email error ${response.status}`);
    return { success: true };
  } catch (error) {
    console.log("⚠️ Order email failed:", error.message);
    return { success: false, message: error.message };
  }
}


function razorpayConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function razorpayAuthHeader() {
  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

function safeTimingEqual(a = "", b = "") {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hmacSha256Hex(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function razorpayRequest(path, method = "GET", body) {
  if (!razorpayConfigured()) {
    const err = new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render Environment.");
    err.status = 500;
    throw err;
  }

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: razorpayAuthHeader()
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.description || data?.message || `Razorpay API error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

function deliveryChargeByPincode(pincode = "", subtotal = 0) {
  const pin = String(pincode || "").trim();
  const amount = Number(subtotal || 0);
  if (!pin || amount <= 0) return 0;
  if (amount >= 999) return 0;
  if (pin.startsWith("226") || pin.startsWith("208")) return 50;
  if (/^(20|21|22|23|24|25|26|27|28)/.test(pin)) return 80;
  return 120;
}

async function ensureDefaultData() {
  try {
    const adminSeedReady = Boolean(DEFAULT_ADMIN.username && DEFAULT_ADMIN.email && DEFAULT_ADMIN.password);

    if (adminSeedReady) {
      const existingAdmin = await User.findOne({
        $or: [{ email: DEFAULT_ADMIN.email }, { username: DEFAULT_ADMIN.username }]
      });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
        await User.create({
          username: DEFAULT_ADMIN.username,
          name: DEFAULT_ADMIN.name,
          email: DEFAULT_ADMIN.email,
          phone: DEFAULT_ADMIN.phone,
          password: hashedPassword,
          role: "admin"
        });
        console.log("✅ Default admin account created from Render env vars");
      } else if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        existingAdmin.username = existingAdmin.username || DEFAULT_ADMIN.username;
        await existingAdmin.save();
        console.log("✅ Existing owner account promoted to admin");
      }
    } else {
      console.log("ℹ️ Admin seed skipped. Add ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in Render if you want auto-admin creation.");
    }

    for (const coupon of DEFAULT_COUPONS) {
      await Coupon.findOneAndUpdate(
        { code: coupon.code },
        { $setOnInsert: coupon },
        { upsert: true, returnDocument: "after" }
      );
    }

    await SiteSetting.findOneAndUpdate(
      { key: "homepage" },
      { $setOnInsert: { key: "homepage", value: DEFAULT_HOMEPAGE } },
      { upsert: true, returnDocument: "after" }
    );
    console.log("✅ Default coupons and homepage settings checked");
  } catch (error) {
    console.log("⚠️ Default seed skipped:", error.message);
  }
}

let defaultDataSeeded = false;
mongoose.connection.on("connected", async () => {
  if (defaultDataSeeded) return;
  defaultDataSeeded = true;
  await ensureDefaultData();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "✅ Rivayat Backend Running" });
});


// ─── TELEGRAM TEST (admin only) ───────────────────────────────────────────────
app.post("/telegram/test", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const result = await sendTelegramMessage(
      `✅ RIVAYAT Telegram test successful\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\nChat ID: ${TELEGRAM_CHAT_ID}`
    );

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        message: result.reason,
        fix: "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Render Environment."
      });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    res.json({ success: true, message: "Telegram test message sent.", result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
      role: "customer"
    });

    res.json({ success: true, message: "Account created successfully!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email/username and password are required." });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with this email/username." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    }

    res.json({ success: true, message: "Login successful!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ─── HOMEPAGE SETTINGS ───────────────────────────────────────────────────────
app.get("/settings/homepage", async (req, res) => {
  try {
    const setting = await SiteSetting.findOne({ key: "homepage" });
    res.json({ success: true, settings: { ...DEFAULT_HOMEPAGE, ...(setting?.value || {}) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/settings/homepage", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const value = { ...DEFAULT_HOMEPAGE, ...(req.body || {}) };
    const setting = await SiteSetting.findOneAndUpdate(
      { key: "homepage" },
      { key: "homepage", value, updatedAt: new Date() },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    res.json({ success: true, settings: setting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ active: { $ne: false } }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ $or: [{ id }, { slug: id }] });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const productData = normalizeProduct(req.body);
    if (!productData.name || !productData.price || !productData.mrp) {
      return res.status(400).json({ success: false, message: "Product name, MRP, and selling price are required." });
    }

    const product = await Product.findOneAndUpdate(
      { id: productData.id },
      { $set: productData, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Product saved successfully", product });
  } catch (error) {
    console.error("Product save error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/products/:id", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const existing = await Product.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });
    const productData = normalizeProduct({ ...existing.toObject(), ...req.body, id: existing.id });
    const product = await Product.findOneAndUpdate({ id: req.params.id }, { $set: productData }, { returnDocument: "after" });
    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── COUPONS ──────────────────────────────────────────────────────────────────
app.get("/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/coupons", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const couponData = {
      id: req.body.id || `coupon-${Date.now()}`,
      code: String(req.body.code || "").trim().toUpperCase(),
      type: req.body.type || "fixed",
      value: Number(req.body.value || 0),
      minCart: Number(req.body.minCart || 0),
      active: req.body.active !== false,
      expiry: req.body.expiry || "2027-12-31",
      description: req.body.description || "Admin-created coupon",
      updatedAt: new Date()
    };

    if (!couponData.code || !couponData.value) {
      return res.status(400).json({ success: false, message: "Coupon code and value are required." });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { id: couponData.id },
      { $set: couponData, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Coupon saved successfully", coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/coupons/validate", async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = await Coupon.findOne({ code: String(code || "").trim().toUpperCase() });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    if (!coupon.active) return res.status(400).json({ success: false, message: "Coupon is disabled" });
    if (new Date(coupon.expiry) < new Date()) return res.status(400).json({ success: false, message: "Coupon expired" });
    if (Number(subtotal || 0) < coupon.minCart) return res.status(400).json({ success: false, message: `Minimum cart value is ₹${coupon.minCart}` });

    const discount = coupon.type === "percent"
      ? Math.round(Number(subtotal || 0) * coupon.value / 100)
      : coupon.value;

    res.json({ success: true, coupon, discount: Math.min(discount, Number(subtotal || 0)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/coupons/:id", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const coupon = await Coupon.findOneAndDelete({ id: req.params.id });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── RAZORPAY PAYMENTS ────────────────────────────────────────────────────────
app.get("/payment/config", (req, res) => {
  res.json({
    success: true,
    razorpayEnabled: Boolean(RAZORPAY_KEY_ID),
    keyId: RAZORPAY_KEY_ID || ""
  });
});

app.post("/payment/create-order", async (req, res) => {
  try {
    if (!razorpayConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render Environment."
      });
    }

    const amountRupees = Number(
      req.body.amount ??
      req.body.total ??
      req.body.subtotal ??
      req.body.advanceAmount ??
      0
    );
    const amountPaise = Number(req.body.amountPaise || req.body.amount_in_paise || Math.round(amountRupees * 100));

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required. Minimum amount is ₹1." });
    }

    const receipt = String(req.body.receipt || req.body.orderId || `rvyt_${Date.now()}`).slice(0, 40);
    const currency = String(req.body.currency || "INR").toUpperCase();

    const razorpayOrder = await razorpayRequest("/orders", "POST", {
      amount: amountPaise,
      currency,
      receipt,
      payment_capture: 1,
      notes: {
        localOrderId: String(req.body.orderId || req.body.id || receipt),
        customerName: String(req.body.customerName || req.body.name || "").slice(0, 120),
        phone: String(req.body.phone || "").slice(0, 30),
        email: String(req.body.email || "").slice(0, 120),
        source: "RIVAYAT Website"
      }
    });

    res.json({
      success: true,
      keyId: RAZORPAY_KEY_ID,
      razorpayOrder,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error.message);
    res.status(error.status || 500).json({ success: false, message: error.message, details: error.data || undefined });
  }
});

app.post("/payment/verify", async (req, res) => {
  try {
    const razorpayOrderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const razorpayPaymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const razorpaySignature = req.body.razorpay_signature || req.body.razorpaySignature;
    const localOrderId = req.body.orderId || req.body.localOrderId || req.body.id;

    if (!razorpayConfigured()) {
      return res.status(500).json({ success: false, message: "Razorpay is not configured on backend." });
    }
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay verification fields." });
    }

    const expectedSignature = hmacSha256Hex(`${razorpayOrderId}|${razorpayPaymentId}`, RAZORPAY_KEY_SECRET);
    if (!safeTimingEqual(expectedSignature, razorpaySignature)) {
      return res.status(400).json({ success: false, message: "Payment signature verification failed." });
    }

    let order = null;
    const update = {
      paymentMethod: "Razorpay",
      paymentStatus: "Paid",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: "Confirmed",
      paidAt: new Date(),
      updatedAt: new Date()
    };

    if (localOrderId) {
      order = await Order.findOneAndUpdate({ id: localOrderId }, { $set: update }, { returnDocument: "after" });
    }
    if (!order) {
      order = await Order.findOneAndUpdate({ razorpayOrderId }, { $set: update }, { returnDocument: "after" });
    }

    sendTelegramMessage(`✅ RIVAYAT payment verified\nOrder: ${localOrderId || "Not saved yet"}\nRazorpay Order: ${razorpayOrderId}\nPayment: ${razorpayPaymentId}`).catch(()=>{});

    res.json({ success: true, message: "Payment verified successfully", orderUpdated: Boolean(order), order });
  } catch (error) {
    console.error("Razorpay verify error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/payment/webhook", async (req, res) => {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return res.status(500).json({ success: false, message: "RAZORPAY_WEBHOOK_SECRET is missing in Render Environment." });
    }

    const receivedSignature = req.get("x-razorpay-signature") || "";
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expectedSignature = hmacSha256Hex(rawBody, RAZORPAY_WEBHOOK_SECRET);

    if (!receivedSignature || !safeTimingEqual(expectedSignature, receivedSignature)) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay webhook signature." });
    }

    const event = req.body?.event || "unknown";
    const payment = req.body?.payload?.payment?.entity || null;
    const rzOrder = req.body?.payload?.order?.entity || null;
    const razorpayOrderId = payment?.order_id || rzOrder?.id || "";
    const razorpayPaymentId = payment?.id || "";
    const localOrderId = rzOrder?.receipt || payment?.notes?.localOrderId || payment?.notes?.orderId || "";

    const update = {
      razorpayWebhookEvent: event,
      updatedAt: new Date()
    };

    if (razorpayOrderId) update.razorpayOrderId = razorpayOrderId;
    if (razorpayPaymentId) update.razorpayPaymentId = razorpayPaymentId;

    if (["payment.captured", "order.paid"].includes(event)) {
      update.paymentMethod = "Razorpay";
      update.paymentStatus = "Paid";
      update.status = "Confirmed";
      update.paidAt = new Date();
    } else if (["payment.failed"].includes(event)) {
      update.paymentMethod = "Razorpay";
      update.paymentStatus = "Failed";
    } else if (["refund.created", "refund.processed"].includes(event)) {
      update.paymentStatus = event === "refund.processed" ? "Refunded" : "Refund Initiated";
    }

    let order = null;
    if (localOrderId) {
      order = await Order.findOneAndUpdate({ id: localOrderId }, { $set: update }, { returnDocument: "after" });
    }
    if (!order && razorpayOrderId) {
      order = await Order.findOneAndUpdate({ razorpayOrderId }, { $set: update }, { returnDocument: "after" });
    }

    console.log(`✅ Razorpay webhook received: ${event} | updated order: ${order?.id || "none"}`);
    res.json({ success: true, received: true, event, orderUpdated: Boolean(order) });
  } catch (error) {
    console.error("Razorpay webhook error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
app.post("/orders", async (req, res) => {
  try {
    const body = req.body;
    const orderId = body.orderId || body.id;
    if (!orderId) return res.status(400).json({ success: false, message: "Order ID is required." });

    const existing = await Order.findOne({ id: orderId });
    if (existing) {
      return res.json({ success: true, message: "Order already saved.", order: existing });
    }

    // Reduce stock when the ordered product exists in backend products.
    for (const item of body.items || []) {
      const product = await Product.findOne({ id: item.productId });
      if (!product) continue;

      const inventory = product.inventory || {};
      const size = item.size || "M";
      const requestedQty = Number(item.qty || item.quantity || 1);
      const currentStock = Number(inventory[size] || 0);

      if (currentStock < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `${product.name} size ${size} has only ${currentStock} left in stock.`
        });
      }

      inventory[size] = currentStock - requestedQty;
      product.inventory = inventory;
      product.soldCount = Number(product.soldCount || 0) + requestedQty;
      product.markModified("inventory");
      await product.save();
    }

    const order = await Order.create({
      id:            orderId,
      customerName:  body.customerName,
      phone:         body.phone,
      email:         normalizeEmail(body.email),
      productName:   body.productName,
      size:          body.size,
      quantity:      body.quantity,
      subtotal:      body.subtotal,
      discount:      body.discount,
      delivery:      deliveryChargeByPincode(body.address?.pincode, body.subtotal),
      price:         Number(body.subtotal || 0) - Number(body.discount || 0) + deliveryChargeByPincode(body.address?.pincode, body.subtotal),
      paymentMethod: body.paymentMethod,
      paymentStatus: body.paymentStatus,
      razorpayOrderId: body.razorpayOrderId || body.razorpay_order_id || "",
      razorpayPaymentId: body.razorpayPaymentId || body.razorpay_payment_id || "",
      razorpaySignature: body.razorpaySignature || body.razorpay_signature || "",
      paidAt: body.paymentStatus === "Paid" ? new Date() : undefined,
      status:        body.paymentStatus === "Paid" ? "Confirmed" : "Pending",
      address:       body.address,
      items:         body.items,
      referralCode:  String(body.referralCode || "").trim().toUpperCase()
    });

    if (order.referralCode) {
      await Referral.findOneAndUpdate({ code: order.referralCode }, { $inc: { uses: 1 }, updatedAt: new Date() });
    }

    sendTelegramMessage(`🛍️ New RIVAYAT order\n${orderPlainText(order)}`).catch(()=>{});
    sendOrderEmail(order).catch(()=>{});

    console.log("✅ Order saved:", order.id);
    res.json({ success: true, message: "Order saved successfully!", order });
  } catch (error) {
    console.error("Order error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const query = {};

    // Admin can see all orders. Customers can only see orders placed with their own email.
    if (!isAdminRequest(req)) {
      const email = requestEmail(req);
      if (!email) return res.json({ success: true, orders: [] });
      query.email = email;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (!isAdminRequest(req)) {
      const email = requestEmail(req);
      if (!email || normalizeEmail(order.email) !== email) {
        return res.status(403).json({ success: false, message: "You can only manage your own order." });
      }
      if (status !== "Cancelled") {
        return res.status(403).json({ success: false, message: "Customers can only cancel their own order." });
      }
      if (order.status === "Delivered") {
        return res.status(400).json({ success: false, message: "Delivered orders cannot be cancelled." });
      }
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();
    sendTelegramMessage(`📦 RIVAYAT order status updated\nOrder: ${order.id}\nStatus: ${order.status}\nCustomer: ${order.customerName || ""}`).catch(()=>{});

    res.json({ success: true, message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Status update error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── RETURNS / EXCHANGES ──────────────────────────────────────────────────────
app.get("/returns", async (req, res) => {
  try {
    const query = {};
    if (!isAdminRequest(req)) {
      const email = requestEmail(req);
      if (!email) return res.json({ success: true, requests: [] });
      query["customer.email"] = email;
    }
    const requests = await ReturnRequest.find(query).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/returns", async (req, res) => {
  try {
    const requestId = req.body.id || `return-${Date.now()}`;
    const order = await Order.findOne({ id: req.body.orderId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!isAdminRequest(req)) {
      const email = requestEmail(req);
      if (!email || normalizeEmail(order.email) !== email) {
        return res.status(403).json({ success: false, message: "You can only request return/exchange for your own order." });
      }
    }
    const request = await ReturnRequest.findOneAndUpdate(
      { id: requestId },
      { $set: {
          id: requestId,
          orderId: req.body.orderId,
          type: req.body.type || "Return",
          reason: req.body.reason || "",
          status: "Pending",
          customer: { ...(req.body.customer || {}), name: req.body.customer?.name || order.customerName, phone: req.body.customer?.phone || order.phone, email: normalizeEmail(req.body.customer?.email || order.email) },
          items: req.body.items || order.items || [],
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    res.json({ success: true, message: `${request.type} request submitted`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/returns/:id/status", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { status } = req.body;
    if (!RETURN_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid return status" });
    const request = await ReturnRequest.findOneAndUpdate(
      { id: req.params.id },
      { status, updatedAt: new Date() },
      { returnDocument: "after" }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── USERS / REVIEWS / STATS ──────────────────────────────────────────────────
app.get("/users", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users: users.map(publicUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const reviewId = req.body.id || `review-${Date.now()}`;
    const review = await Review.findOneAndUpdate(
      { id: reviewId },
      { $set: { ...req.body, id: reviewId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/reviews/:id", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const review = await Review.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { returnDocument: "after" }
    );
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/reviews/:id", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const review = await Review.findOneAndDelete({ id: req.params.id });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/admin/stats", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [orders, products, customers, returnRequests] = await Promise.all([
      Order.find(),
      Product.find(),
      User.find({ role: "customer" }),
      ReturnRequest.find()
    ]);
    const revenue = orders.reduce((sum, order) => sum + Number(order.price || 0), 0);
    const lowStock = products.filter((product) => {
      const inventory = product.inventory || {};
      const total = Object.values(inventory).reduce((sum, qty) => sum + Number(qty || 0), 0);
      return total <= 5;
    }).length;

    res.json({
      success: true,
      stats: {
        revenue,
        orders: orders.length,
        pending: orders.filter(o => o.status === "Pending").length,
        delivered: orders.filter(o => o.status === "Delivered").length,
        cancelled: orders.filter(o => o.status === "Cancelled").length,
        products: products.length,
        lowStock,
        customers: customers.length,
        returnRequests: returnRequests.length,
        pendingReturns: returnRequests.filter(r => r.status === "Pending").length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELIVERY / NEWSLETTER / REFERRALS ───────────────────────────────────────
app.post("/delivery/quote", async (req, res) => {
  try {
    const charge = deliveryChargeByPincode(req.body.pincode, req.body.subtotal);
    res.json({ success: true, charge, freeAbove: 999 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/newsletter", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const lead = await Newsletter.findOneAndUpdate(
      { email },
      { email, phone: req.body.phone || "", source: req.body.source || "Website" },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    sendTelegramMessage(`📩 New RIVAYAT newsletter lead\nEmail: ${email}\nPhone: ${lead.phone || "-"}`).catch(()=>{});
    res.json({ success: true, message: "Subscribed successfully", lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/newsletter", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const leads = await Newsletter.find().sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/referrals/me", async (req, res) => {
  try {
    const email = requestEmail(req);
    if (!email) return res.status(401).json({ success: false, message: "Login required" });
    const code = `RIV${email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}50`;
    const referral = await Referral.findOneAndUpdate(
      { ownerEmail: email },
      { $setOnInsert: { code, ownerEmail: email, rewardValue: 50, active: true }, updatedAt: new Date() },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    res.json({ success: true, referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/referrals", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const referrals = await Referral.find().sort({ createdAt: -1 });
    res.json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/referrals/validate", async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);
    const referral = await Referral.findOne({ code, active: true });
    if (!referral) return res.status(404).json({ success: false, message: "Referral code not found" });
    const discount = Math.min(Number(referral.rewardValue || 50), subtotal);
    res.json({ success: true, referral, discount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get("/telegram/test", async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const result = await sendTelegramMessage("✅ RIVAYAT Telegram browser test successful!");
    if (result.skipped) return res.status(400).json({ success: false, message: result.reason });
    if (!result.success) return res.status(500).json({ success: false, message: result.message });
    res.json({ success: true, message: "Telegram test message sent." });
  } catch (error) {
    console.error("Telegram test error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled promise rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught exception:", err.message);
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
