
const puppeteer = require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
const URL='https://thevalkdokk.github.io/sheetlens/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fresh(b){ const p=await b.newPage(); await p.setViewport({width:1280,height:900}); await p.goto(URL,{waitUntil:'networkidle2',timeout:60000}); return p; }
async function resultText(p){ return p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n')); }
(async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
 const out={};
 // ---- R9 refusals
 for (const f of ['pk_text.xlsx','short_bytes.xlsx','empty.xlsx']){
   const p=await fresh(b);
   const inp=await p.$('#file'); await inp.uploadFile(DIR+f); await sleep(1800);
   const txt=await resultText(p);
   const alert=await p.evaluate(()=>{const e=document.querySelector('[role=alert],.err,.error');return e?e.innerText.trim():null;});
   out['R9_'+f]={alert, snippet: txt.slice(txt.indexOf('Choose a file')>0?txt.indexOf('Choose a file'):0, txt.indexOf('Choose a file')+700)};
   await p.screenshot({path:DIR+'r9-'+f+'.png'});
   await p.close();
 }
 // ---- R8 mobile
 const m=await fresh(b); await m.setViewport({width:380,height:800}); await sleep(600);
 out.R8_load_scrollW = await m.evaluate(()=>document.documentElement.scrollWidth);
 // tab from load
 let tabLog=[]; let reached=false;
 for(let i=0;i<12;i++){
   await m.keyboard.press('Tab'); await sleep(120);
   const a=await m.evaluate(()=>{const e=document.activeElement; if(!e)return 'none'; const t=(e.innerText||e.value||'').trim().slice(0,40); return e.tagName+'|'+(e.id||'')+'|'+t;});
   tabLog.push(a);
   if(/Choose a file/i.test(a)){ reached=true; break; }
 }
 out.R8_tabPath=tabLog; out.R8_tabReachedChooseFile=reached;
 await m.screenshot({path:DIR+'r8-380.png'});
 // demo at 380 and overview scroll
 const d=await fresh(b); await d.setViewport({width:380,height:800});
 for (const btn of await d.$$('button')) { if((await d.evaluate(e=>e.innerText.trim(),btn))==='Load demo workbook'){ await btn.click(); break; } }
 await sleep(2000); await d.click('#tab-overview'); await sleep(500);
 out.R8_overview_scrollW = await d.evaluate(()=>document.documentElement.scrollWidth);
 await d.screenshot({path:DIR+'r8-380-overview.png',fullPage:false});
 await d.close();
 // ---- perf
 const pf=await fresh(b);
 const t0=Date.now(); await (await pf.$('#file')).uploadFile(DIR+'perf20k.xlsx');
 let busy=false, samples=[];
 for(let i=0;i<60;i++){
   const st=await pf.evaluate(()=>({txt:document.body.innerText, busy:!!document.querySelector('[aria-busy=true],[class*=busy],[class*=spinner],[class*=loading],.progress')}));
   if(st.busy||/parsing|reading|loading|analys|working|please wait/i.test(st.txt)) busy=true;
   if(st.txt.includes('Workbook summary')) { samples.push({ms:Date.now()-t0, i}); break; }
   await sleep(50);
 }
 out.PERF= {elapsedMs: samples[0]?samples[0].ms:null, busySeen:busy};
 await pf.screenshot({path:DIR+'perf-result.png'});
 await pf.close();
 console.log(JSON.stringify(out,null,1));
 await b.close();
})();
