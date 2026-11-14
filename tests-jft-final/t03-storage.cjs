// Real-browser tests: persistence, reload recovery, corrupt storage, quota failure, multi-tab overwrite.
const L = require('./lib.cjs');
async function answerN(p, n) { for (let i = 0; i < n; i++) { const idx = await p.evaluate(() => jftState().live.opts.findIndex(o => o.ok)); await p.click('.jft-option >> nth=' + idx); await p.click('text=Lanjut →'); } }
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];

  // A. progress persists across reload (answers, ledger, live session, daily log)
  let ctx = await L.newCtx(b); let p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(400);
  await p.evaluate(() => { go('learn'); jftStart('j', 1, 'acak'); });
  await answerN(p, 3);
  const before = await p.evaluate(() => ({ done: jftState().live.done, ids: Object.keys(jftState().progress).length, kanji: Object.keys(jftDayLog().kanji).length, sid: jftState().live.sessionId }));
  await p.reload(); await p.waitForTimeout(700);
  const after = await p.evaluate(() => ({ done: jftState().live && jftState().live.done, ids: Object.keys(jftState().progress).length, kanji: Object.keys(jftDayLog().kanji).length, sid: jftState().live && jftState().live.sessionId }));
  L.check('A1 sesi, progres item, dan Kanji harian pulih setelah reload', JSON.stringify(before) === JSON.stringify(after), { before, after });
  await p.evaluate(() => { go('learn'); jftResume(); }); await p.waitForTimeout(200);
  const resumed = await p.evaluate(() => !!(jftState().live.cur && jftState().live.opts.length === 4));
  L.check('A2 sesi dapat dilanjutkan setelah reload (soal aktif tersedia)', resumed);
  await ctx.close();

  // B. corrupt localStorage -> app boots and restores from IndexedDB mirror
  ctx = await L.newCtx(b); p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(400);
  await p.evaluate(() => { S.roots[0].folders[0].words.push({ id: 'wX', k: '猫', f: 'ねこ', a: 'Kucing' }); save(); });
  await p.waitForTimeout(1500); // mirror debounce 900ms
  await p.evaluate(() => localStorage.setItem(KEY, '{corrupt json'));
  await p.reload(); await p.waitForTimeout(1500);
  const rec = await p.evaluate(() => { let f = false; allF().forEach(x => x.words.forEach(w => { if (w.id === 'wX') f = true })); return f; });
  L.check('B1 localStorage korup: data dipulihkan dari salinan otomatis IndexedDB', rec);
  await ctx.close();

  // C. quota exceeded: app must keep working and tell the user (no silent data loss)
  ctx = await L.newCtx(b); p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(400);
  await p.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === KEY) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return o.apply(this, arguments); }; });
  await p.evaluate(() => { S.font = 'big'; save(); });
  await p.waitForTimeout(300);
  const toastShown = await p.evaluate(() => { const t = document.getElementById('tst'); return !!t && t.classList.contains('show') && /penyimpanan|simpan/i.test(document.getElementById('tstm').textContent); });
  L.check('C1 gagal menyimpan (kuota penuh) menampilkan peringatan ke pengguna', toastShown);
  await ctx.close();

  // D. multi-tab: a stale tab must not wipe progress made in another tab
  ctx = await L.newCtx(b); const p1 = await ctx.newPage(); const p2 = await ctx.newPage(); L.watch(p1, errs); L.watch(p2, errs);
  await p1.goto(url); await p1.waitForTimeout(400); await p2.goto(url); await p2.waitForTimeout(600);
  await p1.evaluate(() => { go('learn'); jftStart('k', 3, 'acak'); });
  await answerN(p1, 3);
  const p1prog = await p1.evaluate(() => ({ done: jftState().live.done, items: Object.keys(jftState().progress).length }));
  await p2.evaluate(() => { S.font = 'big'; save(); }); // innocuous action in the stale tab
  await p2.waitForTimeout(300);
  const stored = await p1.evaluate(() => { const o = JSON.parse(localStorage.getItem(KEY)); return { done: o.jft && o.jft.live && o.jft.live.done, items: Object.keys((o.jft || {}).progress || {}).length }; });
  L.check('D1 tab lama tidak menimpa progres tab lain di localStorage', stored.done === p1prog.done && stored.items === p1prog.items, { p1prog, stored });
  await ctx.close();

  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t03-storage'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
