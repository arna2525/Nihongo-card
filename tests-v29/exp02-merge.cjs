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
  vm.runInContext('function uid(){return Math.random().toString(36).slice(2,9)+Math.random().toString(36).slice(2,5)}', context);
  context.wordLoc = () => null; context.QM = [];
  const sharedStart = html.indexOf('function sharedLedger()');
  const sharedEnd = html.indexOf('/* __TEST_SHARED_END__ */', sharedStart);
  vm.runInContext(html.slice(sharedStart, sharedEnd), context, { timeout: 30000 });
  vm.runInContext(html.slice(html.lastIndexOf('var JFTC='), html.lastIndexOf('</script>')), context, { timeout: 30000 });
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
let n = 0; function ok(m){ console.log('PASS  '+m); n++; }
function day(exp){ return { exp, seconds: 1, answers: 1, correct: 1, quizAnswers: 0, quizCorrect: 0, assessmentAnswers: 0, assessmentCorrect: 0, kanji: {}, kotoba: {} }; }

function bak(o) {
  return JSON.stringify(Object.assign({ progress: {}, extraProgress: {}, daily: {}, sessions: [], rewardedAssessments: {}, rewardLedger: {} }, o));
}

// 1 identical twice
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:idemp001')`);
  const e = run(c, `jftState().exp`);
  const payload = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments,rewardLedger:jftState().rewardLedger,progress:{}}))`);
  run(c, `mergeJftBackup(${JSON.stringify(payload)}); mergeJftBackup(${JSON.stringify(payload)})`);
  assert(run(c, `jftState().exp`) === e, '1 exp stable');
  ok('1 identical twice');
}
// 2 ten times
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:ten00001')`);
  const payload = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments,rewardLedger:jftState().rewardLedger,progress:{}}))`);
  for (let i = 0; i < 10; i++) run(c, `mergeJftBackup(${JSON.stringify(payload)})`);
  assert(run(c, `jftState().exp`) === 42, '2 ten times');
  ok('2 ten imports');
}
// 3-4 A then B / B then A — different rewards
{
  const makeAB = () => {
    const cA = makeContext();
    run(cA, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:devA0001')`);
    const A = run(cA, `JSON.parse(JSON.stringify({exp:jftState().exp,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments,rewardLedger:jftState().rewardLedger,progress:{}}))`);
    const cB = makeContext();
    run(cB, `jftRecordSpecial('Konjugasi',10,10,5,[],'assess:verb:devB0001')`);
    const B = run(cB, `JSON.parse(JSON.stringify({exp:jftState().exp,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments,rewardLedger:jftState().rewardLedger,progress:{}}))`);
    return { A, B };
  };
  const { A, B } = makeAB();
  const c1 = makeContext();
  run(c1, `mergeJftBackup(${JSON.stringify(A)}); mergeJftBackup(${JSON.stringify(B)})`);
  assert(run(c1, `jftState().exp`) === 84, '3 A then B = 84');
  const c2 = makeContext();
  run(c2, `mergeJftBackup(${JSON.stringify(B)}); mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 84, '4 B then A = 84');
  ok('3-4 order independent different rewards');
}
// 5 different rewards
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:diffA001')`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:jftState().daily,progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:diffB001')`);
  run(c2, `mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 84, '5');
  ok('5 different rewards merge');
}
// 6 same reward
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:same0001')`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:jftState().daily,progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:same0001')`);
  run(c2, `mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 42, '6 same');
  ok('6 same reward');
}
// 7-9 dates
{
  const c = makeContext();
  run(c, `jftLedgerPut('assess:bun:dayA0001',42,'assessment','2026-11-13'); jftReconcileExpFromLedger()`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,daily:jftState().daily,sessions:[],rewardedAssessments:{},progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftLedgerPut('assess:bun:dayB0001',42,'assessment','2026-11-14'); jftReconcileExpFromLedger()`);
  run(c2, `mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 84, '7/9 diff days');
  const d13 = run(c2, `(jftState().daily['2026-11-13']||{}).exp||0`);
  const d14 = run(c2, `(jftState().daily['2026-11-14']||{}).exp||0`);
  assert(d13 === 42 && d14 === 42, 'daily per day '+d13+' '+d14);
  ok('7-9 different days');
}
// 8 same day different rewards
{
  const c = makeContext();
  run(c, `jftLedgerPut('assess:bun:sdA00001',40,'assessment','2026-11-14'); jftReconcileExpFromLedger()`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,daily:jftState().daily,sessions:[],rewardedAssessments:{},progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftLedgerPut('assess:bun:sdB00001',50,'assessment','2026-11-14'); jftReconcileExpFromLedger()`);
  run(c2, `mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 90, '8 same day sum');
  assert(run(c2, `jftState().daily['2026-11-14'].exp`) === 90, '8 daily 90');
  ok('8 same day different rewards');
}
// 10 rewardedAssessments merged
{
  const c = makeContext();
  run(c, `jftState().rewardedAssessments={'assess:bun:mapA0001':100}; mergeJftBackup({rewardedAssessments:{'assess:bun:mapB0001':200,'assess:bun:mapA0001':50},exp:0,daily:{},sessions:[],progress:{},rewardLedger:{}})`);
  assert(run(c, `!!jftState().rewardedAssessments['assess:bun:mapA0001'] && !!jftState().rewardedAssessments['assess:bun:mapB0001']`), '10');
  ok('10 rewardedAssessments union');
}
// 11 same id rejected after merge
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:postm001')`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:jftState().daily,progress:{}}))`);
  const c2 = makeContext();
  run(c2, `mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:postm001')`) === 0, '11');
  ok('11 reject after merge');
}
// 12 different ids merge
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:twoA0001')`);
  const A = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:{},progress:{}}))`);
  const c2 = makeContext();
  run(c2, `jftRecordSpecial('Konjugasi',10,10,5,[],'assess:verb:twoB0001'); mergeJftBackup(${JSON.stringify(A)})`);
  assert(run(c2, `jftState().exp`) === 84, '12');
  ok('12');
}
// 13 sessions same id
{
  const c = makeContext();
  run(c, `jftState().sessions=[{id:'s1',rewardId:'assess:bun:sess0001',exp:42,title:'Bunpou',t:1}]; mergeJftBackup({sessions:[{id:'s1',rewardId:'assess:bun:sess0001',exp:42,title:'Bunpou',t:1}],exp:42,daily:{},progress:{},rewardLedger:{'assess:bun:sess0001':{amount:42,source:'assessment',day:'2026-11-14',t:1}},rewardedAssessments:{}})`);
  assert(run(c, `jftState().sessions.length`) === 1, '13');
  ok('13 same session id');
}
// 14 different session id same rewardId
{
  const c = makeContext();
  run(c, `jftState().sessions=[{id:'sA',rewardId:'assess:bun:rid00001',exp:42,title:'Bunpou',t:1}]; mergeJftBackup({sessions:[{id:'sB',rewardId:'assess:bun:rid00001',exp:42,title:'Bunpou',t:2}],exp:42,daily:{},progress:{},rewardLedger:{},rewardedAssessments:{}})`);
  assert(run(c, `jftState().sessions.length`) === 1, '14');
  ok('14 same rewardId different session id');
}
// 15 different sessions kept
{
  const c = makeContext();
  run(c, `jftState().sessions=[{id:'s1',rewardId:'assess:bun:k1xxxx1',exp:42,title:'Bunpou',t:1}]; mergeJftBackup({sessions:[{id:'s2',rewardId:'assess:verb:k2xxxx2',exp:42,title:'Konjugasi',t:2}],exp:42,daily:{},progress:{},rewardLedger:{},rewardedAssessments:{}})`);
  assert(run(c, `jftState().sessions.length`) === 2, '15');
  ok('15 distinct sessions');
}
// 16-17 reload
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:rel00001')`);
  const payload = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments,rewardLedger:jftState().rewardLedger,progress:{}}))`);
  const c2 = makeContext();
  run(c2, `mergeJftBackup(${JSON.stringify(payload)})`);
  const exp = run(c2, `jftState().exp`);
  const snap = run(c2, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,daily:jftState().daily,sessions:jftState().sessions,rewardedAssessments:jftState().rewardedAssessments}))`);
  const c3 = makeContext();
  run(c3, `var snap=${JSON.stringify(snap)}; jftState().exp=snap.exp;jftState().rewardLedger=snap.rewardLedger;jftState().daily=snap.daily;jftState().sessions=snap.sessions;jftState().rewardedAssessments=snap.rewardedAssessments;`);
  run(c3, `mergeJftBackup(${JSON.stringify(payload)})`);
  assert(run(c3, `jftState().exp`) === exp, '16-17');
  ok('16-17 reload merge');
}
// 18-19 legacy without ledger / rewardedAssessments
{
  const c = makeContext();
  run(c, `jftState().exp=100; mergeJftBackup({exp:150,daily:{},sessions:[],progress:{}})`);
  assert(run(c, `jftState().exp`) === 150, '18 legacy max');
  ok('18 legacy no ledger');
}
{
  const c = makeContext();
  run(c, `mergeJftBackup({exp:42,sessions:[{id:'lg',rewardId:'assess:bun:leg00001',exp:42,title:'Bunpou',t:1}],daily:{},progress:{}})`);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:leg00001')`) === 0, '19');
  ok('19 legacy session rewardId blocks');
}
// 20 empty/corrupt
{
  const c = makeContext();
  run(c, `jftState().exp=10; mergeJftBackup(null); mergeJftBackup({}); mergeJftBackup({exp:'x',sessions:null})`);
  assert(run(c, `jftState().exp`) === 10, '20');
  ok('20 empty corrupt');
}
// 21-22 ledger consistency
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:con00001'); jftRecordSpecial('Konjugasi',10,10,5,[],'assess:verb:con00001')`);
  assert(run(c, `jftState().exp===84 && jftLedgerSum(jftState().rewardLedger)===84`), '21');
  ok('21-22 total=ledger sum');
}
// 23 chunk award ledger — retry same chunkRewardId must not double
{
  const c = makeContext();
  run(c, `var s={startedAt:999,answerCount:7,done:7,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0,chunkRewardId:'chunk:fixed23'}; var e=jftAwardChunk(s);`);
  assert(run(c, `jftState().exp===30 && Object.keys(jftState().rewardLedger).length===1`), '23');
  run(c, `var s2={startedAt:999,answerCount:7,done:7,chunk:[{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false},{ok:true,repeat:false}],exp:0,chunkRewardId:'chunk:fixed23'}; jftAwardChunk(s2);`);
  assert(run(c, `jftState().exp`) === 30, '23 no double chunk');
  ok('23 chunk ledger');
}
// 24 assessment idempotent
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Test Ingatan',10,10,5,null,'assess:test:idem0001')`) === 42, '24a');
  assert(run(c, `jftRecordSpecial('Test Ingatan',10,10,5,null,'assess:test:idem0001')`) === 0, '24b');
  ok('24 assessment idempotent');
}
// 25 no double on repeat import
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:dbl00001')`);
  const p = run(c, `JSON.parse(JSON.stringify({exp:jftState().exp,rewardLedger:jftState().rewardLedger,rewardedAssessments:jftState().rewardedAssessments,sessions:jftState().sessions,daily:jftState().daily,progress:{}}))`);
  run(c, `mergeJftBackup(${JSON.stringify(p)});mergeJftBackup(${JSON.stringify(p)});mergeJftBackup(${JSON.stringify(p)})`);
  assert(run(c, `jftState().exp`) === 42, '25');
  ok('25 no double repeat import');
}

console.log('\n'+n+' exp02 checks passed');
