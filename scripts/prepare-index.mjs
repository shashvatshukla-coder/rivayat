import fs from "node:fs";

const file = new URL("../index.html", import.meta.url);
let html = fs.readFileSync(file, "utf8");

html = html.replace(
  /<link rel="icon" href="data:image\/webp;base64,[A-Za-z0-9+/=]+" \/>/,
  '<link rel="icon" type="image/webp" sizes="any" href="/assets/branding/rivayat-logo.webp" />'
);

html = html.replace(
  /src="data:image\/webp;base64,[A-Za-z0-9+/=]+" alt="RIVAYAT(?: Fashion)? logo"/g,
  'src="/assets/branding/rivayat-logo.webp" width="1100" height="1100" alt="RIVAYAT Fashion logo"'
);

html = html.replace(
  /    const ASSETS = \{.*?\};\n\n    const INITIAL_PRODUCTS = \[[\s\S]*?\n\];\n\n    const INITIAL_COUPONS = /,
  `    const ASSETS = {
      logo: '/assets/branding/rivayat-logo.webp',
      fallbackProduct: '/assets/products/tshirts/chicago_23_cream_red_tshirt.png'
    };

    const INITIAL_PRODUCTS = Array.isArray(window.RIVAYAT_PRODUCTS) ? window.RIVAYAT_PRODUCTS : [];

    const INITIAL_COUPONS = `
);

html = html.replace(
  "  <script>\n    /*************************************************************",
  "  <script src=\"/catalog.js\"></script>\n  <script>\n    /*************************************************************"
);

if (!html.includes("window.RIVAYAT_PRODUCTS")) throw new Error("Catalog replacement failed");
if (html.includes('rel="icon" href="data:image')) throw new Error("Embedded favicon replacement failed");
if (!html.includes('src="/catalog.js"')) throw new Error("Catalog script injection failed");

fs.writeFileSync(file, html);
