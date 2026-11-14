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

// Rapid click: 20 iterations of same reward
{
  const c = makeContext();
  for (let i = 0; i < 20; i++) {
    run(c, `
      var s={sessionId:'rapid',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0};
      jftState().live=s;
      jftAwardChunkAsync(s);
    `);
  }
  const r = run(c, `({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length})`);
  assert(r.n===1, 'should have exactly 1 ledger entry, got '+r.n);
  assert(r.exp===30, 'should have 30 EXP, got '+r.exp);
  ok('1 rapid click 20x = 1 reward, 30 EXP');
}

// Different sessions: each gets own reward
{
  const c = makeContext();
  for (let i = 0; i < 5; i++) {
    run(c, `
      var s={sessionId:'sess${i}',chunkSeq:0,startedAt:${i+1},answerCount:7,done:7,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0};
      jftState().live=s;
      jftAwardChunkAsync(s);
    `);
  }
  const r = run(c, `({exp:jftState().exp, n:Object.keys(jftState().rewardLedger||{}).length})`);
  assert(r.n===5, 'should have 5 ledger entries, got '+r.n);
  assert(r.exp===150, 'should have 150 EXP, got '+r.exp);
  ok('2 5 different sessions = 5 rewards, 150 EXP');
}

console.log('\n' + n + ' rapid click checks passed');
