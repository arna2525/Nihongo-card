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
    uid: (() => { let n = 0; return () => 'id' + (++n) + 'x' + Math.random().toString(36).slice(2, 6); })(),
    document: { hidden: false }, window: {}, dlg: () => {}
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
let n = 0; function ok(m) { console.log('PASS  ' + m); n++; }

// 1 once
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:uniqueAAA')`) === 42, 'once');
  ok('1 once');
}
// 2 repeat same id
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:uniqueBBB')`);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:uniqueBBB')`) === 0, 'repeat');
  assert(run(c, `jftState().exp`) === 42, 'exp');
  ok('2 same id');
}
// 3 empty/undefined/null rejected
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('X',10,10,1)`) === 0, 'undef');
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,null)`) === 0, 'null');
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,'')`) === 0, 'empty');
  assert(run(c, `jftState().exp`) === 0, 'no exp');
  ok('3 reject empty ids');
}
// 4 prefix only rejected
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,'assess:bun:')`) === 0, 'prefix bun');
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,'assess:verb:')`) === 0, 'prefix verb');
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,'assess:test:')`) === 0, 'prefix test');
  assert(run(c, `jftRecordSpecial('X',10,10,1,null,'foo:bar:bazzzz')`) === 0, 'bad prefix');
  ok('4 prefix rejected');
}
// 5-7 frozen clock unique assessmentId from starts
{
  const c = makeContext();
  const out = run(c, `(function(){
    var fixed=1700000000000, orig=Date.now; Date.now=function(){return fixed};
    jftBunQuizStart(); var a=JFT_BUN_Q.assessmentId, s1=JFT_BUN_Q.startedAt;
    jftBunQuizStart(); var b=JFT_BUN_Q.assessmentId, s2=JFT_BUN_Q.startedAt;
    jftVerbQuizStart(); var c1=JFT_VERB_Q.assessmentId;
    jftVerbQuizStart(); var c2=JFT_VERB_Q.assessmentId;
    Date.now=orig;
    return {s1:s1,s2:s2,sameStart:s1===s2,a:a,b:b,diffBun:a!==b,c1:c1,c2:c2,diffVerb:c1!==c2};
  })()`);
  assert(out.sameStart, 'startedAt can collide under freeze');
  assert(out.diffBun && out.diffVerb, 'assessmentId still unique');
  ok('5-7 unique ids under frozen clock');
}
// 8 different assessments both reward
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:one111111')`);
  run(c, `jftRecordSpecial('Konjugasi',10,10,5,[],'assess:verb:two22222')`);
  assert(run(c, `jftState().exp`) === 84, 'two rewards');
  ok('8 distinct');
}
// 9 reload
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:reload99')`);
  const snap = run(c, `JSON.stringify({exp:jftState().exp,ra:jftState().rewardedAssessments,se:jftState().sessions,daily:jftState().daily})`);
  run(c, `jftState().exp=0;jftState().rewardedAssessments={};jftState().sessions=[];jftState().daily={}`);
  run(c, `var s=JSON.parse(${JSON.stringify(snap)});jftState().exp=s.exp;jftState().rewardedAssessments=s.ra;jftState().sessions=s.se;jftState().daily=s.daily`);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:reload99')`) === 0, 'reload block');
  ok('9 reload');
}
// 10 sessions only
{
  const c = makeContext();
  run(c, `jftState().sessions=[{id:'s',rewardId:'assess:bun:sessOnly1',kind:'assessment'}]`);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:sessOnly1')`) === 0, 'sess');
  ok('10 sessions only');
}
// 11 map only
{
  const c = makeContext();
  run(c, `jftState().rewardedAssessments['assess:bun:mapOnly99']=1`);
  assert(run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:mapOnly99')`) === 0, 'map');
  ok('11 map only');
}
// 12 formula
{
  const c = makeContext();
  assert(run(c, `jftRecordSpecial('X',5,5,1,[],'assess:bun:formAAAA')`) === 22, 'perfect');
  assert(run(c, `jftRecordSpecial('Y',5,4,1,[],'assess:bun:formBBBB')`) === 16, 'partial');
  ok('12 formula');
}
// 13 daily/total
{
  const c = makeContext();
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:daily1111')`);
  run(c, `jftRecordSpecial('Bunpou',10,10,5,[],'assess:bun:daily1111')`);
  assert(run(c, `jftState().exp===42 && jftDayLog().exp===42`), 'daily');
  ok('13 daily total');
}
// 14 production callers no Date.now for reward id — static check via source
{
  const calls = html.match(/jftRecordSpecial\([^;]+/g) || [];
  const bad = calls.filter(x => /assess:(bun|verb|test):'\s*\+|assess:.*Date\.now/.test(x));
  assert(bad.length === 0, 'no Date.now in reward construction: ' + bad.join('|'));
  assert(html.includes("q.assessmentId)jftRecordSpecial"), 'uses assessmentId');
  ok('14 callers use assessmentId only');
}
// 15 production path: start sets assessmentId, reward uses it
{
  const c = makeContext();
  const out = run(c, `(function(){
    jftBunQuizStart();
    var id=JFT_BUN_Q.assessmentId;
    var r1=jftRecordSpecial('Bunpou',10,10,5,[],id);
    var r2=jftRecordSpecial('Bunpou',10,10,5,[],id);
    return {id:id,r1:r1,r2:r2,exp:jftState().exp,hasPrefix:id.indexOf('assess:bun:')===0};
  })()`);
  assert(out.hasPrefix && out.r1 === 42 && out.r2 === 0 && out.exp === 42, JSON.stringify(out));
  ok('15 prod path');
}

console.log('\n' + n + ' hardening checks passed');
