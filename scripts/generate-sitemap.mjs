import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "../catalog.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const base = "https://www.rivayat.shop";
const lastmod = "2026-08-24";
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" }[character]));
const staticPages = [
  ["/", "1.0", "daily"],
  ["/shop", "0.9", "daily"],
  ["/about", "0.6", "monthly"],
  ["/contact", "0.5", "monthly"],
  ["/shipping", "0.5", "monthly"],
  ["/returns-policy", "0.5", "monthly"],
  ["/privacy", "0.3", "yearly"],
  ["/terms", "0.3", "yearly"],
  ["/cookies", "0.2", "yearly"]
];
const urls = staticPages.map(([pathname, priority, frequency]) => ({ pathname, priority, frequency }));
for (const product of catalog) urls.push({ pathname: `/product/${product.slug}`, priority: "0.8", frequency: "weekly", image: product.image, imageTitle: product.name });

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((entry) => `  <url>
    <loc>${escapeXml(`${base}${entry.pathname}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.frequency}</changefreq>
    <priority>${entry.priority}</priority>${entry.image ? `
    <image:image>
      <image:loc>${escapeXml(`${base}${entry.image}`)}</image:loc>
      <image:title>${escapeXml(entry.imageTitle)}</image:title>
    </image:image>` : ""}
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
console.log(`Generated sitemap.xml with ${urls.length} canonical URLs.`);
