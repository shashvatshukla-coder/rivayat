# RIVAYAT final storefront

This package combines the supplied storefront, the corrected working server baseline, 32 unique supplied product images, mobile-first UI, account tools, operations screens, SEO files and deployment configuration.

## First deployment

1. Copy every value from `.env.example` into the Render service Environment page and replace placeholders.
2. Use Node 20 or 22. Build with `npm ci`; start with `npm start`; health check path is `/health`.
3. Keep `CATALOG_SYNC_MODE=replace` and `CATALOG_VERSION=2026-08-24-supplied-assets-v1` for the first deploy. The server creates a recoverable MongoDB backup batch before replacing old products.
4. After the first successful catalog load, change `CATALOG_SYNC_MODE` to `seed-empty` to prevent a future version string typo from replacing admin edits.
5. Sign in as the seeded administrator, verify all draft prices, stock, sizes and team profiles, and then remove `ADMIN_PASSWORD` from Render.
6. Trigger **Search → Reindex Algolia** after Algolia keys are configured, or call `POST /admin/search/reindex` with an administrator token.
7. Verify password reset, signup verification, unsubscribe and order-email delivery using the verified `EMAIL_FROM` domain before announcing launch.

## Official email and order alerts

1. In Resend, add and verify `rivayat.shop`; publish the SPF and DKIM DNS records Resend provides.
2. Set `EMAIL_FROM=RIVAYAT <orders@rivayat.shop>` on Render. This makes verification, reset, newsletter and order emails come from the official domain.
3. Set `ORDER_NOTIFICATION_EMAILS=jiking847@gmail.com,shashvatshukla240@gmail.com`. Add any other trusted operations address as another comma-separated recipient.
4. Deploy, create a test account, request a verification code, subscribe/unsubscribe, and place one test order. Confirm that both customer and operations emails arrive and that Reply-To points to the customer on the internal order alert.
5. Keep `RESEND_API_KEY` only in Render environment variables; never place it in browser code or commit it to GitHub.

## RIVAYAT Assistant

The floating **RIVAYAT Assistant** helps customers with product discovery, sizing, styling, delivery, returns and account navigation. Chat requests go to `POST /assistant/chat`; the Gemini key is read only by the server and is never sent to the browser.

1. Add `GEMINI_API_KEY` to the Render environment. `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
2. Redeploy the service and confirm `/health` reports `services.assistant: true`.
3. If the key is temporarily missing or the provider is unavailable, the assistant stays usable with a limited, safe help fallback.

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
