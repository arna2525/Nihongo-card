// Real-browser backup fuzz: type-confused / truncated / oversized / hostile payloads. bkValidate must never throw; every accepted
// payload must apply (Timpa and Gabung) and render all main screens without JavaScript errors; rejected payloads must leave data unchanged.
const L = require('./lib.cjs');
(async () => {
  const { srv, url } = await L.serve(); const b = await L.launch(); const errs = [];
  const ctx = await L.newCtx(b); const p = await ctx.newPage(); L.watch(p, errs); p.on('dialog', d => d.dismiss());
  await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(() => { S.welcomed = 1; S.roots[0].folders[0].words.push({ id: 'wKeep', k: '猫', f: 'ねこ', a: 'Kucing' }); jftState().exp = 55; save(); });
  const r = await p.evaluate(() => {
    const base = JSON.stringify(bkPayload()); const out = { throws: [], accepted: 0, rejected: 0, applyErr: [], changedOnReject: [], n: 0 };
    const vals = [null, '', 0, -1, 1e308, true, [], {}, [null], [[]], 'x'.repeat(5000), { a: { b: { c: {} } } }, '<img src=x onerror=1>', NaN, [1, 2, 3], { length: 5 }];
    const o = JSON.parse(base); const paths = [];
    (function walk(v, path, d) { if (d > 3 || !v || typeof v !== 'object') return; Object.keys(v).slice(0, 14).forEach(k => { paths.push(path.concat(k)); walk(v[k], path.concat(k), d + 1); }); })(o, [], 0);
    const cases = [];
    paths.slice(0, 300).forEach(pa => vals.forEach(v => cases.push({ pa, v })));
    const snap = () => JSON.stringify([allF().map(f => f.id + ':' + f.words.length), jftState().exp]);
    function set(root, pa, v) { let c = root; for (let i = 0; i < pa.length - 1; i++) c = c[pa[i]]; if (v === undefined) delete c[pa[pa.length - 1]]; else c[pa[pa.length - 1]] = (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v; }
    const texts = ['', '{', '[]', 'null', '"x"', '123', base.slice(0, base.length >> 1), base.slice(0, 40), '{"format":"kotoba-card-backup"}', '{"format":"kotoba-card-backup","schema":999,"data":{}}', '{"__proto__":{"polluted":1}}', '{"format":"kotoba-card-backup","schema":5,"data":{"roots":[{"id":"__proto__","name":"x","folders":[]}]}}'];
    function attempt(txt) {
      out.n++; let v; const before = snap();
      try { v = bkValidate(txt); } catch (e) { out.throws.push(String(e.message).slice(0, 80)); return; }
      if (!v || (!v.ok && !v.err)) { out.throws.push('bad return shape'); return; }
      if (v.err) { out.rejected++; if (snap() !== before) out.changedOnReject.push(1); return; }
      out.accepted++;
      if (out.accepted <= 60) { try { bkApply(v, out.accepted % 2 ? 'merge' : 'replace'); ['home', 'folder', 'quiz', 'stat', 'learn'].forEach(s => go(s)); } catch (e) { out.applyErr.push(String(e.message).slice(0, 100)); } }
    }
    texts.forEach(attempt);
    cases.forEach(c => { const q = JSON.parse(base); try { set(q, c.pa, c.v); attempt(JSON.stringify(q)); } catch (e) { } });
    out.polluted = ({}).polluted === 1 || Object.prototype.polluted === 1;
    return out;
  });
  await p.waitForTimeout(800);
  L.check('F1 bkValidate tidak pernah melempar exception (' + r.n + ' payload; ' + r.accepted + ' diterima, ' + r.rejected + ' ditolak)', r.throws.length === 0 && r.n > 300, { throws: r.throws.slice(0, 4), n: r.n });
  L.check('F2 payload yang diterima dapat diterapkan (Gabung/Timpa) dan semua layar dirender tanpa error', r.applyErr.length === 0 && r.accepted > 0, r.applyErr.slice(0, 4));
  L.check('F3 payload yang ditolak tidak mengubah data', r.changedOnReject.length === 0, r.changedOnReject.length);
  L.check('F4 tidak ada prototype pollution', r.polluted === false, r.polluted);
  L.check('Z tidak ada pageerror/console error', errs.length === 0, errs.slice(0, 4));
  const code = L.report('t14-backup-fuzz'); await b.close(); srv.close(); process.exit(code);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
