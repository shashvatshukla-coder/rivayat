const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Update ASSETS object to include suit assets
html = html.replace(
  /const ASSETS = \{([\s\S]*?)\};/,
  (match, p1) => {
    let assets = JSON.parse('{' + p1 + '}');
    assets.coatPantCombo = '/assets/products/rivayat-black-coat-pant-combo.png';
    assets.coatPantFront = '/assets/products/rivayat-black-coat-pant-front.png';
    assets.coatPantDetails = '/assets/products/rivayat-black-coat-pant-details.png';
    assets.coatPantModel = '/assets/products/rivayat-black-coat-pant-model.png';
    assets.coatPantLookbook = '/assets/products/rivayat-black-coat-pant-lookbook.png';
    return `const ASSETS = ${JSON.stringify(assets)};`;
  }
);

// 2. Ensure INITIAL_PRODUCTS gallery for rivayat-premium-black-coat-pant-combo has all 5 images
html = html.replace(
  /"id":\s*"rivayat-premium-black-coat-pant-combo"[\s\S]*?"gallery":\s*\[[\s\S]*?\]/,
  (match) => {
    return match.replace(
      /"gallery":\s*\[[\s\S]*?\]/,
      `"gallery": [
    "/assets/products/rivayat-black-coat-pant-combo.png",
    "/assets/products/rivayat-black-coat-pant-front.png",
    "/assets/products/rivayat-black-coat-pant-details.png",
    "/assets/products/rivayat-black-coat-pant-model.png",
    "/assets/products/rivayat-black-coat-pant-lookbook.png"
  ]`
    );
  }
);

// 3. Make sure the hero image in DEFAULT_HOMEPAGE is set
html = html.replace(
  /heroImage:\s*['"][^'"]*['"]/,
  `heroImage: '/assets/products/rivayat-black-coat-pant-combo.png'`
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('UI and Assets updated successfully');
