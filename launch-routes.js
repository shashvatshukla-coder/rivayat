const crypto = require("crypto");

const EXPECTED_ROUTES = [
  ["POST", "/auth/google"],
  ["GET", "/launch/payment/config"],
  ["POST", "/launch/orders/cod"],
  ["POST", "/launch/payment/order"],
  ["POST", "/launch/payment/verify"],
  ["GET", "/launch/reviews/product/:id"],
  ["POST", "/launch/reviews"],
  ["GET", "/launch/admin/reviews"],
  ["PATCH", "/launch/admin/reviews/:id"],
  ["PATCH", "/launch/orders/:id/status-v2"]
];

let googleJwksCache = { keys: [], expiresAt: 0 };

function safeEqual(left = "", right = "") {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function expectedRazorpaySignature(secret, orderId, paymentId) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function verifyRazorpaySignature(secret, orderId, paymentId, signature) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqual(signature, expectedRazorpaySignature(secret, orderId, paymentId));
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(String(part), "base64url").toString("utf8"));
}

async function getGoogleJwks() {
  if (googleJwksCache.keys.length && googleJwksCache.expiresAt > Date.now()) return googleJwksCache.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Unable to load Google signing keys (${response.status}).`);
  const data = await response.json();
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeMs = Math.max(5 * 60 * 1000, Number(maxAgeMatch?.[1] || 3600) * 1000);
  googleJwksCache = { keys: Array.isArray(data.keys) ? data.keys : [], expiresAt: Date.now() + maxAgeMs };
  return googleJwksCache.keys;
}

function verifyGoogleIdTokenWithKey(encodedHeader, encodedPayload, encodedSignature, payload, jwk, clientId) {
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
  if (!audience.includes(clientId)) throw new Error("Google credential was issued for a different app.");
  if (!payload.exp || Number(payload.exp) <= now) throw new Error("Google credential has expired.");
  if (payload.iat && Number(payload.iat) > now + 300) throw new Error("Invalid Google credential time.");
  if (!payload.sub || !payload.email || payload.email_verified !== true) throw new Error("Google account email is not verified.");
  return payload;
}

async function verifyGoogleIdToken(idToken, clientId) {
  if (!clientId) {
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
  return verifyGoogleIdTokenWithKey(encodedHeader, encodedPayload, encodedSignature, payload, jwk, clientId);
}

function registerLaunchRoutes(deps) {
  const {
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
    GOOGLE_CLIENT_ID = "",
    RAZORPAY_KEY_ID = "",
    RAZORPAY_KEY_SECRET = ""
  } = deps;

  function launchError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  function nextOrderId() {
    return `RIV${Date.now()}${crypto.randomInt(1000, 10000)}`;
  }

  async function createLaunchOrder(body = {}, paymentMethod = "COD") {
    const customerName = String(body.customerName || "").trim().slice(0, 120);
    const email = normalizeEmail(body.email);
    const phone = String(body.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
    const address = {
      line1: String(body.address?.line1 || "").trim().slice(0, 300),
      city: String(body.address?.city || "").trim().slice(0, 100),
      state: String(body.address?.state || "").trim().slice(0, 100),
      pincode: String(body.address?.pincode || "").replace(/\D/g, "").slice(0, 6)
    };
    if (!customerName || !email || !phone || !address.line1 || !address.city || !address.state || !/^\d{6}$/.test(address.pincode)) {
      throw launchError("Complete name, email, phone and a valid delivery address are required.");
    }

    const submittedItems = Array.isArray(body.items) ? body.items : [];
    if (!submittedItems.length) throw launchError("Your bag is empty.");
    if (submittedItems.length > 50) throw launchError("Too many items in one order.");
    const requestedIds = [...new Set(submittedItems.map((item) => String(item.id || "").trim()).filter(Boolean))];
    const products = await Product.find({ id: { $in: requestedIds }, active: { $ne: false } });
    const byId = new Map(products.map((product) => [String(product.id), product]));
    const items = submittedItems.map((submitted) => {
      const product = byId.get(String(submitted.id || "").trim());
      if (!product) throw launchError("One of the products in your bag is no longer available.");
      const qty = Math.max(1, Math.min(20, Math.floor(Number(submitted.qty || submitted.quantity || 1))));
      const size = String(submitted.size || "").trim();
      if (!size || (Array.isArray(product.sizes) && product.sizes.length && !product.sizes.includes(size))) {
        throw launchError(`Choose a valid size for ${product.name}.`);
      }
      const available = Number(product.inventory?.[size] ?? 0);
      if (available < qty) throw launchError(`${product.name} (${size}) has only ${Math.max(0, available)} left.`);
      return {
        id: product.id,
        name: product.name,
        image: product.image || "",
        size,
        qty,
        quantity: qty,
        price: Number(product.price || 0)
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    if (!(subtotal > 0)) throw launchError("The order total is invalid.");
    const discount = 0;
    const delivery = deliveryChargeByPincode(address.pincode, subtotal);
    const price = Math.max(0, subtotal - discount + delivery);
    return Order.create({
      id: nextOrderId(),
      customerName,
      email,
      phone,
      productName: items.map((item) => item.name).join(", ").slice(0, 500),
      size: items.length === 1 ? items[0].size : "Multiple",
      quantity: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal,
      discount,
      delivery,
      price,
      paymentMethod,
      paymentStatus: "Pending",
      status: paymentMethod === "COD" ? "Confirmed" : "Pending",
      address,
      items,
      statusHistory: [{ status: paymentMethod === "COD" ? "Confirmed" : "Pending", at: new Date(), source: "checkout" }]
    });
  }

  async function adjustOrderStock(order, direction = -1) {
    const changed = [];
    try {
      for (const item of order.items || []) {
        const qty = Math.max(1, Number(item.qty || item.quantity || 1));
        const size = String(item.size || "");
        if (!/^[A-Za-z0-9 -]{1,24}$/.test(size)) throw launchError("Invalid product size.");
        const inventoryPath = `inventory.${size}`;
        const soldChange = direction < 0 ? qty : -qty;
        const filter = direction < 0 ? { id: item.id, [inventoryPath]: { $gte: qty } } : { id: item.id };
        const result = await Product.updateOne(filter, { $inc: { [inventoryPath]: direction * qty, soldCount: soldChange } });
        if (!result.modifiedCount) throw launchError(`${item.name || "An item"} is no longer available in the requested quantity.`, 409);
        changed.push({ id: item.id, inventoryPath, qty });
      }
    } catch (error) {
      if (direction < 0 && changed.length) {
        await Promise.all(changed.map((item) => Product.updateOne(
          { id: item.id },
          { $inc: { [item.inventoryPath]: item.qty, soldCount: -item.qty } }
        ))).catch(() => {});
      }
      throw error;
    }
  }

  async function notifyOrder(order) {
    const emailPromise = order.email
      ? sendEmail({ to: order.email, subject: `RIVAYAT order confirmed: ${order.id}`, html: `<pre>${orderPlainText(order)}</pre>` })
      : Promise.resolve({ skipped: true, reason: "Customer email is missing." });
    const telegramPromise = sendTelegramMessage(`New RIVAYAT order\n${orderPlainText(order)}`);
    const [emailResult, telegramResult] = await Promise.allSettled([emailPromise, telegramPromise]);
    return {
      email: emailResult.status === "fulfilled" ? emailResult.value : { success: false, message: emailResult.reason?.message || "Email failed." },
      telegram: telegramResult.status === "fulfilled" ? telegramResult.value : { success: false, message: telegramResult.reason?.message || "Telegram failed." }
    };
  }

  async function createRazorpayOrder(order) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw launchError("Online payment is temporarily unavailable. Please choose cash on delivery.", 503);
    }
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(Number(order.price || 0) * 100),
        currency: "INR",
        receipt: String(order.id).slice(0, 40),
        notes: { rivayatOrderId: order.id }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) throw launchError(data.error?.description || "Razorpay could not start the payment.", 502);
    return data;
  }

  function publicReview(review) {
    const value = typeof review?.toObject === "function" ? review.toObject() : review;
    return {
      ...value,
      reviewerName: value.reviewerName || value.name || "RIVAYAT customer",
      title: value.title || "Customer review",
      verifiedPurchase: Boolean(value.verifiedPurchase)
    };
  }

  app.post("/auth/google", async (req, res) => {
    try {
      const claims = await verifyGoogleIdToken(req.body.credential, GOOGLE_CLIENT_ID);
      const email = normalizeEmail(claims.email);
      const googleIsAuthoritativeForEmail = email.endsWith("@gmail.com") || Boolean(claims.hd && claims.email_verified === true);
      if (!googleIsAuthoritativeForEmail) {
        return res.status(400).json({ success: false, message: "For this Google account, please use email signup so RIVAYAT can verify the mailbox directly." });
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
      res.json({ success: true, message: "Google sign-in successful!", user: { ...publicUser(user), token: createToken(user) } });
    } catch (error) {
      res.status(error.statusCode || 401).json({ success: false, message: error.message });
    }
  });

  app.get("/launch/payment/config", (req, res) => {
    const configured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
    res.json({ success: true, configured, keyId: configured ? RAZORPAY_KEY_ID : "" });
  });

  app.post("/launch/orders/cod", async (req, res) => {
    let order;
    let stockAdjusted = false;
    try {
      order = await createLaunchOrder(req.body, "COD");
      await adjustOrderStock(order, -1);
      stockAdjusted = true;
      const notifications = await notifyOrder(order);
      res.status(201).json({ success: true, message: "Order confirmed.", order, ...notifications });
    } catch (error) {
      if (order?._id && !stockAdjusted) await Order.deleteOne({ _id: order._id }).catch(() => {});
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  app.post("/launch/payment/order", async (req, res) => {
    let order;
    try {
      order = await createLaunchOrder(req.body, "Razorpay");
      const razorpayOrder = await createRazorpayOrder(order);
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      res.status(201).json({
        success: true,
        keyId: RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        razorpayOrderId: razorpayOrder.id,
        internalId: order.id
      });
    } catch (error) {
      if (order?._id && !order.razorpayOrderId) await Order.deleteOne({ _id: order._id }).catch(() => {});
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  app.post("/launch/payment/verify", async (req, res) => {
    try {
      if (!RAZORPAY_KEY_SECRET) throw launchError("Online payment is not configured.", 503);
      const internalId = String(req.body.internalId || "");
      const razorpayOrderId = String(req.body.razorpay_order_id || "");
      const razorpayPaymentId = String(req.body.razorpay_payment_id || "");
      const signature = String(req.body.razorpay_signature || "");
      const existing = await Order.findOne({ id: internalId, razorpayOrderId });
      if (!existing) return res.status(404).json({ success: false, message: "Payment order not found." });
      if (existing.paymentStatus === "Paid") return res.json({ success: true, message: "Payment already verified.", order: existing });
      if (!verifyRazorpaySignature(RAZORPAY_KEY_SECRET, razorpayOrderId, razorpayPaymentId, signature)) {
        return res.status(400).json({ success: false, message: "Payment signature verification failed." });
      }
      const order = await Order.findOneAndUpdate(
        { id: internalId, razorpayOrderId, paymentStatus: { $ne: "Paid" } },
        { paymentStatus: "Verifying", updatedAt: new Date() },
        { new: true }
      );
      if (!order) {
        const paid = await Order.findOne({ id: internalId, razorpayOrderId });
        return res.json({ success: true, message: "Payment already verified.", order: paid });
      }
      try {
        await adjustOrderStock(order, -1);
      } catch (error) {
        await Order.updateOne({ _id: order._id }, { paymentStatus: "Pending", updatedAt: new Date() }).catch(() => {});
        throw error;
      }
      order.razorpayPaymentId = razorpayPaymentId;
      order.paymentSignature = signature;
      order.paymentStatus = "Paid";
      order.status = "Confirmed";
      order.updatedAt = new Date();
      order.statusHistory = [...(order.statusHistory || []), { status: "Confirmed", at: new Date(), source: "razorpay" }];
      await order.save();
      const notifications = await notifyOrder(order);
      res.json({ success: true, message: "Payment verified and order confirmed.", order, ...notifications });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  app.get("/launch/reviews/product/:id", async (req, res) => {
    try {
      const reviews = await Review.find({ productId: req.params.id, status: "Approved" }).sort({ createdAt: -1 });
      const average = reviews.length
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1))
        : 0;
      res.json({ success: true, reviews: reviews.map(publicReview), summary: { count: reviews.length, average } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/launch/reviews", async (req, res) => {
    try {
      const auth = authContext(req);
      if (!auth.email) return res.status(401).json({ success: false, message: "Please sign in to write a review." });
      const user = await User.findOne({ email: normalizeEmail(auth.email) });
      if (!user) return res.status(401).json({ success: false, message: "Please sign in again." });
      const productId = String(req.body.productId || "").trim();
      const product = await Product.findOne({ id: productId, active: { $ne: false } });
      if (!product) return res.status(404).json({ success: false, message: "Product not found." });
      const rating = Math.floor(Number(req.body.rating || 0));
      const title = String(req.body.title || "").trim().slice(0, 120);
      const text = String(req.body.text || "").trim().slice(0, 2000);
      if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Choose a rating from 1 to 5." });
      if (text.length < 10) return res.status(400).json({ success: false, message: "Please write at least 10 characters." });
      const verifiedPurchase = Boolean(await Order.exists({
        email: normalizeEmail(auth.email),
        status: "Delivered",
        items: { $elemMatch: { id: productId } }
      }));
      const review = await Review.create({
        id: `review-${Date.now()}-${crypto.randomInt(1000, 10000)}`,
        productId,
        name: user.name,
        reviewerName: user.name,
        reviewerEmail: normalizeEmail(user.email),
        rating,
        title,
        text,
        verifiedPurchase,
        status: "Pending"
      });
      res.status(201).json({ success: true, message: "Review submitted for moderation.", review: publicReview(review) });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  app.get("/launch/admin/reviews", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, reviews: reviews.map(publicReview) });
  });

  app.patch("/launch/admin/reviews/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const status = String(req.body.status || "");
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid review status." });
    }
    const review = await Review.findOneAndUpdate({ id: req.params.id }, { status, updatedAt: new Date() }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });
    res.json({ success: true, message: "Review updated.", review: publicReview(review) });
  });

  app.patch("/launch/orders/:id/status-v2", async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const status = String(req.body.status || "");
      if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid order status" });
      const order = await Order.findOne({ id: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      order.status = status;
      order.updatedAt = new Date();
      order.statusHistory = [...(order.statusHistory || []), { status, at: new Date(), source: "admin" }];
      await order.save();
      const email = order.email
        ? await sendEmail({ to: order.email, subject: `RIVAYAT order ${order.id}: ${order.status}`, html: orderStatusEmail(order) })
        : { skipped: true, reason: "Customer email is missing." };
      sendTelegramMessage(`RIVAYAT order status updated\nOrder: ${order.id}\nStatus: ${order.status}`).catch(() => {});
      res.json({ success: true, message: "Order status updated successfully", order, email });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });
}

registerLaunchRoutes.expectedRoutes = EXPECTED_ROUTES;
registerLaunchRoutes.verifyRazorpaySignature = verifyRazorpaySignature;
module.exports = registerLaunchRoutes;
