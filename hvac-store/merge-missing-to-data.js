import fs from 'fs/promises';
import path from 'path';

const root = path.resolve('./');
const productosPaths = [
  path.join(root, '..', 'productos.txt'),
  path.join(root, 'productos.txt'),
  path.join(root, '..', '..', 'productos.txt'),
  path.join(root, '..', '..', '..', 'productos.txt'),
  path.join(root, '..', 'HvacDir', 'productos.txt'),
];

async function findProductos() {
  for (const p of productosPaths) {
    try {
      const txt = await fs.readFile(p, 'utf8');
      return { path: p, text: txt };
    } catch (e) {
      // continue
    }
  }
  throw new Error('productos.txt not found in expected locations');
}

function extractModelsFromProductos(txt) {
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const models = [];
  for (const line of lines) {
    const parts = line.split(/\s{2,}|\t|\s/);
    const token = parts[0];
    if (!token) continue;
    // ignore header-like lines
    if (/MODELO|DESCRIPCION|PRECIO/i.test(token)) continue;
    // skip lines that look like descriptions (have many words and no hyphen or digits)
    models.push(token);
  }
  return Array.from(new Set(models));
}

async function run() {
  const { path: prodPath, text } = await findProductos();
  console.log('Found productos at', prodPath);
  const prodModels = extractModelsFromProductos(text).map(m => m.trim());

  const dataPath = path.join(root, 'src', 'data.js');
  const dataText = await fs.readFile(dataPath, 'utf8');

  const modelRe = /model:\s*'([^']+)'/gi;
  const existing = new Set();
  let m;
  while ((m = modelRe.exec(dataText)) !== null) {
    existing.add(m[1]);
  }

  const missing = prodModels.filter(pm => !existing.has(pm));

  if (missing.length === 0) {
    console.log('No missing models found.');
    return;
  }

  // backup
  await fs.copyFile(dataPath, dataPath + '.bak');
  console.log('Backup written to', dataPath + '.bak');

  // build entries
  const entries = missing.map(mod => {
    const safe = mod.replace(/'/g, "\\'");
    return `  { id: '${safe}', name: '${safe}', model: '${safe}', sku: '${safe}', img: '', image: '', category: '', subcategory: '', description: '', function: '', voltage: '', price: 0, brand: '' },`;
  }).join('\n') + '\n';

  // insert before the last occurrence of '\n];\n\nexport const searchSuggestions'
  const marker = '\n];\n\nexport const searchSuggestions';
  let idx = dataText.lastIndexOf(marker);
  let newText;
  if (idx !== -1) {
    const before = dataText.slice(0, idx);
    const after = dataText.slice(idx);
    // remove the closing bracket so we can append entries then close
    const newBefore = before.replace(/\n\];\s*$/,'\n');
    newText = newBefore + '\n' + entries + '\n];\n\n' + after.replace(/^\n?\];\n\n/,'');
  } else {
    // fallback: insert before the final '];' in file
    const lastBracket = dataText.lastIndexOf('\n];');
    if (lastBracket === -1) throw new Error('Could not find end of products array');
    const before = dataText.slice(0, lastBracket);
    const after = dataText.slice(lastBracket + 1);
    newText = before + '\n' + entries + '\n];' + after;
  }

  await fs.writeFile(dataPath, newText, 'utf8');
  console.log('Inserted', missing.length, 'entries into', dataPath);
}

run().catch(e => { console.error(e); process.exit(1); });
