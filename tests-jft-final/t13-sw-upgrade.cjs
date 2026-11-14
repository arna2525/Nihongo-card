// Real-browser Service Worker UPGRADE test: an older worker/cache is installed first, a tab stays open, then the current worker
// is served. Verifies old Kotoba cache is retired, third-party cache untouched, user data preserved, offline launch works.
const L = require('./lib.cjs'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = L.ROOT; let phase = 1;
const CUR = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'); const m = /var CACHE_NAME = "([^"]+)"/.exec(CUR); const NEWNAME = m[1];
const OLDNAME = 'kotoba-v0.1.0-build16-old';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
function serve() { return new Promise(r => { const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; } let body = fs.readFileSync(f); if (u === '/sw.js' && phase === 1) body = Buffer.from(CUR.replace(NEWNAME, OLDNAME)); res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(body); }); srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/' })); }); }
(async () => {
  const { srv, url } = await serve(); const b = await L.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const tabA = await ctx.newPage(); L.watch(tabA, errs);
  await tabA.goto(url); await tabA.waitForTimeout(800);
  await tabA.evaluate(async () => { await navigator.serviceWorker.ready; const c = await caches.open('other-app-v1'); await c.put('/x', new Response('keep')); });
  await tabA.reload(); await tabA.waitForTimeout(800);
  await tabA.evaluate(() => { S.welcomed = 1; S.font = 'big'; S.jft = S.jft || {}; jftState().exp = 123; save(); });
  let keys = await tabA.evaluate(() => caches.keys());
  L.check('U1 fase lama: cache lama + cache pihak ketiga ada', keys.includes(OLDNAME) && keys.includes('other-app-v1'), keys);
  // upgrade while tabA stays open
  phase = 2;
  const tabB = await ctx.newPage(); L.watch(tabB, errs); await tabB.goto(url); await tabB.waitForTimeout(500);
  await tabB.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await tabB.waitForTimeout(2500);
  keys = await tabA.evaluate(() => caches.keys());
  L.check('U2 setelah update: cache Kotoba lama dihapus, cache build baru ada', !keys.includes(OLDNAME) && keys.includes(NEWNAME), keys);
  L.check('U3 cache aplikasi lain tidak disentuh', keys.includes('other-app-v1') && await tabA.evaluate(async () => !!(await (await caches.open('other-app-v1')).match('/x'))), keys);
  const ctl = await tabA.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: !!r.active, waiting: !!r.waiting, ctl: !!navigator.serviceWorker.controller }; });
  L.check('U4 worker baru aktif tanpa waiting; tab lama tetap dikendalikan', ctl.active && !ctl.waiting && ctl.ctl, ctl);
  await tabA.reload(); await tabA.waitForTimeout(800);
  const data = await tabA.evaluate(() => ({ font: S.font, exp: jftState().exp, build: APP_BUILD }));
  const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).build;
  L.check('U5 data pengguna utuh setelah upgrade (font big, EXP 123) dan build baru', data.font === 'big' && data.exp === 123 && data.build === ver, data);
  await ctx.setOffline(true); await tabA.reload(); await tabA.waitForTimeout(800);
  const off = await tabA.evaluate(() => ({ ok: typeof go === 'function', exp: jftState().exp }));
  L.check('U6 buka ulang saat offline setelah upgrade: aplikasi jalan, data utuh', off.ok && off.exp === 123, off);
  await ctx.setOffline(false);
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs.slice(0, 4));
  const code = L.report('t13-sw-upgrade'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
