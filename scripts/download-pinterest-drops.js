const fs = require('fs');
const path = require('path');
const https = require('https');

const productsDir = path.join(__dirname, '..', 'assets', 'products');
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// 16 curated Pinterest viral streetwear items (8 Hoodies & 8 Cargos)
const PINTEREST_DROPS = [
  // --- HOODIES (Pinterest Viral Drops) ---
  {
    slug: 'washed-mocha-boxy-hoodie',
    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'cyber-goth-fullzip-skeleton-hoodie',
    url: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'vintage-cherry-red-heavy-hoodie',
    url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'angel-wings-rhinestone-zip-hoodie',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'faded-sage-green-oversized-hoodie',
    url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'tokyo-neon-cyberpunk-oversized-hoodie',
    url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'distressed-charcoal-waffle-hoodie',
    url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'starburst-y2k-metallic-zip-hoodie',
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85'
  },

  // --- CARGOS (Pinterest Streetwear Aesthetic Cargos) ---
  {
    slug: 'vintage-moss-green-parachute-cargo',
    url: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'moonrock-grey-baggy-balloon-cargo',
    url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'distressed-raw-hem-skater-cargo-denim',
    url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'midnight-black-d-ring-tactical-cargo',
    url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'washed-khaki-cinched-hem-cargo',
    url: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'camo-real-tree-baggy-street-cargo',
    url: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'graphite-heavyweight-pleated-cargo',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85'
  },
  {
    slug: 'cream-ivory-skater-wide-utility-cargo',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1200&q=85'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve(dest));
      });
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Starting download of ${PINTEREST_DROPS.length} Pinterest Drop assets...`);
  for (let i = 0; i < PINTEREST_DROPS.length; i++) {
    const item = PINTEREST_DROPS[i];
    const jpgDest = path.join(productsDir, `${item.slug}.jpg`);
    const pngDest = path.join(productsDir, `${item.slug}.png`);
    try {
      await downloadFile(item.url, jpgDest);
      // Copy to png as well so any extension reference loads flawlessly
      fs.copyFileSync(jpgDest, pngDest);
      const sizeKb = (fs.statSync(jpgDest).size / 1024).toFixed(1);
      console.log(`[${i + 1}/${PINTEREST_DROPS.length}] Downloaded ${item.slug} -> ${sizeKb} KB`);
    } catch (err) {
      console.error(`Error downloading ${item.slug}:`, err.message);
    }
  }
  console.log('All Pinterest Drop assets processed!');
}

run();
