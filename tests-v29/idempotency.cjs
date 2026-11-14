const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function assert(c,m){if(!c)throw new Error('FAIL: '+m)}
const ctx={console,Math,Date,JSON,Array,Object,String,Number,Set,Map,S:{},save(){},uid:()=>Math.random().toString(36).slice(2),wordLoc:()=>null,QM:[]};
vm.createContext(ctx);
const a=html.indexOf('function sharedLedger()'),b=html.indexOf('/* __TEST_SHARED_END__ */',a);
vm.runInContext(html.slice(a,b),ctx);
const run=c=>vm.runInContext(c,ctx);
const mi=html.indexOf('function mergeSharedBackup(');assert(mi>0,'mergeSharedBackup missing');const me=html.indexOf('\nfunction ',mi+10);vm.runInContext(html.slice(mi,me>0?me:mi+4000),ctx);
// 1 event applied once
run(`sharedRecord('kotoba','猫','ねこ','k2a',true,'kotoba','e1')`);
run(`sharedRecord('kotoba','猫','ねこ','k2a',true,'kotoba','e1')`);
let q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);
assert(q.attempts===1&&q.correct===1&&q.streak===1,'duplicate event double-counted: '+JSON.stringify(q));
// 2 distinct events count
run(`sharedRecord('kotoba','猫','ねこ','k2a',true,'kotoba','e2');sharedRecord('kotoba','猫','ねこ','k2a',true,'kotoba','e3')`);
q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);assert(q.attempts===3&&q.mastery===3,'3/3 mastery');
// 3 wrong resets
run(`sharedRecord('kotoba','猫','ねこ','k2a',false,'kotoba','e4')`);
q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);assert(q.mastery===0&&q.streak===0&&q.attempts===4&&q.correct===3,'reset on wrong');
// 4 replaying wrong event doesn't change
run(`sharedRecord('kotoba','猫','ねこ','k2a',false,'kotoba','e4')`);
q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);assert(q.attempts===4,'replayed wrong event counted');
// 5 NFKC/space identity
run(`sharedRecord('kotoba','猫 ','ねこ','k2a',true,'jft','e5')`);
assert(run(`sharedGet('kotoba','猫','ねこ','k2a')`).attempts===5,'normalized identity');
// 6 merge same backup twice is idempotent, events unioned
const snap=JSON.stringify(run(`S.sharedProgress`));
run(`mergeSharedBackup(JSON.parse(${JSON.stringify(snap)}));mergeSharedBackup(JSON.parse(${JSON.stringify(snap)}))`);
q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);assert(q.attempts===5&&q.correct===4,'merge same backup changed counts');
assert(run(`sharedEventSeen('e5')`),'events not preserved');
// 7 merge keeps mastery <= streak
run(`mergeSharedBackup({items:{'kotoba|猫|ねこ':{type:'kotoba',jp:'猫',read:'ねこ',dirs:{k2a:{attempts:9,correct:9,streak:0,mastery:3,updatedAt:1}}}}})`);
q=run(`sharedGet('kotoba','猫','ねこ','k2a')`);assert(q.mastery===Math.min(3,q.streak),'mastery inconsistent with streak after merge');
// 8 no event id still records (legacy path)
run(`sharedRecord('kanji','山','やま','k2h',true,'jft')`);run(`sharedRecord('kanji','山','やま','k2h',true,'jft')`);
assert(run(`sharedGet('kanji','山','やま','k2h')`).attempts===2,'legacy no-id path');
console.log('PASS idempotency: 8 checks');
