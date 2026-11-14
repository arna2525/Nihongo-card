const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
let failed = 0;
fs.readdirSync(__dirname).filter(f => /^t\d+.*\.cjs$/.test(f)).sort().forEach(f => {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const last = (r.stdout || '').trim().split('\n').pop();
  console.log((r.status === 0 ? 'OK   ' : 'FAIL ') + last || f);
  if (r.status !== 0) { failed++; console.log(r.stdout, r.stderr); }
});
process.exit(failed ? 1 : 0);
