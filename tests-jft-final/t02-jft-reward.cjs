// Real-browser tests: JFT session, EXP, reload recovery, double-reward prevention (rapid click, multi-tab, reload mid-claim).
const L = require('./lib.cjs');
async function correctIdx(p) { return p.evaluate(() => jftState().live.opts.findIndex(o => o.ok)); }
async function wrongIdx(p) { return p.evaluate(() => jftState().live.opts.findIndex(o => !o.ok)); }
async function answer(p, ok) {
  const i = ok ? await correctIdx(p) : await wrongIdx(p);
  await p.click('.jft-option >> nth=' + i);
  await p.click('text=Lanjut →');
}
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  // ---------- A. basic session: 7 correct fresh answers = 7*4 + 2 bonus = 30 EXP
  let ctx = await L.newCtx(b); let p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { go('learn'); jftStart('k', 1, 'acak'); });
  await p.waitForTimeout(200);
  for (let n = 0; n < 7; n++) await answer(p, true);
  await p.waitForSelector('text=Blok selesai', { timeout: 5000 }).catch(() => {});
  // the reward commit (IndexedDB claim -> ledger) is asynchronous and may land after the break screen renders: wait for it, don't race it
  await p.waitForFunction(() => jftState().exp > 0, null, { timeout: 5000 }).catch(() => {});
  let st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger), brk: jftState().live.break, day: jftDayLog().exp }));
  L.check('A1 blok 7 soal benar menghasilkan 30 EXP', st.exp === 30, st);
  L.check('A2 ledger hanya satu entri', st.led.length === 1, st);
  L.check('A3 EXP harian sama dengan EXP total', st.day === 30, st);
  // reload mid-break: state must survive
  await p.reload(); await p.waitForTimeout(600);
  st = await p.evaluate(() => ({ exp: jftState().exp, live: !!jftState().live, led: Object.keys(jftState().rewardLedger).length }));
  L.check('A4 setelah reload: EXP tetap 30, sesi masih ada, ledger 1', st.exp === 30 && st.live && st.led === 1, st);
  // ---------- B. rapid clicks on Lanjut / option must not double count
  await p.evaluate(() => { go('learn'); jftResume(); });
  await p.click('text=Lanjutkan sesi →'); await p.waitForTimeout(150);
  const before = await p.evaluate(() => ({ done: jftState().live.done, ans: jftState().live.answerCount }));
  const i = await correctIdx(p);
  await p.evaluate((i) => { const btn = document.querySelectorAll('.jft-option')[i]; for (let k = 0; k < 5; k++) btn.click(); }, i);
  st = await p.evaluate(() => ({ done: jftState().live.done, ans: jftState().live.answerCount }));
  L.check('B1 5x klik cepat pada satu opsi hanya dihitung 1 jawaban', st.done === before.done + 1 && st.ans === before.ans + 1, { before, st });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /Lanjut →/.test(x.textContent)); for (let k = 0; k < 5; k++) bt && bt.click(); });
  st = await p.evaluate(() => ({ done: jftState().live.done, hasCur: !!jftState().live.cur, pick: jftState().live.pick }));
  L.check('B2 5x klik cepat pada Lanjut tidak melompati soal', st.done === before.done + 1 && st.hasCur && st.pick === null, st);
  // finish 7 fresh in this second chunk, hammering the last Lanjut
  let guard = 0;
  while (guard++ < 40) {
    const s = await p.evaluate(() => { const l = jftState().live; return { brk: l.break, fresh: l.fresh }; });
    if (s.brk) break;
    const idx = await correctIdx(p);
    await p.click('.jft-option >> nth=' + idx);
    await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /Lanjut →/.test(x.textContent)); for (let k = 0; k < 6; k++) bt && bt.click(); });
    await p.waitForTimeout(60);
  }
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length, sum: jftLedgerSum(jftState().rewardLedger) }));
  L.check('B3 setelah blok ke-2 dengan klik berulang: ledger = 2 entri, EXP = jumlah ledger', st.led === 2 && st.exp === st.sum, st);
  // ---------- C. reload mid-award: claim committed in IDB but state not saved -> reconcile must restore exactly once
  await p.evaluate(() => { jftState().exp = 0; jftState().rewardLedger = {}; jftState().daily = {}; save(); });
  await p.reload(); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length }));
  L.check('C1 reconcile dari IndexedDB mengembalikan EXP yang hilang tepat sekali (2 entri)', st.led === 2 && st.exp > 0, st);
  const exp1 = st.exp;
  await p.reload(); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length }));
  L.check('C2 reload berulang tidak menambah EXP lagi', st.exp === exp1 && st.led === 2, { st, exp1 });
  await ctx.close();

  // ---------- D. multi-tab: the same live session open in two tabs, both finish the same chunk
  ctx = await L.newCtx(b); const p1 = await ctx.newPage(); const p2 = await ctx.newPage(); L.watch(p1, errs); L.watch(p2, errs);
  await p1.goto(url); await p1.waitForTimeout(500);
  await p1.evaluate(() => { go('learn'); jftStart('k', 2, 'acak'); });
  await p1.waitForTimeout(200);
  await p2.goto(url); await p2.waitForTimeout(700);
  await p2.evaluate(() => { go('learn'); jftResume(); });
  async function fastChunk(pg) {
    let g = 0;
    while (g++ < 30) {
      const brk = await pg.evaluate(() => jftState().live && jftState().live.break); if (brk) break;
      const idx = await pg.evaluate(() => jftState().live.opts.findIndex(o => o.ok));
      await pg.click('.jft-option >> nth=' + idx);
      await pg.click('text=Lanjut →'); await pg.waitForTimeout(40);
    }
  }
  await fastChunk(p1); await fastChunk(p2);
  await p1.waitForTimeout(400); await p2.waitForTimeout(400);
  const e1 = await p1.evaluate(() => ({ exp: jftState().exp })); const e2 = await p2.evaluate(() => ({ exp: jftState().exp }));
  const stored = await p1.evaluate(() => { const o = JSON.parse(localStorage.getItem(KEY)); return { exp: o.jft.exp, led: Object.keys(o.jft.rewardLedger || {}).length }; });
  await p1.reload(); await p1.waitForTimeout(900);
  const after = await p1.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length }));
  L.check('D1 multi-tab: chunk yang sama hanya diberi EXP sekali setelah reload (<=30)', after.exp === 30 && after.led === 1, { e1, e2, stored, after });
  await ctx.close();

  // ---------- E. IndexedDB unavailable: fail closed, preserve the chunk for retry, never invent local-only rewards
  ctx = await L.newCtx(b); await ctx.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
  p = await ctx.newPage(); L.watch(p, errs); await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { go('learn'); jftStart('k', 1, 'acak'); });
  for (let n = 0; n < 7; n++) await answer(p, true);
  await p.waitForTimeout(400);
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length, chunk: jftState().live.chunk.length, error: jftState().live.rewardError, brk: jftState().live.break }));
  L.check('E1 tanpa IndexedDB: EXP tidak diberikan, chunk 7 jawaban dipertahankan dan dapat dicoba ulang', st.exp === 0 && st.led === 0 && st.chunk === 7 && st.error && st.brk, st);
  await ctx.close();

  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t02-jft-reward'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
