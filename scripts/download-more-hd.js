const fs = require('fs');
const path = require('path');
const https = require('https');

const productsDir = path.join(__dirname, '../assets/products');

const photoMap = {
  "alpine-print-overshirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85",
  "black-noir-utility-cargo": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85",
  "black-spider-zip-hoodie": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85",
  "block-grid-shirt": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  "blue-type-overshirt": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1200&q=85",
  "charcoal-city-wide-cargo": "https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=1200&q=85",
  "electric-branch-hoodie": "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85",
  "emerald-check-overshirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85",
  "espresso-wide-cargo": "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1200&q=85",
  "field-olive-utility-cargo": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85",
  "flame-track-jacket": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=85",
  "gothic-cross-thermal-hoodie": "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=85",
  "mint-graffiti-overshirt": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
  "olive-faith-hoodie": "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1200&q=85",
  "rose-static-panel-hoodie": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85",
  "rust-utility-overshirt": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=85",
  "scarlet-spider-hoodie": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
  "sky-stripe-overshirt": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=85",
  "smoke-check-shirt": "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
  "split-red-denim-jacket": "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=85",
  "stone-utility-cargo": "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=1200&q=85",
  "washed-blue-graphic-hoodie": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=85",
  "wave-navy-hoodie": "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=85",
  "web-grey-zip-hoodie": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=85"
};

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve(fs.statSync(destPath).size);
        });
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  const keys = Object.keys(photoMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const url = photoMap[key];
    const outPng = path.join(productsDir, `${key}.png`);
    const outJpg = path.join(productsDir, `${key}.jpg`);
    try {
      const bytes = await downloadImage(url, outPng);
      fs.copyFileSync(outPng, outJpg);
      console.log(`[${i+1}/${keys.length}] Downloaded ${key} -> ${(bytes/1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`Error downloading ${key}:`, err.message);
    }
  }
}

run();
