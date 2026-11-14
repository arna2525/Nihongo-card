// Real-browser crash/reload tests for the JFT reward transaction (IndexedDB claim -> local ledger apply).
// Crash is simulated by suppressing one step and reloading the page; IndexedDB and localStorage are real.
const L = require('./lib.cjs');
async function chunk(p, n = 7) { for (let i = 0; i < n; i++) { const idx = await p.evaluate(() => jftState().live.opts.findIndex(o => o.ok)); await p.click('.jft-option >> nth=' + idx); await p.click('text=Lanjut →'); } await p.waitForTimeout(400); }
const st = (p) => p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length, day: jftDayLog().exp, chunk: ((jftState().live || {}).chunk || []).length }));
const idb = (p) => p.evaluate(() => new Promise(r => { jftOpenRewardDb().then(db => { if (!db) return r(-1); const q = db.transaction('rewards', 'readonly').objectStore('rewards').getAll(); q.onsuccess = () => r(q.result.length); q.onerror = () => r(-2); }); }));
async function fresh(b, url, errs) { const ctx = await L.newCtx(b); const p = await ctx.newPage(); L.watch(p, errs); await p.goto(url); await p.waitForTimeout(500); await p.evaluate(() => { S.welcomed = 1; save(); go('learn'); jftStart('k', 1, 'acak'); }); await p.waitForTimeout(200); return { ctx, p }; }
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  // A. crash AFTER IndexedDB claim but BEFORE local ledger apply
  let { ctx, p } = await fresh(b, url, errs);
  await p.evaluate(() => { jftApplyChunkAward = function () { return 'CRASHED'; }; });
  await chunk(p);
  L.check('A1 sebelum crash: klaim IndexedDB tertulis, lokal belum menerapkan (EXP 0, IDB 1)', (await idb(p)) === 1 && (await st(p)).exp === 0, { idb: await idb(p), s: await st(p) });
  await p.reload(); await p.waitForTimeout(1200);
  let s = await st(p);
  L.check('A2 setelah reload: rekonsiliasi memulihkan tepat 30 EXP, ledger 1', s.exp === 30 && s.led === 1 && s.day === 30, s);
  await p.reload(); await p.waitForTimeout(1000); await p.reload(); await p.waitForTimeout(1000);
  s = await st(p);
  L.check('A3 reload berulang tidak menggandakan EXP (tetap 30)', s.exp === 30 && s.led === 1 && s.day === 30, s);
  // retry the still-pending chunk of the live session: must not double award
  const retry = await p.evaluate(async () => { const s = jftState().live; if (!s || !(s.chunk || []).length) return 'no-chunk'; const r = await jftAwardChunkAsync(s); return String(r) + ':' + jftState().exp; });
  L.check('A4 coba ulang chunk yang sama setelah pemulihan tidak menambah EXP', retry === 'no-chunk' || /:30$/.test(retry), retry);
  await ctx.close();

  // B. crash BEFORE the IndexedDB claim (IndexedDB unavailable): nothing awarded, answers kept, later retry awards once
  ({ ctx, p } = await fresh(b, url, errs));
  await p.evaluate(() => { window.__realOpen = jftOpenRewardDb; jftOpenRewardDb = function () { return Promise.resolve(null); }; });
  await chunk(p);
  s = await st(p);
  L.check('B1 IndexedDB tidak tersedia: EXP 0, ledger 0, 7 jawaban chunk tetap tersimpan', s.exp === 0 && s.led === 0 && s.chunk === 7, s);
  await p.reload(); await p.waitForTimeout(1000);
  s = await st(p);
  L.check('B2 setelah reload: chunk masih ada dan belum ada EXP (tidak hilang diam-diam)', s.exp === 0 && s.chunk === 7, s);
  const r2 = await p.evaluate(async () => { const s = jftState().live; const r = await jftAwardChunkAsync(s); return { r: String(r), exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length }; });
  L.check('B3 coba ulang saat IndexedDB kembali: tepat 30 EXP sekali', r2.exp === 30 && r2.led === 1, r2);
  const r3 = await p.evaluate(async () => { const s = jftState().live; await jftAwardChunkAsync(s); return jftState().exp; });
  L.check('B4 coba ulang kedua tidak menambah EXP', r3 === 30, r3);
  await ctx.close();

  // C. two tabs claim the same reward id concurrently: exactly one wins, EXP applied once after both reload
  ctx = await L.newCtx(b); const t1 = await ctx.newPage(), t2 = await ctx.newPage(); L.watch(t1, errs); L.watch(t2, errs);
  await t1.goto(url); await t1.waitForTimeout(500); await t2.goto(url); await t2.waitForTimeout(500);
  const res = await Promise.all([t1, t2].map(t => t.evaluate(() => jftClaimReward('chunk:race:0', 30))));
  const sorted = res.slice().sort().join(',');
  L.check('C1 dua tab mengklaim reward-id yang sama: satu CLAIMED, satu EXISTS', sorted === 'CLAIMED,EXISTS', res);
  await t1.reload(); await t2.reload(); await t1.waitForTimeout(1200); await t2.waitForTimeout(1200);
  const e1 = await st(t1), e2 = await st(t2);
  L.check('C2 setelah reload kedua tab: EXP 30 sekali di tiap tab dan IDB hanya 1 baris', e1.exp === 30 && e2.exp === 30 && (await idb(t1)) === 1, { e1, e2 });
  await ctx.close();
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs.slice(0, 4));
  const code = L.report('t12-reward-crash'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
