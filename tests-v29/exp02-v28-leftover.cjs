#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeContext() {
  const store = new Map();
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
  context.__store = store;
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }

// Leftover 1: 1 correct answer, then finish
{
  const c = makeContext();
  const r = run(c, `
    var s={sessionId:'left1',chunkSeq:0,startedAt:1,answerCount:1,done:1,chunk:[{ok:true,repeat:false}],exp:0,queue:[]};
    jftState().live=s;
    var ar=jftAwardChunkAsync(s);
    ({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length})
  `);
  assert(r.exp===6, 'leftover 1 should award 6 (4+2), got '+r.exp);
  ok('1 leftover 1 correct = 6 EXP (4+2 bonus)');
}

// Leftover 3: 3 correct, then finish
{
  const c = makeContext();
  const r = run(c, `
    var s={sessionId:'left3',chunkSeq:0,startedAt:2,answerCount:3,done:3,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0,queue:[]};
    jftState().live=s;
    jftFinish();
    ({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length})
  `);
  assert(r.exp===14, 'leftover 3 should award 14 (12+2)');
  ok('2 leftover 3 correct = 14 EXP (12+2 bonus)');
}

// Leftover 6: 6 correct, then finish
{
  const c = makeContext();
  const r = run(c, `
    var s={sessionId:'left6',chunkSeq:0,startedAt:3,answerCount:6,done:6,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0,queue:[]};
    jftState().live=s;
    jftFinish();
    ({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length})
  `);
  assert(r.exp===26, 'leftover 6 should award 26 (24+2)');
  ok('3 leftover 6 correct = 26 EXP (24+2 bonus)');
}

// Leftover 0: empty chunk, finish
{
  const c = makeContext();
  const r = run(c, `
    var s={sessionId:'left0',chunkSeq:0,startedAt:4,answerCount:0,done:0,chunk:[],exp:0,queue:[]};
    jftState().live=s;
    jftFinish();
    ({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length, live:!!jftState().live})
  `);
  assert(r.exp===0 && r.n===0, 'empty should not award');
  ok('4 leftover 0 = no award');
}

console.log('\n' + n + ' leftover checks passed');
