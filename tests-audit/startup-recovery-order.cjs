'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function mirrorRecover()');
const end=html.indexOf('/* --- koreksi pengguna',start);
if(start<0||end<0)throw new Error('mirror recovery source not found');
const source=html.slice(start,end);
function assert(x,m){if(!x)throw new Error(m||'assertion failed')}
function check(name,fn){return Promise.resolve().then(fn).then(()=>console.log('PASS',name),e=>{console.error('FAIL',name,e.message);throw e})}
function context(record){
 const db={transaction(){return{objectStore(){return{get(){const req={result:undefined,onsuccess:null,onerror:null};setTimeout(()=>{req.result=record;if(req.onsuccess)req.onsuccess()},0);return req}}}}}};
 const c={Promise,JSON,FRESH:true,MIRROR_OK:false,RL:false,S:{roots:[]},dbOpen:()=>Promise.resolve(db),mirrorSoon(){c.mirrorScheduled=true},mig(){},applyFont(){},save(){},R(){},toast(){}};
 vm.createContext(c);vm.runInContext(source,c);return c;
}
(async()=>{
 await check('JFT reward reconciliation waits until the mirror snapshot has restored S',async()=>{
  const c=context({json:JSON.stringify({roots:[{id:'restored'}],marker:'mirror-restored'})});
  let observed;
  await vm.runInContext('mirrorRecover().then(function(){observed=S.marker;return Promise.resolve()})',c);
  assert(c.observed==='mirror-restored','recovery promise resolved before mirrored state was restored');
  assert(c.FRESH===false&&c.RL===true,'mirror restore flags were not applied');
 });
 await check('Mirror recovery resolves safely when no snapshot exists',async()=>{
  const c=context(null);await vm.runInContext('mirrorRecover()',c);
  assert(c.MIRROR_OK===true,'mirror readiness flag not set');
  assert(c.mirrorScheduled===true,'empty mirror did not schedule a fresh mirror');
 });
 await check('Startup chains reward reconciliation after mirror recovery',()=>{
  assert(/mirrorRecover\(\)\.then\(function\(\)\{return jftReconcileFromIdb\(\)\}\)/.test(html),'startup recovery calls are still racing in parallel');
 });
 console.log('\nStartup recovery ordering tests: 3 passed, 0 failed');
})().catch(()=>process.exit(1));
