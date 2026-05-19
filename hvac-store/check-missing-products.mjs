import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { products } from './src/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(__dirname, '..', 'productos.txt'),
  path.resolve(process.cwd(), 'productos.txt'),
  path.resolve(process.cwd(), '..', 'productos.txt'),
  path.resolve(process.cwd(), '..', '..', 'productos.txt')
];
let txtPath = candidates.find(p => fs.existsSync(p));
if (!txtPath) txtPath = candidates[0];
if (!fs.existsSync(txtPath)) {
  console.error('productos.txt not found at', txtPath);
  process.exit(1);
}
const txt = fs.readFileSync(txtPath, 'utf8');
const lines = txt.split(/\r?\n/).filter(Boolean);

function guessModelFromLine(line){
  // try tab-separated first column, otherwise first token
  const parts = line.split(/\t+/).map(s=>s.trim()).filter(Boolean);
  let candidate = parts[0] || '';
  if (!candidate) {
    candidate = line.split(/\s+/)[0] || '';
  }
  // sanitize
  return candidate.replace(/^\W+|\W+$/g,'');
}

const modelsInTxt = new Set();
for (const line of lines.slice(1)) { // skip header
  const m = guessModelFromLine(line);
  if (m) modelsInTxt.add(m);
}

const productModels = new Set(products.map(p=>String(p.model||p.name||p.id).toLowerCase()));
const productNames = products.map(p=>String(p.name||p.model||p.id).toLowerCase());

const missing = [];
for (const m of Array.from(modelsInTxt)){
  const lower = m.toLowerCase();
  if (!productModels.has(lower) && !productNames.some(n=>n.includes(lower))) missing.push(m);
}

console.log('Total models found in productos.txt:', modelsInTxt.size);
console.log('Total products in data.js:', products.length);
console.log('Missing models (found in productos.txt but not in data.js):');
if (!missing.length) console.log('None — everything from productos.txt is present in data.js');
else {
  missing.slice(0,200).forEach(m=>console.log('-', m));
  console.log(`... (${missing.length} total missing)`);
}
