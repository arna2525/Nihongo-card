#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function makeContext() {
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl,
    S: {}, e: x => String(x ?? ''), hero: () => '', vStatBase: () => '', R: () => {}, save: () => {},
    shuf: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    uid: () => Math.random().toString(36).slice(2, 9), document: { hidden: false }, window: {}, dlg: () => {}
  };
  vm.createContext(context); context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
let n = 0; function ok(m){ console.log('PASS  '+m); n++; }

// A: one assessment rewards once (formula 10*4+2=42)
{
  const c = makeContext();
  const r = run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1001')`);
  assert(r === 42, 'A reward 42 got '+r);
  assert(run(c, `jftState().exp`) === 42, 'A total exp');
  ok('EXP-01-A once');
}

// B: second call same id
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1002')`);
  const r2 = run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1002')`);
  assert(r2 === 0 && run(c, `jftState().exp`) === 42, 'B no double');
  ok('EXP-01-B double call');
}

// C: third call
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1003')`);
  run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1003')`);
  run(c, `jftRecordSpecial('Bunpou',10,10,12,[], 'assess:bun:1003')`);
  assert(run(c, `jftState().exp`) === 42, 'C still 42');
  ok('EXP-01-C triple call');
}

// D/H: simulate save/reload via snapshot of rewardedAssessments + sessions
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Konjugasi',10,8,15,[], 'assess:verb:2001')`);
  // 8*4=32 no perfect bonus
  assert(run(c, `jftState().exp`) === 32, 'D first 32');
  const snap = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:jftState().daily}))`);
  // "reload"
  run(c, `jftState().exp=0; jftState().rewardedAssessments={}; jftState().sessions=[]; jftState().daily={}`);
  run(c, `var snap=${JSON.stringify(snap)}; jftState().exp=snap.exp; jftState().rewardedAssessments=snap.rewardedAssessments; jftState().sessions=snap.sessions; jftState().daily=snap.daily`);
  const r = run(c, `jftRecordSpecial('Konjugasi',10,8,15,[], 'assess:verb:2001')`);
  assert(r === 0 && run(c, `jftState().exp`) === 32, 'D/H reload no re-reward');
  ok('EXP-01-D/H reload');
}

// E: resume same assessment id
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Test Ingatan',20,20,30,null,'assess:test:3001')`);
  assert(run(c, `jftState().exp`) === 82, 'E 20*4+2=82');
  run(c, `jftRecordSpecial('Test Ingatan',20,20,30,null,'assess:test:3001')`);
  assert(run(c, `jftState().exp`) === 82, 'E resume same');
  ok('EXP-01-E resume same id');
}

// F: two different assessments
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,10,[], 'assess:bun:4001')`);
  run(c, `jftRecordSpecial('Konjugasi',10,10,10,[], 'assess:verb:4002')`);
  assert(run(c, `jftState().exp`) === 84, 'F two distinct 42+42');
  ok('EXP-01-F distinct assessments');
}

// G: rewardId persisted on session record
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,9,10,[], 'assess:bun:5001')`);
  assert(run(c, `jftState().sessions[0].rewardId==='assess:bun:5001'`), 'G session has rewardId');
  assert(run(c, `!!jftState().rewardedAssessments['assess:bun:5001']`), 'G map has id');
  ok('EXP-01-G id persisted');
}

// I: no duplicate session rows for same rewardId
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,10,[], 'assess:bun:6001')`);
  run(c, `jftRecordSpecial('Bunpou',10,10,10,[], 'assess:bun:6001')`);
  assert(run(c, `jftState().sessions.filter(x=>x.rewardId==='assess:bun:6001').length`) === 1, 'I one session');
  ok('EXP-01-I no duplicate sessions');
}

// J: daily + total consistent
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,10,[], 'assess:bun:7001')`);
  run(c, `jftRecordSpecial('Bunpou',10,10,10,[], 'assess:bun:7001')`);
  assert(run(c, `jftState().exp===42 && jftDayLog().exp===42`), 'J totals');
  ok('EXP-01-J daily/total');
}

// K: formula unchanged
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('X',5,5,1,[], 'assess:bun:formX1ok')`) === 22, 'K 5*4+2');
  assert(run(c, `jftRecordSpecial('Y',5,4,1,[], 'assess:bun:formY1ok')`) === 16, 'K 4*4 no bonus');
  ok('EXP-01-K formula');
}

console.log('\n'+n+' EXP-01 checks passed');
