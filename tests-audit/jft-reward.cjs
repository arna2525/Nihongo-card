'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const startShared=html.indexOf('function sharedLedger()'),endShared=html.indexOf('/* __TEST_SHARED_END__ */',startShared);
const startJft=html.indexOf('var JFTC='),endJft=html.lastIndexOf('</script>');
function assert(x,m){if(!x)throw new Error(m||'assertion failed')}
function makeContext(store=new Map()){
 const c={console,Math,Date,JSON,Array,Object,String,Number,Set,Map,Intl,Promise,Uint8Array,
  S:{},window:{},document:{hidden:false,addEventListener(){}},navigator:{},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  save(){},R(){},e:x=>String(x??''),hero:()=>'',vStatBase:()=>'',shuf:a=>a.slice(),
  uid:(()=>{let i=0;return()=>`audit${++i}`})(),setTimeout,clearTimeout,
  performance:{now:()=>Date.now()},
 };
 vm.createContext(c);
 vm.runInContext(html.slice(startShared,endShared),c,{timeout:30000});
 vm.runInContext(html.slice(startJft,endJft),c,{timeout:30000});
 c.__store=store;
 c.jftOpenRewardDb=()=>Promise.resolve({transaction(){
   const tx={};tx.objectStore=()=>({
    get(id){const req={result:undefined,onsuccess:null,onerror:null};setTimeout(()=>{req.result=store.get(id);if(req.onsuccess)req.onsuccess();setTimeout(()=>{if(tx.oncomplete)tx.oncomplete()},0)},0);return req},
    put(row){store.set(row.rewardId,row)},
    clear(){store.clear();setTimeout(()=>{if(tx.oncomplete)tx.oncomplete()},0)},
    getAll(){const req={result:undefined,onsuccess:null,onerror:null};setTimeout(()=>{req.result=[...store.values()];if(req.onsuccess)req.onsuccess()},0);return req}
   });return tx;
  }});
 return c;
}
const seven=()=>Array.from({length:7},()=>({ok:true,repeat:false}));
(async()=>{
 let pass=0,fail=0;
 async function check(name,fn){try{await fn();pass++;console.log('PASS',name)}catch(e){fail++;console.log('FAIL',name,'-',e.message)}}
 await check('IndexedDB reward claim returns CLAIMED then EXISTS',async()=>{
  const c=makeContext();const a=await vm.runInContext("jftClaimReward('id-a',30)",c);const b=await vm.runInContext("jftClaimReward('id-a',30)",c);
  assert(a==='CLAIMED',String(a));assert(b==='EXISTS',String(b));assert(c.__store.size===1);
 });
 await check('JFT seven-answer chunk awards exactly 30 EXP once',async()=>{
  const c=makeContext();c.__session={sessionId:'session-a',chunkSeq:0,chunk:seven(),exp:0};
  const a=await vm.runInContext('jftAwardChunkAsync(__session)',c);
  assert(a==='CLAIMED_NEW',String(a));assert(vm.runInContext('jftState().exp',c)===30);
  c.__session={sessionId:'session-a',chunkSeq:0,chunkRewardId:'chunk:session-a:0',chunk:seven(),exp:0};
  const b=await vm.runInContext('jftAwardChunkAsync(__session)',c);
  assert(b==='ALREADY_COMMITTED',String(b));assert(vm.runInContext('jftState().exp',c)===30);
 });
 await check('Existing IndexedDB claim recovers into the local ledger once',async()=>{
  const rows=new Map([['chunk:recover:0',{rewardId:'chunk:recover:0',amount:30,source:'chunk',day:'2026-11-15'}]]);const c=makeContext(rows);
  c.__session={sessionId:'recover',chunkSeq:0,chunk:seven(),exp:0};
  const a=await vm.runInContext('jftAwardChunkAsync(__session)',c);
  assert(a==='RECOVERED_FROM_IDB',String(a));assert(vm.runInContext('jftState().exp',c)===30);
 });
 await check('Unavailable IndexedDB fails closed and preserves the chunk',async()=>{
  const c=makeContext();c.jftOpenRewardDb=()=>Promise.resolve(null);c.__session={sessionId:'offline',chunkSeq:0,chunk:seven(),exp:0};
  const a=await vm.runInContext('jftAwardChunkAsync(__session)',c);
  assert(a==='FAILED',String(a));assert(vm.runInContext('__session.chunk.length',c)===7);assert(vm.runInContext('jftState().exp',c)===0);
 });
 await check('IndexedDB transaction exception fails closed',async()=>{
  const c=makeContext();c.jftOpenRewardDb=()=>Promise.resolve({transaction(){throw new Error('blocked')}});
  const a=await vm.runInContext("jftClaimReward('broken',30)",c);assert(a==='FAILED',String(a));
 });
 await check('Startup reconciliation recovers missing local reward and stays idempotent',async()=>{
  const rows=new Map([['chunk:startup:0',{rewardId:'chunk:startup:0',amount:30,source:'chunk',day:'2026-11-15'}]]);const c=makeContext(rows);
  const a=await vm.runInContext('jftReconcileFromIdb()',c);const b=await vm.runInContext('jftReconcileFromIdb()',c);
  assert(a==='RECONCILED',String(a));assert(b==='NOOP',String(b));assert(vm.runInContext('jftState().exp',c)===30);
 });
 await check('Restore generation ignores stale IndexedDB rewards but accepts new-generation claims',async()=>{
  const rows=new Map([
   ['old',{rewardId:'old',amount:30,source:'chunk',day:'2026-11-14',generation:0}],
   ['new',{rewardId:'new',amount:12,source:'chunk',day:'2026-11-15',generation:2}]
  ]);const c=makeContext(rows);c.S={jft:{rewardGeneration:2,exp:0,daily:{},rewardLedger:{}}};
  const a=await vm.runInContext('jftReconcileFromIdb()',c);assert(a==='RECONCILED',String(a));
  assert(vm.runInContext('jftState().exp',c)===12,'stale generation was counted or current generation lost');
  const claim=await vm.runInContext("jftClaimReward('future',8)",c);assert(claim==='CLAIMED',String(claim));assert(rows.get('future').generation===2,'new reward generation not stored');
  const reused=await vm.runInContext("jftClaimReward('old',8)",c);assert(reused==='CLAIMED',String(reused));assert(rows.get('old').generation===2&&rows.get('old').amount===8,'stale reward ID was not replaced for the current generation');
  const mismatch=await vm.runInContext("jftClaimReward('new',99)",c);assert(mismatch==='CONFLICT',String(mismatch));
 });
 await check('In-flight JFT reward claim becomes stale across Restore Timpa',async()=>{
  const rows=new Map(),c=makeContext(rows);c.S={jft:{rewardGeneration:0,exp:0,daily:{},rewardLedger:{}}};
  const session={sessionId:'before-restore',chunkSeq:0,chunk:seven(),exp:0};
  const pending=vm.runInContext('jftAwardChunkAsync(__session)',Object.assign(c,{__session:session}));
  vm.runInContext('JFT_REWARD_RECONCILE_EPOCH++;jftState().rewardGeneration=1',c);
  const status=await pending;assert(status==='STALE',String(status));
  assert(vm.runInContext('jftState().exp',c)===0,'stale claim changed restored EXP');
  assert(session.chunk.length===7,'stale claim discarded the old chunk object');
 });
 await check('Restore-replace helper clears stale IndexedDB reward records',async()=>{
  const rows=new Map([['old',{rewardId:'old',amount:30}]]);const c=makeContext(rows);
  const status=await vm.runInContext('jftClearRewardDb()',c);assert(status==='CLEARED',String(status));assert(rows.size===0);
 });
 await check('Restore-replace helper reports unavailable reward database',async()=>{
  const c=makeContext();c.jftOpenRewardDb=()=>Promise.resolve(null);const status=await vm.runInContext('jftClearRewardDb()',c);assert(status==='UNAVAILABLE',String(status));
 });
 await check('Restore replace invalidates an in-flight startup reconciliation',async()=>{
  const rows=new Map([['old-startup',{rewardId:'old-startup',amount:30,source:'chunk',day:'2026-11-15'}]]);const c=makeContext(rows);
  const pending=vm.runInContext('jftReconcileFromIdb()',c);vm.runInContext('JFT_REWARD_RECONCILE_EPOCH++',c);const status=await pending;
  assert(status==='STALE',String(status));assert(vm.runInContext('jftState().exp',c)===0);
 });
 console.log(`\nBuild 15.9 async reward tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
