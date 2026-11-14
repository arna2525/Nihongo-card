// Real-browser smoke: click every visible button on each screen (fresh state each); dialogs are never confirmed. Fails only on JS errors.
const L = require('./lib.cjs');
const SCREENS = ["go('home')", "go('folder')", "go('quiz')", "go('stat')", "go('learn');JFT_TAB='home';JFT_PAGE='home';R()", "go('learn');JFT_TAB='kotoba';JFT_PAGE='home';R()", "go('learn');JFT_TAB='bab';JFT_PAGE='home';R()", "go('learn');JFT_TAB='kanji';JFT_PAGE='home';R()", "go('learn');JFT_TAB='bun';JFT_PAGE='home';R()", "go('learn');JFT_TAB='verb';JFT_PAGE='home';R()", "go('learn');JFT_TAB='test';JFT_PAGE='home';R()", "go('learn');JFT_TAB='streak';JFT_PAGE='home';R()", "go('folder');gear=true;ES=[];R();ecT(3)"];
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); let clicks = 0; const errs = [];
  for (const sc of SCREENS) {
    const ctx = await L.newCtx(b, { acceptDownloads: true }); const p = await ctx.newPage(); L.watch(p, errs);
    p.on('dialog', d => d.dismiss());
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((s) => { S.welcomed = true; save(); eval(s); }, sc); await p.waitForTimeout(150);
    const n = await p.$$eval('.pg.active button, nav button', bs => bs.length);
    for (let i = 0; i < Math.min(n, 60); i++) {
      const hs = await p.$$('.pg.active button, nav button'); if (i >= hs.length) break;
      try { if (await hs[i].isVisible()) { await hs[i].click({ timeout: 800, noWaitAfter: true }); clicks++; await p.waitForTimeout(40); } } catch (e) { }
      await p.evaluate((s) => { try { document.querySelectorAll('.dlg,.mask,#dg').forEach(x => x.classList && x.classList.remove('show')); eval(s); } catch (e) { } }, sc);
    }
    await ctx.close();
  }
  L.check('A1 ' + clicks + ' klik tombol di ' + SCREENS.length + ' layar tanpa error JavaScript', errs.length === 0 && clicks > 100, { clicks, errs: errs.slice(0, 5) });
  const code = L.report('t10-button-smoke'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
