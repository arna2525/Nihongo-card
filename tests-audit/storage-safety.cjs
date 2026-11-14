'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('var SAVE_BASE=null'),end=html.indexOf('function cur()',start);
if(start<0||end<0)throw new Error('save implementation source not found');
const src=html.slice(start,end);let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS',name)}catch(e){fail++;console.log('FAIL',name,'-',e.message)}}
function assert(x,m){if(!x)throw new Error(m||'assertion failed')}
function context(initial,initializeBase=true){let raw=JSON.stringify(initial),toastMsg='',storageHandler=null,failWrites=false;
 const c={S:JSON.parse(raw),Q:null,L:null,KEY:'kotobaCard.v1',SAVE_BASE:JSON.parse(raw),SAVE_WARN_AT:0,
  localStorage:{getItem(k){return k==='kotobaCard.v1'?raw:null},setItem(k,v){if(failWrites&&k==='kotobaCard.v1'){let e=new Error('quota');e.name='QuotaExceededError';throw e}if(k==='kotobaCard.v1')raw=v}},
  window:{addEventListener(k,fn){if(k==='storage')storageHandler=fn}},Date,JSON,Object,Array,console,
  toast(m){toastMsg=m},mirrorSoon(){},mig(){},dirty(){return false},fixAct(){},applyFont(){},R(){}};
 vm.createContext(c);vm.runInContext(src,c,{timeout:10000});if(initializeBase)c.SAVE_BASE=JSON.parse(raw);
 return {c,get raw(){return raw},set raw(v){raw=v},get toast(){return toastMsg},get handler(){return storageHandler},fail(v){failWrites=v}};
}
const base={font:'std',roots:[{id:'r1',folders:[]}],jft:{progress:{},live:null},studySessions:[]};
check('Initial load snapshots a merge base before the first save',()=>{
 const x=context(base,false);vm.runInContext('load()',x.c);assert(x.c.SAVE_BASE&&x.c.SAVE_BASE.roots,'load did not capture baseline');
 const remote=JSON.parse(JSON.stringify(base));remote.jft.progress.jk0={total:4,correct:3};x.raw=JSON.stringify(remote);x.c.S.font='min';vm.runInContext('save()',x.c);
 const out=JSON.parse(x.raw);assert(out.font==='min','local first edit lost');assert(out.jft.progress.jk0.total===4,'remote progress overwritten on first save');
});
check('Stale tab save preserves progress written by another tab',()=>{
 const x=context(base),remote=JSON.parse(JSON.stringify(base));remote.jft.progress.jk1={total:3,correct:2};x.raw=JSON.stringify(remote);x.c.S.font='big';vm.runInContext('save()',x.c);
 const out=JSON.parse(x.raw);assert(out.font==='big','local preference lost');assert(out.jft.progress.jk1.total===3,'other tab progress overwritten');
});
check('Storage event merges remote progress without discarding local preference',()=>{
 const x=context(base),remote=JSON.parse(JSON.stringify(base));remote.jft.progress.jk2={total:2,correct:1};x.c.S.font='min';x.raw=JSON.stringify(remote);x.handler({key:'kotobaCard.v1',newValue:JSON.stringify(remote)});
 assert(x.c.S.font==='min','local change lost');assert(x.c.S.jft.progress.jk2.total===2,'remote progress missing');
 vm.runInContext('save()',x.c);const out=JSON.parse(x.raw);assert(out.font==='min'&&out.jft.progress.jk2.total===2,'merged state not persisted');
});
check('QuotaExceededError displays a visible save warning',()=>{
 const x=context(base);x.fail(true);vm.runInContext('S.font="big";save()',x.c);assert(/penyimpanan|simpan/i.test(x.toast),'no user-facing storage warning');
});
check('REGRESSION Build17: key absent from merge base (lazy jftState) must not wipe remote jft live/progress/exp',()=>{
 const lean={font:'std',roots:[{id:'r1',folders:[]}],studySessions:[]};
 const x=context(lean);
 const remote=JSON.parse(JSON.stringify(lean));remote.jft={progress:{jk1:{total:3,correct:2}},daily:{},sessions:[],exp:30,live:{done:3,sessionId:'s1'},unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};
 x.raw=JSON.stringify(remote);
 /* this tab lazily creates empty defaults (as jftState() does) and then saves an unrelated change */
 x.c.S.jft={progress:{},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};x.c.S.font='big';
 vm.runInContext('save()',x.c);const out=JSON.parse(x.raw);
 assert(out.font==='big','local preference lost');assert(out.jft.live&&out.jft.live.done===3,'remote live session wiped');assert(out.jft.progress.jk1&&out.jft.progress.jk1.total===3,'remote progress wiped');assert(out.jft.exp===30,'remote EXP wiped');
});
check('REGRESSION Build17: storage event keeps remote jft when local only has lazy empty defaults',()=>{
 const lean={font:'std',roots:[{id:'r1',folders:[]}],studySessions:[]};
 const x=context(lean);x.c.S.jft={progress:{},daily:{},sessions:[],exp:0,live:null,unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};
 const remote=JSON.parse(JSON.stringify(lean));remote.jft={progress:{jk2:{total:2,correct:1}},daily:{},sessions:[],exp:12,live:{done:2},unitSeconds:{},completed:{},quote:0,settings:{dailyKanji:10}};
 x.raw=JSON.stringify(remote);x.handler({key:'kotobaCard.v1',newValue:JSON.stringify(remote)});
 assert(x.c.S.jft.live&&x.c.S.jft.live.done===2,'remote live lost in event merge');assert(x.c.S.jft.exp===12,'remote exp lost in event merge');
});
console.log(`\nStorage safety tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
