#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeContext(idbRows) {
  const rows = idbRows || [];
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl, Promise,
    S: {}, e: x => String(x ?? ''), hero: () => '', vStatBase: () => '', R: () => {}, save: () => {},
    shuf: a => Array.isArray(a) ? a.slice() : a,
    document: { hidden: false }, window: {}, dlg: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    __result: null
  };
  vm.createContext(context);
  vm.runInContext('function uid(){return Math.random().toString(36).slice(2,9)}', context);
  context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  context.jftOpenRewardDb = function() {
    return Promise.resolve({
      transaction: function() {
        return {
          objectStore: function() {
            return {
              getAll: function() {
                const req = { result: rows.slice(), onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess && req.onsuccess(), 0);
                return req;
              }
            };
          }
        };
      }
    });
  };
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }
function wait(c, setup, check) {
  return new Promise((res) => {
    run(c, setup);
    setTimeout(() => { check(c.__result); res(); }, 80);
  });
}

(async () => {
  // 1. Same amount → NOOP
  {
    const c = makeContext([{rewardId:'A', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=30; jftState().rewardLedger={A:{amount:30}}`);
    await wait(c, `jftReconcileFromIdb().then(function(st){ __result = {st:st, exp:jftState().exp}; })`, (r) => {
      assert(r && r.st==='NOOP' && r.exp===30, JSON.stringify(r));
      ok('1 same amount NOOP');
    });
  }
  // 2. Amount conflict
  {
    const c = makeContext([{rewardId:'A', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=10; jftState().rewardLedger={A:{amount:10}}`);
    await wait(c, `jftReconcileFromIdb().then(function(st){ __result = {st:st, exp:jftState().exp}; })`, (r) => {
      assert(r && r.st==='CONFLICT' && r.exp===10, JSON.stringify(r));
      ok('2 amount conflict no add');
    });
  }
  // 3. Missing local
  {
    const c = makeContext([{rewardId:'B', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=0; jftState().rewardLedger={}`);
    await wait(c, `jftReconcileFromIdb().then(function(st){ __result = {st:st, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length}; })`, (r) => {
      assert(r && r.st==='RECONCILED' && r.exp===30 && r.n===1, JSON.stringify(r));
      ok('3 missing local recovered');
    });
  }
  // 4. Partial
  {
    const c = makeContext([{rewardId:'A', amount:30, source:'chunk', day:'2026-11-14'},{rewardId:'B', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=30; jftState().rewardLedger={A:{amount:30}}`);
    await wait(c, `jftReconcileFromIdb().then(function(st){ __result = {st:st, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length}; })`, (r) => {
      assert(r && r.exp===60 && r.n===2, JSON.stringify(r));
      ok('4 partial recover +30');
    });
  }
  // 5. Invalid ignored
  {
    const c = makeContext([{rewardId:'', amount:30},{rewardId:'C', amount:0},{rewardId:'D', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=0; jftState().rewardLedger={}`);
    await wait(c, `jftReconcileFromIdb().then(function(){ __result = {exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length}; })`, (r) => {
      assert(r && r.exp===30 && r.n===1, JSON.stringify(r));
      ok('5 invalid records ignored');
    });
  }
  // 6. Repeated conflict
  {
    const c = makeContext([{rewardId:'A', amount:30, source:'chunk', day:'2026-11-14'}]);
    run(c, `jftState().exp=10; jftState().rewardLedger={A:{amount:10}}`);
    await wait(c, `jftReconcileFromIdb().then(function(){return jftReconcileFromIdb()}).then(function(st){ __result = {st:st, exp:jftState().exp}; })`, (r) => {
      assert(r && r.st==='CONFLICT' && r.exp===10, JSON.stringify(r));
      ok('6 repeated conflict stable');
    });
  }
  // 7. V14 still fixed
  {
    const store = new Map();
    const seven = JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}]);
    const c1 = makeContext();
    c1.jftClaimReward = function(rid, amount){ if(store.has(rid)) return false; store.set(rid, amount); return true; };
    const c2 = makeContext();
    c2.jftClaimReward = function(rid, amount){ if(store.has(rid)) return false; store.set(rid, amount); return true; };
    const r1 = run(c1, `var s={sessionId:'v14',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0}; var st=jftAwardChunkAsync(s); ({st:st, exp:jftState().exp})`);
    const r2 = run(c2, `var s={sessionId:'v14',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0,chunkRewardId:'chunk:v14:0'}; var st=jftAwardChunkAsync(s); ({st:st, exp:jftState().exp})`);
    assert(r1.st==='CLAIMED_NEW' && r1.exp===30);
    assert(r2.st==='ALREADY_COMMITTED' && r2.exp===0);
    ok('7 V14 still fixed');
  }
  // 8. Assessment
  {
    const c = makeContext();
    assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v17ok')`)===42);
    assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v17ok')`)===0);
    ok('8 assessment idempotent');
  }
  console.log('\n' + n + ' v17 checks passed');
})();
