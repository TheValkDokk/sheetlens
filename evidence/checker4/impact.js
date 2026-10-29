
const puppeteer = require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
(async () => {
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({width:1280,height:1000});
  await p.goto('https://thevalkdokk.github.io/sheetlens/', {waitUntil:'networkidle2', timeout:60000});
  const btns = await p.$$('button');
  for (const btn of btns) { const t = await p.evaluate(e=>e.innerText.trim(), btn); if (t==='Load demo workbook') { await btn.click(); break; } }
  await new Promise(r=>setTimeout(r,2500));
  const afterDemo = await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n'));
  console.log('---DEMO TEXT---\n'+afterDemo.slice(0,2500));
  await p.click('#tab-impact');
  await new Promise(r=>setTimeout(r,800));
  const impact = await p.evaluate(()=>({
    text: document.body.innerText.replace(/\n{2,}/g,'\n'),
    inputs: [...document.querySelectorAll('input:not([type=file]),textarea')].map(i=>({tag:i.tagName,type:i.type,id:i.id,ph:i.placeholder,cls:i.className})),
    btns: [...document.querySelectorAll('button')].map(x=>x.innerText.trim()).filter(Boolean),
  }));
  console.log('---IMPACT---\n'+JSON.stringify(impact,null,1).slice(0,3000));
  await p.screenshot({path:DIR+'impact-empty.png'});
  await b.close();
})();
