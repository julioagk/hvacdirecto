import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

let src = fs.readFileSync(dataPath, 'utf8');

const targetSkus = [
  '48NL-B360603',
  '48NL-B480903',
  '48NL-B601153',
  '50NL-B36---5',
  '50NL-B48---5',
  '50NL-B60---5',
  '50NL-B60---6',
  '50NT-B36---5'
];

let count = 0;
targetSkus.forEach(sku => {
  const pattern = new RegExp(
    `("sku":\\s*"${sku.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}"[\\s\\S]*?"brand":\\s*)"INTENSITY"`
  );
  if (pattern.test(src)) {
    src = src.replace(pattern, `$1"CARRIER"`);
    count++;
    console.log(`  ✅ ${sku} → CARRIER`);
  } else {
    console.log(`  ⚠️  ${sku} no encontrado o ya no tiene marca INTENSITY`);
  }
});

if (count > 0) {
  fs.writeFileSync(dataPath, src, 'utf8');
  console.log(`🎉 Se actualizaron con éxito ${count} productos en data.js.`);
} else {
  console.log('⚠️ No se realizó ningún cambio.');
}
