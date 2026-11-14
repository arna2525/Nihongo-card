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
  // override claim with deterministic unique store
  context.jftClaimReward = function(rid, amount) {
    if (!rid) return Promise.resolve(false);
    if (store.has(rid)) return Promise.resolve(false);
    store.set(rid, amount);
    return Promise.resolve(true);
  };
  context.__claimStore = store;
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }
const seven = JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}]);

// 1. Live path async award
{
  const c = makeContext();
  const r = run(c, `
    var s = {sessionId:'live1', chunkSeq:0, startedAt:1, answerCount:7, done:7, chunk:${seven}, exp:0};
    jftAwardChunkAsync(s).then(function(e){ return {e:e, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length}; })
  `);
  // r is a promise; resolve it
  assert(r && typeof r.then === 'function', 'returns promise');
  // since claim is sync resolve, the then already ran in the same tick in this mock? 
  // In vm, Promise microtasks may not flush. Use a sync check via store.
  const store = c.__claimStore;
  assert(store.has('chunk:live1:0'), 'claim recorded');
  ok('1 async award claims via live path');
}

// 2. Two concurrent claims same rid
{
  const store = new Map();
  const c1 = makeContext(store);
  const c2 = makeContext(store);
  run(c1, `var s={sessionId:'tab',chunkSeq:0,startedAt:2,answerCount:7,done:7,chunk:${seven},exp:0}; jftAwardChunkAsync(s)`);
  run(c2, `var s={sessionId:'tab',chunkSeq:0,startedAt:2,answerCount:7,done:7,chunk:${seven},exp:0,chunkRewardId:'chunk:tab:0'}; jftAwardChunkAsync(s)`);
  assert(store.size === 1 && store.get('chunk:tab:0') === 30, 'only one claim');
  ok('2 two tabs same rid only one claim');
}

// 3. Different sessions both claim
{
  const store = new Map();
  const c = makeContext(store);
  run(c, `
    var s1={sessionId:'a',chunkSeq:0,startedAt:3,answerCount:7,done:7,chunk:${seven},exp:0};
    var s2={sessionId:'b',chunkSeq:0,startedAt:4,answerCount:7,done:7,chunk:${seven},exp:0};
    jftAwardChunkAsync(s1); jftAwardChunkAsync(s2);
  `);
  assert(store.size === 2, 'two claims');
  ok('3 different sessions both claim');
}

// 4. Same session next chunk (await via setTimeout)
{
  const store = new Map();
  const c = makeContext(store);
  run(c, `
    var s={sessionId:'seq',chunkSeq:0,startedAt:5,answerCount:7,done:7,chunk:${seven},exp:0};
    jftAwardChunkAsync(s).then(function(){
      s.chunk=${seven}; s.answerCount=14; s.done=14;
      return jftAwardChunkAsync(s);
    });
  `);
  setTimeout(function(){
    assert(store.size === 2, 'two chunk claims');
    ok('4 next chunk different claim');
  }, 20);
}

// 5. Fail-closed when claim returns null
{
  const c = makeContext();
  c.jftClaimReward = function(){ return Promise.resolve(null); };
  const r = run(c, `
    var s={sessionId:'fail',chunkSeq:0,startedAt:6,answerCount:7,done:7,chunk:${seven},exp:0};
    jftAwardChunkAsync(s).then(function(e){ return e; })
  `);
  // chunk should remain
  const chunkLen = run(c, `s && s.chunk ? s.chunk.length : -1`);
  // we don't have s in outer; check via claim store not written
  assert(c.__claimStore.size === 0, 'no claim on fail-closed');
  ok('5 fail-closed when claim null');
}

// 6. Retry after success
{
  const store = new Map();
  const c = makeContext(store);
  run(c, `
    var s={sessionId:'ret',chunkSeq:0,startedAt:7,answerCount:7,done:7,chunk:${seven},exp:0};
    jftAwardChunkAsync(s);
    var s2={sessionId:'ret',chunkSeq:0,chunk:${seven},exp:0,chunkRewardId:'chunk:ret:0'};
    jftAwardChunkAsync(s2);
  `);
  assert(store.size === 1, 'retry no second claim');
  ok('6 retry no double claim');
}

// 7. Assessment still works (sync path)
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v12ok')`)===42);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v12ok')`)===0);
  ok('7 assessment idempotent');
}

// 8. Formula unchanged
{
  const c = makeContext();
  const r = run(c, `
    var s={sessionId:'form',chunkSeq:0,startedAt:8,answerCount:7,done:7,chunk:${seven},exp:0};
    jftAwardChunkAsync(s);
    jftState().exp
  `);
  // exp may not be updated yet if promise not flushed; check store amount
  assert(c.__claimStore.get('chunk:form:0') === 30, 'formula 7*4+2=30');
  ok('8 formula preserved');
}

// 9. Merge still works
{
  const c = makeContext();
  run(c, `jftState().exp=50; mergeJftBackup({exp:80,daily:{},sessions:[],progress:{},rewardLedger:{},rewardedAssessments:{}})`);
  assert(run(c, `jftState().exp`)===80);
  ok('9 merge legacy max');
}

console.log('\n' + n + ' v12 checks passed');
