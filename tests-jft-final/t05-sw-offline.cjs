// Real-browser tests: Service Worker install/activate, offline relaunch, offline learning + EXP, manifest & icon validity.
const L = require('./lib.cjs'); const fs = require('fs'); const path = require('path');
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  // static manifest/icon checks
  const man = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'manifest.webmanifest'), 'utf8'));
  L.check('M1 manifest: name, start_url, scope, display standalone', !!(man.name && man.start_url === './' && man.scope === './' && man.display === 'standalone'), man);
  const iconOk = man.icons.every(i => { const f = path.join(L.ROOT, i.src); if (!fs.existsSync(f)) return false; const [w, h] = pngSize(f); return i.sizes === w + 'x' + h; });
  L.check('M2 manifest: semua ikon ada dan ukuran sesuai deklarasi', iconOk, man.icons);
  const ver = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'version.json'), 'utf8'));
  const html = fs.readFileSync(path.join(L.ROOT, 'index.html'), 'utf8');
  const bm = html.match(/APP_BUILD\s*=\s*["']([^"']+)["']/), vm = html.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  L.check('M3 version.json konsisten dengan APP_BUILD/APP_VERSION di index.html', !!(bm && vm && ver.build === bm[1] && ver.displayVersion === vm[1]), { ver, build: bm && bm[1], v: vm && vm[1] });
  // every local asset referenced by index.html / sw.js exists
  const refs = new Set(); (html.match(/(?:src|href)=["'](assets\/[^"']+)["']/g) || []).forEach(m => refs.add(m.match(/["'](.+)["']/)[1]));
  (html.match(/url\(["']?(assets\/[^"')]+)/g) || []).forEach(m => refs.add(m.replace(/url\(["']?/, '')));
  const swsrc = fs.readFileSync(path.join(L.ROOT, 'sw.js'), 'utf8'); (swsrc.match(/"assets\/[^"]+"/g) || []).forEach(m => refs.add(m.replace(/"/g, '')));
  const missing = [...refs].filter(r => !fs.existsSync(path.join(L.ROOT, r)));
  L.check('M4 semua aset lokal yang dirujuk ada (' + refs.size + ' rujukan)', missing.length === 0, missing);

  // real SW lifecycle
  const ctx = await L.newCtx(b, { serviceWorkers: 'allow' }); const p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(500);
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, state: r.active && r.active.state }; });
  L.check('S1 Service Worker terdaftar dan aktif', sw.state === 'activated' && sw.scope.endsWith('/'), sw);
  await p.reload(); await p.waitForTimeout(800);
  const ctrl = await p.evaluate(() => !!navigator.serviceWorker.controller);
  L.check('S2 halaman dikendalikan Service Worker setelah reload', ctrl);
  const cached = await p.evaluate(async () => { const ks = await caches.keys(); const out = {}; for (const k of ks) { const c = await caches.open(k); out[k] = (await c.keys()).map(r => new URL(r.url).pathname); } return out; });
  const files = Object.values(cached).flat();
  L.check('S3 cache berisi index, manifest, dan aset artwork', ['/', '/index.html', '/manifest.webmanifest', '/assets/logo.png', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/header.webp', '/assets/bg.webp'].filter(x => !files.includes(x)).length <= 1, cached);
  L.check('S4 version.json tidak di-cache (pemeriksaan update akurat)', !files.includes('/version.json'));

  // go offline: relaunch + learn + EXP
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(800);
  const title = await p.title();
  L.check('O1 reload saat offline tetap memuat aplikasi', title === 'Kotoba Card' && (await p.evaluate(() => typeof S === 'object' && !!document.querySelector('nav'))), title);
  await p.evaluate(() => { S.welcomed = true; go('learn'); jftStart('k', 1, 'acak'); });
  for (let i = 0; i < 7; i++) { const idx = await p.evaluate(() => jftState().live.opts.findIndex(o => o.ok)); await p.click('.jft-option >> nth=' + idx); await p.click('text=Lanjut →'); }
  await p.waitForTimeout(400);
  L.check('O2 belajar JFT saat offline: 7 jawaban benar = 30 EXP', (await p.evaluate(() => jftState().exp)) === 30);
  const logoOk = await p.evaluate(() => fetch('assets/logo.png').then(r => r.ok).catch(() => false));
  L.check('O3 aset gambar tersedia offline dari cache', logoOk);
  const vj = await p.evaluate(() => fetch('version.json', { cache: 'no-store' }).then(r => r.ok).catch(() => 'network-error'));
  L.check('O4 saat offline version.json gagal dengan wajar (tanpa crash)', vj === 'network-error' || vj === false);
  const chk = await p.evaluate(async () => { try { await btnAppCheck(); return document.getElementById('abMsg') ? 'noui' : 'ok-no-ui'; } catch (e) { return 'threw:' + e.message; } });
  L.check('O5 Periksa Update saat offline tidak melempar error', !/^threw/.test(chk), chk);
  await ctx.setOffline(false);
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t05-sw-offline'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
