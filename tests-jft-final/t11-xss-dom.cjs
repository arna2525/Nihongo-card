// Real-browser DOM-XSS regression: hostile text (quotes, angle brackets, backslashes, handler/URL payloads) is imported
// through the real backup path and every screen is rendered and clicked. Fails if any payload executes or becomes markup.
// Scope: deterministic regression on known sinks; NOT a third-party penetration test.
const L = require('./lib.cjs');
const P = ['"><img src=x onerror=window.__xss=1>', "'><img src=x onerror=window.__xss=1>", "');window.__xss=1;//", '</script><svg onload=window.__xss=1>', "\\');window.__xss=1;//", 'javascript:window.__xss=1', '<a href="javascript:window.__xss=1" id="pwn">x</a>'];
const SCREENS = ["go('home')", "go('folder')", "go('quiz')", "go('stat')", "go('learn');JFT_TAB='kotoba';JFT_PAGE='home';R()"];
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = []; let clicks = 0, bad = [];
  const payload = JSON.stringify({ format: 'kotoba-card-backup', schema: 5, app: '0.1.0', data: { rootId: 'r1', roots: [{ id: 'r1', name: P[0], folders: [
    { id: 'f1', name: P[1], words: P.map((x, i) => ({ id: 'w' + i, k: x + i, f: P[(i + 1) % P.length] + i, a: P[(i + 2) % P.length] + i })), children: [{ id: 'f2', name: P[2], words: [{ id: 'wc', k: P[3], f: P[4], a: P[5] }], children: [] }] },
    { id: 'f3', name: P[6], words: [], children: [] }] }] }, corrections: [{ k: P[0], f: P[1], a: P[2], c: '', at: 1 }] });
  async function scan(p) { return p.evaluate(() => { const o = []; if (window.__xss) o.push('payload executed'); if (document.querySelector('img[src="x"],svg[onload],#pwn,[onerror],[onload]')) o.push('payload became DOM markup'); if (document.querySelector('a[href^="javascript:"]')) o.push('javascript: link'); return o; }); }
  for (const sc of SCREENS) {
    const ctx = await L.newCtx(b); const p = await ctx.newPage(); L.watch(p, errs); p.on('dialog', d => d.dismiss());
    await p.goto(url); await p.waitForTimeout(300);
    const ok = await p.evaluate((t) => { const v = bkValidate(t); if (!v.ok) return v.err; bkApply(v, 'replace'); S.welcomed = 1; return 'ok'; }, payload);
    if (ok !== 'ok') { bad.push('import rejected: ' + ok); await ctx.close(); continue; }
    await p.waitForTimeout(500);
    await p.evaluate((s) => { eval(s); }, sc); await p.waitForTimeout(150);
    bad.push(...(await scan(p)).map(x => sc + ' render: ' + x));
    const n = await p.$$eval('.pg.active button, nav button', bs => bs.length);
    for (let i = 0; i < Math.min(n, 60); i++) {
      const hs = await p.$$('.pg.active button, nav button'); if (i >= hs.length) break;
      try { if (await hs[i].isVisible()) { await hs[i].click({ timeout: 800, noWaitAfter: true }); clicks++; await p.waitForTimeout(40); } } catch (e) { }
      bad.push(...(await scan(p)).map(x => sc + ' click#' + i + ': ' + x));
      await p.evaluate((s) => { try { document.querySelectorAll('.dlg,.mask,#dg').forEach(x => x.classList && x.classList.remove('show')); eval(s); } catch (e) { } }, sc);
    }
    // hostile text typed into every text input (search etc.)
    const ins = await p.$$('.pg.active input[type=text], .pg.active input:not([type]), .pg.active textarea');
    for (const h of ins) { try { if (await h.isVisible()) { await h.fill(P[0] + P[2]); await p.waitForTimeout(60); } } catch (e) { } }
    bad.push(...(await scan(p)).map(x => sc + ' typed: ' + x));
    await ctx.close();
  }
  L.check('A1 payload impor bermusuhan tidak pernah dieksekusi/menjadi markup (' + clicks + ' klik, ' + SCREENS.length + ' layar)', bad.length === 0 && clicks > 20, { clicks, bad: bad.slice(0, 6) });
  const code = L.report('t11-xss-dom'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
