import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const productosPath = path.join(root, '..', 'productos.txt');
const dataPath = path.join(root, 'src', 'data.js');

if (!fs.existsSync(productosPath)) {
  console.error('productos.txt not found at', productosPath);
  process.exit(1);
}
if (!fs.existsSync(dataPath)) {
  console.error('data.js not found at', dataPath);
  process.exit(1);
}

const prodText = fs.readFileSync(productosPath, 'utf8');
const lines = prodText.split(/\r?\n/);

const priceMap = new Map();
const modelLineRe = /^\s*([A-Za-z0-9\-]+)\b[\s\t\S]*?(?:\$?\s*([0-9.,]+))?\s*$/;
for (const line of lines) {
  const m = line.match(modelLineRe);
  if (!m) continue;
  const model = m[1].trim();
  let priceStr = (m[2] || '').trim();
  if (!priceStr) continue;
  // Normalize locale: if contains both '.' and ',' assume '.' thousands and ',' decimals
  if (priceStr.indexOf('.') !== -1 && priceStr.indexOf(',') !== -1) {
    priceStr = priceStr.replace(/\./g, '').replace(/,/g, '.');
  } else if (priceStr.indexOf(',') !== -1 && priceStr.indexOf('.') === -1) {
    priceStr = priceStr.replace(/,/g, '.');
  } else {
    // only dots or only digits
    // leave as is
  }
  const price = Number(priceStr);
  if (!isNaN(price)) priceMap.set(model.toUpperCase(), price);
}

console.log('Found prices for', priceMap.size, 'models in productos.txt');

const dataText = fs.readFileSync(dataPath, 'utf8');
const backupPath = dataPath + '.bak_prices_' + Date.now();
fs.copyFileSync(dataPath, backupPath);
console.log('Backup written to', backupPath);

const startToken = 'export const products = [';
let startIndex = dataText.indexOf(startToken);
if (startIndex === -1) { console.error('products array not found'); process.exit(1); }

// find matching closing bracket for the products array by scanning
let i = startIndex + startToken.length - 1;
let depth = 0; let endIndex = -1;
for (; i < dataText.length; i++) {
  const ch = dataText[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    if (depth === 0) { endIndex = i; break; }
    depth--;
  }
}
// fallback: find first occurrence of '\n];' after start
if (endIndex === -1) {
  const alt = dataText.indexOf('\n];', startIndex);
  if (alt !== -1) endIndex = alt + 1; // position of ]
}
if (endIndex === -1) { console.error('could not locate end of products array'); process.exit(1); }

// Extract original products array text and attempt to eval safe by wrapping
const productsText = dataText.slice(startIndex + startToken.length - 1, endIndex + 1);
// Build new products by importing the file as module to get actual products array
let products;
try {
  const mod = await import('./src/data.js');
  products = mod.products;
} catch (err) {
  console.error('Failed to import src/data.js:', err);
  process.exit(1);
}

let updated = 0;
for (const p of products) {
  if (!p || !p.model) continue;
  const modelKey = String(p.model).toUpperCase();
  if (priceMap.has(modelKey)) {
    const newPrice = priceMap.get(modelKey);
    if (p.price !== newPrice) {
      p.price = newPrice;
      updated++;
    }
  }
}

console.log('Updated prices for', updated, 'products');

// Generate a compact JS array literal from products
const productsLiteral = JSON.stringify(products, null, 2).replace(/"img":/g, 'img:').replace(/"image":/g, 'image:');
// The above replacement is naive; we'll produce a safer insertion: keep rest of file and replace whole block
const newProductsBlock = 'export const products = ' + JSON.stringify(products, null, 2) + ';';
const newDataText = dataText.slice(0, startIndex) + newProductsBlock + dataText.slice(endIndex + 1);
fs.writeFileSync(dataPath, newDataText, 'utf8');
console.log('Wrote updated', dataPath);
