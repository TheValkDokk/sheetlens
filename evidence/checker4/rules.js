
const puppeteer = require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
(async () => {
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({width:1280,height:900});
  await p.goto('https://thevalkdokk.github.io/sheetlens/', {waitUntil:'networkidle2', timeout:60000});
  const input = await p.$('#file');
  await input.uploadFile(DIR+'rules.xlsx');
  await new Promise(r=>setTimeout(r,2500));
  const info = await p.evaluate(()=>({
    text: document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,4000),
    tabs: [...document.querySelectorAll('[role=tab], .tab, nav a, nav button')].map(t=>({tag:t.tagName,txt:t.innerText.trim(),sel:t.id||t.className})),
    selects: [...document.querySelectorAll('select,input:not([type=file])')].map(s=>({tag:s.tagName,type:s.type,cls:s.className,ph:s.placeholder,id:s.id})),
  }));
  console.log(JSON.stringify(info,null,1));
  await p.screenshot({path:DIR+'rules-result.png', fullPage:false});
  await b.close();
})();
