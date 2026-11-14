#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeContext(claimStore) {
  const store = claimStore || new Map();
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl, Promise,
    S: {}, e: x => String(x ?? ''), hero: () => '', vStatBase: () => '', R: () => {}, save: () => {},
    shuf: a => Array.isArray(a) ? a.slice() : a,
    document: { hidden: false }, window: {}, dlg: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  };
  vm.createContext(context);
  vm.runInContext('function uid(){return Math.random().toString(36).slice(2,9)}', context);
  context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  context.jftClaimReward = function(rid, amount) {
    if (!rid) return false;
    if (store.has(rid)) return false;
    store.set(rid, amount);
    return true;
  };
  context.__claimStore = store;
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }
const seven = JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}]);

// Reproduce V14 bug: second claim same rid must NOT add exp
{
  const store = new Map();
  const c1 = makeContext(store);
  const c2 = makeContext(store);
  const r1 = run(c1, `
    var s={sessionId:'v15',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0};
    var status=jftAwardChunkAsync(s);
    ({status:status, exp:jftState().exp})
  `);
  const r2 = run(c2, `
    var s={sessionId:'v15',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0,chunkRewardId:'chunk:v15:0'};
    var status=jftAwardChunkAsync(s);
    ({status:status, exp:jftState().exp})
  `);
  assert(r1.status==='CLAIMED_NEW' && r1.exp===30, JSON.stringify(r1));
  assert(r2.status==='ALREADY_COMMITTED' && r2.exp===0, JSON.stringify(r2));
  ok('1 V14 bug fixed: second claim no exp');
}

// Different sessions both award
{
  const store = new Map();
  const c = makeContext(store);
  const r = run(c, `
    var s1={sessionId:'a',chunkSeq:0,startedAt:2,answerCount:7,done:7,chunk:${seven},exp:0};
    var s2={sessionId:'b',chunkSeq:0,startedAt:3,answerCount:7,done:7,chunk:${seven},exp:0};
    var st1=jftAwardChunkAsync(s1);
    var st2=jftAwardChunkAsync(s2);
    ({st1:st1, st2:st2, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.st1==='CLAIMED_NEW' && r.st2==='CLAIMED_NEW' && r.exp===60 && r.n===2, JSON.stringify(r));
  ok('2 different sessions both award');
}

// Next chunk different
{
  const store = new Map();
  const c = makeContext(store);
  const r = run(c, `
    var s={sessionId:'seq',chunkSeq:0,startedAt:4,answerCount:7,done:7,chunk:${seven},exp:0};
    var st1=jftAwardChunkAsync(s);
    s.chunk=${seven}; s.answerCount=14; s.done=14;
    var st2=jftAwardChunkAsync(s);
    ({st1:st1, st2:st2, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.exp===60 && r.n===2, JSON.stringify(r));
  ok('3 next chunk different');
}

// Fail-closed
{
  const c = makeContext();
  c.jftClaimReward = function(){ return null; };
  const r = run(c, `
    var s={sessionId:'fail',chunkSeq:0,startedAt:5,answerCount:7,done:7,chunk:${seven},exp:0};
    var status=jftAwardChunkAsync(s);
    ({status:status, exp:jftState().exp, chunkLen:s.chunk.length})
  `);
  assert(r.status==='FAILED' && r.exp===0 && r.chunkLen===7, JSON.stringify(r));
  ok('4 fail-closed keeps chunk');
}

// Assessment still works
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v15ok')`)===42);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v15ok')`)===0);
  ok('5 assessment idempotent');
}

// Formula
{
  const store = new Map();
  const c = makeContext(store);
  run(c, `var s={sessionId:'f',chunkSeq:0,startedAt:6,answerCount:7,done:7,chunk:${seven},exp:0}; jftAwardChunkAsync(s);`);
  assert(store.get('chunk:f:0')===30);
  ok('6 formula 30');
}

console.log('\n' + n + ' v15 checks passed');
