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

const c1 = makeContext();
run(c1, `jftStart('k',1,'ha')`);
const e0 = run(c1, `jftState().exp`);
run(c1, `var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer()`);
assert(run(c1, `jftState().exp`) === e0, 'single answer no EXP');
ok('1 single answer no EXP');

const c2 = makeContext();
run(c2, `jftStart('k',1,'ha'); var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftChoose(i)`);
assert(run(c2, `jftState().live.done===1 && jftState().live.chunk.length===1`), 'double choose');
ok('2 double choose');

const c3 = makeContext();
run(c3, `jftStart('k',1,'ha')`);
for (let k = 0; k < 7; k++) {
  run(c3, `if(jftState().live.pick!=null)jftAfterAnswer(); var i=jftState().live.opts.findIndex(x=>x.ok); jftChoose(i>=0?i:0); jftAfterAnswer()`);
}
assert(run(c3, `!!jftState().live.break`), 'break after 7');
assert(run(c3, `jftState().exp`) === 30, 'perfect block 30 EXP');
run(c3, `jftContinue()`);
assert(run(c3, `jftState().exp`) === 30, 'continue no re-award');
ok('3 block award once');

const c5 = makeContext();
run(c5, `jftStart('k',1,'ha'); var i=jftState().live.opts.findIndex(x=>x.ok);jftChoose(i);jftAfterAnswer(); var e=jftState().exp; jftDiscardLive();`);
assert(run(c5, `jftState().exp===0 && jftState().live===null`), 'discard');
ok('5 discard no EXP');

const c6 = makeContext();
run(c6, `jftState().live={title:'x',queue:[],chunk:[],wrong:[],done:0,ok:0,no:0,answerCount:0,cur:null,pick:null,break:false,exp:0,startedAt:Date.now(),lastAt:Date.now()}; jftFinish()`);
assert(run(c6, `jftState().exp===0 && jftState().sessions.length===0`), 'empty finish');
ok('6 empty finish');

const c7 = makeContext();
run(c7, `jftRecordSpecial('T',10,10,5); jftRecordSpecial('T',10,10,5)`);
assert(run(c7, `jftState().exp`) === 84, 'recordSpecial not self-idempotent');
ok('7 recordSpecial double call doubles');

const c8 = makeContext();
run(c8, `jftState().exp=50; mergeJftBackup({exp:80,daily:{},progress:{},sessions:[]}); mergeJftBackup({exp:60,daily:{},progress:{},sessions:[]})`);
assert(run(c8, `jftState().exp`) === 80, 'merge max');
ok('8 merge max');

const c9 = makeContext();
run(c9, `jftMarkActivity(JFT_ITEMS.k[0],5,true); var s1=jftStreak(); jftMarkActivity(JFT_ITEMS.k[0],5,true); var s2=jftStreak(); if(s1!==s2||s1<1) throw new Error('streak '+s1+' '+s2)`);
ok('9 same day streak stable');

const c10 = makeContext();
run(c10, `var d=new Date(); jftState().daily[jftDate(d)]={seconds:10,kanji:{},kotoba:{},answers:1,correct:1,exp:0}; d.setDate(d.getDate()-1); jftState().daily[jftDate(d)]={seconds:10,kanji:{},kotoba:{},answers:1,correct:1,exp:0}; d.setDate(d.getDate()-1); jftState().daily[jftDate(d)]={seconds:10,kanji:{},kotoba:{},answers:1,correct:1,exp:0}`);
assert(run(c10, `jftStreak()`) === 3, '3 day');
ok('10 multi-day streak');

const c11 = makeContext();
run(c11, `var d=new Date(); jftState().daily[jftDate(d)]={seconds:10,kanji:{},kotoba:{},answers:1,correct:1,exp:0}; d.setDate(d.getDate()-2); jftState().daily[jftDate(d)]={seconds:10,kanji:{},kotoba:{},answers:1,correct:1,exp:0}`);
assert(run(c11, `jftStreak()`) === 1, 'gap');
ok('11 gap breaks streak');

console.log('\n' + n + ' exp-streak audit probes passed');
