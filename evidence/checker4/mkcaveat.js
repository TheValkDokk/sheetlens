
const fs=require('fs'),path=require('path');
const XLSX=require('/Users/valk/Documents/product-test/app/node_modules/xlsx');
const ws={'A1':{t:'n',v:10},'A2':{t:'n',v:20},'A3':{t:'n',v:30},
 'B1':{t:'n',v:60,f:'SUM(A:A)'},
 'C1':{t:'n',v:9.97,f:'A1-0.03'},
 'D1':{t:'s',v:'https://example.com'},
 'E1':{t:'s',v:'visit https://example.com for docs'},
 '!ref':'A1:E3'};
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Caveats');
XLSX.writeFile(wb,'/Users/valk/Documents/product-test/evidence/checker4/caveats.xlsx');
console.log('ok');
