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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "RIVAYAT <orders@rivayat.in>";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  heroPill: "NEW ARRIVALS • DROP 01",
  heroTitle: "Everyday streetwear, done better.",
  heroSubtitle: "Clean silhouettes, useful details and dependable quality—designed to become the pieces you reach for most.",
  heroImage: "",
  heroOffer: "Free shipping above Rs 999 • VIBE10 for 10% off",
  primaryButtonText: "Shop now",
  secondaryButtonText: "Explore categories"
};
const DEFAULT_COUPONS = [
  { id: "c1", code: "RIVAYAT150", type: "fixed", value: 150, minCart: 699, active: true, expiry: "2027-12-31", description: "Rs 150 off above Rs 699" },
  { id: "c2", code: "VIBE10", type: "percent", value: 10, minCart: 0, active: true, expiry: "2027-12-31", description: "10% off on all orders" },
  { id: "c3", code: "LAUNCH20", type: "percent", value: 20, minCart: 999, active: false, expiry: "2027-12-31", description: "20% launch discount above Rs 999" }
];

const LEGACY_STOREFRONT_PRODUCT_IDS = ["rivayat-half-pant-black", "rivayat-half-pant-white", "rivayat-full-pant", "rivayat-motion-half-pant", "rivayat-everyday-half-pant-ivory", "rivayat-travel-full-pant-graphite", "rivayat-everyday-full-pant-black", "rivayat-prive-signature-black", "rivayat-prive-ivory-half", "rivayat-prive-onyx-half", "rivayat-prive-travel-trouser", "rivayat-prive-pearl-half"];
const DEFAULT_PRODUCTS = [
  { id:"static-noise-oversized-tee", slug:"static-noise-oversized-tee", name:"Static Noise Oversized Tee", category:"T-Shirts", color:"Bone", badge:"DROP 01", mrp:1299, price:849, rating:4.9, reviews:46, soldCount:31, bg:"linear-gradient(145deg,#e9e4d8,#f7f3ea 58%,#d8ff3e 58%)", art:"bone", type:"tee", tier:"standard" },
  { id:"after-hours-oversized-tee", slug:"after-hours-oversized-tee", name:"After Hours Oversized Tee", category:"T-Shirts", color:"Black", badge:"AFTER DARK", mrp:1399, price:899, rating:4.9, reviews:39, soldCount:26, bg:"linear-gradient(145deg,#0c0c0e,#26262b 66%,#ff5c8a 66%)", art:"black", type:"tee", tier:"standard" },
  { id:"signal-boxy-tee-acid-grey", slug:"signal-boxy-tee-acid-grey", name:"Signal Boxy Tee", category:"T-Shirts", color:"Acid Grey", badge:"NEW SIGNAL", mrp:1499, price:949, rating:4.8, reviews:28, soldCount:18, bg:"linear-gradient(145deg,#b7b6b2,#deddd8 63%,#5b4dff 63%)", art:"grey", type:"tee", tier:"standard" },
  { id:"studio-cargo-01-graphite", slug:"studio-cargo-01-graphite", name:"Studio Cargo 01", category:"Cargos", color:"Graphite", badge:"UTILITY 01", mrp:2299, price:1599, rating:4.9, reviews:34, soldCount:24, bg:"linear-gradient(145deg,#222326,#4b4d51 68%,#d8ff3e 68%)", art:"graphite", type:"cargo", tier:"standard" },
  { id:"utility-cargo-02-olive", slug:"utility-cargo-02-olive", name:"Utility Cargo 02", category:"Cargos", color:"Olive", badge:"FIELD UNIT", mrp:2399, price:1699, rating:4.8, reviews:25, soldCount:15, bg:"linear-gradient(145deg,#3e4637,#6d775f 68%,#f2c94c 68%)", art:"olive", type:"cargo", tier:"standard" },
  { id:"wide-leg-denim-01", slug:"wide-leg-denim-01", name:"Wide-Leg Denim 01", category:"Denim", color:"Washed Blue", badge:"DENIM LAB", mrp:2699, price:1899, rating:4.9, reviews:31, soldCount:20, bg:"linear-gradient(145deg,#6480a4,#a9bdd1 68%,#ff6b35 68%)", art:"blue", type:"denim", tier:"standard" },
  { id:"night-shift-denim-02", slug:"night-shift-denim-02", name:"Night Shift Denim 02", category:"Denim", color:"Black Wash", badge:"NIGHT SHIFT", mrp:2799, price:1999, rating:4.9, reviews:22, soldCount:14, bg:"linear-gradient(145deg,#17171a,#55555c 68%,#00d4ff 68%)", art:"black", type:"denim", tier:"standard" },
  { id:"sunday-heavyweight-hoodie", slug:"sunday-heavyweight-hoodie", name:"Sunday Heavyweight Hoodie", category:"Hoodies", color:"Ash", badge:"OFF DUTY", mrp:2899, price:2099, rating:4.9, reviews:27, soldCount:17, bg:"linear-gradient(145deg,#c6c4bf,#efede8 68%,#5b4dff 68%)", art:"ash", type:"hoodie", tier:"standard" },
  { id:"zero-hour-hoodie-black", slug:"zero-hour-hoodie-black", name:"Zero Hour Hoodie", category:"Hoodies", color:"Black", badge:"ZERO HOUR", mrp:2999, price:2199, rating:4.9, reviews:24, soldCount:16, bg:"linear-gradient(145deg,#09090b,#2a2a30 68%,#ff5c8a 68%)", art:"black", type:"hoodie", tier:"standard" },
  { id:"mono-coord-set-stone", slug:"mono-coord-set-stone", name:"Mono Co-ord Set", category:"Co-ords", color:"Stone", badge:"SET 001", mrp:3499, price:2499, rating:4.8, reviews:19, soldCount:11, bg:"linear-gradient(145deg,#b9a994,#e3dbd0 68%,#d8ff3e 68%)", art:"stone", type:"coord", tier:"standard" },
  { id:"archive-zip-shirt-ecru", slug:"archive-zip-shirt-ecru", name:"Archive Zip Shirt", category:"Shirts", color:"Ecru", badge:"ARCHIVE", mrp:2199, price:1499, rating:4.8, reviews:21, soldCount:13, bg:"linear-gradient(145deg,#e8dfd0,#f8f3ea 68%,#ff6b35 68%)", art:"ecru", type:"shirt", tier:"standard" },
  { id:"noir-sculpt-overshirt", slug:"noir-sculpt-overshirt", name:"NOIR Sculpt Overshirt", category:"Overshirts", color:"Ink", badge:"RIVAYAT / NOIR", mrp:4299, price:3199, rating:5.0, reviews:13, soldCount:8, bg:"linear-gradient(145deg,#050506,#1c1c21 70%,#d8ff3e 70%)", art:"ink", type:"overshirt", tier:"premium" },
  { id:"noir-tailored-cargo", slug:"noir-tailored-cargo", name:"NOIR Tailored Cargo", category:"Cargos", color:"Deep Charcoal", badge:"RIVAYAT / NOIR", mrp:3999, price:2999, rating:5.0, reviews:12, soldCount:7, bg:"linear-gradient(145deg,#111216,#34353c 70%,#5b4dff 70%)", art:"charcoal", type:"cargo", tier:"premium" },
  { id:"noir-varsity-jacket", slug:"noir-varsity-jacket", name:"NOIR Varsity Jacket", category:"Jackets", color:"Black / Bone", badge:"RIVAYAT / NOIR", mrp:5499, price:3999, rating:5.0, reviews:9, soldCount:5, bg:"linear-gradient(145deg,#070708,#26262a 52%,#e8dfd0 52% 78%,#ff5c8a 78%)", art:"black", type:"jacket", tier:"premium" },
  { id:"noir-structured-trouser", slug:"noir-structured-trouser", name:"NOIR Structured Trouser", category:"Trousers", color:"Obsidian", badge:"RIVAYAT / NOIR", mrp:3799, price:2799, rating:4.9, reviews:11, soldCount:6, bg:"linear-gradient(145deg,#08090b,#25262b 70%,#00d4ff 70%)", art:"obsidian", type:"trouser", tier:"premium" }
];

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use(express.static(__dirname));

mongoose.set("strictQuery", true);

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  password: { type: String, default: "" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: { type: Array, default: [] },
  emailVerified: { type: Boolean, default: false },
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
  category: { type: String, default: "T-Shirts" },
  color: { type: String, default: "Black" },
  badge: { type: String, default: "New Arrival" },
  mrp: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  sizes: { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
  inventory: { type: Object, default: () => ({ S: 10, M: 10, L: 10, XL: 10, XXL: 10 }) },
  rating: { type: Number, default: 4.7 },
  reviews: { type: Number, default: 0 },
  description: { type: String, default: "Official RIVAYAT piece" },
  details: { type: [String], default: ["Official RIVAYAT piece"] },
  image: { type: String, default: "" },
  gallery: { type: [String], default: [] },
  sizeChartImage: { type: String, default: "" },
  sizeChart: { type: Object, default: () => ({}) },
  bg: { type: String, default: "" },
  art: { type: String, default: "black" },
  type: { type: String, default: "short" },
  tier: { type: String, enum: ["standard", "premium"], default: "standard" },
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
const EmailVerificationSchema = new mongoose.Schema({
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
  emailVerified: Boolean(user.emailVerified),
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
  return verifyToken(token) || { role: "guest", email: "" };
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

function hashVerificationCode(email, code) {
  return crypto.createHmac("sha256", APP_SECRET).update(`verify:${normalizeEmail(email)}:${String(code).trim()}`).digest("hex");
}

async function createEmailVerification(user, { throttle = false } = {}) {
  const email = normalizeEmail(user?.email);
  if (!email) throw new Error("A valid email is required for verification.");

  if (throttle) {
    const recent = await EmailVerification.findOne({
      email,
      usedAt: null,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    }).sort({ createdAt: -1 });
    if (recent) {
      const error = new Error("Please wait one minute before requesting another verification code.");
      error.statusCode = 429;
      throw error;
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await EmailVerification.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });
  await EmailVerification.create({
    email,
    codeHash: hashVerificationCode(email, code),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  });

  const emailResult = await sendEmail({
    to: email,
    subject: "Verify your RIVAYAT email",
    html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:auto"><h1 style="letter-spacing:4px">RIVAYAT</h1><p>Hi ${user.name || "Customer"},</p><p>Use this code to verify your email and activate your account:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px;margin:24px 0">${code}</p><p>This code expires in 15 minutes. If you did not create this account, you can ignore this email.</p></div>`
  });

  const exposeCode = process.env.NODE_ENV !== "production" && !emailResult.success;
  return {
    delivered: Boolean(emailResult.success),
    email: emailResult,
    code: exposeCode ? code : undefined
  };
}

let googleJwksCache = { keys: [], expiresAt: 0 };
async function getGoogleJwks() {
  if (googleJwksCache.keys.length && googleJwksCache.expiresAt > Date.now()) return googleJwksCache.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw new Error(`Unable to load Google signing keys (${response.status}).`);
  const data = await response.json();
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeMs = Math.max(5 * 60 * 1000, Number(maxAgeMatch?.[1] || 3600) * 1000);
  googleJwksCache = { keys: Array.isArray(data.keys) ? data.keys : [], expiresAt: Date.now() + maxAgeMs };
  return googleJwksCache.keys;
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(String(part), "base64url").toString("utf8"));
}

function verifyGoogleIdTokenWithKey(encodedHeader, encodedPayload, encodedSignature, payload, jwk) {
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const validSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, "base64url")
  );
  if (!validSignature) throw new Error("Invalid Google credential signature.");

  const issuerOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);
  if (!issuerOk) throw new Error("Invalid Google credential issuer.");
  if (!audience.includes(GOOGLE_CLIENT_ID)) throw new Error("Google credential was issued for a different app.");
  if (!payload.exp || Number(payload.exp) <= now) throw new Error("Google credential has expired.");
  if (payload.iat && Number(payload.iat) > now + 300) throw new Error("Invalid Google credential time.");
  if (!payload.sub || !payload.email || payload.email_verified !== true) throw new Error("Google account email is not verified.");
  return payload;
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    const error = new Error("Google sign-in is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid Google credential.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google credential.");

  let keys = await getGoogleJwks();
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    googleJwksCache.expiresAt = 0;
    keys = await getGoogleJwks();
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) throw new Error("Google signing key was not found.");
  return verifyGoogleIdTokenWithKey(encodedHeader, encodedPayload, encodedSignature, payload, jwk);
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
  // Existing accounts created before email verification was introduced should keep working.
  await User.collection.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true, authProvider: "password" } }
  );

  if (DEFAULT_ADMIN) {
    const existingAdmin = await User.findOne({ $or: [{ email: DEFAULT_ADMIN.email }, { username: DEFAULT_ADMIN.username }] });
    if (!existingAdmin) {
      await User.create({
        username: DEFAULT_ADMIN.username,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        phone: DEFAULT_ADMIN.phone,
        password: await bcrypt.hash(DEFAULT_ADMIN.password, 12),
        role: "admin",
        emailVerified: true,
        authProvider: "password"
      });
    } else {
      existingAdmin.role = "admin";
      existingAdmin.username = existingAdmin.username || DEFAULT_ADMIN.username;
      existingAdmin.emailVerified = true;
      existingAdmin.authProvider = existingAdmin.googleSub ? "hybrid" : "password";
      await existingAdmin.save();
    }
  }

  for (const coupon of DEFAULT_COUPONS) {
    await Coupon.findOneAndUpdate({ code: coupon.code }, { $setOnInsert: coupon }, { upsert: true, setDefaultsOnInsert: true });
  }
  await Product.updateMany(
    { id: { $in: LEGACY_STOREFRONT_PRODUCT_IDS } },
    { $set: { active: false, updatedAt: new Date() } }
  );
  for (const product of DEFAULT_PRODUCTS) {
    await Product.findOneAndUpdate(
      { id: product.id },
      { $set: { ...product, active: true, updatedAt: new Date() } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  await SiteSetting.updateOne(
    {
      key: "homepage",
      $or: [
        { "value.heroTitle": /Own Your Vibe/i },
        { "value.heroPill": /Premium Indian D2C Fashion/i },
        { "value.heroOffer": /Half Pants from/i }
      ]
    },
    { $set: { value: DEFAULT_HOMEPAGE, updatedAt: new Date() } }
  );
  await SiteSetting.findOneAndUpdate(
    { key: "homepage" },
    { $setOnInsert: { key: "homepage", value: DEFAULT_HOMEPAGE } },
    { upsert: true }
  );
}
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/api", (req, res) => res.json({ success: true, message: "Rivayat backend running" }));
app.get("/health", (req, res) => res.json({ success: true }));
app.get("/public-config", (req, res) => res.json({
  success: true,
  config: {
    googleClientId: GOOGLE_CLIENT_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  }
}));

app.post("/telegram/test", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await sendTelegramMessage(`RIVAYAT Telegram test successful\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\nChat ID: ${TELEGRAM_CHAT_ID}`);
  if (result.skipped) return res.status(400).json({ success: false, message: result.reason });
  if (!result.success) return res.status(500).json({ success: false, message: result.message });
  res.json({ success: true, message: "Telegram test message sent.", result });
});
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    const cleanEmail = normalizeEmail(email);
    if (String(password).length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

    let user = await User.findOne({ email: cleanEmail });
    if (user?.emailVerified) return res.status(400).json({ success: false, message: "Email already registered. Please login." });

    if (!user) {
      user = await User.create({
        name: String(name).trim(),
        email: cleanEmail,
        phone: String(phone || "").trim(),
        password: await bcrypt.hash(password, 12),
        role: "customer",
        emailVerified: false,
        authProvider: "password"
      });
    } else {
      user.name = String(name).trim();
      user.phone = String(phone || "").trim();
      user.password = await bcrypt.hash(password, 12);
      user.authProvider = user.googleSub ? "hybrid" : "password";
      await user.save();
    }

    const verification = await createEmailVerification(user);
    if (!verification.delivered && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        requiresVerification: true,
        email: cleanEmail,
        message: "Your account was created, but verification email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM, then resend the code."
      });
    }

    res.json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: verification.delivered
        ? "Account created. We sent a 6-digit verification code to your email."
        : "Account created. Email delivery is not configured, so a local testing code was generated.",
      verificationCode: verification.code
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

app.post("/verify-email", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!email || !code) return res.status(400).json({ success: false, message: "Email and verification code are required." });

    const verification = await EmailVerification.findOne({ email, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!verification || !sameHash(verification.codeHash, hashVerificationCode(email, code))) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Account not found." });

    verification.usedAt = new Date();
    user.emailVerified = true;
    user.authProvider = user.googleSub && user.password ? "hybrid" : (user.googleSub ? "google" : "password");
    user.lastLoginAt = new Date();
    await Promise.all([verification.save(), user.save()]);

    res.json({
      success: true,
      message: "Email verified successfully. Welcome to RIVAYAT!",
      user: { ...publicUser(user), token: createToken(user) }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

app.post("/resend-verification", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If this account exists, a verification code has been sent." });
    if (user.emailVerified) return res.json({ success: true, verified: true, message: "This email is already verified. You can login." });

    const verification = await createEmailVerification(user, { throttle: true });
    if (!verification.delivered && process.env.NODE_ENV === "production") {
      return res.status(503).json({ success: false, message: "Verification email delivery is not configured." });
    }
    res.json({
      success: true,
      message: verification.delivered ? "A new verification code was sent." : "A local testing verification code was generated.",
      verificationCode: verification.code
    });
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
    if (!user.password) return res.status(401).json({ success: false, message: "This account uses Google sign-in. Continue with Google or set a password using Forgot Password." });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });

    if (!user.emailVerified) {
      let verificationMessage = "Please verify your email before logging in.";
      try {
        const verification = await createEmailVerification(user, { throttle: true });
        if (verification.delivered) verificationMessage = "Please verify your email before logging in. A new code was sent.";
      } catch (error) {
        if (error.statusCode !== 429) console.warn("Verification resend during login failed:", error.message);
      }
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: verificationMessage
      });
    }

    user.lastLoginAt = new Date();
    await user.save();
    res.json({ success: true, message: "Login successful!", user: { ...publicUser(user), token: createToken(user) } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

app.post("/auth/google", async (req, res) => {
  try {
    const claims = await verifyGoogleIdToken(req.body.credential);
    const email = normalizeEmail(claims.email);
    const googleIsAuthoritativeForEmail = email.endsWith("@gmail.com") || Boolean(claims.hd && claims.email_verified === true);
    if (!googleIsAuthoritativeForEmail) {
      return res.status(400).json({
        success: false,
        message: "For Google accounts using a non-Gmail, non-Workspace email, please use email signup so RIVAYAT can verify the mailbox directly."
      });
    }
    let user = await User.findOne({ googleSub: claims.sub });
    if (!user) user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: claims.name || email.split("@")[0],
        email,
        phone: "",
        password: "",
        role: "customer",
        emailVerified: true,
        authProvider: "google",
        googleSub: claims.sub,
        avatar: claims.picture || "",
        lastLoginAt: new Date()
      });
    } else {
      if (user.googleSub && user.googleSub !== claims.sub) {
        return res.status(409).json({ success: false, message: "This email is linked to a different Google account." });
      }
      user.googleSub = claims.sub;
      user.emailVerified = true;
      user.avatar = claims.picture || user.avatar || "";
      user.name = user.name || claims.name || email.split("@")[0];
      user.authProvider = user.password ? "hybrid" : "google";
      user.lastLoginAt = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: "Google sign-in successful!",
      user: { ...publicUser(user), token: createToken(user) }
    });
  } catch (error) {
    res.status(error.statusCode || 401).json({ success: false, message: error.message });
  }
});

app.put("/profile", async (req, res) => {
  try {
    const auth = authContext(req);
    const email = normalizeEmail(auth.email);

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Please login first."
      });
    }

    const { name, phone, addresses } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (typeof name === "string") {
      user.name = name.trim();
    }

    if (typeof phone === "string") {
      user.phone = phone.trim();
    }

    if (Array.isArray(addresses)) {
      user.addresses = addresses;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: { ...publicUser(user), token: createToken(user) }
    });

  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      success: false,
      message: "Server error."
    });
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
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    const reset = await PasswordReset.findOne({ email, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!reset || !sameHash(reset.codeHash, hashResetCode(email, code))) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
    user.password = await bcrypt.hash(password, 12);
    user.authProvider = user.googleSub ? "hybrid" : "password";
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
  const auth = authContext(req);
  if (!auth.email) return res.status(401).json({ success: false, message: "Login required" });
  const body = req.body || {};
  const order = await Order.findOne({ id: body.orderId, email: normalizeEmail(auth.email) });
  if (!order && auth.role !== "admin") return res.status(403).json({ success: false, message: "You can only return your own order." });
  const request = await ReturnRequest.findOneAndUpdate(
    { id: body.id || `ret-${Date.now()}` },
    { ...body, customer: { ...(body.customer || {}), email: normalizeEmail(auth.email) }, id: body.id || `ret-${Date.now()}`, updatedAt: new Date() },
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

function validateConfig() {
  const errors = [];
  if (!MONGO_URI) errors.push("MONGO_URI is required");
  if (APP_SECRET.length < 32) errors.push("APP_SECRET must contain at least 32 characters");
  if ((process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD) || (!process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)) {
    errors.push("ADMIN_EMAIL and ADMIN_PASSWORD must be configured together");
  }
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) errors.push("ADMIN_PASSWORD must contain at least 12 characters");
  if (errors.length) throw new Error(`Invalid configuration: ${errors.join("; ")}`);
}

async function startServer() {
  validateConfig();
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");
  await ensureDefaultData();
  return app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, authContext, createToken, verifyToken, deliveryChargeByPincode, validateConfig, startServer };
