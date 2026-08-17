const crypto = require('crypto');
const mongoose = require('mongoose');
const { app, createToken } = require('./server');

const APP_SECRET = process.env.APP_SECRET || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'RIVAYAT <orders@rivayat.in>';

const User = mongoose.model('User');
const Product = mongoose.model('Product');
const Order = mongoose.model('Order');
const ReturnRequest = mongoose.model('ReturnRequest');
const EmailVerification = mongoose.model('EmailVerification');
const PasswordReset = mongoose.model('PasswordReset');
const SiteSetting = mongoose.model('SiteSetting');

const ORDER_STATUSES = ['Pending','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled'];
const RETURN_STATUSES = ['Pending','Approved','Rejected','Resolved'];
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function verifyToken(token = '') {
  try {
    const [body, sig] = String(token).split('.');
    if (!body || !sig || !APP_SECRET) return null;
    const expected = crypto.createHmac('sha256', APP_SECRET).update(body).digest('base64url');
    const left = Buffer.from(sig);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
function authContext(req) {
  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return verifyToken(token) || { role:'guest', email:'' };
}
function requireAdmin(req, res) {
  const auth = authContext(req);
  if (auth.role === 'admin') return auth;
  res.status(403).json({ success:false, message:'Admin access required.' });
  return null;
}
async function sendEmail({to,subject,html}) {
  if (!RESEND_API_KEY || !to) return { skipped:true };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${RESEND_API_KEY}`},
      body:JSON.stringify({ from:EMAIL_FROM, to:[to], subject, html })
    });
    if (!response.ok) throw new Error(`Email error ${response.status}`);
    return { success:true };
  } catch (error) { return { success:false, message:error.message }; }
}
function publicUser(user) {
  return {
    id:user._id, username:user.username, name:user.name, email:user.email, phone:user.phone,
    role:user.role, addresses:user.addresses || [], emailVerified:Boolean(user.emailVerified),
    authProvider:user.authProvider || 'password', avatar:user.avatar || ''
  };
}
function validAvatar(value='') {
  if (!value) return true;
  if (/^https:\/\//i.test(value)) return value.length <= 2048;
  return /^data:image\/(webp|png|jpeg|jpg|avif);base64,/i.test(value) && value.length <= 2_200_000;
}
function validProductImage(value='') {
  if (!value) return true;
  if (/^sprite:\d+,\d+$/i.test(value)) return true;
  if (/^https:\/\//i.test(value)) return value.length <= 4096;
  return /^data:image\/(webp|png|jpeg|jpg|avif);base64,/i.test(value) && value.length <= 3_200_000;
}
function orderStatusEmail(order) {
  const statuses = ORDER_STATUSES.filter(s => s !== 'Cancelled');
  const idx = statuses.indexOf(order.status);
  const steps = statuses.map((s,i)=>`<div style="display:flex;gap:10px;align-items:center;margin:8px 0"><span style="width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;background:${i<=idx?'#111':'#e9e7e2'};color:${i<=idx?'#fff':'#777'};font-size:12px">${i<=idx?'✓':'•'}</span><span style="font-weight:${i===idx?800:500};color:${i<=idx?'#111':'#777'}">${escapeHtml(s)}</span></div>`).join('');
  const cancelled = order.status === 'Cancelled';
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111;background:#fff;padding:28px"><div style="letter-spacing:5px;font-weight:900;font-size:22px">RIVAYAT</div><p style="color:#666;margin-top:6px">Order update</p><h1 style="font-size:28px;margin:24px 0 8px">${cancelled?'Your order was cancelled.':'Your order is '+escapeHtml(order.status)+'.'}</h1><p style="color:#555">Order <strong>${escapeHtml(order.id)}</strong></p>${cancelled?'<div style="padding:14px;background:#fff3f3;border:1px solid #f2cccc;border-radius:12px">If you did not request this cancellation, reply to this email or contact support.</div>':`<div style="margin:24px 0">${steps}</div>`}<p style="margin-top:28px;color:#666">We will email you again when the status changes.</p><p style="font-size:12px;color:#888">RIVAYAT · Transactional order notification</p></div>`;
}

app.get('/launch/legal-settings', async (req,res) => {
  try {
    const setting = await SiteSetting.findOne({key:'legal'});
    res.json({success:true,settings:setting?.value || {}});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.put('/launch/legal-settings', async (req,res) => {
  if (!requireAdmin(req,res)) return;
  try {
    const input=req.body || {};
    const value={
      operator:String(input.operator||'RIVAYAT').trim().slice(0,160),
      businessAddress:String(input.businessAddress||'').trim().slice(0,500),
      privacyEmail:String(input.privacyEmail||input.email||'support@rivayat.in').trim().slice(0,160),
      supportPhone:String(input.supportPhone||'').trim().slice(0,40),
      grievanceOfficer:String(input.grievanceOfficer||'').trim().slice(0,160),
      grievanceEmail:String(input.grievanceEmail||input.privacyEmail||'support@rivayat.in').trim().slice(0,160),
      gstin:String(input.gstin||'').trim().slice(0,40),
      returnDays:Math.max(1,Math.min(30,Number(input.returnDays||7))),
      updatedAt:new Date().toISOString()
    };
    const setting=await SiteSetting.findOneAndUpdate({key:'legal'},{$set:{key:'legal',value,updatedAt:new Date()}},{upsert:true,new:true});
    res.json({success:true,settings:setting.value});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.put('/launch/profile', async (req,res) => {
  try {
    const auth = authContext(req); const email = normalizeEmail(auth.email);
    if (!email) return res.status(401).json({success:false,message:'Please sign in first.'});
    const user = await User.findOne({email});
    if (!user) return res.status(404).json({success:false,message:'Account not found.'});
    const {name,phone,addresses,avatar} = req.body || {};
    if (typeof name === 'string') user.name = name.trim().slice(0,100);
    if (typeof phone === 'string') user.phone = phone.trim().slice(0,30);
    if (Array.isArray(addresses)) user.addresses = addresses.slice(0,10);
    if (typeof avatar === 'string') {
      if (!validAvatar(avatar)) return res.status(413).json({success:false,message:'Profile photo is too large or unsupported.'});
      user.avatar = avatar;
    }
    await user.save();
    res.json({success:true,user:{...publicUser(user),token:createToken(user)}});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.delete('/launch/account', async (req,res) => {
  try {
    const auth = authContext(req); const email = normalizeEmail(auth.email);
    if (!email) return res.status(401).json({success:false,message:'Please sign in first.'});
    if (String(req.body?.confirmation || '') !== 'DELETE') return res.status(400).json({success:false,message:'Type DELETE to confirm account deletion.'});
    const user = await User.findOne({email});
    if (!user) return res.json({success:true});
    if (user.role === 'admin') return res.status(403).json({success:false,message:'Admin accounts cannot be deleted from the storefront.'});
    await Promise.all([
      User.deleteOne({_id:user._id}),
      EmailVerification.deleteMany({email}),
      PasswordReset.deleteMany({email})
    ]);
    res.json({success:true,message:'Your RIVAYAT account has been deleted. Transaction records may be retained where legally or operationally required.'});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.post('/launch/products', async (req,res) => {
  if (!requireAdmin(req,res)) return;
  try {
    const body = req.body || {};
    if (!body.name) return res.status(400).json({success:false,message:'Product name is required.'});
    if (!validProductImage(String(body.image || ''))) return res.status(413).json({success:false,message:'Primary product image is too large or unsupported.'});
    const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0,8) : [];
    if (gallery.some(img => !validProductImage(String(img || '')))) return res.status(413).json({success:false,message:'One of the gallery images is too large or unsupported.'});
    if (gallery.reduce((sum,img)=>sum+String(img||'').length,0) > 7_000_000) return res.status(413).json({success:false,message:'Gallery is too large. Use fewer or smaller images.'});
    const id = body.id || `product-${Date.now()}`;
    const slug = body.slug || String(body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const product = await Product.findOneAndUpdate({id},{$set:{...body,id,slug,gallery,updatedAt:new Date()}},{upsert:true,new:true,setDefaultsOnInsert:true});
    res.json({success:true,product});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.patch('/launch/orders/:id/status', async (req,res) => {
  if (!requireAdmin(req,res)) return;
  try {
    const status = String(req.body?.status || '');
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({success:false,message:'Invalid order status.'});
    const order = await Order.findOne({id:req.params.id});
    if (!order) return res.status(404).json({success:false,message:'Order not found.'});
    const changed = order.status !== status;
    order.status = status; order.updatedAt = new Date(); await order.save();
    let email={skipped:true};
    if (changed && order.email) email = await sendEmail({to:order.email,subject:`RIVAYAT order ${order.id}: ${status}`,html:orderStatusEmail(order)});
    res.json({success:true,order,email});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});

app.patch('/launch/returns/:id/status', async (req,res) => {
  if (!requireAdmin(req,res)) return;
  try {
    const status=String(req.body?.status || '');
    if (!RETURN_STATUSES.includes(status)) return res.status(400).json({success:false,message:'Invalid return status.'});
    const request=await ReturnRequest.findOneAndUpdate({id:req.params.id},{status,updatedAt:new Date()},{new:true});
    if(!request)return res.status(404).json({success:false,message:'Return request not found.'});
    if(request.customer?.email) await sendEmail({to:request.customer.email,subject:`RIVAYAT ${request.type || 'return'} update: ${status}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px"><h2 style="letter-spacing:4px">RIVAYAT</h2><h1>Your ${escapeHtml(request.type || 'return').toLowerCase()} request is ${escapeHtml(status)}.</h1><p>Order: <strong>${escapeHtml(request.orderId)}</strong></p><p>We will contact you if any further action is needed.</p></div>`});
    res.json({success:true,request});
  } catch(e) { res.status(500).json({success:false,message:e.message}); }
});
