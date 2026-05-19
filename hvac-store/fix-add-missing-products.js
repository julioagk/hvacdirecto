import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve('./');
const dataPath = path.join(root, 'src', 'data.js');
const productosPath = path.join(root, '..', 'productos.txt');

function guessModelFromLine(line){
  const parts = line.split(/\t+/).map(s=>s.trim()).filter(Boolean);
  let candidate = parts[0] || '';
  if (!candidate) candidate = line.split(/\s+/)[0] || '';
  return candidate.replace(/^\W+|\W+$/g,'');
}

async function run(){
  const txt = await fs.readFile(productosPath, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean).slice(1);
  const modelsInTxt = new Set(lines.map(guessModelFromLine).filter(Boolean));

  const dataText = await fs.readFile(dataPath, 'utf8');

  // import current products by eval? safer to parse by locating export const products = [ and matching bracket
  const startToken = 'export const products = [';
  const start = dataText.indexOf(startToken);
  if (start === -1) throw new Error('products array start not found');
  const arrStart = dataText.indexOf('[', start);

  // find matching closing bracket for this array
  let i = arrStart;
  let depth = 0;
  for (; i < dataText.length; i++){
    const ch = dataText[i];
    if (ch === '[') depth++;
    else if (ch === ']'){
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error('could not find end of products array');
  const arrEnd = i; // position of matching ']'

  // extract current products array text
  const productsText = dataText.slice(arrStart+1, arrEnd);
  // quick parse to find existing model values
  const modelRe = /model:\s*'([^']+)'/g;
  const existing = new Set();
  let m;
  while ((m = modelRe.exec(productsText)) !== null){ existing.add(m[1].toLowerCase()); }

  const missing = Array.from(modelsInTxt).filter(x=>{
    if (!x) return false;
    // skip header-like tokens
    if (!/[0-9]/.test(x)) return false;
    if (existing.has(x.toLowerCase())) return false;
    return true;
  });

  if (!missing.length){
    console.log('No model-like missing products to add.');
    return;
  }

  await fs.copyFile(dataPath, dataPath + '.bak_fix_add');

  // build insertion text
  const entries = missing.map(m=>`  { id: '${m}', name: '${m}', model: '${m}', sku: '${m}', img: '', image: '', category: '', subcategory: '', description: '', price: null, brand: '' },`).join('\n');

  const newData = dataText.slice(0, arrEnd) + '\n' + entries + '\n' + dataText.slice(arrEnd);
  await fs.writeFile(dataPath, newData, 'utf8');
  console.log('Inserted', missing.length, 'models into products array. Backup at', dataPath + '.bak_fix_add');
}

run().catch(e=>{console.error(e); process.exit(1)});
