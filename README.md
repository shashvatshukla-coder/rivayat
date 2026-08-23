# Rivayat

Rivayat is a mobile-first Node.js, Express and MongoDB fashion storefront. The frontend is served from `index.html`, while `server.js` provides authentication, catalogue, order, return, review, loyalty, referral, search, bug-desk and administration APIs. The authoritative catalogue contains 32 supplied, lossless PNG product images; deployment runs a one-time versioned migration that removes retired database products.

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and replace every placeholder.
4. Export the values from `.env` through your process manager or hosting provider.
5. Run `npm start`.

The server deliberately refuses to start without `MONGO_URI` and an `APP_SECRET` of at least 32 characters. Administrator seeding is disabled unless both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured. Use an administrator password of at least 12 characters.

Generate an application secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## Validation

```bash
npm run check
npm test
```

CI installs the lockfile, audits production dependencies for high-severity findings, and runs these checks for pushes and pull requests targeting `main`. This application is not an npm package and the workflow does not publish it.

## Deployment

For a Render Web Service use:

- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/health`
- Runtime: Node.js 20 or newer

Configure secrets in Render, never in Git. The minimum production variables are:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas **driver connection URI** (`mongodb+srv://...`); an Atlas API key is not a connection URI. |
| `APP_SECRET` | Random application signing secret with at least 32 characters. |
| `ALLOWED_ORIGINS` | Comma-separated exact frontend origins, including the Render/custom domains in use. |
| `RESEND_API_KEY` | Sends signup and forgot-password four-digit OTP emails. |
| `EMAIL_FROM` | A sender verified in Resend. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeds the initial admin; use a unique password of at least 12 characters. |

Optional variables are `GOOGLE_CLIENT_ID`, `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_API_KEY`, `ALGOLIA_ADMIN_API_KEY`, `ALGOLIA_INDEX_NAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `RETURN_WINDOW_DAYS`. Keep the Algolia admin key server-only. `GOOGLE_MAPS_API_KEY` and Razorpay variables are reserved and are not required for the current India Post/COD flow.

Online payment is intentionally disabled until a server-side payment order and signature-verification flow is connected. Cash on Delivery remains available; do not expose a Razorpay secret or mark a browser-reported payment as paid.

The default return/exchange window is seven days after delivery and can be changed with `RETURN_WINDOW_DAYS` from 1 to 30. Review the policy text, business identity, grievance contact, manufacturer/packer details, tax disclosures and return rules with qualified Indian counsel before launch.

Before making the store public, complete **Admin → Brand & Legal** and every product's manufacturer, packer, material and country-of-origin fields. Then verify `https://rivayat.shop` in Google Search Console and submit `https://rivayat.shop/sitemap.xml`. `favicon.svg`, the web manifest, canonical metadata, product JSON-LD, Open Graph/Twitter image metadata, `robots.txt`, the current sitemap and offline service worker are included.

## Credential rotation required

Earlier repository history contained database and administrator credentials. Removing values from the current files does not remove them from Git history. Rotate the MongoDB database user password, administrator password and application signing secret before deploying this version. Review active database users and sessions as well; changing `APP_SECRET` invalidates all existing session tokens.
