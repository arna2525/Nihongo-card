const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const start=html.indexOf('function vStatBase(){'),end=html.indexOf('\nload();mig();',start);
const code=html.slice(start,end);
const ctx={console,Math,Date,JSON,Array,Object,String,Number,Set,Map,Intl,
 S:{statMode:'random',statRange:7,st:{},studySessions:[],jft:{progress:{},daily:{},sessions:[],exp:0,unitSeconds:{},completed:{},settings:{dailyKanji:10}}},
 allF:()=>[{id:'f1',name:'Folder A',words:[{id:'w1',jp:'私',f:'わたし',a:'saya'}]}],
 today:()=>Math.floor(Date.now()/86400000),e:x=>String(x??'').replace(/[&<>"']/g,''),fm:s=>Math.round((+s||0)/60)+'m',
 masteryEligible:a=>a,qValidPattern:()=>true,masteryValue:(id)=>id==='w1'?3:0,reviewStore:()=>({}),QM:[['random','Random']],
 KC_MORE:false,KC_ICO:{sakura:'',chart:'',flame:'',bars:'',target:'',sync:'',arrow:'',tick:''},kcRing:()=>'<svg/>',
 document:{getElementById:()=>null},window:{matchMedia:()=>({matches:true})},setTimeout:()=>{},R:()=>{},save:()=>{},
};
vm.createContext(ctx);
ctx.wordLoc=(id)=>{for(const f of ctx.allF())for(const w of f.words||[])if(w.id===id)return {f,w};return null};
const sharedStart=html.indexOf('function sharedLedger()'),sharedEnd=html.indexOf('/* __TEST_SHARED_END__ */',sharedStart);
vm.runInContext(html.slice(sharedStart,sharedEnd),ctx,{timeout:30000});
const realMasteryValue=ctx.masteryValue;
const jftStart=html.indexOf('var JFTC='),jftEnd=html.indexOf('function jftNav',jftStart);
vm.runInContext(html.slice(jftStart,jftEnd),ctx,{timeout:30000});
vm.runInContext(code,ctx,{timeout:30000});
// Simulate mixed KC + JFT progress.
vm.runInContext(`var d=jftDayLog();d.seconds=120;d.quizAnswers=2;d.quizCorrect=1;var w=JFT_ITEMS.k[0];jftSetProgress(w,'ha',true);jftMarkActivity(w,5,true);jftSetProgress(w,'ha',false);jftMarkActivity(w,5,false);var w2=JFT_ITEMS.k[1];jftSetProgress(w2,'ha',true);jftMarkActivity(w2,5,true);jftSetProgress(w2,'ha',true);jftMarkActivity(w2,5,true);jftState().sessions.push({id:'today-unit',kind:'k',done:10,ok:8,no:2,accuracy:80,seconds:60,t:Date.now()});`,ctx,{timeout:30000});
const out=vm.runInContext('vStatBase()',ctx,{timeout:30000});
if(!out.includes('Total Learning Items')||!out.includes('Quiz Accuracy')||!out.includes('Mastered Directions')||!out.includes('Combined session accuracy trend')||!out.includes('Mastery Run')) throw new Error('Unified dashboard did not render expected metrics');
console.log('PASS runtime unified statistics render:',out.length,'chars');

// A Kotoba Card word matching a JFT Kotoba record must be one canonical learning item, not two.
ctx.allF=()=>[{id:'overlap-folder',name:'Overlap',words:[{id:'kc-overlap',k:ctx.JFT_ITEMS.k[0].jp,f:ctx.JFT_ITEMS.k[0].read,a:ctx.JFT_ITEMS.k[0].mean}]}];
ctx.masteryValue=()=>0;
const dedupOut=vm.runInContext('vStatBase()',ctx,{timeout:30000});
const itemMatch=dedupOut.match(/Total Learning Items<\/span><b>([\d,]+)/);
const expectedUnique=ctx.JFT_ITEMS.k.length+ctx.JFT_ITEMS.j.length;
const canonicalCount=new Set([...ctx.JFT_ITEMS.k.map(w=>'kotoba|'+w.jp.normalize('NFKC').replace(/\s+/g,'')+'|'+w.read.normalize('NFKC').replace(/\s+/g,'')),...ctx.JFT_ITEMS.j.map(w=>'kanji|'+w.jp.normalize('NFKC').replace(/\s+/g,'')+'|'+w.read.normalize('NFKC').replace(/\s+/g,''))]).size; if(!itemMatch||Number(itemMatch[1].replace(/,/g,''))!==canonicalCount) throw new Error('Overlapping Kotoba Card/JFT curriculum item was counted twice');
console.log('PASS canonical item deduplication:',canonicalCount,'unique items');
ctx.masteryValue=realMasteryValue;
// Bidirectional progress is merged into the same item/direction, not copied as duplicate items.
const sharedItem=ctx.JFT_ITEMS.k[0];
ctx.jftSetProgress(sharedItem,'ha',true);
ctx.jftSetProgress(sharedItem,'ha',true);
ctx.jftSetProgress(sharedItem,'ha',true);
const fromJft=ctx.jftProgress(sharedItem,'ha');
if(fromJft.total<2||fromJft.correct<2||!ctx.jftMastered(sharedItem,'ha')||ctx.masteryValue('kc-overlap','h2a')<3) throw new Error('JFT-to-Kotoba Card shared progress sync failed');
ctx.sharedRecord('kotoba',sharedItem.jp,sharedItem.read,'h2a',true,'kotoba');
if(ctx.jftProgress(sharedItem,'ha').total<4||ctx.masteryValue('kc-overlap','h2a')<3) throw new Error('Kotoba Card-to-JFT shared progress sync failed');
console.log('PASS bidirectional shared progress: JFT ↔ Kotoba Card');

// Flashcard flip is a pure reveal; rating records SRS only, never quiz accuracy/mastery.
const fcStart=html.indexOf('function flipC()'),fcEnd=html.indexOf('function startL(',fcStart);
const fcNodes={in:{classList:{toggle:(x)=>{fcNodes.in.flipped=x}}},ev:{classList:{add:(x)=>{fcNodes.ev.visible=x}}}};
let fcStats=[],fcPerf=0;
ctx.document={getElementById:id=>fcNodes[id]||null};
ctx.L={q:['card-1'],cram:false};
ctx.learnPool=()=>[{id:'card-1',k:'日本',f:'にほん',a:'Jepang'}];
ctx.stat=(k,ok)=>fcStats.push([k,ok]);ctx.perfUpd=()=>fcPerf++;ctx.sr=()=>({ivl:2,ease:2.5});ctx.today=()=>10;ctx.save=()=>{};ctx.R=()=>{};
vm.runInContext(html.slice(fcStart,fcEnd),ctx,{timeout:30000});
ctx.flipC();
if(fcNodes.in.flipped!=='f'||fcNodes.ev.visible!=='show'||fcStats.length) throw new Error('Flashcard flip must reveal only');
ctx.L={q:['card-1'],cram:false};ctx.rate(2);
if(fcStats.length!==1||fcStats[0][0]!=='r'||fcPerf!==1||ctx.L.q.length!==0) throw new Error('Flashcard rating must update review only, not quiz answers');
console.log('PASS flashcard flip/review separation');

// Backup merge keeps the greater counter and does not replay the same backup twice.
const mbStart=html.indexOf('function mergeSharedBackup('),mbEnd=html.indexOf('function bkApply(',mbStart);
vm.runInContext(html.slice(mbStart,mbEnd),ctx,{timeout:30000});
const mergeKey='kotoba|'+sharedItem.jp.normalize('NFKC').replace(/\s+/g,'')+'|'+sharedItem.read.normalize('NFKC').replace(/\s+/g,'');
const priorAttempts=ctx.sharedGet('kotoba',sharedItem.jp,sharedItem.read,'h2a').attempts;
ctx.mergeSharedBackup({items:{[mergeKey]:{type:'kotoba',jp:sharedItem.jp,read:sharedItem.read,dirs:{h2a:{attempts:1,correct:1,streak:1,mastery:1,updatedAt:1,sources:{jft:1}}}}}});
if(ctx.sharedGet('kotoba',sharedItem.jp,sharedItem.read,'h2a').attempts!==priorAttempts) throw new Error('Shared ledger backup merge double-counted an existing backup');
console.log('PASS shared ledger backup merge');



