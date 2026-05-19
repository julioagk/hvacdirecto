import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('./');
const productosPath = path.join(root, '..', 'productos.txt');
const dataPath = path.join(root, 'src', 'data.js');

async function loadProductos() {
  const txt = await fs.readFile(path.join(root, '..', 'productos.txt'), 'utf8');
  // split by lines and tokens; gather candidate tokens
  const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const candidates = new Set();
  for (const line of lines) {
    // split by whitespace and commas/tabs
    const parts = line.split(/\s+|,|\t/).map(p=>p.trim()).filter(Boolean);
    for (const p of parts) {
      // accept tokens with letters+digits and optional hyphens, length 2..40, no spaces
      if (/^[A-Za-z0-9\-]{2,40}$/.test(p)) candidates.add(p);
    }
  }
  return Array.from(candidates);
}

async function loadDataProducts(){
  const mod = await import('file://'+dataPath);
  return mod.products.map(p=>p.model);
}

async function run(){
  const candidates = await loadProductos();
  const existing = await loadDataProducts();
  const existingSet = new Set(existing.map(s=>s.toUpperCase()));
  const missing = candidates.filter(c=>!existingSet.has(c.toUpperCase()));
  // filter further: require at least one digit in model (to avoid words like MODELO)
  const filtered = missing.filter(m=>/[0-9]/.test(m));
  if (filtered.length===0){
    console.log('No model-like missing products found to add.');
    return;
  }

  // backup
  await fs.copyFile(dataPath, dataPath + '.bak_add_missing');

  let dataText = await fs.readFile(dataPath, 'utf8');
  const insertIndex = dataText.lastIndexOf(']');
  if (insertIndex === -1) throw new Error('could not find products array end');

  const toInsert = filtered.map(m=>`  { model: '${m}', brand: '', category: '', price: null, img: '', image: '' },`).join('\n');
  const newText = dataText.slice(0, insertIndex) + '\n' + toInsert + '\n' + dataText.slice(insertIndex);
  await fs.writeFile(dataPath, newText, 'utf8');
  console.log('Added', filtered.length, 'missing model entries to src/data.js. Backup at', dataPath + '.bak_add_missing');
}

run().catch(e=>{console.error(e); process.exit(1)});
