const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\ssrc\s*=/.test(match[0]))
  .map((match) => ({ name: "inline script", source: match[1] }));
const externalScripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map((match) => match[1])
  .filter((src) => src.startsWith("/") && !src.startsWith("//"))
  .map((src) => src.split("?")[0])
  .map((src) => {
    const file = src.replace(/^\//, "");
    return { name: file, source: fs.readFileSync(path.join(process.cwd(), file), "utf8") };
  });

const scripts = [...inlineScripts, ...externalScripts];
if (!scripts.length) throw new Error("No local frontend scripts found");
for (const script of scripts) new vm.Script(script.source, { filename: script.name });
console.log(`Validated ${scripts.length} frontend script(s).`);
