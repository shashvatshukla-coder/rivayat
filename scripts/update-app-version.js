const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Update APP_VERSION
html = html.replace(
  /const APP_VERSION = ['"][^'"]*['"];/,
  `const APP_VERSION = 'rivayat-v8-premium-black-coat-pant-combo-launch';`
);

// 2. Enhance db.init() to guarantee new drops and homepage settings are always present
const oldDbInitRegex = /init\(\) \{[\s\S]*?if \(!localStorage\.getItem\('rivayat_referrals'\)\) this\.set\('rivayat_referrals', \[\]\);\s+\}/;

const newDbInit = `init() {
        const storedVersion = localStorage.getItem('rivayat_app_version');
        if (storedVersion !== APP_VERSION) {
          this.set('rivayat_products', INITIAL_PRODUCTS);
          this.set('rivayat_coupons', INITIAL_COUPONS);
          this.set('rivayat_orders', INITIAL_ORDERS);
          this.set('rivayat_users', INITIAL_USERS);
          this.set('rivayat_reviews', INITIAL_REVIEWS);
          this.set('rivayat_returns', []);
          this.set('rivayat_homepage_settings', DEFAULT_HOMEPAGE);
          this.set('rivayat_newsletter_leads', []);
          this.set('rivayat_referrals', []);
          localStorage.setItem('rivayat_app_version', APP_VERSION);
          return;
        }
        // Guarantee all INITIAL_PRODUCTS exist in the local product store
        const currentProducts = this.get('rivayat_products', []);
        if (!currentProducts || !currentProducts.length) {
          this.set('rivayat_products', INITIAL_PRODUCTS);
        } else {
          const existingIds = new Set(currentProducts.map(p => p.id));
          const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id));
          if (missing.length > 0) {
            this.set('rivayat_products', [...missing, ...currentProducts]);
          }
        }
        if (!localStorage.getItem('rivayat_homepage_settings')) {
          this.set('rivayat_homepage_settings', DEFAULT_HOMEPAGE);
        }
        if (!localStorage.getItem('rivayat_coupons')) this.set('rivayat_coupons', INITIAL_COUPONS);
        if (!localStorage.getItem('rivayat_orders')) this.set('rivayat_orders', INITIAL_ORDERS);
        if (!localStorage.getItem('rivayat_users')) this.set('rivayat_users', INITIAL_USERS);
        if (!localStorage.getItem('rivayat_reviews')) this.set('rivayat_reviews', INITIAL_REVIEWS);
        if (!localStorage.getItem('rivayat_returns')) this.set('rivayat_returns', []);
        if (!localStorage.getItem('rivayat_newsletter_leads')) this.set('rivayat_newsletter_leads', []);
        if (!localStorage.getItem('rivayat_referrals')) this.set('rivayat_referrals', []);
      }`;

html = html.replace(oldDbInitRegex, newDbInit);

// 3. Fix Quick Checkout button in renderHome hero card
html = html.replace(
  /CartService\.add\('rivayat-premium-black-coat-pant-combo','L'\); location\.hash='#\/checkout';/,
  `quickAddToCart('rivayat-premium-black-coat-pant-combo').then(()=>{ location.hash='#/checkout'; });`
);

// 4. Update New Arrivals banner card to feature the Coat Pant Combo
html = html.replace(
  /<div class="card pad" style="background:#111;color:#fff"><span class="pill" style="background:rgba\(255,255,255,\.1\);border-color:var\(--line-dark\);color:#e9dcc5">New Arrivals<\/span><h2 class="serif" style="font-size:48px;margin:18px 0 8px">Minimal essentials for this season\.<\/h2><p style="color:rgba\(255,255,255,\.68\);line-height:1\.7">Black, white, and neutral pieces made for easy styling\.<\/p><a class="btn gold" href="#\/shop" style="margin-top:16px">Explore New Drop<\/a><\/div>/,
  `<div class="card pad" style="background:#111;color:#fff"><span class="pill" style="background:rgba(255,255,255,.1);border-color:var(--line-dark);color:#e9dcc5">★ Launch Drop</span><h2 class="serif" style="font-size:clamp(32px, 4vw, 48px);margin:18px 0 8px">Premium Black Coat Pant Combo</h2><p style="color:rgba(255,255,255,.75);line-height:1.7">Bespoke 380 GSM Italian-blend wool gabardine tailored 2-piece suit combo. Structured peak lapels and slim-straight trousers for ₹2,999.</p><a class="btn gold" href="#/product/rivayat-premium-black-coat-pant-combo" style="margin-top:16px">Shop Hero Drop · ₹2,999</a></div>`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('App version and db.init updated successfully');
