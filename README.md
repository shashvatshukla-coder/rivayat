# Rivayat

Rivayat is a Node.js, Express and MongoDB fashion storefront. The frontend is served from `index.html`, while `server.js` provides authentication, catalogue, order, return, review, referral and administration APIs.

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

Configure all secrets in the hosting provider. Never commit `.env`, database URLs, passwords or API tokens. Set `ALLOWED_ORIGINS` to the comma-separated production frontend origins. `RESEND_API_KEY` and a verified `EMAIL_FROM` sender are required for production signup and password-reset email delivery. Telegram is optional and receives operations alerts only—never OTP values.

Online payment is intentionally disabled until a server-side payment order and signature-verification flow is connected. Cash on Delivery remains available; do not expose a Razorpay secret or mark a browser-reported payment as paid.

The default return/exchange window is seven days after delivery and can be changed with `RETURN_WINDOW_DAYS` from 1 to 30. Review the policy text, business identity, grievance contact, manufacturer/packer details, tax disclosures and return rules with qualified Indian counsel before launch.

## Credential rotation required

Earlier repository history contained database and administrator credentials. Removing values from the current files does not remove them from Git history. Rotate the MongoDB database user password, administrator password and application signing secret before deploying this version. Review active database users and sessions as well; changing `APP_SECRET` invalidates all existing session tokens.
