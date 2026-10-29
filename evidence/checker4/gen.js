
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const XLSX = require(path.join(process.cwd(), 'app/node_modules/xlsx'));
// a) text starting with PK containing xl/workbook.xml
fs.writeFileSync(path.join(dir,'pk_text.xlsx'), Buffer.concat([Buffer.from('PK','latin1'), Buffer.from('not a real zip file, mentions xl/workbook.xml inside','utf8')]));
// b) short bytes 50 4b 03 04 01 02 03 04 05
fs.writeFileSync(path.join(dir,'short_bytes.xlsx'), Buffer.from([0x50,0x4b,0x03,0x04,0x01,0x02,0x03,0x04,0x05]));
// c) empty
fs.writeFileSync(path.join(dir,'empty.xlsx'), Buffer.alloc(0));
// d) 20k cell workbook
const ws = {}; let n=0;
for (let r=0;r<200;r++){ for (let c=0;c<20;c++){ const addr = XLSX.utils.encode_cell({r,c}); ws[addr] = c===0? {t:'n',v:r} : {t:'n',v:r*20+c}; n++; } }
ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:199,c:19}});
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Perf');
XLSX.writeFile(wb, path.join(dir,'perf20k.xlsx'));
// e) rules probe: =A1-0.03 formula in one sheet, URL text cell
const ws2 = {};
ws2['A1']={t:'n',v:100}; ws2['B1']={t:'n',v:99.97,f:'A1-0.03'};
ws2['A2']={t:'s',v:'https://example.com'};
ws2['A3']={t:'n',v:5}; ws2['B3']={t:'n',v:5.03,f:'A3+0.03'};
ws2['!ref']='A1:B3';
const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, ws2, 'Rules');
XLSX.writeFile(wb2, path.join(dir,'rules.xlsx'));
console.log('wrote', fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx')).join(','));
