// Real-browser tests: Bunpou/Verb/Test Ingatan assessment rewards (once only), flashcard JFT side effects, daily Kanji + streak.
const L = require('./lib.cjs');
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  const ctx = await L.newCtx(b); const p = await ctx.newPage(); L.watch(p, errs);
  await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { S.welcomed = true; save(); go('learn'); JFT_TAB = 'bun'; JFT_PAGE = 'home'; R(); });
  // Bunpou: 10 correct = 42 EXP, rendering result many times must not re-award
  await p.evaluate(() => jftBunQuizStart());
  for (let i = 0; i < 10; i++) { await p.evaluate(() => { const q = JFT_BUN_Q, x = q.items[q.i]; jftBunPick(x.opts.indexOf(x.correct)); }); await p.evaluate(() => jftBunNext()); }
  await p.evaluate(() => { R('n'); R('n'); R('n'); });
  let st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).filter(k => k.indexOf('assess:bun:') === 0).length, sess: jftState().sessions.filter(s => s.kind === 'assessment').length }));
  L.check('A1 Bunpou 10/10 benar = 42 EXP, tepat satu ledger dan satu sesi walau dirender berkali-kali', st.exp === 42 && st.led === 1 && st.sess === 1, st);
  await p.reload(); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ exp: jftState().exp, sess: jftState().sessions.length }));
  L.check('A2 setelah reload EXP Bunpou tetap 42 (tidak ganda)', st.exp === 42 && st.sess === 1, st);
  // Verb quiz
  await p.evaluate(() => { go('learn'); JFT_TAB = 'verb'; JFT_PAGE = 'home'; R(); jftVerbQuizStart(); });
  for (let i = 0; i < 10; i++) { await p.evaluate(() => { const q = JFT_VERB_Q, x = q.items[q.i]; jftVerbPick(x.opts.findIndex(o => o.r === x.correct.r)); }); await p.evaluate(() => jftVerbNext()); }
  await p.evaluate(() => { R('n'); R('n'); });
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).filter(k => k.indexOf('assess:verb:') === 0).length }));
  L.check('B1 kuis konjugasi 10/10 = +42 EXP (total 84), satu ledger', st.exp === 84 && st.led === 1, st);
  // Test Ingatan with 5 mastered items
  const m = await p.evaluate(() => { let n = 0; JFT_ITEMS.k.slice(0, 5).forEach((w, i) => jftValidModes(w).forEach(mo => { for (let r = 0; r < 3; r++) jftSetProgress(w, mo, true, 'seed:' + w.id + mo + r); })); return jftAllLearned('all').length; });
  L.check('C0 prasyarat: item dengan streak >= 3 tersedia untuk Test Ingatan', m >= 5, m);
  await p.evaluate(() => { go('learn'); JFT_TAB = 'test'; JFT_PAGE = 'home'; R(); jftTestStart('all', 5); });
  for (let i = 0; i < 5; i++) { await p.evaluate(() => { R('n'); const q = JFT_TEST; jftTestPick(q.opts.findIndex(o => o.ok)); }); await p.evaluate(() => jftTestNext()); }
  await p.evaluate(() => { R('n'); R('n'); R('n'); });
  st = await p.evaluate(() => ({ exp: jftState().exp, led: Object.keys(jftState().rewardLedger).filter(k => k.indexOf('assess:test:') === 0).length }));
  L.check('C1 Test Ingatan 5/5 = +22 EXP (total 106), satu ledger walau dirender 3x', st.exp === 106 && st.led === 1, st);
  // JFT flashcard: study time only, no answers/attempts
  const f0 = await p.evaluate(() => ({ ans: jftDayLog().answers, corr: jftDayLog().correct, att: JSON.stringify(sharedLedger()).length, exp: jftState().exp }));
  await p.evaluate(() => { jftFlashStart('k', 1); jftFlashToggle(); jftFlashMove(1); jftFlashMove(1); jftFlashToggle(); });
  const f1 = await p.evaluate(() => ({ ans: jftDayLog().answers, corr: jftDayLog().correct, att: JSON.stringify(sharedLedger()).length, exp: jftState().exp }));
  L.check('D1 flashcard JFT tidak menambah jawaban, akurasi, ledger, atau EXP', JSON.stringify(f0) === JSON.stringify(f1), { f0, f1 });
  // Kanji daily: same item answered repeatedly counts once
  const kd = await p.evaluate(() => { const w = JFT_ITEMS.j[0]; const before = jftTodayKanji(); jftMarkActivity(w, 3, true); jftMarkActivity(w, 3, false); const mid = jftTodayKanji(); const w2 = JFT_ITEMS.j[1]; jftMarkActivity(w2, 3, true); return { before, mid, after: jftTodayKanji() }; });
  L.check('E1 Kanji harian: item sama dihitung sekali, item baru +1', kd.mid === kd.before + 1 && kd.after === kd.mid + 1, kd);
  // Streak
  const sk = await p.evaluate(() => { const d = jftState().daily; const day = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return jftDate(x); }; const out = {}; Object.keys(d).forEach(k => delete d[k]);
    const mk = (n) => { d[day(n)] = { seconds: 10, exp: 0, answers: 0, correct: 0, kanji: {}, kotoba: {} }; };
    mk(0); mk(1); mk(2); out.three = jftStreak(); delete d[day(1)]; out.gap = jftStreak(); delete d[day(0)]; mk(1); mk(2); out.yesterdayOnly = jftStreak(); delete d[day(1)]; out.broken = jftStreak(); return out; });
  L.check('F1 streak: 3 hari berturut = 3; putus di tengah = 1; hari ini kosong tapi kemarin ada tetap lanjut (2); putus = 0', sk.three === 3 && sk.gap === 1 && sk.yesterdayOnly === 2 && sk.broken === 0, sk);
  await p.evaluate(() => { go('stat'); }); await p.evaluate(() => { go('learn'); JFT_TAB = 'streak'; R(); });
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs);
  const code = L.report('t09-jft-assessments'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
