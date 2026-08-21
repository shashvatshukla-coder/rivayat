const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const APP_SECRET = process.env.APP_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "RIVAYAT <orders@rivayat.in>";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const IS_TEST = process.env.NODE_ENV === "test";
const configuredReturnWindow = Number(process.env.RETURN_WINDOW_DAYS || 7);
const RETURN_WINDOW_DAYS = Number.isFinite(configuredReturnWindow) ? Math.max(1, Math.min(30, configuredReturnWindow)) : 7;
const ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || "http://localhost:3000,https://rivayat.shop,https://www.rivayat.shop")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const ORDER_STATUSES = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const RETURN_STATUSES = ["Pending", "Approved", "Rejected", "Resolved"];
const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || "",
  name: process.env.ADMIN_NAME || "Rivayat Owner",
  email: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  phone: process.env.ADMIN_PHONE || "",
  password: process.env.ADMIN_PASSWORD || ""
};
const DEFAULT_HOMEPAGE = {
  heroPill: "Rivayat Signature Drop • Premium Menswear",
  heroTitle: "Own Your Vibe with RIVAYAT.",
  heroSubtitle: "Luxury craftsmanship meets modern silhouettes. Introducing the all-new Rivayat Premium Black Coat Pant Combo alongside our iconic streetwear and comfort essentials.",
  heroImage: "/assets/products/rivayat-black-coat-pant-combo.png",
  heroOffer: "Hero Launch Drop: Tailored Black Coat Pant Combo at Rs 2,999 (MRP Rs 5,999)",
  primaryButtonText: "Shop Hero Drop",
  secondaryButtonText: "Buy on WhatsApp"
};
const DEFAULT_COUPONS = [
  { id: "c1", code: "RIVAYAT150", type: "fixed", value: 150, minCart: 699, active: true, expiry: "2027-12-31", description: "Rs 150 off above Rs 699" },
  { id: "c2", code: "VIBE10", type: "percent", value: 10, minCart: 0, active: true, expiry: "2027-12-31", description: "10% off on all orders" },
  { id: "c3", code: "LAUNCH20", type: "percent", value: 20, minCart: 999, active: false, expiry: "2027-12-31", description: "20% launch discount above Rs 999" }
];

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by Rivayat CORS policy."));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' https://rivayat.onrender.com https://accounts.google.com; frame-src https://accounts.google.com"
  });
  if (req.secure || req.get("x-forwarded-proto") === "https") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));

function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (req, res, next) => {
    if (IS_TEST) return next();
    const now = Date.now();
    const identifier = normalizeEmail(req.body?.email || req.body?.identifier) || "anonymous";
    const key = `${req.ip}:${req.path}:${identifier}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > 5000) {
      for (const [storedKey, stored] of buckets) if (stored.resetAt <= now) buckets.delete(storedKey);
    }
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message: "Too many attempts. Please wait and try again." });
    }
    return next();
  };
}

app.use(
  ["/login", "/signup", "/signup/request-otp", "/signup/verify", "/forgot-password", "/reset-password", "/auth/google"],
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 })
);
app.use(
  ["/pincode", "/newsletter", "/reviews", "/orders", "/returns", "/coupons/validate", "/referrals/validate"],
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 120 })
);

mongoose.set("strictQuery", true);

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  password: { type: String, required: true },
  googleSub: { type: String, unique: true, sparse: true },
  emailVerified: { type: Boolean, default: false },
  avatar: { type: String, default: "" },
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
  inventoryRestocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const ReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: String,
  userId: { type: String, default: "" },
  userEmail: { type: String, default: "", lowercase: true },
  name: String,
  rating: { type: Number, default: 5 },
  title: { type: String, default: "" },
  text: String,
  photo: { type: String, default: "" },
  verifiedPurchase: { type: Boolean, default: false },
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
  attempts: { type: Number, default: 0 },
  requestedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
const SignupVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  passwordHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  requestedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 }
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
const SignupVerification = mongoose.model("SignupVerification", SignupVerificationSchema);

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_PATTERN = /^\d{6}$/;
const IMAGE_DATA_PATTERN = /^data:image\/(?:png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i;
const slugify = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `product-${Date.now()}`;
const cleanText = (value, max = 500) => String(value || "").trim().slice(0, max);
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar || "",
  emailVerified: Boolean(user.emailVerified || user.googleSub),
  addresses: user.addresses || []
});
function base64url(input) {
  return Buffer.from(input).toString("base64url");
}
function createToken(user) {
  if (!APP_SECRET) throw new Error("APP_SECRET is not configured.");
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
    if (!APP_SECRET) return null;
    const [body, sig] = String(token).split(".");
    if (!body || !sig) return null;
    const expected = crypto.createHmac("sha256", APP_SECRET).update(body).digest("base64url");
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
function authContext(req) {
  const token = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return verifyToken(token) || { role: "guest", email: "" };
}
function requireUser(req, res) {
  const auth = authContext(req);
  if (auth.email && auth.id) return auth;
  res.status(401).json({ success: false, message: "Please sign in to continue." });
  return null;
}
function requireAdmin(req, res) {
  const auth = authContext(req);
  if (auth.id && auth.role === "admin") return auth;
  res.status(403).json({ success: false, message: "Admin access required. Please login as admin again." });
  return null;
}
function requestEmail(req) {
  return normalizeEmail(authContext(req).email);
}
function hashResetCode(email, code) {
  return crypto.createHmac("sha256", APP_SECRET).update(`${normalizeEmail(email)}:${String(code).trim()}`).digest("hex");
}
function randomFourDigitCode() {
  return String(crypto.randomInt(1000, 10000));
}
function validImageDataUrl(value, maxBytes = 8 * 1024 * 1024) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (!IMAGE_DATA_PATTERN.test(image)) return null;
  const encoded = image.slice(image.indexOf(",") + 1);
  const approximateBytes = Math.floor(encoded.length * 0.75);
  return approximateBytes <= maxBytes ? image : null;
}
function safeImageSource(value, maxBytes = 12 * 1024 * 1024) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (source.startsWith("data:")) return validImageDataUrl(source, maxBytes);
  if (source.length > 2048) return null;
  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:" ? source : null;
  } catch {
    return null;
  }
}
function safeCssBackground(value) {
  const background = cleanText(value, 160);
  if (!background) return "";
  if (/^#[0-9a-f]{3,8}$/i.test(background)) return background;
  if (/^linear-gradient\([#a-z0-9(),.%\s-]+\)$/i.test(background)) return background;
  return "";
}
function sameHash(a = "", b = "") {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function sendServerError(res, error, operation) {
  console.error(`${operation} error:`, error);
  return res.status(500).json({ success: false, message: "Rivayat could not complete this request. Please try again." });
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
async function restockOrderInventory(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  await Promise.all(items.map((item) => {
    const productId = cleanText(item?.productId, 120);
    const size = cleanText(item?.size, 20);
    const qty = Number(item?.qty || item?.quantity || 0);
    if (!productId || !/^[a-zA-Z0-9+-]{1,20}$/.test(size) || !Number.isInteger(qty) || qty <= 0) return null;
    return Product.updateOne({ id: productId }, { $inc: { [`inventory.${size}`]: qty, soldCount: -qty } });
  }));
}
async function syncProductReviewStats(productId) {
  const [stats] = await Review.aggregate([
    { $match: { productId, status: "Approved" } },
    { $group: { _id: "$productId", reviews: { $sum: 1 }, rating: { $avg: "$rating" } } }
  ]);
  await Product.updateOne(
    { id: productId },
    { $set: { reviews: Number(stats?.reviews || 0), rating: Number(Number(stats?.rating || 0).toFixed(1)), updatedAt: new Date() } }
  );
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
  if (DEFAULT_ADMIN.email && DEFAULT_ADMIN.password) {
    const existingAdmin = await User.findOne({
      $or: [
        { email: DEFAULT_ADMIN.email },
        ...(DEFAULT_ADMIN.username ? [{ username: DEFAULT_ADMIN.username }] : [])
      ]
    });
    if (!existingAdmin) {
      await User.create({
        username: DEFAULT_ADMIN.username || undefined,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        phone: DEFAULT_ADMIN.phone,
        password: await bcrypt.hash(DEFAULT_ADMIN.password, 12),
        emailVerified: true,
        role: "admin"
      });
    } else if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      existingAdmin.emailVerified = true;
      existingAdmin.username = existingAdmin.username || DEFAULT_ADMIN.username || undefined;
      await existingAdmin.save();
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

app.use("/assets", express.static(path.join(__dirname, "assets"), {
  dotfiles: "deny",
  immutable: true,
  index: false,
  maxAge: "1y"
}));
app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/styles.css", (req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/sitemap.xml", (req, res) => res.sendFile(path.join(__dirname, "sitemap.xml")));
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: https://rivayat.shop/sitemap.xml\n");
});
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
  if (!requireAdmin(req, res)) return;
  const result = await sendTelegramMessage("RIVAYAT Telegram browser test successful.");
  if (result.skipped) return res.status(400).send(result.reason);
  if (!result.success) return res.status(500).send(result.message);
  res.send("Telegram test message sent.");
});

async function requestSignupOtp(req, res) {
  try {
    const { name, email, phone, password } = req.body;
    const cleanName = cleanText(name, 100);
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = cleanText(phone, 24);
    const plainPassword = String(password || "");
    if (cleanName.length < 2) return res.status(400).json({ success: false, message: "Please enter your full name." });
    if (!EMAIL_PATTERN.test(cleanEmail)) return res.status(400).json({ success: false, message: "Enter a valid email address." });
    if (plainPassword.length < 8) return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
    if (await User.findOne({ email: cleanEmail })) return res.status(409).json({ success: false, message: "Email already registered. Please login." });

    const previous = await SignupVerification.findOne({ email: cleanEmail });
    if (previous && Date.now() - new Date(previous.requestedAt).getTime() < 60_000) {
      return res.status(429).json({ success: false, message: "Please wait one minute before requesting another OTP." });
    }

    const code = randomFourDigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await SignupVerification.findOneAndUpdate(
      { email: cleanEmail },
      {
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        passwordHash: await bcrypt.hash(plainPassword, 12),
        codeHash: hashResetCode(cleanEmail, code),
        attempts: 0,
        requestedAt: new Date(),
        expiresAt
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: `${code} is your RIVAYAT verification code`,
      html: `<div style="font-family:Arial,sans-serif;color:#102a2c"><h1>RIVAYAT</h1><p>Hi ${cleanName.replace(/[<>&"']/g, "")}, enter this 4-digit code to create your account:</p><p style="font-size:36px;font-weight:800;letter-spacing:10px">${code}</p><p>This code expires in 10 minutes.</p></div>`
    });
    if (!emailResult.success) {
      if (!IS_TEST && process.env.NODE_ENV === "production") {
        return res.status(503).json({ success: false, message: "Email verification is temporarily unavailable. Please try again later." });
      }
      return res.json({ success: true, verificationRequired: true, devOtp: code, message: "Preview mode: use the 4-digit code shown here." });
    }
    return res.json({ success: true, verificationRequired: true, message: "A 4-digit OTP was sent to your email. It expires in 10 minutes." });
  } catch (error) {
    return sendServerError(res, error, "Signup OTP");
  }
}
app.post("/signup", requestSignupOtp);
app.post("/signup/request-otp", requestSignupOtp);
app.post("/signup/verify", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || req.body.otp || "").trim();
    if (!EMAIL_PATTERN.test(email) || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ success: false, message: "Enter your email and complete 4-digit OTP." });
    }
    const pending = await SignupVerification.findOne({ email });
    if (!pending || new Date(pending.expiresAt).getTime() <= Date.now()) {
      await SignupVerification.deleteOne({ email });
      return res.status(400).json({ success: false, message: "This OTP has expired. Request a new 4-digit code." });
    }
    if (Number(pending.attempts || 0) >= 5) {
      return res.status(429).json({ success: false, message: "Too many attempts. Request a fresh OTP." });
    }
    if (!sameHash(pending.codeHash, hashResetCode(email, code))) {
      pending.attempts = Number(pending.attempts || 0) + 1;
      await pending.save();
      return res.status(400).json({ success: false, message: "That OTP is not correct." });
    }
    if (await User.findOne({ email })) {
      await SignupVerification.deleteOne({ email });
      return res.status(409).json({ success: false, message: "This account already exists. Please login." });
    }
    const user = await User.create({
      name: pending.name,
      email,
      phone: pending.phone || "",
      password: pending.passwordHash,
      emailVerified: true,
      role: "customer"
    });
    await SignupVerification.deleteOne({ email });
    return res.status(201).json({
      success: true,
      message: "Email verified and account created.",
      user: { ...publicUser(user), token: createToken(user) }
    });
  } catch (error) {
    return sendServerError(res, error, "Signup verification");
  }
});
app.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const password = String(req.body.password || "");
    if (!identifier || !password) return res.status(400).json({ success: false, message: "Email/username and password are required." });
    const user = await User.findOne({ $or: [{ email: normalizeEmail(identifier) }, { username: identifier }] });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Email/username or password is incorrect." });
    }
    res.json({ success: true, message: "Login successful!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    return sendServerError(res, error, "Login");
  }
});

app.get("/auth/google/config", (req, res) => {
  res.json({ success: true, clientId: GOOGLE_CLIENT_ID || null });
});
app.post("/auth/google", async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: "Google sign-in is not configured." });
    const credential = String(req.body?.credential || "");
    if (!credential || credential.length > 10_000) return res.status(400).json({ success: false, message: "Google did not return a valid credential." });
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return res.status(401).json({ success: false, message: "Google could not verify this sign-in." });
    const tokenInfo = await response.json();
    const email = normalizeEmail(tokenInfo.email);
    if (
      tokenInfo.aud !== GOOGLE_CLIENT_ID ||
      !new Set(["accounts.google.com", "https://accounts.google.com"]).has(String(tokenInfo.iss || "")) ||
      String(tokenInfo.email_verified) !== "true" ||
      !tokenInfo.sub ||
      !EMAIL_PATTERN.test(email) ||
      Number(tokenInfo.exp || 0) <= Math.floor(Date.now() / 1000)
    ) {
      return res.status(401).json({ success: false, message: "The Google credential was not valid for RIVAYAT." });
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: cleanText(tokenInfo.name, 100) || "Rivayat member",
        email,
        password: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12),
        googleSub: String(tokenInfo.sub),
        emailVerified: true,
        role: "customer"
      });
    } else {
      user.googleSub = String(tokenInfo.sub);
      user.emailVerified = true;
      if (!user.name && tokenInfo.name) user.name = cleanText(tokenInfo.name, 100);
      await user.save();
    }
    return res.json({ success: true, message: "Signed in with Google.", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    console.error("Google sign-in error:", error);
    return res.status(500).json({ success: false, message: "Google sign-in failed." });
  }
});

app.put("/profile", async (req, res) => {
  try {
    const auth = requireUser(req, res);
    if (!auth) return;
    const { name, phone, addresses, avatar } = req.body || {};
    const user = await User.findOne({ email: normalizeEmail(auth.email) });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (typeof name === "string") {
      const cleanName = cleanText(name, 100);
      if (cleanName.length < 2) return res.status(400).json({ success: false, message: "Name must contain at least 2 characters." });
      user.name = cleanName;
    }
    if (typeof phone === "string") user.phone = cleanText(phone, 24);
    if (Array.isArray(addresses)) {
      user.addresses = addresses.slice(0, 8).map((address) => ({
        id: cleanText(address?.id, 80) || `addr-${crypto.randomUUID()}`,
        label: cleanText(address?.label, 40) || "Home",
        line1: cleanText(address?.line1, 240),
        city: cleanText(address?.city, 90),
        district: cleanText(address?.district, 90),
        state: cleanText(address?.state, 90),
        pincode: PINCODE_PATTERN.test(String(address?.pincode || "")) ? String(address.pincode) : ""
      })).filter((address) => address.line1 && address.city && address.state && address.pincode);
    }
    if (typeof avatar === "string") {
      const validatedAvatar = validImageDataUrl(avatar);
      if (validatedAvatar === null) {
        return res.status(400).json({ success: false, message: "Profile photo must be PNG, JPG, WEBP or AVIF and under 8 MB." });
      }
      user.avatar = validatedAvatar;
    }
    await user.save();
    return res.json({ success: true, message: "Profile updated successfully.", user: publicUser(user) });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});
app.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.identifier);
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ success: false, message: "A valid email is required." });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If this email is registered, a reset code has been sent." });

    const previous = await PasswordReset.findOne({ email, usedAt: null }).sort({ createdAt: -1 });
    if (previous && Date.now() - new Date(previous.requestedAt || previous.createdAt).getTime() < 60_000) {
      return res.status(429).json({ success: false, message: "Please wait one minute before requesting another OTP." });
    }
    const code = randomFourDigitCode();
    await PasswordReset.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });
    await PasswordReset.create({ email, codeHash: hashResetCode(email, code), attempts: 0, requestedAt: new Date(), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    const emailResult = await sendEmail({
      to: user.email,
      subject: "RIVAYAT password reset code",
      html: `<div style="font-family:Arial,sans-serif;color:#111"><h1>RIVAYAT</h1><p>Hi ${cleanText(user.name || "Customer", 100).replace(/[<>&"']/g, "")}, your 4-digit password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p></div>`
    });
    if (!emailResult.success) {
      const showCode = process.env.NODE_ENV !== "production";
      return res.status(showCode ? 200 : 503).json({
        success: showCode,
        message: showCode
          ? `Reset code generated for local testing: ${code}`
          : "Password reset email is temporarily unavailable. Please try again later.",
        resetCode: showCode ? code : undefined,
        email: emailResult
      });
    }
    sendTelegramMessage(`RIVAYAT password reset requested\nCustomer: ${user.name || "Customer"}\nEmail: ${email}`).catch(() => {});
    res.json({ success: true, message: "If this email is registered, a reset code has been sent.", email: emailResult });
  } catch (error) {
    return sendServerError(res, error, "Password reset request");
  }
});
app.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const password = String(req.body.password || "");
    if (!EMAIL_PATTERN.test(email) || !/^\d{4}$/.test(code) || !password) return res.status(400).json({ success: false, message: "Email, 4-digit reset code, and new password are required." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    const reset = await PasswordReset.findOne({ email, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!reset || Number(reset.attempts || 0) >= 5) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    if (!sameHash(reset.codeHash, hashResetCode(email, code))) {
      reset.attempts = Number(reset.attempts || 0) + 1;
      await reset.save();
      return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    user.password = await bcrypt.hash(password, 12);
    await user.save();
    reset.usedAt = new Date();
    await reset.save();
    sendTelegramMessage(`RIVAYAT password reset completed\nCustomer: ${user.name || "Customer"}\nEmail: ${email}`).catch(() => {});
    res.json({ success: true, message: "Password updated. You can login now." });
  } catch (error) {
    return sendServerError(res, error, "Password reset");
  }
});

app.get("/settings/homepage", async (req, res) => {
  const setting = await SiteSetting.findOne({ key: "homepage" });
  res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  res.json({ success: true, settings: { ...DEFAULT_HOMEPAGE, ...(setting?.value || {}) } });
});
app.put("/settings/homepage", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const body = req.body || {};
  const heroImage = safeImageSource(body.heroImage || DEFAULT_HOMEPAGE.heroImage, 10 * 1024 * 1024);
  if (heroImage === null) {
    return res.status(400).json({ success: false, message: "Hero image must be a valid HTTP(S) image or PNG, JPG, WEBP or AVIF upload under 10 MB." });
  }
  const value = {
    heroPill: cleanText(body.heroPill, 140) || DEFAULT_HOMEPAGE.heroPill,
    heroTitle: cleanText(body.heroTitle, 180) || DEFAULT_HOMEPAGE.heroTitle,
    heroSubtitle: cleanText(body.heroSubtitle, 500) || DEFAULT_HOMEPAGE.heroSubtitle,
    heroImage,
    heroOffer: cleanText(body.heroOffer, 180) || DEFAULT_HOMEPAGE.heroOffer,
    primaryButtonText: cleanText(body.primaryButtonText, 80) || DEFAULT_HOMEPAGE.primaryButtonText,
    secondaryButtonText: cleanText(body.secondaryButtonText, 80) || DEFAULT_HOMEPAGE.secondaryButtonText
  };
  const setting = await SiteSetting.findOneAndUpdate({ key: "homepage" }, { key: "homepage", value, updatedAt: new Date() }, { upsert: true, new: true });
  res.json({ success: true, settings: setting.value });
});

app.get("/products", async (req, res) => {
  res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  res.json({ success: true, products: await Product.find({ active: { $ne: false } }).sort({ createdAt: -1 }) });
});
app.get("/products/:slugOrId", async (req, res) => {
  const value = req.params.slugOrId;
  const auth = authContext(req);
  const product = await Product.findOne({
    $or: [{ id: value }, { slug: value }],
    ...(auth.role === "admin" ? {} : { active: { $ne: false } })
  });
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
});
app.post("/products", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const body = req.body || {};
  const name = cleanText(body.name, 140);
  const requestedId = cleanText(body.id, 120).replace(/[^a-zA-Z0-9_-]/g, "");
  const id = requestedId || `product-${crypto.randomUUID()}`;
  const price = Number(body.price);
  const mrp = Number(body.mrp);
  const image = safeImageSource(body.image, 12 * 1024 * 1024);
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(mrp) || mrp < price) {
    return res.status(400).json({ success: false, message: "Product name, price and an MRP not below price are required." });
  }
  if (image === null) {
    return res.status(400).json({ success: false, message: "Product image must be PNG, JPG, WEBP or AVIF and under 12 MB." });
  }
  const sizes = Array.isArray(body.sizes)
    ? [...new Set(body.sizes.map((size) => cleanText(size, 12).replace(/[^a-zA-Z0-9+-]/g, "")).filter(Boolean))].slice(0, 20)
    : [];
  const inventory = {};
  for (const size of sizes) {
    const quantity = Number(body.inventory?.[size] || 0);
    inventory[size] = Number.isFinite(quantity) ? Math.max(0, Math.min(100_000, Math.floor(quantity))) : 0;
  }
  const gallery = Array.isArray(body.gallery)
    ? body.gallery.map((item) => safeImageSource(item, 12 * 1024 * 1024)).filter((item) => typeof item === "string" && item).slice(0, 12)
    : [];
  if (Array.isArray(body.gallery) && gallery.length !== body.gallery.filter(Boolean).slice(0, 12).length) {
    return res.status(400).json({ success: false, message: "Every gallery image must be a valid HTTP(S) image or supported upload under 12 MB." });
  }
  const sizeChartImage = safeImageSource(body.sizeChartImage, 8 * 1024 * 1024);
  if (sizeChartImage === null) return res.status(400).json({ success: false, message: "Size-chart image is not valid." });
  const sizeChart = {};
  for (const size of sizes) if (body.sizeChart?.[size]) sizeChart[size] = cleanText(body.sizeChart[size], 160);
  const variants = Array.isArray(body.variants) ? body.variants.slice(0, 100).map((variant) => ({
    color: cleanText(variant?.color, 80),
    size: cleanText(variant?.size, 12),
    stock: Math.max(0, Math.min(100_000, Math.floor(Number(variant?.stock || 0)))),
    price: Number.isFinite(Number(variant?.price)) ? Math.max(0, Math.round(Number(variant.price))) : undefined,
    image: safeImageSource(variant?.image, 8 * 1024 * 1024) || ""
  })).filter((variant) => variant.color || variant.size) : [];
  const productData = {
    id,
    slug: slugify(body.slug || name),
    name,
    category: cleanText(body.category, 80) || "Clothing",
    color: cleanText(body.color, 80) || "Black",
    badge: cleanText(body.badge, 60) || "New Arrival",
    mrp: Math.round(mrp),
    price: Math.round(price),
    sizes: sizes.length ? sizes : undefined,
    inventory: sizes.length ? inventory : undefined,
    description: cleanText(body.description, 1600) || "Official RIVAYAT product",
    details: Array.isArray(body.details) ? body.details.map((detail) => cleanText(detail, 240)).filter(Boolean).slice(0, 20) : [],
    image,
    gallery,
    sizeChartImage,
    sizeChart,
    bg: safeCssBackground(body.bg),
    art: body.art === "white" ? "white" : "black",
    type: body.type === "full" ? "full" : "short",
    active: body.active !== false,
    variants,
    updatedAt: new Date()
  };
  const product = await Product.findOneAndUpdate(
    { id },
    productData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, product });
});
app.delete("/products/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const product = await Product.findOneAndDelete({ id: req.params.id });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  res.json({ success: true, message: "Product deleted successfully" });
});

app.get("/coupons", async (req, res) => {
  const query = authContext(req).role === "admin" ? {} : { active: true };
  res.json({ success: true, coupons: await Coupon.find(query).sort({ createdAt: -1 }) });
});
app.post("/coupons/validate", async (req, res) => {
  const code = cleanText(req.body.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const subtotal = Number(req.body.subtotal || 0);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ success: false, message: "Enter a valid coupon code and cart subtotal." });
  }
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
  const id = cleanText(body.id, 100) || `coupon-${crypto.randomUUID()}`;
  const code = cleanText(body.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const type = body.type === "percent" ? "percent" : "fixed";
  const value = Number(body.value);
  const minCart = Number(body.minCart || 0);
  if (!code || !Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100) || !Number.isFinite(minCart) || minCart < 0) {
    return res.status(400).json({ success: false, message: "Enter a valid coupon code, type, value and minimum cart." });
  }
  const coupon = await Coupon.findOneAndUpdate(
    { id },
    { id, code, type, value, minCart, active: body.active !== false, expiry: cleanText(body.expiry, 10), description: cleanText(body.description, 240), updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, coupon });
});
app.delete("/coupons/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const coupon = await Coupon.findOneAndDelete({ id: req.params.id });
  if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
  res.json({ success: true, message: "Coupon deleted successfully" });
});

app.post("/orders", async (req, res) => {
  try {
    const body = req.body || {};
    const auth = authContext(req);
    const orderId = cleanText(body.orderId || body.id, 100);
    if (!/^[a-zA-Z0-9_-]{6,100}$/.test(orderId)) return res.status(400).json({ success: false, message: "A valid order ID is required." });
    const email = normalizeEmail(auth.email || body.email);
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ success: false, message: "A valid customer email is required." });
    if (auth.email && normalizeEmail(body.email) && normalizeEmail(body.email) !== normalizeEmail(auth.email)) {
      return res.status(403).json({ success: false, message: "The order email must match the signed-in account." });
    }
    const existing = await Order.findOne({ id: orderId });
    if (existing) {
      if (normalizeEmail(existing.email) !== email) return res.status(409).json({ success: false, message: "This order ID is already in use." });
      return res.json({ success: true, message: "Order already saved.", order: existing });
    }
    const address = body.address && typeof body.address === "object" ? {
      line1: cleanText(body.address.line1, 240),
      city: cleanText(body.address.city, 90),
      district: cleanText(body.address.district, 90),
      state: cleanText(body.address.state, 90),
      pincode: cleanText(body.address.pincode, 6)
    } : {};
    if (!address.line1 || !address.city || !address.state || !PINCODE_PATTERN.test(address.pincode)) {
      return res.status(400).json({ success: false, message: "Complete the delivery address and 6-digit PIN code." });
    }
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) {
      return res.status(400).json({ success: false, message: "Order must contain between 1 and 20 items." });
    }
    const items = [];
    for (const requestedItem of body.items) {
      const productId = cleanText(requestedItem.productId || requestedItem.id, 120);
      const size = cleanText(requestedItem.size, 20);
      const qty = Number(requestedItem.qty || requestedItem.quantity);
      if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 10) {
        return res.status(400).json({ success: false, message: "Every order item needs a valid product and quantity from 1 to 10." });
      }
      const product = await Product.findOne({ $or: [{ id: productId }, { slug: productId }], active: { $ne: false } });
      if (!product) return res.status(400).json({ success: false, message: `Product ${productId} is not available.` });
      if (product.sizes?.length && !product.sizes.includes(size)) return res.status(400).json({ success: false, message: `${product.name} is not available in size ${size}.` });
      const available = Number(product.inventory?.[size] || 0);
      if (available < qty) return res.status(409).json({ success: false, message: `${product.name} size ${size} has only ${available} left.` });
      items.push({ productId: product.id, slug: product.slug, name: product.name, size, qty, price: Number(product.price) });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    let discount = 0;
    const couponCode = cleanText(body.couponCode, 40).toUpperCase();
    const referralCode = cleanText(body.referralCode, 40).toUpperCase();
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, active: true });
      const today = new Date().toISOString().slice(0, 10);
      if (!coupon || (coupon.expiry && coupon.expiry < today) || subtotal < Number(coupon.minCart || 0)) {
        return res.status(400).json({ success: false, message: "Coupon is invalid for this order." });
      }
      discount = coupon.type === "percent" ? subtotal * Number(coupon.value || 0) / 100 : Number(coupon.value || 0);
    } else if (referralCode) {
      const referral = await Referral.findOne({ code: referralCode, active: true });
      if (!referral) return res.status(400).json({ success: false, message: "Referral code is invalid." });
      discount = Number(referral.rewardValue || 50);
    }
    discount = Math.min(Math.max(0, Math.round(discount)), subtotal);
    const delivery = deliveryChargeByPincode(address.pincode, subtotal);
    const price = subtotal - discount + delivery;
    const reservedItems = [];
    let order;
    try {
      for (const item of items) {
        const result = await Product.updateOne(
          { id: item.productId, [`inventory.${item.size}`]: { $gte: item.qty } },
          { $inc: { [`inventory.${item.size}`]: -item.qty, soldCount: item.qty } }
        );
        if (Number(result.modifiedCount || 0) !== 1) {
          const stockError = new Error(`${item.name} size ${item.size} sold out while you were checking out.`);
          stockError.code = "INSUFFICIENT_STOCK";
          throw stockError;
        }
        reservedItems.push(item);
      }
      order = await Order.create({
        id: orderId,
        customerName: cleanText(body.customerName, 100),
        phone: cleanText(body.phone, 24),
        email,
        productName: items.map((item) => item.name).join(", "),
        size: items.map((item) => item.size).join(", "),
        quantity: items.reduce((sum, item) => sum + item.qty, 0),
        subtotal,
        discount,
        delivery,
        price,
        paymentMethod: "COD",
        paymentStatus: "Pending",
        status: "Pending",
        address,
        items,
        referralCode
      });
    } catch (error) {
      if (reservedItems.length) await restockOrderInventory({ items: reservedItems });
      if (error.code === "INSUFFICIENT_STOCK") return res.status(409).json({ success: false, message: error.message });
      throw error;
    }
    if (order.referralCode) await Referral.findOneAndUpdate({ code: order.referralCode, active: true }, { $inc: { uses: 1 }, updatedAt: new Date() });
    sendTelegramMessage(`New RIVAYAT order\n${orderPlainText(order)}`).catch(() => {});
    if (order.email) {
      sendEmail({ to: order.email, subject: `RIVAYAT order confirmed: ${order.id}`, html: `<pre>${orderPlainText(order)}</pre>` }).catch(() => {});
    }
    res.json({ success: true, message: "Order saved successfully!", order });
  } catch (error) {
    return sendServerError(res, error, "Order creation");
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
  if (order.status === "Cancelled" && status !== "Cancelled") {
    return res.status(400).json({ success: false, message: "Cancelled orders cannot be reopened. Create a new order instead." });
  }
  if (auth.role !== "admin") {
    if (!auth.email || normalizeEmail(order.email) !== normalizeEmail(auth.email)) return res.status(403).json({ success: false, message: "You can only manage your own order." });
    if (status === order.status) return res.json({ success: true, message: "Order status is already up to date.", order });
    if (status !== "Cancelled") return res.status(403).json({ success: false, message: "Customers can only cancel their own order." });
    if (!new Set(["Pending", "Confirmed"]).has(order.status)) return res.status(400).json({ success: false, message: "This order can no longer be cancelled online. Contact support." });
  }
  if (status === "Cancelled" && order.status !== "Cancelled" && !order.inventoryRestocked) {
    await restockOrderInventory(order);
    order.inventoryRestocked = true;
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
  const auth = requireUser(req, res);
  if (!auth) return;
  const body = req.body || {};
  const orderId = cleanText(body.orderId, 100);
  const type = body.type === "Exchange" ? "Exchange" : "Return";
  const reason = cleanText(body.reason, 700);
  if (!orderId || reason.length < 5) return res.status(400).json({ success: false, message: "Order ID and return reason are required." });
  const order = await Order.findOne({ id: orderId });
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  if (auth.role !== "admin" && normalizeEmail(order.email) !== normalizeEmail(auth.email)) {
    return res.status(403).json({ success: false, message: "You can only request a return for your own order." });
  }
  if (auth.role !== "admin" && order.status !== "Delivered") {
    return res.status(400).json({ success: false, message: "Returns and exchanges can be requested after delivery." });
  }
  const deliveredAt = new Date(order.updatedAt || order.createdAt).getTime();
  if (auth.role !== "admin" && Date.now() - deliveredAt > RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ success: false, message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.` });
  }
  const existingRequest = await ReturnRequest.findOne({
    orderId,
    "customer.email": normalizeEmail(order.email),
    status: { $in: ["Pending", "Approved"] }
  });
  if (existingRequest) {
    return res.status(409).json({ success: false, message: "This order already has an active return or exchange request.", request: existingRequest });
  }
  const requestId = cleanText(body.id, 100) || `ret-${crypto.randomUUID()}`;
  const request = await ReturnRequest.findOneAndUpdate(
    { id: requestId },
    {
      id: requestId,
      orderId,
      type,
      reason,
      status: "Pending",
      customer: { name: order.customerName || auth.name || "", email: normalizeEmail(order.email), phone: order.phone || "" },
      items: Array.isArray(order.items) ? order.items.slice(0, 20) : [],
      updatedAt: new Date()
    },
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
app.get("/reviews", async (req, res) => {
  const auth = authContext(req);
  const query = auth.role === "admin" ? {} : { status: "Approved" };
  if (req.query.productId) query.productId = cleanText(req.query.productId, 120);
  const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(auth.role === "admin" ? 250 : 100);
  const safeReviews = auth.role === "admin" ? reviews : reviews.map((review) => {
    const result = review?.toObject ? review.toObject() : { ...review };
    delete result.userId;
    delete result.userEmail;
    return result;
  });
  res.json({ success: true, reviews: safeReviews });
});
app.post("/reviews", async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;
  const body = req.body || {};
  const productId = cleanText(body.productId, 120);
  const rating = Number(body.rating);
  const text = cleanText(body.text, 1200);
  const title = cleanText(body.title, 100);
  const photo = validImageDataUrl(body.photo, 8 * 1024 * 1024);
  if (!productId) return res.status(400).json({ success: false, message: "Choose a product to review." });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be from 1 to 5." });
  if (text.length < 12) return res.status(400).json({ success: false, message: "Review must contain at least 12 characters." });
  if (photo === null) return res.status(400).json({ success: false, message: "Review photo must be PNG, JPG, WEBP or AVIF and under 8 MB." });
  const product = await Product.findOne({ $or: [{ id: productId }, { slug: productId }], active: { $ne: false } });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  const user = await User.findById(auth.id);
  const verifiedPurchase = Boolean(await Order.exists({
    email: normalizeEmail(auth.email),
    status: "Delivered",
    "items.productId": product.id
  }));
  const review = await Review.findOneAndUpdate(
    { productId: product.id, userEmail: normalizeEmail(auth.email) },
    {
      $set: {
        userId: String(auth.id),
        userEmail: normalizeEmail(auth.email),
        name: cleanText(user?.name || auth.name || "Rivayat customer", 100),
        rating,
        title,
        text,
        verifiedPurchase,
        ...(photo ? { photo } : {}),
        status: "Pending",
        updatedAt: new Date()
      },
      $setOnInsert: { id: `review-${crypto.randomUUID()}`, productId: product.id, createdAt: new Date() }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true, message: "Review submitted for moderation.", review });
});
app.patch("/reviews/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = cleanText(req.body?.status, 20);
  if (!new Set(["Pending", "Approved", "Rejected"]).has(status)) {
    return res.status(400).json({ success: false, message: "Status must be Pending, Approved or Rejected." });
  }
  const review = await Review.findOneAndUpdate({ id: req.params.id }, { status, updatedAt: new Date() }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  await syncProductReviewStats(review.productId);
  res.json({ success: true, review });
});
app.delete("/reviews/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const review = await Review.findOneAndDelete({ id: req.params.id });
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  await syncProductReviewStats(review.productId);
  res.json({ success: true, message: "Review deleted successfully" });
});

app.post("/newsletter", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ success: false, message: "A valid email is required" });
  const lead = await Newsletter.findOneAndUpdate(
    { email },
    { email, phone: cleanText(req.body.phone, 24), source: cleanText(req.body.source, 80) || "Website" },
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
  const auth = requireUser(req, res);
  if (!auth) return;
  const prefix = String(auth.email).split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "MEMBER";
  const suffix = crypto.createHash("sha256").update(normalizeEmail(auth.email)).digest("hex").slice(0, 4).toUpperCase();
  const code = `RIV${prefix}${suffix}`;
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
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) return res.status(400).json({ success: false, message: "Enter a valid referral code and cart subtotal." });
  const referral = await Referral.findOne({ code, active: true });
  if (!referral) return res.status(404).json({ success: false, message: "Referral code not found" });
  const discount = Math.min(Number(referral.rewardValue || 50), subtotal);
  res.json({ success: true, referral: { code: referral.code, rewardValue: referral.rewardValue, active: referral.active }, discount });
});
app.get("/admin/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [orders, products, customers, returnRequests] = await Promise.all([Order.find(), Product.find(), User.find({ role: "customer" }), ReturnRequest.find()]);
  res.json({
    success: true,
    stats: {
      revenue: orders.filter((order) => order.status === "Delivered").reduce((sum, order) => sum + Number(order.price || 0), 0),
      activeOrderValue: orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.price || 0), 0),
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
app.post("/delivery/quote", (req, res) => {
  const pincode = String(req.body?.pincode || "").trim();
  const subtotal = Number(req.body?.subtotal || 0);
  if ((pincode && !PINCODE_PATTERN.test(pincode)) || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ success: false, message: "Enter a valid PIN code and subtotal." });
  }
  return res.json({ success: true, charge: deliveryChargeByPincode(pincode, subtotal), freeAbove: 999 });
});

app.get("/pincode/:pincode", async (req, res) => {
  const pincode = String(req.params.pincode || "").trim();
  if (!PINCODE_PATTERN.test(pincode)) {
    return res.status(400).json({ success: false, message: "Enter a valid 6-digit Indian PIN code." });
  }
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("India Post lookup is temporarily unavailable.");
    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0] : null;
    const office = result?.PostOffice?.[0];
    if (result?.Status !== "Success" || !office) {
      return res.status(404).json({ success: false, message: "India Post did not find this PIN code." });
    }
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.json({
      success: true,
      place: {
        city: office.Block || office.Taluk || office.Division || office.District || office.Name || "",
        district: office.District || "",
        state: office.State || ""
      },
      postOffices: (result.PostOffice || []).slice(0, 12).map((item) => item.Name).filter(Boolean)
    });
  } catch (error) {
    console.error("PIN code lookup error:", error);
    return res.status(502).json({ success: false, message: "India Post PIN-code lookup is temporarily unavailable." });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = /CORS policy/i.test(error?.message || "") ? 403 : 500;
  if (status === 500) console.error("Rivayat request error:", error);
  return res.status(status).json({
    success: false,
    message: status === 403 ? "This origin is not allowed." : "Rivayat could not complete this request."
  });
});

function validateConfiguration() {
  const errors = [];
  if (!MONGO_URI) errors.push("MONGO_URI is required");
  if (APP_SECRET.length < 32) errors.push("APP_SECRET must contain at least 32 characters");
  if (DEFAULT_ADMIN.email && !EMAIL_PATTERN.test(DEFAULT_ADMIN.email)) errors.push("ADMIN_EMAIL must be valid");
  if (DEFAULT_ADMIN.email && DEFAULT_ADMIN.password.length < 12) errors.push("ADMIN_PASSWORD must contain at least 12 characters when administrator seeding is enabled");
  if (DEFAULT_ADMIN.password && !DEFAULT_ADMIN.email) errors.push("ADMIN_EMAIL is required when ADMIN_PASSWORD is set");
  if (errors.length) throw new Error(`Invalid Rivayat configuration: ${errors.join("; ")}`);
}

async function startServer(port = PORT) {
  validateConfiguration();
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");
  return app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  startServer,
  validateConfiguration,
  helpers: {
    authContext,
    createToken,
    deliveryChargeByPincode,
    hashResetCode,
    normalizeEmail,
    orderPlainText,
    randomFourDigitCode,
    safeCssBackground,
    safeImageSource,
    sameHash,
    slugify,
    validImageDataUrl,
    verifyToken
  },
  models: {
    Coupon,
    Newsletter,
    Order,
    PasswordReset,
    Product,
    Referral,
    ReturnRequest,
    Review,
    SignupVerification,
    SiteSetting,
    User
  }
};
