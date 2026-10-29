
const puppeteer=require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
 // qualified whole-column test
 let p=await b.newPage(); await p.setViewport({width:1280,height:900});
 await p.goto('https://thevalkdokk.github.io/sheetlens/',{waitUntil:'networkidle2'});
 await (await p.$('#file')).uploadFile(DIR+'qualified.xlsx'); await sleep(1800);
 await p.click('#tab-impact'); await sleep(400);
 let t=await p.evaluate(()=>document.body.innerText);
 console.log('QUALIFIED_REF_NOTICE?', /cannot trace/.test(t));
 // perf with instrumentation
 const pf=await b.newPage(); await pf.setViewport({width:1280,height:900});
 await pf.goto('https://thevalkdokk.github.io/sheetlens/',{waitUntil:'networkidle2'});
 await pf.evaluate(()=>{
   window.__log={busy:[],start:null,end:null};
   const snap=()=>{ const el=document.querySelector('[aria-busy=true],[class*=spinner],[class*=loading],[class*=busy],.notice,.warning');
     const txt=document.body.innerText;
     window.__log.busy.push({t:performance.now(), txt:/parsing|reading|analysing|analyzing|loading|please wait|working/i.test(txt), any:!!el}); };
   const iv=setInterval(snap,10);
   const inp=document.querySelector('#file');
   inp.addEventListener('change',()=>{window.__log.start=performance.now();},{capture:true});
   const mo=new MutationObserver(()=>{ if(!window.__log.end && document.body.innerText.includes('Workbook summary')) window.__log.end=performance.now(); });
   mo.observe(document.body,{subtree:true,childList:true,characterData:true});
   window.__iv=iv;
 });
 await (await pf.$('#file')).uploadFile(DIR+'perf20k.xlsx');
 await sleep(4000);
 const log=await pf.evaluate(()=>{
   const l=window.__log; clearInterval(window.__iv);
   const busySamples=l.busy.filter(s=>s.txt||s.any);
   const summary=document.body.innerText.match(/([\d,]+) cells/);
   return {start:l.start,end:l.end,durationMs:(l.end&&l.start)?l.end-l.start:null,
     busyCount:busySamples.length, firstBusy:busySamples[0]||null,
     cells:summary?summary[0]:null, samples:l.busy.length,
     header:document.body.innerText.slice(0,300)};
 });
 console.log('PERF', JSON.stringify(log,null,1));
 await pf.screenshot({path:DIR+'perf-instrumented.png'});
 await b.close();
})();
