const fs = require('fs');
const path = require('path');
const https = require('https');

const productsDir = path.join(__dirname, '..', 'assets', 'products');

const COAT_PANT_IMAGES = [
  {
    name: 'rivayat-black-coat-pant-combo',
    url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1400&q=90'
  },
  {
    name: 'rivayat-black-coat-pant-front',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=90'
  },
  {
    name: 'rivayat-black-coat-pant-details',
    url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=1400&q=90'
  },
  {
    name: 'rivayat-black-coat-pant-model',
    url: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=1400&q=90'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
  for (const item of COAT_PANT_IMAGES) {
    const jpg = path.join(productsDir, `${item.name}.jpg`);
    const png = path.join(productsDir, `${item.name}.png`);
    try {
      await download(item.url, jpg);
      fs.copyFileSync(jpg, png);
      const kb = (fs.statSync(jpg).size / 1024).toFixed(1);
      console.log(`Downloaded ${item.name} -> ${kb} KB`);
    } catch (e) {
      console.error(`Failed ${item.name}:`, e.message);
    }
  }
}

main();
