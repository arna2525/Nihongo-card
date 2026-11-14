const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function assert(c,m){if(!c)throw new Error('FAIL: '+m)}
function mk(){const c={console,Math,Date,JSON,Array,Object,String,Number,Set,Map,Intl,S:{},e:x=>String(x??''),hero:()=>'',vStatBase:()=>'',R(){},save(){},shuf:a=>a.slice(),uid:()=>Math.random().toString(36).slice(2),vLearnLegacy:()=>'',dlg(){},document:{},window:{},QM:[]};
vm.createContext(c);c.wordLoc=()=>null;
vm.runInContext(html.slice(html.indexOf('function sharedLedger()'),html.indexOf('/* __TEST_SHARED_END__ */',html.indexOf('function sharedLedger()'))),c);
vm.runInContext(html.slice(html.lastIndexOf('var JFTC='),html.lastIndexOf('</script>')),c);return c}
const R=(c,s)=>vm.runInContext(s,c);
let n=0;const ok=(c,m)=>{assert(c,m);n++};
// A: legacy-only (pre-build11 user) migrates exactly
let c=mk();R(c,`S.jft={progress:{jk0:{ha:{streak:2,correct:4,total:5,updatedAt:100}}},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}}`);
let w=R(c,`JFT_BY.jk0`);const m1=R(c,`jftMigrateLegacy()`);
let p=R(c,`jftProgress(JFT_BY.jk0,'ha')`);
ok(p.total===5&&p.correct===4&&p.streak===2,'A legacy exact '+JSON.stringify(p));ok(m1.attemptsAdded===5&&m1.ambiguous===0,'A report');
// B: idempotent rerun
R(c,`jftMigrateLegacy();jftMigrateLegacy()`);p=R(c,`jftProgress(JFT_BY.jk0,'ha')`);
ok(p.total===5&&p.correct===4,'B rerun idempotent');
// C: new answer writes ledger only; legacy store frozen
R(c,`jftSetProgress(JFT_BY.jk0,'ha',true,'ev1');jftSetProgress(JFT_BY.jk0,'ha',true,'ev1')`);
p=R(c,`jftProgress(JFT_BY.jk0,'ha')`);ok(p.total===6&&p.correct===5&&p.streak===3,'C one event counted once '+JSON.stringify(p));
ok(R(c,`S.jft.progress.jk0.ha.total`)===5,'C legacy store not written');
R(c,`jftMigrateLegacy()`);ok(R(c,`jftProgress(JFT_BY.jk0,'ha').total`)===6,'C migration after new answers must not roll back or re-add');
ok(R(c,`jftMastered(JFT_BY.jk0,'ha')`),'C mastered at 3 streak');
// D: build-11 user: legacy and ledger both populated (written together) -> no double count
c=mk();R(c,`S.jft={progress:{},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};var w=JFT_BY.jk1;S.jft.progress.jk1={ha:{streak:0,correct:0,total:0}};`);
R(c,`for(var i=0;i<4;i++){var o=i!==2;var s=S.jft.progress.jk1.ha;s.total++;if(o){s.correct++;s.streak++}else s.streak=0;s.updatedAt=10+i;sharedRecord('kotoba',w.jp,w.read,'h2a',o,'jft')}`);
R(c,`Object.keys(sharedLedger()).forEach(function(k){Object.keys(sharedLedger()[k].dirs).forEach(function(d){delete sharedLedger()[k].dirs[d].srcOk})})`);
const before=JSON.stringify(R(c,`sharedGet('kotoba',JFT_BY.jk1.jp,JFT_BY.jk1.read,'h2a')`));
const m2=R(c,`jftMigrateLegacy()`);const after=R(c,`sharedGet('kotoba',JFT_BY.jk1.jp,JFT_BY.jk1.read,'h2a')`);
ok(after.attempts===4&&after.correct===3&&m2.attemptsAdded===0,'D build11 data not doubled '+JSON.stringify(after));
p=R(c,`jftProgress(JFT_BY.jk1,'ha')`);ok(p.total===4&&p.correct===3,'D jft view exact '+JSON.stringify(p));
// E: Kotoba Card attempts on same item do not enter JFT-only totals but share streak/mastery
R(c,`sharedRecord('kotoba',JFT_BY.jk1.jp,JFT_BY.jk1.read,'h2a',true,'kotoba','kc1');sharedRecord('kotoba',JFT_BY.jk1.jp,JFT_BY.jk1.read,'h2a',true,'kotoba','kc2')`);
p=R(c,`jftProgress(JFT_BY.jk1,'ha')`);ok(p.total===4&&p.correct===3,'E kotoba attempts excluded from jft totals');
ok(p.streak===3&&R(c,`jftMastered(JFT_BY.jk1,'ha')`),'E streak shared across apps (one brain)');
// F: partial overlap -> flagged ambiguous, jft-sourced figures exact, invariants hold
c=mk();R(c,`S.jft={progress:{jk2:{ha:{streak:1,correct:5,total:8,updatedAt:50}}},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};var w=JFT_BY.jk2;sharedRecord('kotoba',w.jp,w.read,'h2a',true,'jft');sharedRecord('kotoba',w.jp,w.read,'h2a',true,'jft')`);
R(c,`Object.keys(sharedLedger()).forEach(function(k){Object.keys(sharedLedger()[k].dirs).forEach(function(d){delete sharedLedger()[k].dirs[d].srcOk})})`);
const m3=R(c,`jftMigrateLegacy()`);p=R(c,`jftProgress(JFT_BY.jk2,'ha')`);const q=R(c,`sharedGet('kotoba',JFT_BY.jk2.jp,JFT_BY.jk2.read,'h2a')`);
ok(m3.ambiguous>=1,'F ambiguity reported');ok(p.total===8&&p.correct===5,'F jft figures exact '+JSON.stringify(p));
ok(q.attempts===8&&q.correct<=q.attempts&&q.correct>=0,'F ledger invariants '+JSON.stringify(q));
// G: global invariants over whole ledger after heavy random use
c=mk();R(c,`S.jft={progress:{},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}}`);
R(c,`var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}for(var i=0;i<4000;i++){var w=JFT_ITEMS.k[Math.floor(rnd()*300)],m=jftValidModes(w);jftSetProgress(w,m[Math.floor(rnd()*m.length)],rnd()<.6,'g'+i)}`);
const inv=R(c,`(function(){var bad=0,led=sharedLedger();Object.keys(led).forEach(function(k){Object.keys(led[k].dirs).forEach(function(d){var x=led[k].dirs[d];if(x.correct>x.attempts||x.correct<0||x.mastery>3||x.mastery>x.streak||x.srcOk.jft>x.sources.jft)bad++})});return bad})()`);
ok(inv===0,'G invariants violated: '+inv);
const st=R(c,`jftOverallStats()`);ok(st.attempts===4000&&st.correct<=st.attempts&&st.accuracy<=100&&st.mastered<=st.possible,'G overall stats '+JSON.stringify(st));
ok(R(c,`Object.keys(S.jft.progress).length`)===0,'G legacy store untouched');
console.log('PASS unified brain: '+n+' checks');
