// Real-browser tests: navigation, every main screen & JFT tab, responsive layout on Android / iPhone / desktop viewports.
const L = require('./lib.cjs'); const fs = require('fs'); const path = require('path'); const os = require('os');
const VIEWPORTS = [
  { name: 'Android 360x740', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' },
  { name: 'iPhone 390x844', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' },
  { name: 'iPhone SE 320x568', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'Desktop 1280x800', viewport: { width: 1280, height: 800 } },
];
const SHOTS = process.env.SHOTS ? path.join(os.tmpdir(), 'kc-shots') : null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  for (const vp of VIEWPORTS) {
    const { name, ...opts } = vp; const ctx = await L.newCtx(b, opts); const p = await ctx.newPage(); L.watch(p, errs);
    await p.goto(url); await p.waitForTimeout(500);
    await p.evaluate(() => { S.welcomed = true; save(); R(); });
    const screens = [['home', "go('home')"], ['folder', "go('folder')"], ['quiz', "go('quiz')"], ['stat', "go('stat')"]];
    ['home', 'kotoba', 'bab', 'kanji', 'bun', 'verb', 'test', 'streak'].forEach(t => screens.push(['learn/' + t, "go('learn'); JFT_TAB = '" + t + "'; JFT_PAGE = 'home'; R();"]));
    const bad = [];
    for (const [label, fn] of screens) {
      await p.evaluate(fn); await p.waitForTimeout(250);
      const m = await p.evaluate(() => {
        const W = window.innerWidth, over = [];
        document.querySelectorAll('#app *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && (r.right > W + 1 || r.left < -1)) { let sc = false, n = el.parentElement; while (n && n !== document.body) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { sc = true; break } n = n.parentElement } if (!sc) over.push((el.tagName + '.' + (el.className && el.className.baseVal === undefined ? el.className : '')).slice(0, 50)); } });
        const nav = document.querySelector('nav'), nr = nav && nav.getBoundingClientRect(), mainEl = document.querySelector('main');
        return { docOverflow: document.documentElement.scrollWidth > W + 1, over: over.slice(0, 4), navVisible: !!nr && nr.bottom <= window.innerHeight + 1 && nr.top >= 0 && nr.height > 20, mainScrolls: !!mainEl && getComputedStyle(mainEl).overflowY !== 'hidden', blank: !(mainEl && mainEl.innerText.trim().length > 5) };
      });
      if (m.docOverflow || m.over.length || (label !== 'home' && !m.navVisible) || !m.mainScrolls || m.blank) bad.push({ label, m });
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name.replace(/\W+/g, '_') + '__' + label.replace(/\W+/g, '_') + '.png') });
    }
    L.check(name + ': ' + screens.length + ' layar tanpa overflow horizontal, nav terlihat, konten tidak kosong', bad.length === 0, bad);
    // navigation buttons all work
    const navOk = await p.evaluate(async () => { const out = []; for (const id of ['t-folder', 't-learn', 't-quiz']) { document.getElementById(id).click(); await new Promise(r => setTimeout(r, 200)); out.push(document.getElementById(id).classList.contains('on')); } return out; });
    L.check(name + ': tombol navigasi bawah berpindah halaman (aktif ter-highlight)', navOk.every(Boolean), navOk);
    // answer buttons on a JFT question are tappable and large enough
    await p.evaluate(() => { go('learn'); jftStart('k', 1, 'acak'); }); await p.waitForTimeout(250);
    const tap = await p.evaluate(() => [...document.querySelectorAll('.jft-option')].map(o => { const r = o.getBoundingClientRect(); return { h: Math.round(r.height), inView: r.right <= window.innerWidth + 1 && r.left >= -1 }; }));
    L.check(name + ': 4 opsi jawaban terlihat penuh dan tinggi >= 40px', tap.length === 4 && tap.every(t => t.inView && t.h >= 40), tap);
    await ctx.close();
  }
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t06-ui-responsive'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
