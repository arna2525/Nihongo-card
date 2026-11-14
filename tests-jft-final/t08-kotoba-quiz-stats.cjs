// Real-browser tests: Kotoba quiz (UI driven), double-answer guard, reload resume, history/statistics consistency.
const L = require('./lib.cjs');
const correct = (p) => p.evaluate(() => Q.o.findIndex(o => o.id === Q.q[Q.i].id));
const wrong = (p) => p.evaluate(() => Q.o.findIndex(o => o.id !== Q.q[Q.i].id));
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  const ctx = await L.newCtx(b); const p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { S.welcomed = true; for (let i = 0; i < 8; i++) S.roots[0].folders[0].words.push({ id: 'x' + i, k: '漢' + i, f: 'かん' + i, a: 'Arti ' + i }); save(); go('quiz'); });
  await p.waitForTimeout(200);
  await p.click('.pg.active button:has-text("Kanji → Arti")');
  await p.click('.pg.active button:has-text("Mulai Kuis")'); await p.waitForTimeout(300);
  const st0 = await p.evaluate(() => ({ n: Q.q.length, phase: Q.phase, opts: Q.o.length }));
  L.check('A1 kuis dimulai dari UI: soal tersedia dengan 4 pilihan, fase ask', st0.n > 0 && st0.opts === 4 && st0.phase === 'ask', st0);
  // double / rapid click on the same option counts once
  const c0 = await correct(p);
  await p.evaluate((i) => { const el = document.getElementById('o' + i); for (let k = 0; k < 5; k++) el.click(); }, c0);
  const r1 = await p.evaluate(() => ({ res: Q.res.length, q: (S.st[today()] || {}).q }));
  L.check('A2 5x klik cepat pada jawaban hanya dihitung 1 jawaban (hasil dan statistik harian)', r1.res === 1 && r1.q === 1, r1);
  // reload mid-quiz keeps the session
  await p.waitForTimeout(600);
  const pre = await p.evaluate(() => ({ i: Q.i, res: Q.res.length }));
  await p.reload(); await p.waitForTimeout(800);
  const post = await p.evaluate(() => Q ? { i: Q.i, res: Q.res.length, paused: Q.paused } : null);
  L.check('B1 reload di tengah kuis: sesi dipulihkan (indeks & jawaban sama)', post && post.res === pre.res && post.i >= pre.i, { pre, post });
  // finish the quiz with a mix: first wrong then correct
  await p.evaluate(() => { go('quiz'); }); await p.waitForTimeout(300);
  let g = 0, wrongDone = false;
  while (g++ < 80) {
    const s = await p.evaluate(() => Q ? { done: Q.done, phase: Q.phase, paused: Q.paused } : { gone: true });
    if (s.gone || s.done) break;
    if (s.phase === 'ask') {
      if (s.paused) { await p.evaluate(() => { qSync(); }); await p.waitForTimeout(50); continue; }
      const idx = wrongDone ? await correct(p) : await wrong(p); wrongDone = true;
      await p.evaluate((i) => qPick(i), idx);
    } else if (s.phase === 'fb') { await p.evaluate(() => qNext()); }
    else { await p.evaluate(() => { if (Q && Q.phase !== 'ask' && Q.phase !== 'fb') qBegin(); }); await p.waitForTimeout(30); }
  }
  const fin = await p.evaluate(() => ({ done: Q && Q.done, qh: S.qh.length, ss: S.studySessions.length, st: S.st[today()] }));
  L.check('C1 kuis selesai: riwayat (qh) dan sesi belajar masing-masing tercatat 1x', fin.done === true && fin.qh === 1 && fin.ss === 1, fin);
  L.check('C2 statistik harian: q (dijawab) >= qo (benar) dan keduanya > 0', fin.st && fin.st.q >= fin.st.qo && fin.st.q > 0 && fin.st.qo > 0, fin.st);
  const stat = await p.evaluate(() => { go('stat'); return document.querySelector('.pg.active').innerText.length; });
  L.check('C3 halaman Statistik menampilkan konten setelah kuis', stat > 200, stat);
  const idem = await p.evaluate(() => { const items = Object.keys(sharedLedger()).length; const ev = Object.keys(sharedEvents()).length; return { items, ev }; });
  L.check('C4 ledger bersama: setiap jawaban punya event-ID unik (event > 0)', idem.ev > 0 && idem.items > 0, idem);
  // same event id replay must not double count
  const rep = await p.evaluate(() => { const loc = wordLoc('x1'); const k = 'replay:test:1'; const before = JSON.stringify(sharedLedger()); sharedRecord('kotoba', loc.w.k, loc.w.f, 'k2a', true, 'kotoba', k); const mid = JSON.stringify(sharedLedger()); sharedRecord('kotoba', loc.w.k, loc.w.f, 'k2a', true, 'kotoba', k); const after = JSON.stringify(sharedLedger()); return { first: before !== mid, second: mid !== after }; });
  L.check('C5 event-ID yang sama dicatat sekali (ulang tidak mengubah ledger)', rep.first === true && rep.second === false, rep);
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t08-kotoba-quiz-stats'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
