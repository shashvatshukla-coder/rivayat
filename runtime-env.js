// RIVAYAT production runtime defaults.
// Loaded before server.js so CORS always includes the real storefront origins
// even when Render's ALLOWED_ORIGINS variable is incomplete.
const configured = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);

const trustedStorefrontOrigins = [
  'https://rivayat.shop',
  'https://www.rivayat.shop',
  'https://rivayat-htmlonly.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

process.env.ALLOWED_ORIGINS = [...new Set([...configured, ...trustedStorefrontOrigins])].join(',');
