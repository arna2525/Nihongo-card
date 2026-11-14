'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=html.match(/var JFT_ROW=\{[\s\S]*?function jftVerbForm\(v,k\)\{[\s\S]*?\}\n/);
const data=html.match(/"verbs":(\[[\s\S]*?\])\};/);
if(!fn||!data)throw new Error('conjugation source/dataset not found');
const verbs=JSON.parse(data[1]),ctx={};vm.createContext(ctx);vm.runInContext(fn[0]+';this.jftVerbForm=jftVerbForm;',ctx);
const forms=['masu','tai','te','jisho','nai','ta','pot','vol','imp','pro','ba','pas','cau'];let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS',name)}catch(e){fail++;console.log('FAIL',name,'-',e.message)}}
function assert(x,m){if(!x)throw new Error(m||'assertion failed')}
check('All 49 verbs generate all 13 forms without empty/undefined output',()=>{
 assert(verbs.length===49,'expected 49 verbs');let count=0;
 for(const v of verbs)for(const k of forms){const x=ctx.jftVerbForm(v,k);assert(x&&x.w&&x.r,'empty form '+v[0]+' '+k);assert(!/undefined|null/.test(x.w+x.r),'invalid string '+v[0]+' '+k);count++}
 assert(count===637,'expected 637 generated forms');
});
check('Godan irregular 行く keeps 行って / 行った',()=>{
 const v=verbs.find(x=>x[0]==='行く');assert(ctx.jftVerbForm(v,'te').w==='行って');assert(ctx.jftVerbForm(v,'ta').w==='行った');
});
check('Ichidan and irregular conjugations match key reference examples',()=>{
 const pick=n=>verbs.find(x=>x[0]===n);
 assert(ctx.jftVerbForm(pick('食べる'),'nai').w==='食べない');
 assert(ctx.jftVerbForm(pick('する'),'pot').w==='できる');
 assert(ctx.jftVerbForm(pick('来る'),'nai').w==='来ない');
 assert(ctx.jftVerbForm(pick('勉強する'),'masu').w==='勉強します');
});
console.log(`\nJFT content tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
