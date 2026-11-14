// Shared helpers for browser tests. Uses a REAL Chromium via Playwright; nothing here is simulated.
const path = require('path');
const http = require('http');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { throw new Error('Playwright is required for browser tests. Run npm install before npm run test:browser.'); }
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.webp':'image/webp', '.txt':'text/plain' };

function serve(port = 0) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
      const f = path.join(ROOT, u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/' }));
  });
}

// Block external font requests (no network in CI); everything else is real.
async function newCtx(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }, opts));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  return ctx;
}
function watch(page, errs) {
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|fonts\./.test(m.text())) errs.push('console: ' + m.text()); });
}
let pass = 0, fail = 0; const lines = [];
function check(name, cond, extra) {
  if (cond) { pass++; lines.push('PASS  ' + name); } else { fail++; lines.push('FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function report(title) {
  console.log('== ' + title + ' =='); lines.forEach(l => console.log(l));
  console.log(`-- ${title}: ${pass} pass, ${fail} fail`);
  return fail === 0 ? 0 : 1;
}
async function launch() { const exe = process.env.KOTOBA_CHROMIUM || '/usr/bin/chromium'; return pw.chromium.launch(fs.existsSync(exe) ? { executablePath: exe, args: ['--no-sandbox'] } : {}); }
module.exports = { serve, newCtx, watch, check, report, launch, ROOT, pw };
