import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('./');
const imagesDir = path.join(root, 'public', 'images');
const dataPath = path.join(root, 'src', 'data.js');

async function listImages() {
  const files = await fs.readdir(imagesDir);
  return files;
}

function chooseFallback(category, brand) {
  if (category === 'mini-splits') return 'minisplit inverter instensity.png';
  if (category === 'packaged') return 'PAQUETE COMERCIA.png';
  if (category === 'central-ac') return 'CONDENSADORA SF.png';
  if (brand === 'CIAC') return 'PAQ HP CIAC.png';
  if (brand === 'AC COOLING') return 'Condensadora vertical On Off sf marca AC Cooling.png';
  if (brand === 'INTENSITY') return 'minisplit inverter instensity.png';
  if (brand === 'CARRIER') return 'PAQUETE COMERCIA.png';
  return 'paquete comercial.png';
}

function escapeReg(s){return s.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&');}

async function run(){
  const imgs = await listImages();
  const lowerMap = new Map(imgs.map(f=>[f.toLowerCase(), f]));

  const dataText = await fs.readFile(dataPath, 'utf8');
  await fs.copyFile(dataPath, dataPath + '.bak_images');

  // find all product objects
  const prodRe = /\{[\s\S]*?\},/g;
  let match;
  let newText = dataText;
  let updated = 0;

  while ((match = prodRe.exec(dataText)) !== null) {
    const obj = match[0];
    // extract model
    const m = /model:\s*'([^']+)'/.exec(obj);
    if (!m) continue;
    const model = m[1];
    const imgField = /img:\s*'([^']*)'/.exec(obj);
    const imageField = /image:\s*'([^']*)'/.exec(obj);
    const categoryField = /category:\s*'([^']*)'/.exec(obj);
    const brandField = /brand:\s*'([^']*)'/.exec(obj);
    const imgVal = imgField ? imgField[1] : '';
    const imageVal = imageField ? imageField[1] : '';
    const category = categoryField ? categoryField[1] : '';
    const brand = brandField ? brandField[1] : '';

    if (imgVal && imageVal) continue; // already have images

    // try model-specific filenames
    const candidates = [
      `${model}.png`, `${model}.jpg`, `${model}.jpeg`, `${model}.webp`,
      `${model.toUpperCase()}.png`, `${model.toLowerCase()}.png`
    ];
    let found = null;
    for (const c of candidates) {
      const f = lowerMap.get(c.toLowerCase());
      if (f) { found = f; break; }
    }

    if (!found) {
      // try replace spaces/hyphens variants
      const norm = model.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
      for (const [k,v] of lowerMap.entries()) {
        const kn = k.replace(/[^a-zA-Z0-9]/g,'');
        if (kn.includes(norm) || norm.includes(kn)) { found = v; break; }
      }
    }

    if (!found) found = chooseFallback(category, brand);

    // build replacement
    const escapedFound = found.replace(/'/g, "\\'");
    const newObj = obj
      .replace(/img:\s*'[^']*'/, `img: '/images/${escapedFound}'`)
      .replace(/image:\s*'[^']*'/, `image: '/images/${escapedFound}'`);

    newText = newText.replace(obj, newObj);
    updated++;
  }

  await fs.writeFile(dataPath, newText, 'utf8');
  console.log('Assigned images to', updated, 'products. Backup at', dataPath + '.bak_images');
}

run().catch(e=>{console.error(e); process.exit(1)});
