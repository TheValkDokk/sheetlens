
const puppeteer = require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
(async () => {
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({width:1280,height:1000});
  await p.goto('https://thevalkdokk.github.io/sheetlens/', {waitUntil:'networkidle2', timeout:60000});
  for (const btn of await p.$$('button')) { if ((await p.evaluate(e=>e.innerText.trim(),btn))==='Load demo workbook'){ await btn.click(); break; } }
  await new Promise(r=>setTimeout(r,2500));
  // caveat search across all tabs
  await p.click('#tab-overview'); await new Promise(r=>setTimeout(r,500));
  const overview = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n'));
  console.log('---OVERVIEW---\n'+overview.slice(0,1800));
  const caveat = overview.toLowerCase().match(/untraceab|whole.column|entire column|limitation|not traced/);
  console.log('CAVEAT_IN_OVERVIEW:', caveat? caveat[0]:'NONE');
  await p.click('#tab-impact'); await new Promise(r=>setTimeout(r,400));
  async function trace(val){
    await p.click('#impactor',{clickCount:3});
    await p.evaluate(()=>document.querySelector('#impactor').value='');
    await p.type('#impactor', val);
    const tb=[...await p.$$('button')];
    for(const t of tb){ if((await p.evaluate(e=>e.innerText.trim(),t))==='Trace'){ await t.click(); break; } }
    await new Promise(r=>setTimeout(r,900));
    const out = await p.evaluate(()=>{ const m=document.querySelector('main')||document.body; return m.innerText.replace(/\n{2,}/g,'\n'); });
    const idx = out.indexOf('Cell to test');
    return out.slice(idx).slice(0,1200);
  }
  console.log('---TRACE model!b4---\n'+await trace('model!b4'));
  await p.screenshot({path:DIR+'r5-lowercase.png'});
  console.log('---TRACE Nope!B4---\n'+await trace('Nope!B4'));
  await p.screenshot({path:DIR+'r5-badsheet.png'});
  await b.close();
})();
