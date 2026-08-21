const fs = require('fs');
const path = require('path');
const https = require('https');

const productsDir = path.join(__dirname, '../assets/products');
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

const photoMap = {
  // 1. Oversized Graphic & Minimalist Tees
  "cyber-matrix-oversized-tee": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85",
  "tokyo-drift-heavyweight-tee": "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&w=1200&q=85",
  "acid-wash-rebel-tee": "https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=85",
  "gothic-butterfly-boxy-tee": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=85",
  "anime-mecha-drop-tee": "https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&w=1200&q=85",
  "vintage-rock-tour-tee": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85",
  "renaissance-statue-tee": "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=1200&q=85",
  "cyberpunk-glitch-tee": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=85",
  "abstract-flame-boxy-tee": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1200&q=85",
  "minimal-typography-heavy-tee": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85",

  // 2. Hoodies & Sweats
  "cyber-spider-zip-hoodie": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
  "acid-wash-distressed-hoodie": "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85",
  "japanese-kanji-night-hoodie": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85",
  "gothic-cross-thermal-hoodie": "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1200&q=85",
  "french-terry-boxy-hoodie": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1200&q=85",
  "vintage-motor-club-hoodie": "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1200&q=85",
  "fluid-wave-panel-hoodie": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=85",
  "distressed-edge-crewneck": "https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=1200&q=85",
  "star-embroidery-oversized-hoodie": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=85",
  "cyber-circuit-fullzip-hoodie": "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=85",

  // 3. Cargos & Parachute Pants
  "tactical-multi-pocket-cargo": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85",
  "wide-leg-parachute-cargo": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85",
  "washed-carpenter-denim-cargo": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85",
  "urban-strapped-tech-cargo": "https://images.unsplash.com/photo-1551854838-212c50b4c184?auto=format&fit=crop&w=1200&q=85",
  "stone-washed-wide-cargo": "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=1200&q=85",
  "desert-camo-baggy-cargo": "https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&w=1200&q=85",
  "gothic-zip-convertible-cargo": "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1200&q=85",
  "relaxed-pleated-utility-cargo": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=85",
  "heavyweight-corduroy-cargo": "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1200&q=85",

  // 4. Overshirts & Shackets
  "canvas-workwear-box-overshirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85",
  "vintage-plaid-flannel-shacket": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85",
  "raw-selvedge-denim-overshirt": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=85",
  "corduroy-chore-overshirt": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=85",
  "minimal-zip-twill-overshirt": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1200&q=85",
  "military-fatigue-overshirt": "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
  "checkered-grunge-overshirt": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  "suede-texture-luxe-overshirt": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",

  // 5. Jackets & Bombers
  "retro-leather-sleeve-varsity": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85",
  "matte-minimalist-puffer-jacket": "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1200&q=85",
  "technical-windbreaker-shell": "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1200&q=85",
  "distressed-biker-denim-jacket": "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=85",
  "fleece-paneled-track-jacket": "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=1200&q=85",
  "retro-racing-bomber-jacket": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=85",
  "minimal-wool-blend-coach-jacket": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85",

  // 6. Trousers & Pants
  "korean-pleated-wide-trouser": "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=1200&q=85",
  "minimalist-linen-blend-pant": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
  "heavy-ribbed-knit-flare-pant": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  "baggy-skater-denim-jean": "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=1200&q=85",
  "luxury-heavy-fleece-sweatpant": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
  "structured-drawstring-tailored-pant": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85",

  // 7. Knitwear & Resort Co-ords
  "distressed-jacquard-sweater": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=1200&q=85",
  "mohair-striped-oversized-knit": "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=1200&q=85",
  "minimalist-quarter-zip-knit": "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=1200&q=85",
  "textured-waffle-knit-coord-set": "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&w=1200&q=85",
  "streetwear-box-short-coord": "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=85"
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
  console.log(`Starting download of ${Object.keys(photoMap).length} high-resolution luxury fashion photos...`);
  const keys = Object.keys(photoMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const url = photoMap[key];
    const outPng = path.join(productsDir, `${key}.png`);
    const outJpg = path.join(productsDir, `${key}.jpg`);
    try {
      const bytes = await downloadImage(url, outPng);
      fs.copyFileSync(outPng, outJpg); // keep both extensions for compatibility
      console.log(`[${i+1}/${keys.length}] Downloaded ${key} -> ${(bytes/1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`Error downloading ${key}:`, err.message);
    }
  }
  console.log("All premium fashion photos downloaded successfully!");
}

run();
