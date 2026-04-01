const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('./data/PCOS_data.csv.xlsx');
const sheetName = workbook.SheetNames[0];
const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
fs.writeFileSync('./data/PCOS_data.csv', csv);
console.log('Done! PCOS_data.csv created.');