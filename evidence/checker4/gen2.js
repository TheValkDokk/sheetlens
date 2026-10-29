
const XLSX=require('/Users/valk/Documents/product-test/app/node_modules/xlsx');
const ws={};let n=0;
for(let r=0;r<1000;r++){for(let c=0;c<20;c++){const a=XLSX.utils.encode_cell({r,c});ws[a]=c===0?{t:'n',v:r}:{t:'n',v:r*20+c};n++;}}
ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:999,c:19}});
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Perf');
XLSX.writeFile(wb,'/Users/valk/Documents/product-test/evidence/checker4/perf20k.xlsx');
console.log('cells',n);
