
const puppeteer=require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
 const pf=await b.newPage(); await pf.setViewport({width:1280,height:900});
 await pf.goto('https://thevalkdokk.github.io/sheetlens/',{waitUntil:'networkidle2'});
 await pf.evaluate(()=>{
   window.__log={busy:[],start:null,end:null};
   const busyEl=()=>{const els=[...document.querySelectorAll('[aria-busy=true],[role=status],[class*=spinner],[class*=loading],[class*=busy],[class*=progress]')];
     const vis=els.filter(e=>e.offsetParent!==null||e.getClientRects().length);
     return vis.map(e=>e.tagName+'.'+e.className+' :: '+e.innerText.trim().slice(0,60));};
   const iv=setInterval(()=>{ if(window.__log.busy.length<3000) window.__log.busy.push({t:performance.now(),busy:busyEl(),txt:document.body.innerText.slice(0,200)}); },10);
   document.querySelector('#file').addEventListener('change',()=>{window.__log.start=performance.now();},{capture:true});
   const mo=new MutationObserver(()=>{ if(!window.__log.end && document.body.innerText.includes('Workbook summary')) window.__log.end=performance.now(); });
   mo.observe(document.body,{subtree:true,childList:true,characterData:true});
   window.__iv=iv;
 });
 await (await pf.$('#file')).uploadFile(DIR+'perf20k.xlsx');
 await sleep(4000);
 const log=await pf.evaluate(()=>{
   const l=window.__log; clearInterval(window.__iv);
   const busySamples=l.busy.filter(s=>s.busy.length>0);
   const cells=(document.body.innerText.match(/[\d,]+ cells/)||[])[0];
   return {durationMs:(l.end&&l.start)?l.end-l.start:null, busyCount:busySamples.length, firstBusy:busySamples[0]||null, cells,
     header:document.body.innerText.slice(0,160)};
 });
 console.log('PERF2',JSON.stringify(log,null,1));
 await pf.screenshot({path:DIR+'perf-20k.png'});
 await b.close();
})();
