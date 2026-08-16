const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);

if (!scripts.length) throw new Error("No inline frontend scripts found");
for (const [index, source] of scripts.entries()) {
  new vm.Script(source, { filename: `index.html:inline-script-${index + 1}` });
}

console.log(`Validated ${scripts.length} frontend script(s).`);
