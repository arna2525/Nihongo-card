'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x => x[1]);
let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('PASS', name); }
  catch (e) { fail++; console.log('FAIL', name, '-', e.message); }
}
function assert(x, m) { if (!x) throw new Error(m || 'assertion failed'); }
function makeContext(words = 9) {
  const ws = Array.from({length: words}, (_, i) => ({id:'w'+(i+1), k:'漢字'+(i+1), f:'かんじ'+(i+1), a:'arti '+(i+1), c:'noun'}));
  const folder = {id:'f1', name:'BAB 1', words:ws, children:[]};
  const root = {id:'r1', name:'NIHONGO', folders:[folder]};
  const state={roots:[root],rootId:'r1',active:'f1',qs:{mode:'random',n:25,scope:'all',cat:'all'},perf:{},mastery:{},masteryQueue:{},review:{},studySessions:[],qh:[],st:{}};
  const c = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl,
    S:state,
    T:'quiz', Q:null, gear:false, RL:true, FONTS:{std:'1rem'}, performance:{now:()=>100}, document:{hidden:false,activeElement:null,documentElement:{style:{setProperty(){}},classList:{toggle(){}}},addEventListener(){},getElementById(){return {style:{},classList:{toggle(){},remove(){},add(){}},querySelector(){return null},appendChild(){},setAttribute(){},scrollTop:0}},querySelector(){return null},createElement(){return {style:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},appendChild(){},querySelector(){return null}}}},
    window:{}, navigator:{}, setTimeout:()=>1, clearTimeout:()=>{},
    e:x=>String(x??'').replace(/[&<>"']/g,''), hero:()=>'<hero/>', empty:x=>x,
    R:()=>{}, save:()=>{}, load:()=>{}, mig:()=>{}, mirrorRecover:()=>Promise.resolve(), autoCheck:()=>{}, jftReconcileFromIdb:()=>Promise.resolve(), stat:()=>{}, toast:()=>{}, dlg:()=>{},
    uid:(()=>{let n=0;return()=>`uid${++n}`})(),
    shuf:a=>a.slice(),
    curRoot(){return state.roots.find(x=>x.id===state.rootId)||null},
    rootFolders(r){return r.folders.map(f=>({f,p:null,d:0}))},
    allF(){return state.roots.flatMap(r=>r.folders)},
    wordLoc(id){for(const r of state.roots)for(const f of r.folders)for(const w of f.words)if(w.id===id)return {r,f,w};return null;},
    today:()=>Date.now(), fmtDate:()=>'', fm:x=>String(x),
    qValidPattern:null
  };
  vm.createContext(c);
  const start = html.indexOf('/* ===== Kuis:');
  const end = html.indexOf('var JFTC=');
  if (start < 0 || end < 0) throw new Error('quiz engine source range missing');
  vm.runInContext(html.slice(start, end), c, {timeout:30000, filename:'quiz-engine.js'});
  const mergeStart=html.indexOf('function mergeSharedBackup('), mergeEnd=html.indexOf('function bkApply(',mergeStart);
  vm.runInContext(html.slice(mergeStart,mergeEnd),c,{timeout:30000,filename:'backup-merge.js'});
  c.R=()=>{};
  return c;
}
function run(c, code) { return vm.runInContext(code, c, {timeout:30000}); }

check('Both inline JavaScript blocks parse', () => {
  blocks.forEach((b, i) => new vm.Script(b, {filename:`inline-${i}.js`}));
});
check('Quiz length selector cycles 25 → 50 → 100 → Mastery → 25', () => {
  const c=makeContext(1);
  run(c,"S.qs.n=25;qCycle('n');"); assert(run(c,'S.qs.n')===50);
  run(c,"qCycle('n')"); assert(run(c,'S.qs.n')===100);
  run(c,"qCycle('n')"); assert(run(c,'S.qs.n')==='mastery');
  run(c,"qCycle('n')"); assert(run(c,'S.qs.n')===25);
});
check('Mastery starts with no more than seven Kotoba', () => {
  const c=makeContext(12); run(c,"S.qs.n='mastery';S.qs.mode='k2h';qStart()");
  assert(run(c,'Q.mastery===true')); assert(run(c,'Q.q.length')===7); assert(run(c,'Q.sessionUnique')===7);
});
check('Normal Quiz keeps 25/50/100 totals and splits into sessions of at most seven', () => {
  for (const n of [25,50,100]) { const c=makeContext(12);run(c,"S.qs.n="+n+";S.qs.mode='k2h';qStart()");assert(run(c,'Q.allTotal')===n,'total '+n);assert(run(c,'Q.sessions.every(x=>x.length<=7)'),'session size '+n);assert(run(c,'Q.sessions.reduce((a,x)=>a+x.length,0)==='+n),'split sum '+n); }
});
check('Mastery tracks random mode as its own 3-correct streak', () => {
  const c=makeContext(1);run(c,"S.qs.n='mastery';S.qs.mode='random';qStart();Q.o=[Q.q[0]];qFinish(0,false,false)");
  assert(run(c,"masteryValue('w1','random')===1"),'random mode first answer missing');
  run(c,'qNext();qMasteryNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  run(c,'qNext();qMasteryNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  assert(run(c,"masteryValue('w1','random')===3"),'random mode did not reach 3/3');
  assert(run(c,"masteryValue('w1',qPattern(Q.q[0]))>=1"),'actual question direction was not recorded');
});
check('Mastery wrong answers enter the persisted priority queue', () => {
  const c=makeContext(9); run(c,"S.qs.n='mastery';S.qs.mode='k2h';qStart();var target=Q.q[0];Q.o=[Q.q[1]];qFinish(0,false,false)");
  assert(run(c,"S.masteryQueue.k2h[Q.q[0].id]===1"),'wrong answer not queued');
  assert(run(c,'Q.q.length===7'),'wrong answer expanded the seven-question session');
});
check('Next Mastery session prioritizes a previously missed Kotoba', () => {
  const c=makeContext(9); run(c,"S.qs.n='mastery';S.qs.mode='k2h';qStart();var missed=Q.q[0];Q.o=[Q.q[1]];qFinish(0,false,false);qNext();qMasteryNext()");
  assert(run(c,"Q.q[0].id==='w1'"),'missed Kotoba was not first in the next session');
});
check('Three consecutive correct answers trigger Smart Review', () => {
  const c=makeContext(1); run(c,"S.qs.n='mastery';S.qs.mode='k2h';qStart();Q.o=[Q.q[0]];qFinish(0,false,false)");
  assert(run(c,"masteryValue('w1','k2h')===1"));
  run(c,'qNext();qMasteryNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  run(c,'qNext();qMasteryNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  assert(run(c,"masteryValue('w1','k2h')===3"));
  assert(run(c,"!!reviewState('w1','k2h')"),'review record was not initialized at 3/3');
});
check('Normal quiz reaching 3/3 also initializes Smart Review', () => {
  const c=makeContext(1); run(c,"S.qs.n=25;S.qs.mode='k2h';qStart();Q.o=[Q.q[0]];qFinish(0,false,false)");
  run(c,'qNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  run(c,'qNext();Q.o=[Q.q[0]];qFinish(0,false,false)');
  assert(run(c,"masteryValue('w1','k2h')===3"));
  assert(run(c,"!!reviewState('w1','k2h')"),'normal quiz did not seed Smart Review');
});
check('Quiz result accuracy uses all submitted answers', () => {
  const c=makeContext(1);
  run(c,"Q={mode:'k2h',q:[S.roots[0].folders[0].words[0]],sessions:[[S.roots[0].folders[0].words[0]]],sessionIndex:0,sessionCount:1,sessionUnique:1,first:{w1:{ok:true}},res:[{ok:true},{ok:false},{ok:false}],unm:{},done:true}");
  const out=run(c,'qResult()');
  assert(out.includes('33%'),'expected 33% accuracy over three attempts');
  assert(out.includes('Benar 1 dari 3 jawaban'),'result denominator/label mismatch');
});
check('Repeated Kotoba result status reflects the latest answer', () => {
  const c=makeContext(1);run(c,"Q={mode:'k2h',q:[S.roots[0].folders[0].words[0]],sessions:[[S.roots[0].folders[0].words[0]]],sessionIndex:0,sessionCount:1,sessionUnique:1,first:{w1:{ok:false}},res:[{id:'w1',ok:false},{id:'w1',ok:true}],unm:{},done:true}");
  const out=run(c,'qResult()');assert(out.includes('50%'));assert(out.includes('Benar'),'final status should show the latest correct answer');
});
check('Session timer starts and resets for a continued session', () => {
  const c=makeContext(8); run(c,'qStart()');
  assert(run(c,'Q.startedAt>0'),'initial timestamp missing');
  run(c,'Q.done=true;Q.partial=false;qContinue()');
  assert(run(c,'Q.startedAt>0'),'continued timestamp missing');
});
check('Saved session history uses elapsed session duration', () => {
  const c=makeContext(1);run(c,"qStart();Q.startedAt=Date.now()-7000;Q.res=[{id:'w1',ok:true,ms:100}];Q.first={w1:{id:'w1',ok:true,ms:100}};Q.q=[S.roots[0].folders[0].words[0]];qEnd(false)");
  assert(run(c,'S.studySessions[0].duration>=7'),'saved duration was not measured from session start');
});
check('Shared backup merge preserves source-specific correct counters', () => {
  const c=makeContext(1);
  run(c,"S.sharedProgress={items:{'kotoba|漢字1|かんじ1':{type:'kotoba',jp:'漢字1',read:'かんじ1',dirs:{k2h:{attempts:4,correct:3,streak:1,mastery:1,sources:{jft:2},srcOk:{jft:1}}}}}};mergeSharedBackup({items:{'kotoba|漢字1|かんじ1':{type:'kotoba',jp:'漢字1',read:'かんじ1',dirs:{k2h:{attempts:5,correct:4,streak:2,mastery:2,sources:{jft:3},srcOk:{jft:2}}}}}})");
  assert(run(c,"S.sharedProgress.items['kotoba|漢字1|かんじ1'].dirs.k2h.srcOk.jft===2"),'srcOk was not merged');
});
console.log(`\nAudit unit tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
