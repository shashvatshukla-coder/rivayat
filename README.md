# RIVAYAT final storefront

This package combines the supplied storefront, the corrected working server baseline, 32 unique supplied product images, mobile-first UI, account tools, operations screens, SEO files and deployment configuration.

## First deployment

1. Copy every value from `.env.example` into the Render service Environment page and replace placeholders.
2. Use Node 20 or 22. Build with `npm ci`; start with `npm start`; health check path is `/health`.
3. Keep `CATALOG_SYNC_MODE=replace` and `CATALOG_VERSION=2026-08-24-supplied-assets-v1` for the first deploy. The server creates a recoverable MongoDB backup batch before replacing old products.
4. After the first successful catalog load, change `CATALOG_SYNC_MODE` to `seed-empty` to prevent a future version string typo from replacing admin edits.
5. Sign in as the seeded administrator, verify all draft prices, stock, sizes and team profiles, and then remove `ADMIN_PASSWORD` from Render.
6. Trigger **Search → Reindex Algolia** after Algolia keys are configured, or call `POST /admin/search/reindex` with an administrator token.
7. Verify password reset and signup OTP delivery using the verified `EMAIL_FROM` domain before announcing launch.

## Final information still required from the owner

- Confirmed selling price, MRP, available sizes and opening stock for each of the 32 products. Current values are launch-ready drafts only.
- Legal business name, complete invoice/return address, and GSTIN if registered.
- Confirmation that RIVAYAT may use every supplied image and any club/team/name marks visible in fanwear photographs.
- Final names/roles for Founder, Manager, Business Head and Marketing Head, plus their original-resolution profile photos and approved bios/social links.
- Verified Resend sender/domain, Google OAuth client ID, Algolia credentials/index name, Search Console verification token and final Render origin.

## Important security action

The older uploaded server copy contains embedded database/admin secrets. Rotate that MongoDB credential and any reused administrator password or API key before deploying. This package reads secrets only from environment variables.

## Local verification

```bash
npm install
npm run check
npm start
```

Open `http://localhost:3000`. A local MongoDB-compatible `MONGO_URI` and a 32+ character `APP_SECRET` are required to start the server.
