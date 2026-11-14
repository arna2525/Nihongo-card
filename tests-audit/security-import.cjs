'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function e(s)'),end=html.indexOf('\n',start);
const backupStart=html.indexOf('function sStr(v,d)'),backupEnd=html.indexOf('function mergeWords(',backupStart);
if(start<0||backupStart<0||backupEnd<0)throw new Error('security source not found');
const c={SCHEMA:5,BKF:'kotoba-card-backup',CATS:[['verb','Verb'],['noun','Noun'],['iadj','i-adj'],['naadj','na-adj']],uid:(()=>{let n=0;return()=>`safe${++n}`})(),kfKey:(k,f)=>String(k||'').replace(/\s/g,'')+'|'+String(f||k||'').replace(/\s/g,''),walkF(a,fn,p,d){(a||[]).forEach(f=>{fn(f,p||null,d||0);(f.children||[]).forEach(ch=>fn(ch,f,(d||0)+1))})}};
vm.createContext(c);vm.runInContext(html.slice(start,end).trim()+'\n'+html.slice(backupStart,backupEnd),c);
let pass=0,fail=0;function check(n,fn){try{fn();pass++;console.log('PASS',n)}catch(e){fail++;console.log('FAIL',n,e.message)}}function assert(x,m){if(!x)throw Error(m)}
check('Imported HTML payloads are retained as text-safe data, not executable markup',()=>{
 const payload={format:'kotoba-card-backup',schema:5,data:{rootId:'r1',roots:[{id:'r1',name:'<img src=x onerror=alert(1)>',folders:[{id:'f1',name:'<svg onload=alert(1)>',words:[{id:'w1',k:'<script>alert(1)</script>',f:'<b>よみ</b>',a:'<img src=x onerror=alert(1)>'}]}]}]}};
 const out=c.bkValidate(JSON.stringify(payload));assert(out.ok===1,'hostile text backup rejected instead of safely encoding');
 const vals=[out.roots[0].name,out.roots[0].folders[0].name,out.roots[0].folders[0].words[0].k,out.roots[0].folders[0].words[0].f,out.roots[0].folders[0].words[0].a];
 vals.forEach(v=>assert(!/[<>]/.test(c.e(v)),'HTML delimiter survived escaping: '+v));
});
check('Imported IDs cannot break inline event-handler attributes',()=>{
 const p={format:'kotoba-card-backup',schema:5,data:{rootId:'r1\');alert(1);//',roots:[{id:'r1\');alert(1);//',name:'N',folders:[]}]}};
 assert(!!c.bkValidate(JSON.stringify(p)).err,'malicious root ID accepted');
});
check('All current innerHTML assignments are limited to renderer templates or escaped content',()=>{
 const matches=[...html.matchAll(/\.innerHTML\s*=\s*([^;\n]+)/g)].map(x=>x[1]);
 assert(matches.length===4,'unexpected innerHTML surface count '+matches.length);
 assert(matches.some(x=>x==='h'),'main page renderer assignment changed');
 assert(matches.some(x=>x==='kRows(f)'),'Kotoba list renderer assignment changed');
 assert(matches.some(x=>x.includes('e(l.w.k)')&&x.includes('e(l.w.a)')),'selection renderer does not escape user text');
});
console.log(`\nSecurity/import tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
