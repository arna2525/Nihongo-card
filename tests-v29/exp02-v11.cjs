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
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }
const seven = JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}]);

// 1. Same session + same chunkSeq → same rewardId
{
  const c = makeContext();
  const r = run(c, `
    var s1 = {sessionId:'sessA', chunkSeq:0, startedAt:1, answerCount:7, done:7, chunk:${seven}, exp:0};
    var s2 = {sessionId:'sessA', chunkSeq:0, startedAt:1, answerCount:7, done:7, chunk:${seven}, exp:0};
    var id1 = jftEnsureChunkRewardId(s1);
    var id2 = jftEnsureChunkRewardId(s2);
    ({id1:id1, id2:id2, same:id1===id2})
  `);
  assert(r.same && r.id1 === 'chunk:sessA:0', JSON.stringify(r));
  ok('1 same session same chunkSeq → same rewardId');
}

// 2. Different sessions → different rewardId
{
  const c = makeContext();
  const r = run(c, `
    var s1 = {sessionId:'sessA', chunkSeq:0, chunk:${seven}, exp:0};
    var s2 = {sessionId:'sessB', chunkSeq:0, chunk:${seven}, exp:0};
    ({id1:jftEnsureChunkRewardId(s1), id2:jftEnsureChunkRewardId(s2)})
  `);
  assert(r.id1 !== r.id2, JSON.stringify(r));
  ok('2 different sessions → different rewardId');
}

// 3. Same session different chunkSeq → different
{
  const c = makeContext();
  const r = run(c, `
    var s1 = {sessionId:'sessA', chunkSeq:0, chunk:${seven}, exp:0};
    var s2 = {sessionId:'sessA', chunkSeq:1, chunk:${seven}, exp:0};
    ({id1:jftEnsureChunkRewardId(s1), id2:jftEnsureChunkRewardId(s2)})
  `);
  assert(r.id1 !== r.id2, JSON.stringify(r));
  ok('3 different chunkSeq → different rewardId');
}

// 4. Two tabs claim same rewardId via local ledger (simulate IDB unique)
{
  const c = makeContext();
  const r = run(c, `
    var s1 = {sessionId:'sessX', chunkSeq:0, startedAt:10, answerCount:7, done:7, chunk:${seven}, exp:0};
    var e1 = jftAwardChunk(s1);
    var s2 = {sessionId:'sessX', chunkSeq:0, startedAt:10, answerCount:7, done:7, chunk:${seven}, exp:0, chunkRewardId:'chunk:sessX:0'};
    var e2 = jftAwardChunk(s2);
    ({e1:e1, e2:e2, exp:jftState().exp})
  `);
  assert(r.e1===30 && r.e2===0 && r.exp===30, JSON.stringify(r));
  ok('4 two tabs same rewardId only one award');
}

// 5. Two different sessions both award
{
  const c = makeContext();
  const r = run(c, `
    var s1 = {sessionId:'sess1', chunkSeq:0, startedAt:11, answerCount:7, done:7, chunk:${seven}, exp:0};
    var s2 = {sessionId:'sess2', chunkSeq:0, startedAt:12, answerCount:7, done:7, chunk:${seven}, exp:0};
    var e1 = jftAwardChunk(s1);
    var e2 = jftAwardChunk(s2);
    ({e1:e1, e2:e2, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.e1===30 && r.e2===30 && r.exp===60 && r.n===2, JSON.stringify(r));
  ok('5 different sessions both rewarded');
}

// 6. Retry uses stored id
{
  const c = makeContext();
  const r = run(c, `
    var s = {sessionId:'sessR', chunkSeq:0, startedAt:13, answerCount:7, done:7, chunk:${seven}, exp:0};
    jftAwardChunk(s);
    var s2 = {sessionId:'sessR', chunkSeq:0, chunk:${seven}, exp:0, chunkRewardId:'chunk:sessR:0'};
    var e2 = jftAwardChunk(s2);
    ({e2:e2, exp:jftState().exp})
  `);
  assert(r.e2===0 && r.exp===30, JSON.stringify(r));
  ok('6 retry same id no double');
}

// 7. chunkSeq increments after award
{
  const c = makeContext();
  const r = run(c, `
    var s = {sessionId:'sessS', chunkSeq:0, startedAt:14, answerCount:7, done:7, chunk:${seven}, exp:0};
    jftAwardChunk(s);
    ({seq:s.chunkSeq, rid:s.chunkRewardId})
  `);
  assert(r.seq===1 && r.rid===null, JSON.stringify(r));
  ok('7 chunkSeq increments after award');
}

// 8. Next chunk different id
{
  const c = makeContext();
  const r = run(c, `
    var s = {sessionId:'sessN', chunkSeq:0, startedAt:15, answerCount:7, done:7, chunk:${seven}, exp:0};
    jftAwardChunk(s);
    s.chunk = ${seven}; s.answerCount=14; s.done=14;
    var e2 = jftAwardChunk(s);
    ({exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length})
  `);
  assert(r.exp===60 && r.n===2, JSON.stringify(r));
  ok('8 next chunk different id accumulates');
}

// 9. Assessment still idempotent
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v11ok')`)===42);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v11ok')`)===0);
  ok('9 assessment idempotent');
}

// 10. Merge idempotent
{
  const c = makeContext();
  run(c, `var s={sessionId:'m',chunkSeq:0,startedAt:16,answerCount:7,done:7,chunk:${seven},exp:0}; jftAwardChunk(s);`);
  const bak = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,sessions:[],daily:jftState().daily,rewardedAssessments:{},progress:{}}))`);
  run(c, `mergeJftBackup(${JSON.stringify(bak)}); mergeJftBackup(${JSON.stringify(bak)})`);
  assert(run(c, `jftState().exp`)===30);
  ok('10 merge idempotent');
}

// 11. Daily/total consistent
{
  const c = makeContext();
  run(c, `var s={sessionId:'d',chunkSeq:0,startedAt:17,answerCount:7,done:7,chunk:${seven},exp:0}; jftAwardChunk(s);`);
  assert(run(c, `jftState().exp===30 && jftDayLog().exp===30`));
  ok('11 daily total consistent');
}

// 12. IDB unavailable path (function exists, returns null/false)
{
  const c = makeContext();
  const r = run(c, `typeof jftClaimReward === 'function' && typeof jftOpenRewardDb === 'function'`);
  assert(r, 'claim helpers exist');
  ok('12 claim helpers present');
}

console.log('\n' + n + ' v11 checks passed');
