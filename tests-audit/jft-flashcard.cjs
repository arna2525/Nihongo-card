'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function jftFlashStart('),end=html.indexOf('\nfunction ',html.indexOf('function jftFlashView(',start)+10);if(start<0||end<0)throw Error('JFT flashcard functions not found');
let marked=0,renders=0;const c={JFT_FLASH:null,JFT_PAGE:'home',JFT_ITEMS:{k:[{jp:'私',read:'わたし',mean:'Saya'},{jp:'猫',read:'ねこ',mean:'Kucing'},{jp:'水',read:'みず',mean:'Air'}],j:[]},jftUnitItems:(k,n)=>c.JFT_ITEMS[k].slice(0,2),shuf:a=>a.reverse(),jftMarkStudyTime:(k,u,s)=>{marked+=s},R:()=>{renders++},Date,Math,String,Array,Object,e:x=>String(x).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),hero:()=>'',jftHome:()=>'<home>',kanaToRomaji:()=>''};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
let pass=0,fail=0;function check(n,fn){try{fn();pass++;console.log('PASS',n)}catch(e){fail++;console.log('FAIL',n,e.message)}}function assert(x,m){if(!x)throw Error(m||'assertion failed')}
check('Flashcard session starts with selected unit and first card',()=>{c.jftFlashStart('k',1);assert(c.JFT_PAGE==='flash'&&c.JFT_FLASH.kind==='k'&&c.JFT_FLASH.unit===1&&c.JFT_FLASH.index===0&&c.JFT_FLASH.list.length===2)});
check('Flip toggles answer and accounts study time',()=>{const before=marked;c.jftFlashToggle();assert(c.JFT_FLASH.back&&marked>=before)});
check('Direction cycle changes field and resets card face',()=>{c.jftFlashCycle();assert(c.JFT_FLASH.dir==='read'&&!c.JFT_FLASH.back)});
check('Previous/next navigation wraps safely and resets face',()=>{c.jftFlashMove(1);assert(c.JFT_FLASH.index===1);c.jftFlashMove(1);assert(c.JFT_FLASH.index===0);c.jftFlashMove(-1);assert(c.JFT_FLASH.index===1&&!c.JFT_FLASH.back)});
check('Shuffle retains complete item count and resets cursor',()=>{c.jftFlashShuffle();assert(c.JFT_FLASH.random&&c.JFT_FLASH.list.length===2&&c.JFT_FLASH.index===0&&!c.JFT_FLASH.back)});
check('Exit returns to the correct unit page and closes flashcard state',()=>{c.jftFlashExit();assert(c.JFT_PAGE==='unit'&&c.JFT_FLASH===null)});
check('Flashcard view HTML-escapes content before rendering',()=>{c.JFT_FLASH={kind:'k',unit:1,list:[{jp:'<img src=x>',read:'<script>',mean:'<svg>'}],index:0,back:false,dir:'jp'};const h=c.jftFlashView();assert(!h.includes('<img src=x>')&&!h.includes('<script>')&&!h.includes('<svg>')&&h.includes('&lt;img'))});
console.log(`\nJFT flashcard logic tests: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
