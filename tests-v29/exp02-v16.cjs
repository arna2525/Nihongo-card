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
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  };
  vm.createContext(context);
  vm.runInContext('function uid(){return Math.random().toString(36).slice(2,9)}', context);
  context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  // mock IDB
  context.jftOpenRewardDb = function() {
    return Promise.resolve({
      transaction: function() {
        return {
          objectStore: function() {
            return {
              getAll: function() {
                const req = { result: rows, onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess && req.onsuccess(), 0);
                return req;
              }
            };
          },
          oncomplete: null, onerror: null, onabort: null
        };
      }
    });
  };
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert'); }
let n = 0; function ok(m){ console.log('PASS  ' + m); n++; }

// 1. IDB has reward, local empty → recover +30
{
  const c = makeContext([{rewardId:'chunk:rec:0', amount:30, source:'chunk', day:'2026-11-14'}]);
  run(c, `jftState().exp=0; jftState().rewardLedger={}`);
  // force sync by calling the then
  run(c, `
    jftReconcileFromIdb().then(function(st){
      window.__rec = {st:st, exp:jftState().exp, n:Object.keys(jftState().rewardLedger).length};
    });
  `);
  // flush
  setTimeout(() => {
    const r = run(c, `window.__rec`);
    assert(r && r.exp===30 && r.n===1, JSON.stringify(r));
    ok('1 recover from IDB');
  }, 150);
}

// 2. Already in local → no double
{
  const c = makeContext([{rewardId:'chunk:rec2:0', amount:30, source:'chunk', day:'2026-11-14'}]);
  run(c, `jftState().exp=30; jftState().rewardLedger={'chunk:rec2:0':{amount:30}}`);
  run(c, `jftReconcileFromIdb().then(function(){ window.__rec2 = jftState().exp; })`);
  setTimeout(() => {
    const r = run(c, `window.__rec2`);
    assert(r===30, String(r));
    ok('2 no double on already present');
  }, 150);
}

// 3. Repeated reconcile
{
  const c = makeContext([{rewardId:'chunk:rep:0', amount:30, source:'chunk', day:'2026-11-14'}]);
  run(c, `jftState().exp=0; jftState().rewardLedger={}`);
  run(c, `
    jftReconcileFromIdb().then(function(){
      return jftReconcileFromIdb();
    }).then(function(){
      window.__rep = jftState().exp;
    });
  `);
  setTimeout(() => {
    const r = run(c, `window.__rep`);
    assert(r===30, String(r));
    ok('3 repeated reconcile stable');
  }, 200);
}

// 4. V14 bug still fixed
{
  const store = new Map();
  const c1 = makeContext();
  c1.jftClaimReward = function(rid, amount) {
    if (store.has(rid)) return false;
    store.set(rid, amount);
    return true;
  };
  const c2 = makeContext();
  c2.jftClaimReward = function(rid, amount) {
    if (store.has(rid)) return false;
    store.set(rid, amount);
    return true;
  };
  const seven = JSON.stringify([{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}]);
  const r1 = run(c1, `var s={sessionId:'v14',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0}; var st=jftAwardChunkAsync(s); ({st:st, exp:jftState().exp})`);
  const r2 = run(c2, `var s={sessionId:'v14',chunkSeq:0,startedAt:1,answerCount:7,done:7,chunk:${seven},exp:0,chunkRewardId:'chunk:v14:0'}; var st=jftAwardChunkAsync(s); ({st:st, exp:jftState().exp})`);
  assert(r1.st==='CLAIMED_NEW' && r1.exp===30, JSON.stringify(r1));
  assert(r2.st==='ALREADY_COMMITTED' && r2.exp===0, JSON.stringify(r2));
  ok('4 V14 bug still fixed');
}

// 5. Assessment still works
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v16ok')`)===42);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:v16ok')`)===0);
  ok('5 assessment idempotent');
}

setTimeout(() => {
  console.log('\n' + n + ' v16 checks passed');
}, 300);
