const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const serverPath = path.join(__dirname, '..', 'server.js');

let html = fs.readFileSync(indexPath, 'utf8');
let server = fs.readFileSync(serverPath, 'utf8');

const heroProduct = {
  id: "rivayat-premium-black-coat-pant-combo",
  slug: "rivayat-premium-black-coat-pant-combo",
  name: "Rivayat Premium Black Coat Pant Combo",
  category: "Co-ord Sets",
  color: "Jet Black",
  mrp: 5999,
  price: 2999,
  sizes: ["S", "M", "L", "XL", "XXL"],
  inventory: { S: 35, M: 60, L: 55, XL: 40, XXL: 20 },
  rating: 5.0,
  reviews: 284,
  badge: "Rivayat Hero",
  description: "The definitive RIVAYAT Hero Launch Drop: A bespoke luxury 2-piece Black Coat and Pant suit combo engineered for red carpets, formal galas, weddings, high-stakes business meetings, and elevated evening streetwear. Tailored from an ultra-refined 380 GSM Italian-blend tropical wool gabardine with structured peak lapels, interior silk-satin lining, matte horn buttons, and matching slim-straight creased trousers. Available for instant nationwide delivery and checkout at rivayat.shop.",
  details: [
    "Bespoke 2-Piece Suit Combo: Tailored Single-Breasted Blazer + Slim-Straight Trousers",
    "Ultra-luxurious 380 GSM Italian-blend wool touch gabardine",
    "Structured shoulder silhouette with soft breathable silk-satin full lining",
    "Tailored trousers featuring waistband interior grip, coin pocket, and deep seam utility",
    "Hand-finished pick stitching with custom engraved matte horn buttons"
  ],
  image: "/assets/products/rivayat-black-coat-pant-combo.png",
  gallery: [
    "/assets/products/rivayat-black-coat-pant-combo.png",
    "/assets/products/rivayat-black-coat-pant-front.png",
    "/assets/products/rivayat-black-coat-pant-details.png",
    "/assets/products/rivayat-black-coat-pant-model.png"
  ]
};

// 1. Insert product at the beginning of INITIAL_PRODUCTS if not already present
if (!html.includes('"rivayat-premium-black-coat-pant-combo"')) {
  const initProductsMarker = 'const INITIAL_PRODUCTS = [';
  const insertPos = html.indexOf(initProductsMarker);
  if (insertPos !== -1) {
    const afterMarker = insertPos + initProductsMarker.length;
    const productJson = JSON.stringify(heroProduct, null, 2) + ',';
    html = html.slice(0, afterMarker) + '\n  ' + productJson + html.slice(afterMarker);
    console.log('Inserted hero product into INITIAL_PRODUCTS');
  } else {
    console.error('Could not find INITIAL_PRODUCTS marker');
  }
}

// 2. Update DEFAULT_HOMEPAGE in index.html
html = html.replace(
  /const DEFAULT_HOMEPAGE = \{[\s\S]*?\};/,
  `const DEFAULT_HOMEPAGE = {
      heroPill: 'Rivayat Signature Drop • Premium Menswear',
      heroTitle: 'Own Your Vibe with RIVAYAT.',
      heroSubtitle: 'Luxury craftsmanship meets modern silhouettes. Introducing the all-new Rivayat Premium Black Coat Pant Combo alongside our iconic streetwear and comfort essentials. Built mobile-first for smooth shopping on every device.',
      heroImage: '/assets/products/rivayat-black-coat-pant-combo.png',
      heroOffer: 'Hero Launch Drop: Tailored Black Coat Pant Combo at ₹2,999 (MRP ₹5,999)',
      primaryButtonText: 'Shop Hero Drop',
      secondaryButtonText: 'Buy on WhatsApp'
    };`
);

// 3. Update DEFAULT_HOMEPAGE in server.js
server = server.replace(
  /const DEFAULT_HOMEPAGE = \{[\s\S]*?\};/,
  `const DEFAULT_HOMEPAGE = {
  heroPill: "Rivayat Signature Drop • Premium Menswear",
  heroTitle: "Own Your Vibe with RIVAYAT.",
  heroSubtitle: "Luxury craftsmanship meets modern silhouettes. Introducing the all-new Rivayat Premium Black Coat Pant Combo alongside our iconic streetwear and comfort essentials.",
  heroImage: "/assets/products/rivayat-black-coat-pant-combo.png",
  heroOffer: "Hero Launch Drop: Tailored Black Coat Pant Combo at Rs 2,999 (MRP Rs 5,999)",
  primaryButtonText: "Shop Hero Drop",
  secondaryButtonText: "Buy on WhatsApp"
};`
);

// 4. Update hero card in renderHome in index.html
const oldHeroCardRegex = /<div class="hero-card">[\s\S]*?<\/div><\/div><\/div>/;
// Let's inspect where hero-card is inside renderHome:
html = html.replace(
  /<div class="hero-card"><div class="hero-inner"><img class="hero-product-photo" src="\$\{escapeHtml\(safeImageUrl\(home\.heroImage\) \|\| ASSETS\.blackModel\)\}" alt="RIVAYAT hero product" fetchpriority="high" decoding="async"><div class="hero-copy"><h2 class="serif">Launch Drop<\/h2><p>\$\{escapeHtml\(home\.heroOffer\)\}<\/p><\/div><\/div><\/div>/,
  `<div class="hero-card"><div class="hero-inner"><img class="hero-product-photo" src="\${escapeHtml(safeImageUrl(home.heroImage) || '/assets/products/rivayat-black-coat-pant-combo.png')}" alt="Rivayat Premium Black Coat Pant Combo" fetchpriority="high" decoding="async"><div class="hero-copy"><span class="pill" style="background:rgba(0,0,0,.75);color:#f5ebda;border-color:rgba(255,255,255,.24);margin-bottom:10px;display:inline-block">★ Launch Drop • Hero Product</span><h2 class="serif" style="font-size:clamp(26px, 3.6vw, 38px);margin:0 0 6px">Premium Black Coat Pant Combo</h2><p style="color:rgba(255,255,255,.9);font-size:14px;margin:0 0 14px;line-height:1.5">\${escapeHtml(home.heroOffer)}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn gold small" href="#/product/rivayat-premium-black-coat-pant-combo">Shop Hero Drop · ₹2,999</a><a class="btn small" href="#/checkout" onclick="event.preventDefault(); CartService.add('rivayat-premium-black-coat-pant-combo','L'); location.hash='#/checkout';">Quick Checkout</a></div></div></div></div>`
);

// 5. Remove duplicated renderFoundersSection
const duplicateFoundersRegex = /function renderFoundersSection\(\) \{\s+const people = \[\s+\['Shashvat Shukla',[\s\S]*?return `<section class="section"><div class="container"><div class="section-head"><div><h2 class="serif">People Behind RIVAYAT<\/h2>[\s\S]*?<\/div><\/div><\/section>`;\s+\}/;
html = html.replace(duplicateFoundersRegex, '');

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(serverPath, server, 'utf8');
console.log('Updated index.html and server.js successfully.');
