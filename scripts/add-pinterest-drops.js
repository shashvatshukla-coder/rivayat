const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const match = indexHtml.match(/const INITIAL_PRODUCTS = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find INITIAL_PRODUCTS in index.html");
  process.exit(1);
}

const currentProducts = JSON.parse(match[1]);

const PINTEREST_NEW_DROPS = [
  // --- 8 TRENDING HOODIES (Pinterest Viral Drops) ---
  {
    id: "washed-mocha-boxy-hoodie",
    slug: "washed-mocha-boxy-hoodie",
    name: "Washed Mocha Heavyweight Boxy Hoodie",
    category: "Hoodies & Sweats",
    color: "Mocha Brown",
    mrp: 1899,
    price: 1099,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 18, M: 28, L: 25, XL: 19, XXL: 10 },
    rating: 4.9,
    reviews: 164,
    badge: "New Drop",
    description: "Pinterest-viral earthy mocha boxy hoodie. Cut from ultra-dense 440 GSM diagonal-loop French terry cotton with a heavy double-layered hood, dropped shoulders, and subtle distressed wash treatment.",
    details: [
      "Heavyweight 440 GSM combed cotton",
      "Seamless kangaroo pouch & dropped shoulder fit",
      "Vintage garment-dyed washed mocha finish",
      "Custom Rivayat tone-on-tone embroidery",
      "Ribbed thick 2x2 elastane cuffs and hem"
    ],
    image: "/assets/products/washed-mocha-boxy-hoodie.png",
    gallery: [
      "/assets/products/washed-mocha-boxy-hoodie.png",
      "/assets/products/washed-mocha-boxy-hoodie.jpg"
    ]
  },
  {
    id: "cyber-goth-fullzip-skeleton-hoodie",
    slug: "cyber-goth-fullzip-skeleton-hoodie",
    name: "Cyber Goth Full-Zip Skeleton Hoodie",
    category: "Hoodies & Sweats",
    color: "Washed Obsidian",
    mrp: 2199,
    price: 1249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 14, M: 22, L: 26, XL: 17, XXL: 8 },
    rating: 4.9,
    reviews: 142,
    badge: "Viral Drop",
    description: "High-heat Y2K cyber goth full-zip hoodie with distressed bone print and an oversized hood structure. Designed for layering over graphic baby tees or oversized baggy skater cargos.",
    details: [
      "Custom two-way gunmetal matte zipper",
      "Distressed vintage bone discharge print",
      "420 GSM brushed winter fleece inside",
      "Relaxed wide-chest boxy silhouette",
      "Thumb-loop cuffs for thermal layering"
    ],
    image: "/assets/products/cyber-goth-fullzip-skeleton-hoodie.png",
    gallery: [
      "/assets/products/cyber-goth-fullzip-skeleton-hoodie.png",
      "/assets/products/cyber-goth-fullzip-skeleton-hoodie.jpg"
    ]
  },
  {
    id: "vintage-cherry-red-heavy-hoodie",
    slug: "vintage-cherry-red-heavy-hoodie",
    name: "Vintage Cherry Red Heavyweight Hoodie",
    category: "Hoodies & Sweats",
    color: "Cherry Red",
    mrp: 1999,
    price: 1149,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 16, M: 24, L: 30, XL: 18, XXL: 12 },
    rating: 4.8,
    reviews: 118,
    badge: "Trending",
    description: "The viral pop-of-red essential for Pinterest-inspired street outfits. Crafted in rich cherry crimson with an ultra-soft fleece backing and clean, architectural silhouette.",
    details: [
      "Bold pop-of-color cherry crimson wash",
      "Heavy 400 GSM brushed cotton fleece",
      "Structured standing hood without drawstrings",
      "Double-needle clean reinforced seams",
      "Pre-shrunk for lifelong boxy shape"
    ],
    image: "/assets/products/vintage-cherry-red-heavy-hoodie.png",
    gallery: [
      "/assets/products/vintage-cherry-red-heavy-hoodie.png",
      "/assets/products/vintage-cherry-red-heavy-hoodie.jpg"
    ]
  },
  {
    id: "angel-wings-rhinestone-zip-hoodie",
    slug: "angel-wings-rhinestone-zip-hoodie",
    name: "Angel Wings Rhinestone Zip Hoodie",
    category: "Hoodies & Sweats",
    color: "Onyx Black",
    mrp: 2299,
    price: 1299,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 12, M: 20, L: 24, XL: 15, XXL: 7 },
    rating: 4.9,
    reviews: 135,
    badge: "New Drop",
    description: "Trending 2000s cyber angel back-applique hoodie featuring industrial heat-pressed rhinestone wings and heavy-gauge vintage black fleece.",
    details: [
      "Ultra-durable heat-set glass rhinestones",
      "Heavyweight 420 GSM fleece body",
      "Full metallic front zipper with custom pull",
      "Oversized hood with structured drape",
      "Relaxed drop-shoulder streetwear fit"
    ],
    image: "/assets/products/angel-wings-rhinestone-zip-hoodie.png",
    gallery: [
      "/assets/products/angel-wings-rhinestone-zip-hoodie.png",
      "/assets/products/angel-wings-rhinestone-zip-hoodie.jpg"
    ]
  },
  {
    id: "faded-sage-green-oversized-hoodie",
    slug: "faded-sage-green-oversized-hoodie",
    name: "Faded Sage Green Oversized Hoodie",
    category: "Hoodies & Sweats",
    color: "Sage Green",
    mrp: 1899,
    price: 1049,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 20, M: 32, L: 28, XL: 21, XXL: 14 },
    rating: 4.8,
    reviews: 156,
    badge: "Trending",
    description: "Calm, earthy sage aesthetic hoodie with mineral pigment wash. Offers relaxed draping that pairs seamlessly with moss green or khaki parachute cargo pants.",
    details: [
      "Mineral dye wash with unique fading",
      "100% heavyweight 380 GSM organic cotton",
      "Clean chest tonal micro-embroidery",
      "Spacious hood and ergonomic side vents",
      "Soft brushed interior for cold evening comfort"
    ],
    image: "/assets/products/faded-sage-green-oversized-hoodie.png",
    gallery: [
      "/assets/products/faded-sage-green-oversized-hoodie.png",
      "/assets/products/faded-sage-green-oversized-hoodie.jpg"
    ]
  },
  {
    id: "tokyo-neon-cyberpunk-oversized-hoodie",
    slug: "tokyo-neon-cyberpunk-oversized-hoodie",
    name: "Tokyo Neon Cyberpunk Oversized Hoodie",
    category: "Hoodies & Sweats",
    color: "Pitch Black",
    mrp: 2099,
    price: 1199,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 15, M: 25, L: 28, XL: 16, XXL: 9 },
    rating: 4.9,
    reviews: 172,
    badge: "New Drop",
    description: "Tokyo underground streetwear-inspired hoodie featuring reflective typography and high-density screenprints on heavy French terry cotton.",
    details: [
      "3M reflective cyber typographic accents",
      "400 GSM heavyweight knit French terry",
      "Deep double-lined hood for head drape",
      "Kangaroo pocket with hidden zip stash pocket",
      "Reinforced rib hem for clean cropped stacking"
    ],
    image: "/assets/products/tokyo-neon-cyberpunk-oversized-hoodie.png",
    gallery: [
      "/assets/products/tokyo-neon-cyberpunk-oversized-hoodie.png",
      "/assets/products/tokyo-neon-cyberpunk-oversized-hoodie.jpg"
    ]
  },
  {
    id: "distressed-charcoal-waffle-hoodie",
    slug: "distressed-charcoal-waffle-hoodie",
    name: "Distressed Charcoal Waffle Thermal Hoodie",
    category: "Hoodies & Sweats",
    color: "Washed Charcoal",
    mrp: 1949,
    price: 1099,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 17, M: 27, L: 29, XL: 19, XXL: 11 },
    rating: 4.8,
    reviews: 98,
    badge: "Aesthetic",
    description: "Textured heavyweight waffle thermal knit pullover hoodie with raw-edge distressed trims and washed acid charcoal patina. Perfect for effortless grunge layering.",
    details: [
      "360 GSM high-density waffle thermal texture",
      "Hand-distressed hems and raw cuff edges",
      "Mineral acid wash charcoal gradation",
      "Breathable yet insulating structured weave",
      "Boxy athletic skate silhouette"
    ],
    image: "/assets/products/distressed-charcoal-waffle-hoodie.png",
    gallery: [
      "/assets/products/distressed-charcoal-waffle-hoodie.png",
      "/assets/products/distressed-charcoal-waffle-hoodie.jpg"
    ]
  },
  {
    id: "starburst-y2k-metallic-zip-hoodie",
    slug: "starburst-y2k-metallic-zip-hoodie",
    name: "Starburst Y2K Metallic Zip Hoodie",
    category: "Hoodies & Sweats",
    color: "Washed Silver Grey",
    mrp: 2199,
    price: 1249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 13, M: 21, L: 25, XL: 14, XXL: 8 },
    rating: 4.9,
    reviews: 144,
    badge: "Trending",
    description: "Viral 2026 streetwear staple featuring oversized chrome starburst graphics across the sleeves and chest on vintage heather grey fleece.",
    details: [
      "Chrome metallic foil high-density screenprint",
      "420 GSM heavy brushed cotton interior",
      "Custom metal star slider zipper",
      "Wide boxy skate proportions",
      "Anti-pilling wash-tested yarn construction"
    ],
    image: "/assets/products/starburst-y2k-metallic-zip-hoodie.png",
    gallery: [
      "/assets/products/starburst-y2k-metallic-zip-hoodie.png",
      "/assets/products/starburst-y2k-metallic-zip-hoodie.jpg"
    ]
  },

  // --- 8 TRENDING CARGOS (Pinterest Streetwear Aesthetic Cargos) ---
  {
    id: "vintage-moss-green-parachute-cargo",
    slug: "vintage-moss-green-parachute-cargo",
    name: "Vintage Moss Green Parachute Cargo Pants",
    category: "Utility Cargos",
    color: "Moss Green",
    mrp: 2099,
    price: 1199,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 19, M: 31, L: 27, XL: 18, XXL: 10 },
    rating: 4.9,
    reviews: 188,
    badge: "New Drop",
    description: "The #1 Pinterest streetwear bottom silhouette. Lightweight yet durable nylon ripstop parachute cargo pants with articulated knee pleats, cinched toggle ankles, and deep utility pockets.",
    details: [
      "Durable water-repellent nylon ripstop fabric",
      "Elastic waistband with heavy bungee drawstrings",
      "Adjustable ankle bungee toggles for balloon or straight fit",
      "6 deep utility cargo pockets with storm flaps",
      "Roomy wide-leg drape tailored for chunky sneakers"
    ],
    image: "/assets/products/vintage-moss-green-parachute-cargo.png",
    gallery: [
      "/assets/products/vintage-moss-green-parachute-cargo.png",
      "/assets/products/vintage-moss-green-parachute-cargo.jpg"
    ]
  },
  {
    id: "moonrock-grey-baggy-balloon-cargo",
    slug: "moonrock-grey-baggy-balloon-cargo",
    name: "Moonrock Grey Baggy Balloon Cargos",
    category: "Utility Cargos",
    color: "Moonrock Grey",
    mrp: 2199,
    price: 1249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 15, M: 26, L: 28, XL: 16, XXL: 9 },
    rating: 4.8,
    reviews: 147,
    badge: "Trending",
    description: "Pinterest-favorite sculptural balloon-fit cargo in cool moonrock grey twill. Features voluminous curves that taper gracefully at the hem for a distinct Japanese streetwear look.",
    details: [
      "Heavy 320 GSM cotton twill structure",
      "Darted knee construction creating sculptural drape",
      "Concealed magnetic pocket closures",
      "Mid-rise fit with interior drawstring waist",
      "Styled specifically for chunky retro runners"
    ],
    image: "/assets/products/moonrock-grey-baggy-balloon-cargo.png",
    gallery: [
      "/assets/products/moonrock-grey-baggy-balloon-cargo.png",
      "/assets/products/moonrock-grey-baggy-balloon-cargo.jpg"
    ]
  },
  {
    id: "distressed-raw-hem-skater-cargo-denim",
    slug: "distressed-raw-hem-skater-cargo-denim",
    name: "Distressed Raw-Hem Skater Cargo Denim",
    category: "Utility Cargos",
    color: "Vintage Washed Indigo",
    mrp: 2499,
    price: 1399,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 14, M: 22, L: 25, XL: 15, XXL: 8 },
    rating: 4.9,
    reviews: 162,
    badge: "New Drop",
    description: "Hybrid 13.5 oz denim skater cargos with utility side pouches, subtle distressing, and a wide-leg puddle hem designed to stack over your kicks.",
    details: [
      "13.5 oz rigid washed indigo cotton denim",
      "Dual asymmetrical side utility cargo pouches",
      "Raw frayed hemline for effortless skate look",
      "Hammer loop and reinforced rivets",
      "Relaxed seat and wide straight leg"
    ],
    image: "/assets/products/distressed-raw-hem-skater-cargo-denim.png",
    gallery: [
      "/assets/products/distressed-raw-hem-skater-cargo-denim.png",
      "/assets/products/distressed-raw-hem-skater-cargo-denim.jpg"
    ]
  },
  {
    id: "midnight-black-d-ring-tactical-cargo",
    slug: "midnight-black-d-ring-tactical-cargo",
    name: "Midnight Black D-Ring Tactical Cargo",
    category: "Utility Cargos",
    color: "Midnight Black",
    mrp: 2299,
    price: 1299,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 18, M: 29, L: 31, XL: 20, XXL: 11 },
    rating: 4.9,
    reviews: 210,
    badge: "Best Seller",
    description: "Matte blackout tactical cargo pants equipped with matte metal D-rings, modular cargo compartments, and reinforced knee paneling for everyday techwear styling.",
    details: [
      "Heavyweight matte cotton ripstop",
      "Laser-cut matte alloy D-ring utility attachments",
      "8 strategically placed ergonomic pockets",
      "Dual ankle cinch tabs for custom tapering",
      "Deep gusseted crotch for unrestricted mobility"
    ],
    image: "/assets/products/midnight-black-d-ring-tactical-cargo.png",
    gallery: [
      "/assets/products/midnight-black-d-ring-tactical-cargo.png",
      "/assets/products/midnight-black-d-ring-tactical-cargo.jpg"
    ]
  },
  {
    id: "washed-khaki-cinched-hem-cargo",
    slug: "washed-khaki-cinched-hem-cargo",
    name: "Washed Khaki Cinched-Hem Cargo Pants",
    category: "Utility Cargos",
    color: "Washed Khaki",
    mrp: 1999,
    price: 1149,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 21, M: 33, L: 30, XL: 22, XXL: 13 },
    rating: 4.8,
    reviews: 134,
    badge: "Trending",
    description: "Classic Pinterest off-duty streetwear staple in washed desert khaki. Features bellowed cargo pockets and adjustable bungee hems for versatile styling.",
    details: [
      "Enzyme-washed 100% cotton canvas",
      "Relaxed boyfriend/baggy unisex cut",
      "Bungee drawstring cuffs with toggle locks",
      "Deep coin and phone stash security pockets",
      "Comfort elastic back waistband"
    ],
    image: "/assets/products/washed-khaki-cinched-hem-cargo.png",
    gallery: [
      "/assets/products/washed-khaki-cinched-hem-cargo.png",
      "/assets/products/washed-khaki-cinched-hem-cargo.jpg"
    ]
  },
  {
    id: "camo-real-tree-baggy-street-cargo",
    slug: "camo-real-tree-baggy-street-cargo",
    name: "Camo Real-Tree Baggy Street Cargo",
    category: "Utility Cargos",
    color: "Woodland Camo",
    mrp: 2399,
    price: 1349,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 12, M: 23, L: 27, XL: 16, XXL: 8 },
    rating: 4.9,
    reviews: 153,
    badge: "New Drop",
    description: "Streetwear-coded real-tree woodland camo cargo pants with wide leg cut and extra-deep flap pockets. The definitive Pinterest statement pant for monochrome fits.",
    details: [
      "Custom high-definition woodland camouflage print",
      "Durable 340 GSM heavy twill construction",
      "6 multi-depth cargo compartments",
      "Drawstring waist & bottom hem adjustments",
      "Double-stitched seat for heavy skate durability"
    ],
    image: "/assets/products/camo-real-tree-baggy-street-cargo.png",
    gallery: [
      "/assets/products/camo-real-tree-baggy-street-cargo.png",
      "/assets/products/camo-real-tree-baggy-street-cargo.jpg"
    ]
  },
  {
    id: "graphite-heavyweight-pleated-cargo",
    slug: "graphite-heavyweight-pleated-cargo",
    name: "Graphite Heavyweight Pleated Cargo Trouser",
    category: "Utility Cargos",
    color: "Graphite",
    mrp: 2199,
    price: 1249,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 16, M: 27, L: 29, XL: 18, XXL: 10 },
    rating: 4.8,
    reviews: 112,
    badge: "Luxe Fit",
    description: "Elevated tailoring meets raw utilitarianism. Clean double front pleats combined with flush cargo pockets in heavyweight graphite wool-blend twill.",
    details: [
      "Premium wool-touch heavy structured twill",
      "Tailored front pleats with relaxed wide leg",
      "Sleek low-profile magnetic cargo flaps",
      "Belt loops and concealed interior drawcord",
      "Creased leg front for refined drape"
    ],
    image: "/assets/products/graphite-heavyweight-pleated-cargo.png",
    gallery: [
      "/assets/products/graphite-heavyweight-pleated-cargo.png",
      "/assets/products/graphite-heavyweight-pleated-cargo.jpg"
    ]
  },
  {
    id: "cream-ivory-skater-wide-utility-cargo",
    slug: "cream-ivory-skater-wide-utility-cargo",
    name: "Cream Ivory Skater Wide Utility Cargo",
    category: "Utility Cargos",
    color: "Cream Ivory",
    mrp: 2099,
    price: 1199,
    sizes: ["S", "M", "L", "XL", "XXL"],
    inventory: { S: 18, M: 28, L: 26, XL: 19, XXL: 11 },
    rating: 4.9,
    reviews: 129,
    badge: "New Drop",
    description: "Clean aesthetic ivory off-white utility cargos designed to complete clean monochrome streetwear looks with boxy hoodies and retro sneakers.",
    details: [
      "Unbleached 100% natural cotton heavy canvas",
      "Spacious straight wide leg silhouette",
      "Contrast bronze hardware & metal rivets",
      "Reinforced knee patches for skate durability",
      "Stain-resistant protective textile finish"
    ],
    image: "/assets/products/cream-ivory-skater-wide-utility-cargo.png",
    gallery: [
      "/assets/products/cream-ivory-skater-wide-utility-cargo.png",
      "/assets/products/cream-ivory-skater-wide-utility-cargo.jpg"
    ]
  }
];

// Combine products: put the 16 new drops first right after the flagship Rivayat pants or at the top
const existingIds = new Set(currentProducts.map(p => p.id));
const filteredNewDrops = PINTEREST_NEW_DROPS.filter(p => !existingIds.has(p.id));

// Insert new drops near the top (right after Rivayat Half & Full Pants)
const rivayatFlagship = currentProducts.slice(0, 3);
const restProducts = currentProducts.slice(3);

const updatedProducts = [...rivayatFlagship, ...filteredNewDrops, ...restProducts];

console.log(`Adding ${filteredNewDrops.length} Pinterest drops. Total products will be: ${updatedProducts.length}`);

// Replace in index.html
const updatedProductsJson = JSON.stringify(updatedProducts, null, 2);
indexHtml = indexHtml.replace(
  /const INITIAL_PRODUCTS = \[[\s\S]*?\];/,
  `const INITIAL_PRODUCTS = ${updatedProductsJson};`
);

// Update APP_VERSION
indexHtml = indexHtml.replace(
  /const APP_VERSION = '.*?';/,
  "const APP_VERSION = 'rivayat-v7-pinterest-viral-hoodies-cargos-drop';"
);

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log("Updated index.html with new Pinterest Drops!");
