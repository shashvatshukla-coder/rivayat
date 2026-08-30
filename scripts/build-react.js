const fs = require("fs");
const path = require("path");

const output = path.join(__dirname, "..", "assets", "react", "rivayat-interactive.js");
fs.mkdirSync(path.dirname(output), { recursive: true });

let esbuild;
try {
  esbuild = require("esbuild");
} catch (error) {
  if (fs.existsSync(output)) {
    console.warn("esbuild is unavailable; using the committed React interaction bundle.");
    process.exit(0);
  }
  throw error;
}

esbuild.build({
  entryPoints: [path.join(__dirname, "..", "react", "interactive.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  legalComments: "none",
  outfile: output
}).then(() => {
  console.log("Built React interaction island.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
