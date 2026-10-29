
const puppeteer=require('/Users/valk/Documents/product-test/app/node_modules/puppeteer-core');
const DIR='/Users/valk/Documents/product-test/evidence/checker4/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setViewport({width:1280,height:900});
 await p.goto('https://thevalkdokk.github.io/sheetlens/',{waitUntil:'networkidle2'});
 await (await p.$('#file')).uploadFile(DIR+'caveats.xlsx'); await sleep(2000);
 await p.click('#tab-impact'); await sleep(400);
 const txt=await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n'));
 console.log('---IMPACT caveats.xlsx---\n'+txt.slice(txt.indexOf('Workbook summary')>0?txt.indexOf('Workbook summary'):0).slice(0,1500));
 console.log('NOTICE?', /cannot trace/.test(txt));
 await p.screenshot({path:DIR+'caveat-notice.png'});
 await p.click('#tab-risks'); await sleep(400);
 const risks=await p.evaluate(()=>document.body.innerText.replace(/\n{2,}/g,'\n'));
 console.log('---RISKS---\n'+risks.slice(risks.indexOf('Workbook summary')).slice(0,1800));
 console.log('EXTERNAL_LINK_FLAG?', /external link|outside this workbook|hyperlink/i.test(risks));
 await p.screenshot({path:DIR+'rules-risks.png'});
 await b.close();
})();
