
const puppeteer = require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('https://thevalkdokk.github.io/sheetlens/', {waitUntil:'networkidle2', timeout:60000});
  await new Promise(r=>setTimeout(r,1500));
  const info = await p.evaluate(()=>({
    title: document.title,
    bodyText: document.body.innerText.slice(0,2500),
    inputs: [...document.querySelectorAll('input')].map(i=>({type:i.type,accept:i.accept,cls:i.className,id:i.id})),
    buttons: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).slice(0,40),
    tabs: [...document.querySelectorAll('[role=tab]')].map(t=>t.innerText.trim()),
    scrollW: document.documentElement.scrollWidth,
  }));
  console.log(JSON.stringify(info,null,1));
  console.log('ERRORS', errs);
  await b.close();
})();
