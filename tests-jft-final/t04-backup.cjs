// Real-browser tests: backup export/import (merge + replace), validation, undo, restore idempotency, UI file round-trip.
const L = require('./lib.cjs'); const fs = require('fs'); const os = require('os'); const path = require('path');
async function chunk(p, n = 7) { for (let i = 0; i < n; i++) { const idx = await p.evaluate(() => jftState().live.opts.findIndex(o => o.ok)); await p.click('.jft-option >> nth=' + idx); await p.click('text=Lanjut →'); } await p.waitForTimeout(250); }
const snap = (p) => p.evaluate(() => { let words = 0; allF().forEach(f => words += f.words.length); return { words, exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length, sess: jftState().studySessions ? 0 : 0, jsess: jftState().sessions.length, att: Object.values(sharedLedger()).reduce((a, it) => a + Object.values(it.dirs).reduce((x, d) => x + (d.attempts || 0), 0), 0) }; });
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  const ctx = await L.newCtx(b, { acceptDownloads: true }); const p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { S.welcomed = true; S.roots[0].folders[0].words.push({ id: 'wBk', k: '犬', f: 'いぬ', a: 'Anjing' }); save(); go('learn'); jftStart('k', 1, 'acak'); });
  await chunk(p);
  const s1 = await snap(p);
  const txt = await p.evaluate(() => JSON.stringify(bkPayload()));
  L.check('A0 payload backup memuat jft + sharedProgress + rewardLedger', await p.evaluate((t) => { const o = JSON.parse(t); return !!(o.data.jft && o.data.jft.rewardLedger && Object.keys(o.data.jft.rewardLedger).length === 1 && o.data.sharedProgress && Object.keys(o.data.sharedProgress.items).length > 0); }, txt));

  // second chunk, then restore (replace) the earlier backup
  await p.evaluate(() => { jftContinue(); }); await p.waitForTimeout(150);
  await chunk(p);
  const s2 = await snap(p);
  L.check('A1 sebelum restore: EXP bertambah ke 60', s2.exp === 60 && s2.led === 2, s2);
  const res = await p.evaluate((t) => { const v = bkValidate(t); if (!v.ok) return { err: v.err }; bkApply(v, 'replace'); return { ok: 1, exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length, welcomed: !!S.welcomed, home: /welcome-screen/.test(vHome()) }; }, txt);
  L.check('A2 Restore Timpa mengembalikan progres JFT ke isi backup (EXP 30, ledger 1)', res.ok && res.exp === 30 && res.led === 1, res);
  L.check('A3 setelah Restore Timpa layar sambutan tidak muncul lagi', res.ok && res.welcomed === true && res.home === false, res);
  const undo = await p.evaluate(() => bkHasUndo());
  L.check('A4 salinan pra-restore tersedia untuk Urungkan', undo === true);
  await p.evaluate(() => { bkUndo(); }); await p.click('#dgy'); await p.waitForTimeout(500); // real Undo path (snapshot format kotoba-restore-undo)
  L.check('A5 Urungkan mengembalikan EXP 60', (await snap(p)).exp === 60);

  // replace must be stable across reload (claim store aligned with restored ledger), and undo likewise
  const rr = await p.evaluate(async (t) => { bkApply(bkValidate(t), 'replace'); await new Promise(r => setTimeout(r, 400)); return jftState().exp; }, txt);
  await p.reload(); await p.waitForTimeout(1000);
  const afterReload = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).length }));
  L.check('A6 setelah Restore Timpa + reload, EXP tetap 30 (tidak kembali ke 60)', rr === 30 && afterReload.exp === 30 && afterReload.led === 1, { rr, afterReload });
  await p.evaluate(() => { bkUndo(); }); await p.click('#dgy'); await p.waitForTimeout(500);
  await p.reload(); await p.waitForTimeout(1000);
  L.check('A7 setelah Urungkan + reload, EXP kembali 60 dan stabil', (await p.evaluate(() => jftState().exp)) === 60);

  // merge same backup twice must not change anything (no double counting)
  const m0 = await snap(p);
  await p.evaluate((t) => { const v = bkValidate(t); bkApply(v, 'merge'); bkApply(bkValidate(t), 'merge'); }, txt);
  const m1 = await snap(p);
  L.check('B1 Gabung backup yang sama 2x: kata, EXP, ledger, sesi, jawaban tidak berubah', JSON.stringify(m0) === JSON.stringify(m1), { m0, m1 });

  // merge into a fresh device (empty app): becomes equal to backup
  const ctx2 = await L.newCtx(b); const q = await ctx2.newPage(); L.watch(q, errs); await q.goto(url); await q.waitForTimeout(500);
  const fresh = await q.evaluate((t) => { bkApply(bkValidate(t), 'merge'); let w = false; allF().forEach(f => f.words.forEach(x => { if (x.id === 'wBk' || x.k === '犬') w = true })); return { exp: jftState().exp, w }; }, txt);
  L.check('B2 Gabung ke perangkat baru membawa EXP 30 dan kosakata', fresh.exp === 30 && fresh.w, fresh);
  await q.reload(); await q.waitForTimeout(800);
  L.check('B3 hasil restore tetap ada setelah reload', (await q.evaluate(() => jftState().exp)) === 30);
  await ctx2.close();

  // validation rejects bad input and leaves state untouched
  const before = await snap(p);
  const rej = await p.evaluate(() => ({
    notJson: bkValidate('{{{').err, wrongFormat: bkValidate(JSON.stringify({ format: 'x', data: {} })).err,
    newer: bkValidate(JSON.stringify({ format: BKF, schema: 99, data: { roots: [{ name: 'a', folders: [] }] } })).err,
    noFolders: bkValidate(JSON.stringify({ format: BKF, schema: 5, data: {} })).err
  }));
  L.check('C1 backup tidak valid / versi lebih baru ditolak dengan pesan', !!(rej.notJson && rej.wrongFormat && rej.newer && rej.noFolders), rej);
  L.check('C2 state tidak berubah setelah penolakan', JSON.stringify(before) === JSON.stringify(await snap(p)));

  // UI round trip: export download, then import via file input + dialog
  await p.evaluate(() => { go('folder'); gear = true; ES = []; R(); ecT(3); });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('text=Ekspor')]);
  L.check('D1 tombol Ekspor menghasilkan unduhan .json', !!dl && /kotoba-card-backup-.*\.json$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
  const f = path.join(os.tmpdir(), 'bk-test.json'); fs.writeFileSync(f, txt);
  await p.setInputFiles('#bkf', f); await p.waitForTimeout(300);
  await p.click('text=Impor (Gabung)'); await p.waitForTimeout(150);
  await p.click('#dgy'); await p.waitForTimeout(300);
  const msg = await p.evaluate(() => document.getElementById('bm') && document.getElementById('bm').textContent);
  L.check('D2 impor lewat UI (pilih file → Gabung → konfirmasi) memberi pesan sukses', /Restore \(gabung\) selesai/.test(msg || ''), msg);

  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t04-backup'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
