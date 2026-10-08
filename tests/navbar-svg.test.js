const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const storefront = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const navStart = storefront.indexOf('<header class="header">');
const navEnd = storefront.indexOf('<main id="app">');
assert.ok(navStart >= 0 && navEnd > navStart, "The storefront navigation shell should exist.");

const navigation = storefront.slice(navStart, navEnd);
assert.doesNotMatch(navigation, /<img\b/i, "Navbar artwork must use theme-aware SVG instead of raster images.");
assert.match(navigation, /class="brand-logo-svg"/);
assert.match(navigation, /class="nav-svg-icon nav-action-logo"/);
assert.match(navigation, /class="nav-svg-icon nav-icon-logo"/);
assert.match(navigation, /class="nav-svg-icon theme-icon theme-sun"/);
assert.match(navigation, /class="nav-svg-icon theme-icon theme-moon"/);
assert.match(navigation, /class="mobile-bottom-nav"[\s\S]*<svg/);
assert.match(storefront, /\[data-theme="dark"\] \.theme-sun \{ display:none; \}/);
assert.match(storefront, /\[data-theme="dark"\] \.theme-moon \{ display:block; \}/);
assert.doesNotMatch(storefront, /thumb\.textContent\s*=/, "Theme switching must not replace the SVG markup.");

const reactSource = fs.readFileSync(path.join(__dirname, "..", "react", "interactive.jsx"), "utf8");
assert.match(reactSource, /<svg className="react-search-icon nav-svg-icon"/);

console.log("Navbar SVG OK: desktop, drawer, search, theme, and mobile navigation icons are vector and theme-aware.");
