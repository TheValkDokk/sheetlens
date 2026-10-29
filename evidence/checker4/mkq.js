
const XLSX=require('/Users/valk/Documents/product-test/app/node_modules/xlsx');
const a={'A1':{t:'n',v:5},'A2':{t:'n',v:7},'B1':{t:'n',v:12,f:'SUM(Data!A:A)'},'!ref':'A1:B2'};
const d={'A1':{t:'n',v:3},'A2':{t:'n',v:4},'!ref':'A1:A2'};
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,a,'Summary');XLSX.utils.book_append_sheet(wb,d,'Data');
XLSX.writeFile(wb,'/Users/valk/Documents/product-test/evidence/checker4/qualified.xlsx');
console.log('ok');
