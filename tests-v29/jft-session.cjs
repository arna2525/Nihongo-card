#!/usr/bin/env node
/**
 * Regression: JFT session safety — live overwrite guard, empty session, dialog semantics.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function makeContext() {
  const dlgLog = [];
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl,
    S: {}, e: x => String(x ?? '').replace(/[&<>"']/g, ''),
    hero: () => '<hero/>', vStatBase: () => '<legacy-stats/>', R: () => {}, save: () => {},
    shuf: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    uid: () => Math.random().toString(36).slice(2, 9),
    document: { hidden: false }, window: {},
    dlgLog,
    dlg: function (o, ok, no) {
      dlgLog.push({
        t: o && o.t, y: o && o.y, n: o && o.n,
        hasOk: typeof ok === 'function', hasNo: typeof no === 'function'
      });
      context.__dlgOk = ok || null;
      context.__dlgNo = no || null;
    }
  };
  vm.createContext(context);
  context.wordLoc = () => null;
  context.QM = [];
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
function snapLive(c) {
  return run(c, `jftState().live?({title:jftState().live.title,kind:jftState().live.kind,unit:jftState().live.unit,mode:jftState().live.mode,startedAt:jftState().live.startedAt,done:jftState().live.done,ok:jftState().live.ok,no:jftState().live.no,answerCount:jftState().live.answerCount,fresh:jftState().live.fresh,exp:jftState().live.exp,queueLen:jftState().live.queue.length,wrongLen:(jftState().live.wrong||[]).length,chunkLen:(jftState().live.chunk||[]).length,hasCur:!!jftState().live.cur,pick:jftState().live.pick,break:!!jftState().live.break}):null`);
}
function sameSnap(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

let passed = 0;
function ok(name) { console.log('PASS  ' + name); passed++; }

// A: start while live — no overwrite before decision
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  const s0 = snapLive(c);
  const exp0 = run(c, `jftState().exp`);
  const sess0 = run(c, `jftState().sessions.length`);
  c.dlgLog.length = 0;
  run(c, `jftStart('k',2,'ha')`);
  assert(c.dlgLog.length === 1, 'A: first dialog shown');
  assert(c.dlgLog[0].y === 'Lanjutkan sesi', 'A: primary is Lanjutkan');
  assert(c.dlgLog[0].n === 'Ganti ke sesi baru…', 'A: secondary is Ganti…');
  assert(sameSnap(snapLive(c), s0), 'A: live unchanged before decision');
  assert(run(c, `jftState().exp`) === exp0 && run(c, `jftState().sessions.length`) === sess0, 'A: no EXP/history');
  ok('A no overwrite before decision');
}

// B: Lanjutkan sesi
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  const s0 = snapLive(c);
  run(c, `jftStart('k',2,'ha')`);
  assert(typeof c.__dlgOk === 'function', 'B: ok callback');
  c.__dlgOk();
  assert(sameSnap(snapLive(c), s0) || run(c, `jftState().live.startedAt===` + s0.startedAt), 'B: same session after Lanjutkan');
  assert(run(c, `jftState().live.unit===1`), 'B: still BAB 1');
  ok('B Lanjutkan keeps BAB1');
}

// B2: pure Batal on step-2 — live identical
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  run(c, `var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer()`);
  const s0 = snapLive(c);
  const exp0 = run(c, `jftState().exp`);
  const sess0 = run(c, `jftState().sessions.length`);
  c.dlgLog.length = 0;
  run(c, `jftStart('k',2,'ha')`);
  // step1 secondary → open step2
  assert(typeof c.__dlgNo === 'function', 'B2: step1 no callback');
  c.__dlgNo();
  assert(c.dlgLog.length === 2, 'B2: second dialog opened');
  assert(c.dlgLog[1].y === 'Buang & mulai baru', 'B2: step2 primary discard');
  assert(c.dlgLog[1].n === 'Batal', 'B2: step2 secondary is Batal');
  // pure cancel
  assert(typeof c.__dlgNo === 'function', 'B2: step2 no callback');
  c.__dlgNo();
  assert(sameSnap(snapLive(c), s0), 'B2: Batal keeps full snapshot');
  assert(run(c, `jftState().live.unit===1`), 'B2: still unit 1');
  assert(run(c, `jftState().exp`) === exp0, 'B2: EXP unchanged');
  assert(run(c, `jftState().sessions.length`) === sess0, 'B2: sessions unchanged');
  assert(run(c, `jftState().live.unit!==2`), 'B2: BAB2 not started');
  ok('B2 Batal preserves full live snapshot');
}

// C: Buang & mulai baru
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  run(c, `var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer()`);
  const sess1 = run(c, `jftState().sessions.length`);
  run(c, `jftStart('k',2,'ha')`);
  c.__dlgNo(); // open step2
  assert(c.dlgLog[c.dlgLog.length - 1].y === 'Buang & mulai baru', 'C: discard label');
  c.__dlgOk(); // confirm discard
  const live = run(c, `jftState().live`);
  assert(live && live.unit === 2, 'C: BAB2 started');
  assert(run(c, `jftState().sessions.length`) === sess1, 'C: no finish record for discarded BAB1');
  ok('C discard then start BAB2');
}

// D: empty session
{
  const c = makeContext();
  run(c, `jftState().live={title:'corrupt',kind:'k',unit:1,mode:'ha',queue:[],chunk:[],wrong:[],fresh:0,done:0,ok:0,no:0,answerCount:0,cur:null,opts:[],pick:null,startedAt:Date.now(),lastAt:Date.now(),break:false,exp:0}`);
  const exp0 = run(c, `jftState().exp`);
  const sess0 = run(c, `jftState().sessions.length`);
  run(c, `jftContinue()`);
  assert(run(c, `jftState().live`) === null, 'D: cleared');
  assert(run(c, `jftState().sessions.length`) === sess0 && run(c, `jftState().exp`) === exp0, 'D: no history/EXP');
  run(c, `jftState().live={title:'corrupt2',kind:'k',unit:1,mode:'ha',queue:[],chunk:[],wrong:[],fresh:0,done:0,ok:0,no:0,answerCount:0,cur:null,opts:[],pick:null,startedAt:Date.now(),lastAt:Date.now(),break:false,exp:0}`);
  run(c, `jftFinish()`);
  assert(run(c, `jftState().live`) === null && run(c, `jftState().sessions.length`) === sess0, 'D: finish empty no record');
  ok('D empty session safe');
}

// E: valid finish
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  for (let i = 0; i < 3; i++) {
    run(c, `if(jftState().live){if(jftState().live.break)jftContinue();if(jftState().live.pick!=null)jftAfterAnswer();var oi=jftState().live.opts.findIndex(x=>x.ok);jftChoose(oi>=0?oi:0);jftAfterAnswer()}`);
  }
  const done = run(c, `jftState().live.done`);
  run(c, `jftState().live.queue=[];jftState().live.wrong=[];jftState().live.cur=null;jftState().live.pick=null;jftState().live.break=false`);
  run(c, `jftFinish()`);
  assert(run(c, `jftState().sessions[0].done===` + done), 'E: history kept');
  ok('E valid finish');
}

// F: double choose
{
  const c = makeContext();
  run(c, `jftStart('k',1,'ha')`);
  const before = run(c, `(function(){var n=0,led=sharedLedger();Object.keys(led).forEach(function(k){Object.keys(led[k].dirs||{}).forEach(function(d){n+=+led[k].dirs[d].attempts||0})});return n})()`);
  run(c, `var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftChoose(i);jftChoose(i)`);
  assert(run(c, `jftState().live.done`) === 1, 'F: done=1');
  const after = run(c, `(function(){var n=0,led=sharedLedger();Object.keys(led).forEach(function(k){Object.keys(led[k].dirs||{}).forEach(function(d){n+=+led[k].dirs[d].attempts||0})});return n})()`);
  assert(after === before + 1, 'F: ledger +1');
  ok('F double choose');
}

// G: persist resume
{
  const c = makeContext();
  run(c, `var __snap=null;save=function(){__snap=JSON.parse(JSON.stringify(S))}`);
  run(c, `jftStart('k',1,'ha')`);
  run(c, `var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer()`);
  run(c, `jftState().live=null;jftState().live=__snap.jft.live;jftResume()`);
  assert(run(c, `jftState().live.done>=1 && jftState().live.title==='BAB 1'`), 'G: resumed');
  ok('G persist resume');
}

// H: isolation
{
  const c = makeContext();
  run(c, `Q=null;L=null;jftStart('k',1,'ha');var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer()`);
  assert(run(c, `Q===null&&L===null`), 'H: Q/L null');
  ok('H isolation');
}

// I: null live
{
  const c = makeContext();
  run(c, `jftState().live=null;jftChoose(0);jftContinue();jftAfterAnswer();jftFinish();jftResume()`);
  assert(run(c, `jftState().live===null&&jftState().sessions.length===0`), 'I: safe');
  ok('I null live');
}

console.log('\n' + passed + ' jft-session checks passed');
