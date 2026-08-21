"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());

assert.ok(inlineScripts.length, "index.html must include application JavaScript");
inlineScripts.forEach((source, index) => {
  new vm.Script(source, { filename: `index-inline-${index}.js` });
});

const forbiddenPatterns = [
  [/mongodb\+srv:\/\/[^\s"']+:[^\s"']+@/i, "embedded MongoDB credentials"],
  [/Puppylampojasdad/i, "embedded administrator password"],
  [/x-user-role/i, "client-controlled role header"],
  [/x-user-email/i, "client-controlled email header"],
  [/express\.static\(__dirname\)/i, "public backend source directory"],
  [/https:\/\/https:\/\//i, "duplicated URL protocol"]
];

for (const [pattern, label] of forbiddenPatterns) {
  assert.doesNotMatch(`${html}\n${server}`, pattern, `Repository contains ${label}`);
}

const requiredFrontendMarkers = [
  "Send 4-digit OTP",
  "Continue with Google",
  "Profile photo",
  "schedulePincodeLookup",
  "Cricket Jerseys",
  "Football Jerseys",
  "Review Photo",
  "routeHashFromLocation",
  "returns-policy",
  "data-theme",
  "token: auth.user?.token",
  "updateRouteSEO",
  "server-side payment verification",
  "AbortController",
  "BACKGROUND_READ_TIMEOUT_MS",
  "DEFAULT_API_BASE_URL",
  "/assets/",
  "scheduleStorefrontRefresh",
  "startup-shell",
  "renderSequence"
];

for (const marker of requiredFrontendMarkers) {
  assert.ok(html.includes(marker), `Missing frontend capability marker: ${marker}`);
}

const requiredBackendRoutes = [
  "/signup/request-otp",
  "/signup/verify",
  "/auth/google",
  "/profile",
  "/pincode/:pincode",
  "/reviews",
  "/orders",
  "/returns",
  "/admin/stats"
];

for (const route of requiredBackendRoutes) {
  assert.ok(server.includes(route), `Missing backend route: ${route}`);
}

console.log(`Frontend syntax and ${requiredFrontendMarkers.length + requiredBackendRoutes.length} capability checks passed.`);
