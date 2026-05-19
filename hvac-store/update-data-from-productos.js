import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('./');
const prodPath = path.join(root, '..', 'productos.txt');
const dataPath = path.join(root, 'src', 'data.js');

function guessBrand(desc) {
  const d = desc.toUpperCase();
  if (d.includes('CARRIER')) return 'CARRIER';
  if (d.includes('CIAC')) return 'CIAC';
  if (d.includes('A/C COOLING') || d.includes('AC COOLING') || d.includes('A/C COOLING') || d.includes('ACCO')) return 'AC COOLING';
  if (d.includes('INTENSITY')) return 'INTENSITY';
  if (d.includes('TLC')) return 'TLC';
  return '';
}

function guessCategory(desc) {
  const d = desc.toLowerCase();
  if (d.includes('minisplit') || d.includes('minisplit')) return 'mini-splits';
  if (d.includes('condensad') || d.includes('condensador')) return 'central-ac';
  if (d.includes('paquete') || d.includes('paquete') || d.includes('paquete res') || d.includes('paquete comercial')) return 'packaged';
  if (d.includes('manejadora') || d.includes('manejadora multiposicion') || d.includes('manejadora comercial')) return 'commercial';
  if (d.includes('fan coil') || d.includes('fan & coil')) return 'commercial';
  return '';
}

function parsePrice(raw) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

async function run() {
  const prodTxt = await fs.readFile(prodPath, 'utf8');
  const lines = prodTxt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    // Split by tabs or multiple spaces
    const parts = line.split(/\t| {2,}/).map(p=>p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const model = parts[0];
    // Last token might be price
    const possiblePrice = parts[parts.length-1];
    const desc = parts.slice(1, parts.length-1).join(' ');
    const price = parsePrice(possiblePrice);
    // If price parsed as 0, maybe the description contained price at end separated by tab; try other heuristics
    entries.push({ model, desc: desc || parts[1] || '', price });
  }

  const map = new Map(entries.map(e=>[e.model, e]));

  const dataText = await fs.readFile(dataPath, 'utf8');
  await fs.copyFile(dataPath, dataPath + '.bak2');

  let newText = dataText;
  let updated = 0;
  for (const [model, info] of map) {
    // only update models that exist in file and currently have brand: '' (our added minimal entries)
    const objPattern = new RegExp("\\{\\s*id:\\s*'"+escapeReg(model)+"'[\\s\\S]*?brand:\\s*''[\\s\\S]*?\},","g");
    const match = objPattern.exec(newText);
    if (!match) continue;
    const oldObj = match[0];
    const brand = guessBrand(info.desc);
    const category = guessCategory(info.desc);
    const price = info.price || 0;
    const description = info.desc.replace(/'/g, "\\'");
    const replacement = oldObj
      .replace(/img:\s*''/, "img: ''")
      .replace(/image:\s*''/, "image: ''")
      .replace(/category:\s*''/, `category: '${category}'`)
      .replace(/subcategory:\s*''/, `subcategory: ''`)
      .replace(/description:\s*''/, `description: '${description}'`)
      .replace(/function:\s*''/, "function: ''")
      .replace(/voltage:\s*''/, "voltage: ''")
      .replace(/price:\s*0/, `price: ${price}`)
      .replace(/brand:\s*''/, `brand: '${brand}'`);

    newText = newText.slice(0, match.index) + replacement + newText.slice(match.index + oldObj.length);
    updated++;
  }

  await fs.writeFile(dataPath, newText, 'utf8');
  console.log('Updated', updated, 'entries in', dataPath);
}

function escapeReg(s){return s.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');}

run().catch(e=>{console.error(e); process.exit(1)});
