'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS',name)}catch(e){fail++;console.log('FAIL',name,'-',e.message)}}
function assert(x,m){if(!x)throw new Error(m||'assertion failed')}
const start=html.indexOf('function sStr(v,d)'),end=html.indexOf('function mergeWords(',start);
if(start<0||end<0)throw new Error('backup validation source not found');
const c={SCHEMA:5,BKF:'kotoba-card-backup',CATS:[['verb','Verb'],['noun','Noun'],['iadj','i-adj'],['naadj','na-adj']],uid:(()=>{let n=0;return()=>`gen${++n}`})(),kfKey:(k,f)=>String(k||'').replace(/\s/g,'')+'|'+String(f||k||'').replace(/\s/g,''),walkF(a,fn,p,d){(a||[]).forEach(f=>{fn(f,p||null,d||0);(f.children||[]).forEach(ch=>{fn(ch,f,(d||0)+1)})})}};
vm.createContext(c);vm.runInContext(html.slice(start,end),c,{timeout:10000});
check('Backup validation rejects prototype-pollution keys',()=>{
 const raw1='{"format":"kotoba-card-backup","schema":5,"data":{"rootId":"r1","roots":[{"id":"r1","name":"N","folders":[]}],"masteryQueue":{"__proto__":{"polluted":1}}}}';
 assert(!!c.bkValidate(raw1).err,'prototype-pollution key accepted');
 const raw='{"format":"kotoba-card-backup","schema":5,"data":{"rootId":"r1","roots":[{"id":"r1","name":"N","folders":[]}],"sharedProgress":{"items":{"__proto__":{"x":1}}}}}';
 assert(!!c.bkValidate(raw).err,'nested prototype-pollution key accepted');
});
check('Backup validation rejects executable or duplicate imported IDs',()=>{
 const base={format:'kotoba-card-backup',schema:5,data:{rootId:'r1',roots:[{id:'r1',name:'NIHONGO',folders:[{id:'f1',name:'BAB 1',words:[{id:"w1');alert(1);//",k:'猫',f:'ねこ',a:'kucing'}]}]}]}};
 const unsafe=c.bkValidate(JSON.stringify(base));assert(!!unsafe.err,'unsafe ID accepted');
 base.data.roots[0].folders[0].words[0].id='f1';const duplicate=c.bkValidate(JSON.stringify(base));assert(!!duplicate.err,'duplicate ID accepted');
});
check('Backup validation retains Mastery reinforcement queue and quiz scope',()=>{
 const payload={format:'kotoba-card-backup',schema:5,data:{rootId:'r1',roots:[{id:'r1',name:'NIHONGO',folders:[{id:'f1',name:'BAB 1',words:[{id:'w1',k:'猫',f:'ねこ',a:'kucing'}]}]}],masteryQueue:{k2h:{w1:1}},qScope:{byRoot:{r1:['f1']}},bold:true,auto:false,statMode:'k2h',statRange:7}};
 const out=c.bkValidate(JSON.stringify(payload));assert(out.ok===1,'backup rejected');assert(out.masteryQueue.k2h.w1===1,'Mastery queue dropped');assert(out.settings.qScope.byRoot.r1[0]==='f1','quiz scope dropped');assert(out.settings.bold===true&&out.settings.auto===false,'settings dropped');
});
const ms=html.indexOf('function mergeMasteryQueue('),me=html.indexOf('function mergeSharedBackup(',ms);if(ms<0||me<0)throw new Error('Mastery queue merge helper not found');
check('Backup merge maps queued Kotoba IDs to matching local IDs',()=>{
 const state={masteryQueue:{k2h:{old:1}},roots:[{folders:[{words:[{id:'new'}]}]}]};const x={S:state,wordLoc(id){return id==='new'?{}:null}};vm.createContext(x);vm.runInContext(html.slice(ms,me),x);x.mergeMasteryQueue({k2h:{old:1,missing:1},random:{old:1}},{old:'new'});assert(x.S.masteryQueue.k2h.new===1,'mapped item missing');assert(!x.S.masteryQueue.k2h.missing,'unknown item was imported');assert(x.S.masteryQueue.random.new===1,'other mode queue missing');
});
check('Restore Timpa carries validated Mastery queue into new state',()=>{
 assert(/masteryQueue:v\.masteryQueue\|\|\{\}/.test(html),'replace restore omits masteryQueue');
});

check('Restore Undo snapshot includes IndexedDB dictionary corrections',()=>{
 assert(/function bkUndoSnapshot\(\)\{return\{format:"kotoba-restore-undo",state:JSON\.parse\(JSON\.stringify\(S\)\),corrections:CORR\.slice\(\)\}\}/.test(html),'undo snapshot does not capture corrections');
 assert(/function bkWriteCorrections\(records\)/.test(html),'correction restore writer missing');
 assert(/CORR=corr\.slice\(\);bkWriteCorrections\(CORR\)/.test(html),'undo does not restore corrections to IndexedDB');
});
check('Restore Gabung marks a fresh installation as welcomed',()=>{
 assert(/S\.welcomed=1;mig\(\);msg="Restore \(gabung\) selesai/.test(html),'merge restore does not finish welcome state');
});
check('Backup rejects payloads larger than 20 MB before JSON parsing',()=>{
 const out=c.bkValidate(' '.repeat(20000001));assert(!!out.err&&/20 MB/.test(out.err),'oversized backup was not rejected');
});
check('Backup skips oversized imported Kotoba fields and caps correction payloads',()=>{
 const payload={format:'kotoba-card-backup',schema:5,data:{rootId:'r1',roots:[{id:'r1',name:'N',folders:[{id:'f1',name:'F',words:[{id:'w1',k:'猫',f:'ねこ',a:'x'.repeat(2001)},{id:'w2',k:'犬',f:'いぬ',a:'anjing'}]}]}]}};
 const out=c.bkValidate(JSON.stringify(payload));assert(out.ok===1&&out.counts.words===1&&out.counts.skip===1,'oversized word not skipped safely');
 const corrections=Array.from({length:10005},(_,i)=>({k:'k'+i,a:'a'}));payload.data.roots[0].folders[0].words=[];const wrapped={format:'kotoba-card-backup',schema:5,data:payload.data,corrections};const c2=c.bkValidate(JSON.stringify(wrapped));assert(c2.corr.length===10000,'correction cap not enforced');
});

console.log(`\nBackup state tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
