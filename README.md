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

CI runs these checks for pushes and pull requests targeting `main`. This application is not an npm package and the workflow does not publish it.

## Deployment

Configure all secrets in the hosting provider. Never commit `.env`, database URLs, passwords or API tokens. Set `ALLOWED_ORIGINS` to the comma-separated production frontend origins. Leave the optional email and Telegram values blank only if those features are not required.

## Credential rotation required

Earlier repository history contained database and administrator credentials. Removing values from the current files does not remove them from Git history. Rotate the MongoDB database user password and the exposed administrator password before deploying this version. Review active database users and sessions as well.
