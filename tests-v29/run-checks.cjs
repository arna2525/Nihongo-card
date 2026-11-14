const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const root = path.join(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
new vm.Script(script, { filename: 'index.inline.js' });
const appBuild = html.match(/APP_BUILD=\"([^\"]+)/)?.[1];
assert(appBuild === version.build && /var CACHE_NAME\s*=\s*['"]kotoba-v0\.1\.0-build17-5['"]/.test(sw), 'App, version metadata, and service-worker cache build mismatch');
for (const asset of ['assets/header.webp','assets/bg.webp','assets/logo.png','assets/icon-192.png','assets/icon-512.png','manifest.webmanifest']) assert(fs.existsSync(path.join(root, asset)), `Missing PWA asset: ${asset}`);
assert(manifest.start_url === './' && manifest.scope === './' && manifest.display === 'standalone', 'PWA manifest configuration mismatch');

function makeContext() {
  const context = {
    console, Math, Date, JSON, Array, Object, String, Number, Set, Map, Intl,
    S: {}, e: x => String(x ?? '').replace(/[&<>"']/g, ''),
    hero: () => '<hero/>', vStatBase: () => '<legacy-stats/>', R: () => {}, save: () => {},
    shuf: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    uid: () => Math.random().toString(36).slice(2), vLearnLegacy: () => '<legacy/>',
    dlg: () => {}, document: {}, window: {}
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
    if (!rid) return Promise.resolve('FAILED');
    if (_claim.has(rid)) return Promise.resolve('EXISTS');
    _claim.set(rid, amount);
    return Promise.resolve('CLAIMED');
  };
  /* Core curriculum tests isolate quiz/session logic; reward transactions are covered by Build 14 async-specific tests. */
  context.jftAwardChunkAsync = function(s) { if (s) { s.chunk=[]; s.chunkRewardId=null; } return 0; };
  context.__claimStore = _claim;
  return context;
}
function run(c, code) { return vm.runInContext(code, c, { timeout: 30000 }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const c = makeContext();
const counts = run(c, `({kotoba:JFTC.kotoba.length,kanji:JFTC.kanji.length,bunpou:JFTC.bunpou.length,bunpouDetail:JFTC.bunpouExplanations.length,verbs:JFTC.verbs.length,forms:JFTC.verbForms.length,days:Math.ceil(JFTC.kanji.length/10),allDaysTen:Array.from({length:Math.ceil(JFTC.kanji.length/10)},(_,i)=>JFT_ITEMS.j.filter(w=>w.unit===i+1).length).every(n=>n===10)})`);
assert(counts.kotoba === 1497 && counts.kanji === 610, 'Curriculum Kotoba/Kanji counts mismatch');
assert(counts.bunpou === 73 && counts.bunpouDetail === 73, 'Bunpou data/details mismatch');
assert(counts.verbs === 49 && counts.forms === 13, 'Verb/form count mismatch');
assert(counts.days === 61 && counts.allDaysTen, 'Kanji grouping must be 61 days × 10');

for (const fn of ['jftHome', 'jftUnits', 'jftBunView', 'jftVerbView', 'jftStreakView', 'jftVerbRules', 'vStat']) {
  assert(run(c, `${fn}().length > ${fn === 'vStat' ? 0 : 100}`), `${fn} render failed`);
}
const metricHome = run(c, 'jftHome()');
assert(metricHome.includes('AKURASI TOTAL') && metricHome.includes('MASTERY TOTAL') && metricHome.includes('AKURASI HARI INI'), 'Home accuracy/mastery metrics are missing');
const metricUnit = run(c, `(JFT_KIND='k',JFT_DAY=1,jftUnitView())`);
assert(metricUnit.includes('AKURASI') && metricUnit.includes('Jawaban benar:'), 'Per-unit accuracy breakdown is missing');
run(c, `vStatBase=function(){return '<div><details><div>existing analytics</div></div></details>'}`);
const statView = run(c, 'vStat()');
assert(!statView.includes('JFT Learning Progress'), 'Duplicate standalone JFT summary card should be removed');
assert(statView.includes('JFT Learning Analytics') && statView.includes('Rincian 50 BAB Kotoba') && statView.includes('Rincian 61 hari Kanji') && statView.includes('Riwayat sesi JFT terbaru'), 'Full JFT analytics are not embedded in complete statistics');
const declaredHandlers = new Set([...html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const inlineHandlers = new Set();
for (const expr of html.matchAll(/on(?:click|change|input|submit)=\"([^\"]+)\"/g)) for (const m of expr[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) inlineHandlers.add(m[1]);
const missingHandlers = [...inlineHandlers].filter(name => !declaredHandlers.has(name) && !['if','return','confirm','alert','setTimeout','clearTimeout','parseInt','parseFloat'].includes(name));
assert(missingHandlers.length === 0, `Inline UI handlers are undefined: ${missingHandlers.join(', ')}`);
assert(html.includes('function flipC()') && html.includes('function rate(r)'), 'Flashcard flip/rating handlers are missing');
const rateBody = html.match(/function rate\(r\)\{([\s\S]*?)\nfunction startL\(/);
assert(rateBody && !rateBody[1].includes('sharedRecord') && !rateBody[1].includes('stat(\"q\"'), 'Flashcard rating must not count as quiz mastery/accuracy');
assert(html.includes('function sharedRecord(type,jp,read,dir,ok,source,eventId)') && html.includes('function mergeSharedBackup(incoming)') && html.includes('sharedProgress:v.sharedProgress||{items:{}}'), 'Shared learning ledger or backup/restore integration is missing');
assert(html.includes('function ckey(type,jp,read)') && html.includes('unifiedPossible=0') && html.includes('unifiedAttempts=totalQ+(+jftStats.attempts||0)') && html.includes('jftReview.complete') && html.includes('qm.n+=(+x.done||0)'), 'Canonical unified mastery, accuracy, review, or Daily Quest aggregation is missing');
assert(html.includes('Total Learning Items') && html.includes('Quiz Accuracy') && html.includes('Kotoba Card: '), 'Unified dashboard labels are missing');
assert(html.includes('slot.n+=(+jd.quizAnswers||0)') && html.includes('totalTime+=jftTotalSeconds') && html.includes('studyDays[di]=1'), 'JFT daily activity/time/streak are not synchronized into the main dashboard');
const jftDetail = run(c, `jftState();var todayKey=jftDayKey();jftDayLog().seconds=120;jftDayLog().quizAnswers=4;jftDayLog().quizCorrect=3;jftDayLog().kanji.jj0=1;jftState().exp=12;jftState().sessions.push({id:'detail-session',kind:'assessment',title:'Bunpou',done:10,ok:8,accuracy:80,seconds:60,t:Date.now()});jftStatisticsDetail()`);
assert(jftDetail.includes('2m') && jftDetail.includes('Total EXP') && jftDetail.includes('Bunpou') && jftDetail.includes('610 karakter'), 'JFT detailed statistics do not render stored daily/session data');
assert(html.includes('nx-shell kc-shell') && html.includes('Learning Mastery') && html.includes('Learning Activity') && html.includes('Daily Quest') && html.includes('Smart Review Intelligence') && html.includes('Needs review') && html.includes('Learning Timeline') && html.includes('Learning Intelligence'), 'Full v1.4.7 statistics design and drill-down sections are missing');
assert(!html.includes("var legacyAnalytics=h") && html.includes("legacyAnalytics=\'<section class=\"nx-panel\" id=\"kcDue\">"), "Old statistics dashboard markup should not be retained as the drill-down design");
assert(html.includes('Last 7 Days') && html.includes('Last 30 Days') && html.includes('Last 90 Days') && html.includes('All Time') && html.includes('More learning analytics'), 'Statistics design filters/details are missing');
assert(html.includes('/* v1.4.7 — Statistics redesign') && html.includes('.kc-shell .nx-panel'), 'Original v1.4.7 scoped statistics styles are missing');

// Session: three passes, mastery, seven-card breaks, and saved result.
run(c, `jftStart('k',1,'ha')`);
let safety = 0;
while (run(c, '!!jftState().live') && safety++ < 1000) {
  if (run(c, 'jftState().live.break')) { run(c, 'jftContinue()'); continue; }
  const correct = run(c, 'jftState().live.opts.findIndex(x=>x.ok)');
  run(c, `jftChoose(${correct});jftAfterAnswer()`);
}
assert(safety < 1000, 'Session did not finish');
const completed = run(c, `({session:jftState().sessions[0],mastery:jftMastered(JFT_ITEMS.k[0],'ha')})`);
assert(completed.session.done === 63 && completed.session.accuracy === 100, 'BAB 1 session simulation failed');
assert(completed.mastery, 'Mastery rule did not activate after repeated correct answers');

// Wrong-answer reinforcement and unique new items inside a seven-card block.
const edge = makeContext();
run(edge, `jftStart('k',1,'ha')`);
const firstId = run(edge, 'jftState().live.cur.id');
const wrong = run(edge, 'jftState().live.opts.findIndex(x=>!x.ok)');
run(edge, `jftChoose(${wrong});jftAfterAnswer()`);
let reappeared = false;
for (let i = 0; i < 10; i++) {
  const state = run(edge, 'jftState().live');
  if (!state) break;
  if (state.break) { run(edge, 'jftContinue()'); continue; }
  if (state.cur && state.cur.id === firstId && state.cur.repeat) { reappeared = true; break; }
  const answer = run(edge, 'jftState().live.opts.findIndex(x=>x.ok)');
  run(edge, `jftChoose(${answer});jftAfterAnswer()`);
}
assert(reappeared, 'Missed answer was not requeued');
// Previous BAB session still live; discard without recording so Kanji Day start can proceed (jftStart no longer overwrites silently).
run(edge, `jftDiscardLive()`);
run(edge, `jftStart('j',1,'ha')`);
const chunkIds = [];
for (let i = 0; i < 7; i++) {
  chunkIds.push(run(edge, 'jftState().live.cur.id'));
  const answer = run(edge, 'jftState().live.opts.findIndex(x=>x.ok)');
  run(edge, `jftChoose(${answer});jftAfterAnswer()`);
}
assert(new Set(chunkIds).size === 7, 'Seven fresh questions in a block were not unique');
run(edge, `jftFlashStart('j',0)`);
assert(run(edge, 'JFT_FLASH.list.length') === 610, 'Global Kanji flashcards missing entries');

// Bunpou and verb quiz generators; every correct answer must exist in its options.
run(edge, 'jftBunQuizStart()');
assert(run(edge, 'JFT_BUN_Q.items.length === 10 && JFT_BUN_Q.items.every(x=>x.opts.includes(x.correct))'), 'Bunpou quiz generator failed');
run(edge, 'jftVerbQuizStart()');
assert(run(edge, 'JFT_VERB_Q.items.length === 10 && JFT_VERB_Q.items.every(x=>x.opts.some(o=>o.r===x.correct.r))'), 'Verb quiz generator failed');
assert(run(edge, 'JFTC.verbs.every(v=>JFTC.verbForms.every(f=>{var x=jftVerbForm(v,f[0]);return x&&x.w&&x.r}))'), 'One or more conjugations failed to generate');


// Accuracy and mastery formulas are separate, explicit percentages.
assert(run(c, 'jftPct(7,10) === 70 && jftPct(0,0) === 0'), 'Percentage helper formula failed');
const metricContext = makeContext();
run(metricContext, `jftStart('k',1,'ha')`);
const metricItem = run(metricContext, 'jftState().live.cur');
run(metricContext, `jftChoose(jftState().live.opts.findIndex(x=>x.ok));jftAfterAnswer()`);
const metricSnapshot = run(metricContext, `({unit:jftUnitStats('k',1),overall:jftOverallStats(),daily:jftDailyStats()})`);
assert(metricSnapshot.unit.attempts === 1 && metricSnapshot.unit.correct === 1 && metricSnapshot.unit.accuracy === 100, 'Unit accuracy calculation failed');
assert(metricSnapshot.daily.answers === 1 && metricSnapshot.daily.correct === 1 && metricSnapshot.daily.accuracy === 100, 'Daily accuracy calculation failed');
assert(metricSnapshot.overall.attempts === 1 && metricSnapshot.overall.accuracy === 100, 'Overall accuracy calculation failed');
// Wrong answers must stay in the denominator (one correct + one wrong = 50%).
const mixedAccuracy = makeContext();
run(mixedAccuracy, `var w=JFT_ITEMS.k[0];jftSetProgress(w,'ha',true);jftMarkActivity(w,1,true);jftSetProgress(w,'ha',false);jftMarkActivity(w,1,false)`);
const mixedMetrics = run(mixedAccuracy, `({unit:jftUnitStats('k',1),overall:jftOverallStats(),daily:jftDailyStats()})`);
assert(mixedMetrics.unit.accuracy === 50 && mixedMetrics.overall.accuracy === 50 && mixedMetrics.daily.accuracy === 50 && mixedMetrics.daily.wrong === 1, 'Incorrect answers were not included in accuracy denominator');

// Flashcard study time must never count as a quiz answer, correct answer, or daily Kanji target.
const flashContext = makeContext();
run(flashContext, `jftFlashStart('j',1);JFT_FLASH.lastAt=Date.now()-5000;jftFlashToggle();JFT_FLASH.lastAt=Date.now()-5000;jftFlashMove(1);JFT_FLASH.lastAt=Date.now()-5000;jftFlashShuffle();JFT_FLASH.lastAt=Date.now()-5000;jftFlashExit()`);
const flashMetrics = run(flashContext, `({day:jftDayLog(),unitSeconds:jftState().unitSeconds['j:1']||0})`);
assert(flashMetrics.day.quizAnswers === 0 && flashMetrics.day.quizCorrect === 0 && Object.keys(flashMetrics.day.kanji).length === 0, 'Flashcards incorrectly changed quiz accuracy or Kanji target');
assert(flashMetrics.day.seconds > 0 && flashMetrics.unitSeconds > 0, 'Flashcard study time was not recorded');
// Special assessments must appear in the global accuracy denominator exactly once.
const assessmentContext = makeContext();
run(assessmentContext, `jftBunQuizStart()`);
for (let i=0;i<10;i++) { const pick=run(assessmentContext, `JFT_BUN_Q.items[JFT_BUN_Q.i].opts.indexOf(JFT_BUN_Q.items[JFT_BUN_Q.i].correct)`); run(assessmentContext, `jftBunPick(${pick});jftBunNext()`); }
run(assessmentContext, `jftBunQuiz()`);
const assessmentMetrics = run(assessmentContext, `({overall:jftOverallStats(),daily:jftDailyStats(),sessions:jftState().sessions.length})`);
assert(assessmentMetrics.overall.attempts === 10 && assessmentMetrics.overall.correct === 10 && assessmentMetrics.overall.accuracy === 100, 'Assessment accuracy aggregation failed');
assert(assessmentMetrics.daily.answers === 10 && assessmentMetrics.daily.accuracy === 100 && assessmentMetrics.sessions === 1, 'Assessment daily/session recording failed');


// Verb assessment percentage and daily/global aggregation are verified as well.
const verbAssessment = makeContext();
run(verbAssessment, `jftVerbQuizStart()`);
for (let i=0;i<10;i++) { const pick=run(verbAssessment, `JFT_VERB_Q.items[JFT_VERB_Q.i].opts.findIndex(o=>o.r===JFT_VERB_Q.items[JFT_VERB_Q.i].correct.r)`); run(verbAssessment, `jftVerbPick(${pick});jftVerbNext()`); }
const verbResult = run(verbAssessment, `jftVerbQuiz()`);
assert(verbResult.includes('100%') && verbResult.includes('10 benar') && run(verbAssessment, `jftOverallStats().attempts===10 && jftOverallStats().correct===10`), 'Verb quiz result percentage or aggregation failed');
// Legacy completed assessments remain included when no new assessment counters exist yet.
const legacyAssessment = makeContext();
run(legacyAssessment, `jftState().sessions.push({id:'old-assessment',kind:'assessment',done:5,ok:4});jftDayLog()`);
assert(run(legacyAssessment, `jftOverallStats().attempts===5 && jftOverallStats().correct===4 && jftOverallStats().accuracy===80`), 'Legacy assessment history fallback failed');
// Legacy assessment sessions must remain counted alongside newly-accounted assessments, without duplication.
const mixedLegacyAssessment = makeContext();
run(mixedLegacyAssessment, `var oldT=new Date(2020,0,2,12).getTime();jftState().sessions.push({id:'legacy-old',kind:'assessment',done:5,ok:4,t:oldT});var today=jftDayKey();jftDayLog().assessmentAnswers=10;jftDayLog().assessmentCorrect=8;jftState().sessions.push({id:'new-accounted',kind:'assessment',accounted:true,done:10,ok:8,t:Date.now()})`);
assert(run(mixedLegacyAssessment, `jftOverallStats().attempts===15 && jftOverallStats().correct===12 && jftOverallStats().accuracy===80`), 'Mixed legacy/new assessment aggregation failed');

// Memory test answers are assessment answers, but remain distinct from learning mastery attempts.
const memoryAssessment = makeContext();
run(memoryAssessment, `jftState();JFT_ITEMS.k.slice(0,10).forEach(w=>{var m=jftValidModes(w)[0],p=S.jft.progress[w.id]=S.jft.progress[w.id]||{};p[m]={streak:3,correct:3,total:3,updatedAt:1}});jftMigrateLegacy();jftTestStart('k',10)`);
for (let i=0;i<10;i++) { run(memoryAssessment, `jftTestRun()`); const pick=run(memoryAssessment, `JFT_TEST.opts.findIndex(o=>o.ok)`); run(memoryAssessment, `jftTestPick(${pick});jftTestNext()`); }
run(memoryAssessment, `jftTestRun()`);
assert(run(memoryAssessment, `jftOverallStats().attempts===40 && jftOverallStats().correct===40 && jftDailyStats().answers===10`), 'Memory test was not included in assessment accuracy');

// Additive backup merge: preserve progress, daily sets, EXP, sessions and resumable state.
run(edge, `S.jft={progress:{jk0:{ha:{streak:1,correct:2,total:2,updatedAt:10}}},daily:{'2026-11-14':{seconds:30,answers:2,correct:2,kanji:{jj0:1},kotoba:{},exp:4}},sessions:[{id:'a',t:1,title:'A'}],exp:4,live:null,unitSeconds:{'j:1':30},completed:{'j:1':1},settings:{dailyKanji:10},tsum:30,tcnt:2}`);
run(edge, `mergeJftBackup({progress:{jk1:{ha:{streak:2,correct:2,total:3,updatedAt:20}}},daily:{'2026-11-14':{seconds:50,answers:3,correct:2,kanji:{jj1:1},kotoba:{jk1:1},exp:8}},sessions:[{id:'a',t:1,title:'A'},{id:'b',t:2,title:'B'}],exp:8,live:{title:'resume'},unitSeconds:{'j:1':50},completed:{'k:1':1},settings:{dailyKanji:20},tsum:50,tcnt:3})`);
assert(run(edge, `S.jft.progress.jk1.ha.streak === 2 && S.jft.sessions.length === 2 && S.jft.exp === 8 && !!S.jft.live && S.jft.daily['2026-11-14'].seconds === 50 && S.jft.daily['2026-11-14'].assessmentAnswers === 0`), 'JFT backup merge failed');



// Regression: a Kotoba Card event in the shared ledger is not added a second time as JFT quiz accuracy.
const noDoubleCount = makeContext();
const sharedOnlyItem = run(noDoubleCount, `JFT_ITEMS.k[0]`);
run(noDoubleCount, `sharedRecord('kotoba',JFT_ITEMS.k[0].jp,JFT_ITEMS.k[0].read,'h2a',true,'kotoba');sharedRecord('kotoba',JFT_ITEMS.k[0].jp,JFT_ITEMS.k[0].read,'h2a',false,'kotoba')`);
assert(run(noDoubleCount, `jftOverallStats().attempts===0 && jftOverallStats().correct===0`), 'Kotoba Card shared-ledger answers leaked into JFT-only accuracy');
run(noDoubleCount, `jftSetProgress(JFT_ITEMS.k[0],'ha',true)`);
assert(run(noDoubleCount, `jftOverallStats().attempts===1 && jftOverallStats().correct===1`), 'JFT-native answer was not counted exactly once');

// Regression: unified mastery is exactly 3 consecutive correct answers and resets on a miss.
const masteryRegression = makeContext();
run(masteryRegression, `sharedRecord('kotoba','食べる','たべる','kh',true,'kotoba');sharedRecord('kotoba','食べる','たべる','kh',true,'kotoba')`);
assert(run(masteryRegression, `sharedGet('kotoba','食べる','たべる','kh').mastery===2`), 'Mastery advanced before 3/3');
run(masteryRegression, `sharedRecord('kotoba','食べる','たべる','kh',false,'jft')`);
assert(run(masteryRegression, `sharedGet('kotoba','食べる','たべる','kh').mastery===0 && sharedGet('kotoba','食べる','たべる','kh').streak===0`), 'Wrong answer did not reset shared mastery');
run(masteryRegression, `sharedRecord('kotoba','食べる','たべる','kh',true,'kotoba');sharedRecord('kotoba','食べる','たべる','kh',true,'jft');sharedRecord('kotoba','食べる','たべる','kh',true,'kotoba')`);
assert(run(masteryRegression, `sharedGet('kotoba','食べる','たべる','kh').mastery===3`), '3/3 mastery did not activate');

// Regression: Bunpou and verb conjugation answers are stored at item/form level and attached to sessions.
const extraItems = makeContext();
run(extraItems, `jftBunQuizStart()`);
for(let i=0;i<10;i++){const p=run(extraItems,`JFT_BUN_Q.items[JFT_BUN_Q.i].opts.indexOf(JFT_BUN_Q.items[JFT_BUN_Q.i].correct)`);run(extraItems,`jftBunPick(${p});jftBunNext()`);}
run(extraItems, `jftBunQuiz()`);
assert(run(extraItems, `Object.keys(S.jft.extraProgress).some(k=>k.indexOf('bunpou|')===0) && S.jft.sessions[0].items.length===10`), 'Bunpou item/session progress missing');
run(extraItems, `jftVerbQuizStart()`);
for(let i=0;i<10;i++){const p=run(extraItems,`JFT_VERB_Q.items[JFT_VERB_Q.i].opts.findIndex(o=>o.r===JFT_VERB_Q.items[JFT_VERB_Q.i].correct.r)`);run(extraItems,`jftVerbPick(${p});jftVerbNext()`);}
run(extraItems, `jftVerbQuiz()`);
assert(run(extraItems, `Object.keys(S.jft.extraProgress).some(k=>k.indexOf('verb|')===0) && S.jft.sessions[0].items.length===10`), 'Verb form item/session progress missing');
assert(run(extraItems, `jftOverallStats().possible>jftUniqueItems('k').concat(jftUniqueItems('j')).reduce((n,w)=>n+jftValidModes(w).length,0) && jftOverallStats().items>jftUniqueItems('k').length+jftUniqueItems('j').length`), 'Extra-item mastery not reflected in overall mastery');


// Regression: backup merge carries Bunpou/verb item progress and deduplicates repeated event IDs.
const extraMerge = makeContext();
run(extraMerge, `jftState().extraProgress={'bunpou|N5|n5':{type:'bunpou',jp:'N5',read:'n5',forms:{meaning:{attempts:1,correct:1,streak:1,mastery:1,updatedAt:10,history:[{id:'event-1',ok:true,t:10}]}}}}`);
run(extraMerge, `mergeJftBackup({extraProgress:{'bunpou|N5|n5':{type:'bunpou',jp:'N5',read:'n5',forms:{meaning:{attempts:1,correct:1,streak:1,mastery:1,updatedAt:10,history:[{id:'event-1',ok:true,t:10}]}}}}})`);
assert(run(extraMerge, `S.jft.extraProgress['bunpou|N5|n5'].forms.meaning.history.length===1`), 'Extra item backup merge duplicated an existing event');

// All generated inline handlers in representative pages must be valid JavaScript.
const renderContext = makeContext();
const pages = {
  home: 'jftHome()', units: "(JFT_TAB='kanji',jftUnits())", unit: "(JFT_KIND='j',JFT_DAY=1,jftUnitView())",
  flash: "(jftFlashStart('j',0),jftFlashView())", bun: 'jftBunView()', verb: 'jftVerbView()', streak: 'jftStreakView()', rules: 'jftVerbRules()'
};
for (const [name, expr] of Object.entries(pages)) {
  const markup = run(renderContext, expr);
  const handlers = [...markup.matchAll(/onclick="([^"]*)"/g)].map(m => m[1]);
  handlers.forEach(code => new vm.Script(`(function(){${code}})`, { filename: `${name}.onclick.js` }));
}

assert(html.includes('jft:jft') && html.includes('jft:v.jft||null') && html.includes('mergeJftBackup(v.jft)'), 'Backup/restore hooks for JFT are missing');
assert(html.includes('KEY="kotobaCard.v1"') && html.includes('SCHEMA=5'), 'Legacy storage compatibility changed');
console.log('PASS: curriculum, sessions, reinforcement, chunks, flashcards, Bunpou/verb item progress, 3/3 mastery/reset, no-double-count shared ledger, percentage formulas, daily/unit/overall accuracy, flashcard score exclusion, assessment aggregation, legacy/new session reconciliation, backup merge/idempotency, handlers, PWA asset/version consistency, and legacy storage compatibility.');

require('./runtime-stat-smoke.cjs');
