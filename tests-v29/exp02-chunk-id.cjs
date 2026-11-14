#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function makeContext() {
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl,
    S: {}, e: x => String(x ?? ''), hero: () => '', vStatBase: () => '', R: () => {}, save: () => {},
    shuf: a => Array.isArray(a) ? a.slice() : a,
    document: { hidden: false }, window: {}, dlg: () => {}
  };
  vm.createContext(context);
  vm.runInContext('function uid(){return Math.random().toString(36).slice(2,9)}', context);
  context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  const _claim = new Map();
  context.jftClaimReward = function(rid, amount) {
    if (!rid) return false;
    if (_claim.has(rid)) return false;
    _claim.set(rid, amount);
    return true;
  };
  context.__claimStore = _claim;
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
let n=0; function ok(m){ console.log('PASS  '+m); n++; }
function sevenOk(){ return Array(7).fill({ok:true,repeat:false}); }

// 1-2 same startedAt and all counters
{
  const c = makeContext();
  const r = run(c, `
    var s1={startedAt:1000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    var e1=jftAwardChunk(s1);
    var id1=Object.keys(jftState().rewardLedger)[0];
    var s2={startedAt:1000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    var e2=jftAwardChunk(s2);
    var keys=Object.keys(jftState().rewardLedger);
    ({e1:e1,e2:e2,exp:jftState().exp,keys:keys,id1:id1,id2:keys[1],diff:keys[0]!==keys[1]})
  `);
  assert(r.e1===30 && r.e2===30 && r.exp===60 && r.diff, JSON.stringify(r));
  ok('1-2 different sessions identical counters get different ids');
}

// 3 two chunks one session
{
  const c = makeContext();
  const r = run(c, `
    var s={startedAt:2000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    var e1=jftAwardChunk(s);
    s.answerCount=14;s.done=14;
    s.chunk=${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])};
    var e2=jftAwardChunk(s);
    ({e1:e1,e2:e2,exp:jftState().exp,n:Object.keys(jftState().rewardLedger).length,cleared:!s.chunkRewardId})
  `);
  assert(r.e1===30 && r.e2===30 && r.exp===60 && r.n===2 && r.cleared, JSON.stringify(r));
  ok('3 two chunks one session');
}

// 4 finish path uses award
{
  const c = makeContext();
  const r = run(c, `
    var s={startedAt:3000,answerCount:3,done:3,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0,queue:[],wrong:[],fresh:0,ok:3,no:0,title:'t',kind:'k',unit:1,pick:null,cur:null};
    jftState().live=s;
    jftFinish();
    ({exp:jftState().exp, live:jftState().live, n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.exp===14 && r.live===null && r.n===1, JSON.stringify(r));
  ok('4 finish awards remaining chunk');
}

// 5 retry same state with same chunkRewardId
{
  const c = makeContext();
  const r = run(c, `
    var s={startedAt:4000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0,chunkRewardId:'chunk:fixedRetry01'};
    var e1=jftAwardChunk(s);
    s.chunk=${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])};
    s.chunkRewardId='chunk:fixedRetry01';
    var e2=jftAwardChunk(s);
    ({e1:e1,e2:e2,exp:jftState().exp})
  `);
  assert(r.e1===30 && r.e2===0 && r.exp===30, JSON.stringify(r));
  ok('5 retry same chunkRewardId no double');
}

// 6-7 save/reload before and after award
{
  const c = makeContext();
  const r = run(c, `
    var s={startedAt:5000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    var rid=jftEnsureChunkRewardId(s);
    var snap=JSON.parse(JSON.stringify(s));
    // reload before award
    var s2=snap;
    var e=jftAwardChunk(s2);
    ({rid:rid,e:e,exp:jftState().exp,sameId:Object.keys(jftState().rewardLedger)[0]===rid})
  `);
  assert(r.e===30 && r.sameId, JSON.stringify(r));
  ok('6 reload before award keeps id');
}
{
  const c = makeContext();
  const r = run(c, `
    var s={startedAt:5100,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    jftAwardChunk(s);
    var ledger=JSON.parse(JSON.stringify(jftState().rewardLedger));
    var exp=jftState().exp;
    // simulate reload after award
    jftState().rewardLedger=ledger; jftState().exp=exp;
    var s2={startedAt:5100,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0,chunkRewardId:Object.keys(ledger)[0]};
    var e2=jftAwardChunk(s2);
    ({exp:jftState().exp,e2:e2})
  `);
  assert(r.exp===30 && r.e2===0, JSON.stringify(r));
  ok('7 reload after award no double');
}

// 9-10 two tabs/devices identical counters
{
  const c = makeContext();
  const r = run(c, `
    var e1=jftAwardChunk({startedAt:9000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0});
    var e2=jftAwardChunk({startedAt:9000,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0});
    ({e1:e1,e2:e2,exp:jftState().exp,n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.e1===30 && r.e2===30 && r.exp===60 && r.n===2, JSON.stringify(r));
  ok('9-10 two devices identical counters both rewarded');
}

// 11 Math.random=0 still non-empty id
{
  const c = makeContext();
  const r = run(c, `
    var orig=Math.random; Math.random=function(){return 0};
    var id=jftSafeUid();
    var s={startedAt:1,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0};
    var e=jftAwardChunk(s);
    Math.random=orig;
    ({id:id, idLen:id.length, e:e, rid:Object.keys(jftState().rewardLedger)[0]})
  `);
  assert(r.idLen>0 && r.e===30, JSON.stringify(r));
  ok('11 random=0 still works');
}

// 13-14 prune sessions / empty map — ledger protects
{
  const c = makeContext();
  const r = run(c, `
    jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:keep0001');
    jftState().sessions=[];
    jftState().rewardedAssessments={};
    var blocked=jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:keep0001');
    ({blocked:blocked, exp:jftState().exp, inLedger:!!jftState().rewardLedger['assess:bun:keep0001']})
  `);
  assert(r.blocked===0 && r.exp===42 && r.inLedger, JSON.stringify(r));
  ok('13-14 ledger protects after prune');
}

// 15 ledger survives reload snap
{
  const c = makeContext();
  const r = run(c, `
    jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:relv9001');
    var snap=JSON.parse(JSON.stringify(jftState().rewardLedger));
    jftState().rewardLedger={};
    jftState().rewardLedger=snap;
    ({n:Object.keys(jftState().rewardLedger).length, blocked:jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:relv9001')})
  `);
  assert(r.n===1 && r.blocked===0, JSON.stringify(r));
  ok('15 ledger reload');
}

// 16 assessment once
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Test Ingatan',10,10,5,null,'assess:test:once0001')`)===42);
  assert(run(c, `jftRecordSpecial('Test Ingatan',10,10,5,null,'assess:test:once0001')`)===0);
  ok('16 assessment idempotent');
}

// 18-19 conflict amount
{
  const c = makeContext();
  const r = run(c, `
    jftLedgerPut('assess:bun:conf0001',40,'assessment','2026-11-14');
    var second=jftLedgerPut('assess:bun:conf0001',60,'assessment','2026-11-14');
    ({second:second, amount:jftState().rewardLedger['assess:bun:conf0001'].amount})
  `);
  assert(r.second===false && r.amount===40, JSON.stringify(r));
  ok('18-19 same id different amount rejected keep first');
}

// 20-21 import / merge order
{
  const c1 = makeContext();
  run(c1, `jftAwardChunk({startedAt:1,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0})`);
  const A = run(c1, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,sessions:[],daily:jftState().daily,rewardedAssessments:{},progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftAwardChunk({startedAt:2,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0})`);
  const B = run(c2, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,sessions:[],daily:jftState().daily,rewardedAssessments:{},progress:{}}))`);
  const m1 = makeContext(); run(m1, `mergeJftBackup(${JSON.stringify(A)});mergeJftBackup(${JSON.stringify(B)});mergeJftBackup(${JSON.stringify(A)})`);
  const m2 = makeContext(); run(m2, `mergeJftBackup(${JSON.stringify(B)});mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(m1, `jftState().exp`)===60 && run(m2, `jftState().exp`)===60);
  ok('20-21 merge repeat and order');
}

// 22 daily/total
{
  const c = makeContext();
  run(c, `jftAwardChunk({startedAt:3,answerCount:7,done:7,chunk:${JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}])},exp:0})`);
  assert(run(c, `jftState().exp===30 && jftDayLog().exp===30`));
  ok('22 total daily');
}

console.log('\n'+n+' chunk-id checks passed');
