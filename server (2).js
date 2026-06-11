const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

// ─── DATABASE CONNECTION ───────────────────────────────────────────────────────
mongoose.connect(
  "mongodb+srv://AdminRivayat:rivayatfashion@cluster0.wk2qecc.mongodb.net/rivayat?retryWrites=true&w=majority&appName=Cluster0"
)
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.log("❌ MongoDB Error:", err.message));


// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: "" },
  password:  { type: String, required: true },
  role:      { type: String, default: "customer" },
  addresses: { type: Array,  default: [] },
  createdAt: { type: Date,   default: Date.now }
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
  status:        { type: String, default: "Pending" },
  address:       Object,
  items:         Array,
  createdAt:     { type: Date, default: Date.now }
});

const User  = mongoose.model("User",  UserSchema);
const Order = mongoose.model("Order", OrderSchema);


// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("✅ Rivayat Backend Running");
});


// ─── SIGNUP ───────────────────────────────────────────────────────────────────
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered. Please login." });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
      role: "customer"
    });

    await user.save();

    // Return user without password
    const safeUser = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, addresses: user.addresses };

    res.json({ success: true, message: "Account created successfully!", user: safeUser });

  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});


// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with this email." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
    }

    // Return user without password
    const safeUser = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, addresses: user.addresses };

    res.json({ success: true, message: "Login successful!", user: safeUser });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});


// ─── SAVE ORDER ───────────────────────────────────────────────────────────────
app.post("/orders", async (req, res) => {
  try {
    const body = req.body;

    // Avoid duplicate order IDs
    const existing = await Order.findOne({ id: body.orderId || body.id });
    if (existing) {
      return res.json({ success: true, message: "Order already saved." });
    }

    const order = new Order({
      id:            body.orderId || body.id,
      customerName:  body.customerName,
      phone:         body.phone,
      email:         body.email,
      productName:   body.productName,
      size:          body.size,
      quantity:      body.quantity,
      subtotal:      body.subtotal,
      discount:      body.discount,
      delivery:      body.delivery,
      price:         body.price,
      paymentMethod: body.paymentMethod,
      paymentStatus: body.paymentStatus,
      status:        "Pending",
      address:       body.address,
      items:         body.items
    });

    await order.save();
    console.log("✅ Order saved:", order.id);

    res.json({ success: true, message: "Order saved successfully!" });

  } catch (error) {
    console.error("Order error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── GET ALL ORDERS (for admin) ────────────────────────────────────────────────
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
