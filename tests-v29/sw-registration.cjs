#!/usr/bin/env node
/**
 * Regression: Service Worker registration must exist, be correct, and not duplicate.
 * Also verifies sw.js CACHE_NAME consistency and core assets.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log("PASS  " + name);
  } else {
    console.log("FAIL  " + name + (detail ? " — " + detail : ""));
    failed++;
  }
}

// 1. Exactly one register call
const regMatches = html.match(/navigator\.serviceWorker\.register\s*\(/g) || [];
check("exactly one serviceWorker.register", regMatches.length === 1, "found " + regMatches.length);

// 2. Register points to ./sw.js with scope ./
check("register uses ./sw.js", /navigator\.serviceWorker\.register\s*\(\s*["']\.\/sw\.js["']/.test(html));
check("register uses scope ./", /register\s*\([^)]*scope\s*:\s*["']\.\/["']/.test(html));

// 3. Guarded by "serviceWorker" in navigator
check("guarded by feature detection", /typeof navigator!=="undefined"&&"serviceWorker" in navigator/.test(html));

// 4. Runs on load (not immediately, avoids blocking)
check("runs on window load", /addEventListener\s*\(\s*["']load["']/.test(html) && html.indexOf("serviceWorker.register") > html.indexOf('addEventListener("load"') - 200);

// 5. Existing update/recover paths still present
check("appApply still present", /async function appApply\s*\(/.test(html));
check("btnRecover still present", /function btnRecover\s*\(/.test(html));
check("getRegistration still used", /navigator\.serviceWorker\.getRegistration\s*\(/.test(html));
check("unregister still used in recover", /rg\.unregister\s*\(/.test(html) || /await rg\.unregister/.test(html));

// 6. No double register patterns
const allRegister = (html.match(/serviceWorker\.register/g) || []).length;
check("no accidental extra register strings", allRegister === 1);

// 7. sw.js integrity
const cacheName = (sw.match(/var CACHE_NAME\s*=\s*["']([^"']+)["']/) || [])[1] || '';
check("CACHE_NAME present and versioned", /^kotoba-v0\.1\.0-build17-5$/.test(cacheName));
check("skipWaiting on install", /self\.skipWaiting\s*\(/.test(sw));
check("clients.claim on activate", /self\.clients\.claim\s*\(/.test(sw));
check("old kotoba-v caches cleaned", /key\.indexOf\s*\(\s*["']kotoba-v["']\s*\)\s*===\s*0/.test(sw));
check("CORE includes index.html", /CORE\s*=\s*\[[^\]]*index\.html/.test(sw));
check("version.json not cached (network)", /version\.json/.test(sw) && /jaringan|network|return;/.test(sw));

// 8. Manifest consistency
check("manifest start_url ./", manifest.start_url === "./");
check("manifest scope ./", manifest.scope === "./");
check("manifest has icons", Array.isArray(manifest.icons) && manifest.icons.length >= 2);

// 9. Version alignment
check("APP_VERSION in html", /APP_VERSION\s*=\s*["']0\.1\.0["']/.test(html));
const appBuild = (html.match(/APP_BUILD\s*=\s*["']([^"']+)["']/) || [])[1] || '';
check("APP_BUILD in html", appBuild === version.build);
check("version.json build matches", version.build === "2026-11-15.8");

if (failed) {
  console.log("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll SW registration regression checks passed");
process.exit(0);
