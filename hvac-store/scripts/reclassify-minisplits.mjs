/**
 * reclassify-minisplits.mjs
 * 
 * Cambia las subcategorías de mini-splits:
 *   ANTES: ['Inverter', 'No Inverter']
 *   DESPUÉS: ['Frio', 'Heat Pump', 'Inverter']
 * 
 * Y reasigna cada producto según su descripción/nombre/SKU.
 *
 * Lógica de clasificación (en orden de prioridad):
 *   1. Heat Pump → si la descripción/nombre contiene: "frio calor", "heat pump",
 *                  "heatpump", "frío calor", "calor", o SKU pattern EHV
 *   2. Inverter   → si contiene "inverter" (y NO cayó en Heat Pump)
 *   3. Frio       → todo lo demás (solo frío, condensadoras SF, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

// ── Leer el archivo ──────────────────────────────────────────────────────────
let src = fs.readFileSync(dataPath, 'utf8');

// ── Función de clasificación ─────────────────────────────────────────────────
function classifyMiniSplit(product) {
  const haystack = [
    product.description || '',
    product.name || '',
    product.model || '',
    product.sku || '',
    product.function || '',
  ].join(' ').toLowerCase();

  // 1. Heat Pump — contiene indicador de calefacción/bomba de calor
  const heatPumpKeywords = [
    'frio calor', 'frío calor',
    'heat pump', 'heatpump', 'heatbpump',
    ' calor',   // cubre "calor" como palabra
    'ehv',      // patrón de SKU heat pump (EHV = electric heat valve)
  ];
  if (heatPumpKeywords.some(kw => haystack.includes(kw))) {
    return 'Heat Pump';
  }

  // 2. Inverter — tecnología inverter sin función calor
  if (haystack.includes('inverter')) {
    return 'Inverter';
  }

  // 3. Frio — todo lo demás (solo frío, condensadoras SF, manejadoras, etc.)
  return 'Frio';
}

// ── Parsear y aplicar cambios ─────────────────────────────────────────────────
// 1. Cambiar subs de mini-splits en el array de categorías
src = src.replace(
  /(\{\s*id:\s*'mini-splits'[^}]*subs:\s*)\[[^\]]*\]/,
  `$1['Frio', 'Heat Pump', 'Inverter']`
);

console.log('✅ subs de mini-splits actualizado a [\'Frio\', \'Heat Pump\', \'Inverter\']');

// 2. Necesitamos leer los productos para clasificarlos.
//    Usamos dynamic import del módulo actual para obtener los datos,
//    pero como lo modificamos en memoria, hacemos una extracción manual con regex.

// Extraer el bloque de productos como texto y reemplazar subcategory por producto
const productBlockStart = src.indexOf('export const products = [');
if (productBlockStart === -1) throw new Error('No se encontró export const products');

// Estrategia: para cada producto de mini-splits, reemplazar su subcategory
// usando una regex que identifique el bloque del producto.
// Recorremos el source buscando objetos con category: "mini-splits"

let changes = 0;
let preview = [];

// Regex para encontrar un bloque de producto con category mini-splits
// Captura desde { hasta la siguiente }
const productRegex = /\{[^{}]*"category":\s*"mini-splits"[^{}]*\}/gs;

src = src.replace(productRegex, (block) => {
  // Extraer campos del bloque para clasificar
  const skuMatch     = block.match(/"sku":\s*"([^"]+)"/);
  const descMatch    = block.match(/"description":\s*"([^"]*)"/);
  const nameMatch    = block.match(/"name":\s*"([^"]*)"/);
  const modelMatch   = block.match(/"model":\s*"([^"]*)"/);
  const fnMatch      = block.match(/"function":\s*"([^"]*)"/);

  const product = {
    sku:         skuMatch?.[1]  || '',
    description: descMatch?.[1] || '',
    name:        nameMatch?.[1] || '',
    model:       modelMatch?.[1] || '',
    function:    fnMatch?.[1]   || '',
  };

  const newSub = classifyMiniSplit(product);

  // Verificar subcategory actual
  const subMatch = block.match(/"subcategory":\s*"([^"]*)"/);
  const oldSub   = subMatch?.[1] || '(vacío)';

  preview.push({ sku: product.sku, old: oldSub, new: newSub, desc: product.description.substring(0, 60) });

  if (!subMatch) {
    // No hay campo subcategory — insertar antes de "description" o al final
    changes++;
    return block.replace(/"category":\s*"mini-splits"/, `"category": "mini-splits",\n    "subcategory": "${newSub}"`);
  }

  if (oldSub !== newSub) changes++;

  return block.replace(/"subcategory":\s*"[^"]*"/, `"subcategory": "${newSub}"`);
});

// ── Escribir el archivo modificado ───────────────────────────────────────────
fs.writeFileSync(dataPath, src, 'utf8');

// ── Reporte ──────────────────────────────────────────────────────────────────
console.log('\n📋 Reclasificación de productos Mini Splits:');
console.log('─'.repeat(90));

const byNew = { 'Frio': [], 'Heat Pump': [], 'Inverter': [] };
preview.forEach(p => {
  byNew[p.new] = byNew[p.new] || [];
  byNew[p.new].push(p);
});

for (const [cat, items] of Object.entries(byNew)) {
  console.log(`\n🏷  ${cat} (${items.length} productos):`);
  items.forEach(p => {
    const changed = p.old !== p.new ? ' ← CAMBIADO' : '';
    console.log(`   ${p.sku.padEnd(25)} [${p.old.padEnd(15)} → ${p.new}]${changed}`);
    if (p.desc) console.log(`      "${p.desc}"`);
  });
}

console.log('\n─'.repeat(90));
console.log(`✅ Total productos mini-splits reclasificados: ${preview.length}`);
console.log(`🔄 Productos con subcategory cambiada: ${changes}`);
console.log(`📁 Archivo actualizado: src/data.js`);
