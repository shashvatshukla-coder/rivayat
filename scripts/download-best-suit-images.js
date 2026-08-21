const fs = require('fs');
const path = require('path');
const https = require('https');

const productsDir = path.join(__dirname, '..', 'assets', 'products');

const SUIT_ASSETS = [
  {
    name: 'rivayat-black-coat-pant-combo',
    // Ultra sharp high fashion male model in luxury black coat & pant suit combo
    url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1600&q=95'
  },
  {
    name: 'rivayat-black-coat-pant-front',
    // Tailored luxury black jacket blazer & pant studio setup
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=95'
  },
  {
    name: 'rivayat-black-coat-pant-details',
    // Crisp lapel, pocket, button, fabric texture close-up
    url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=1600&q=95'
  },
  {
    name: 'rivayat-black-coat-pant-model',
    // Full standing editorial pose in bespoke black coat pant
    url: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=1600&q=95'
  },
  {
    name: 'rivayat-black-coat-pant-lookbook',
    // Sophisticated modern evening black suit combo fit
    url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1600&q=95'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => stream.close(() => resolve(dest)));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  for (const item of SUIT_ASSETS) {
    const jpg = path.join(productsDir, `${item.name}.jpg`);
    const png = path.join(productsDir, `${item.name}.png`);
    try {
      await download(item.url, jpg);
      fs.copyFileSync(jpg, png);
      const kb = (fs.statSync(jpg).size / 1024).toFixed(1);
      console.log(`Saved ${item.name} (${kb} KB)`);
    } catch (e) {
      console.error(`Failed ${item.name}:`, e.message);
    }
  }
}

main();
