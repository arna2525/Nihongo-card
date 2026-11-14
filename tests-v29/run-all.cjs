const {spawnSync}=require('node:child_process'),path=require('node:path');let fail=0;
const files=['run-checks.cjs','runtime-stat-smoke.cjs','idempotency.cjs','unified-brain.cjs','sw-registration.cjs','ast-no-duplicate-functions.cjs','exp01-idempotency.cjs','exp01-hardening.cjs','exp02-merge.cjs','exp02-v10.cjs','exp02-v11.cjs'];
for(const f of files){const r=spawnSync(process.execPath,[path.join(__dirname,f)],{encoding:'utf8'});const ok=r.status===0;if(!ok)fail++;console.log((ok?'PASS ':'FAIL ')+f);if(!ok)console.log((r.stderr||r.stdout).split('\n').slice(0,10).join('\n'))}
console.log('\nCompatible regression suite: '+(files.length-fail)+'/'+files.length+' passed');
process.exit(fail?1:0);
