/**
 * fix-incomplete-products.mjs
 * Corrije productos con datos faltantes en data.js:
 *  1. 8 packaged sin marca → CARRIER
 *  2. 2 mini-splits S-EHV sin marca (N/D) → TLC
 *  3. 4 CONDENSADORA/EVAPORADOR sin categoría → mini-splits + CARRIER + Heat Pump
 *  4. Elimina 2 entradas basura: "Modelo" y "MODELO_HEADER"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');
let src = fs.readFileSync(dataPath, 'utf8');

// ── 1. Packaged sin marca → CARRIER ─────────────────────────────────────────
const packgedSkus = [
  '50NT-B48---5', '50NT-B60---5', '50NT-B60---6',
  '48NL-B3660605', '48NL-B480905', '48NL-B601155',
  '50VSQ180363GA', '50VSQ180603GA',
];
let count1 = 0;
packgedSkus.forEach(sku => {
  // Reemplaza "brand": "" dentro del bloque que contiene ese SKU
  const pattern = new RegExp(
    `("sku":\\s*"${sku.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')}"[\\s\\S]*?"brand":\\s*)""`
  );
  if (pattern.test(src)) {
    src = src.replace(pattern, `$1"CARRIER"`);
    count1++;
    console.log(`  ✅ ${sku} → CARRIER`);
  } else {
    console.log(`  ⚠️  ${sku} no encontrado o ya tiene marca`);
  }
});

// ── 2. S12P-EHV13 y S36P-EHV23 → TLC ───────────────────────────────────────
const ehvSkus = ['S12P-EHV13', 'S36P-EHV23'];
let count2 = 0;
ehvSkus.forEach(sku => {
  const pattern = new RegExp(
    `("sku":\\s*"${sku}"[\\s\\S]*?"brand":\\s*)"N\\/D"`
  );
  if (pattern.test(src)) {
    src = src.replace(pattern, `$1"TLC"`);
    count2++;
    console.log(`  ✅ ${sku} → TLC`);
  } else {
    console.log(`  ⚠️  ${sku} no encontrado`);
  }
});

// ── 3. Condensadoras/Evaporadores Carrier sin categoría ─────────────────────
// Estos tienen el ID/SKU larguísimo, pero todos comparten category:"" y brand:""
// Los marcamos con category:mini-splits, subcategory:Heat Pump, brand:CARRIER
const carrierBlocks = [
  'CONDENSADORA MINISPLIT INVERTER MARCA CARRIER HEAT PUMP REFRIGERANTE R32 CAPACIDAD 1 TR VOLTAJE 220V/1F/60HZ',
  'EVAPORADOR MINISPLIT INVERTER  MARCA CARRIER HEAT PUMP REFRIGERANTE R32 CAPACIDAD 1 TR VOLTAJE 220V/1F/60HZ) VAN JUNTIS',
  'CONDENSADORA MINISPLIT INVERTER MARCA CARRIER HEAT PUMP REFRIGERANTE R32 CAPACIDAD 2 TR VOLTAJE 220V/1F/60HZ',
  'EVAPORADOR MINISPLIT INVERTER MARCA CARRIER HEAT PUMP REFRIGERANTE R32 CAPACIDAD 2 TR VOLTAJE 220V/1F/60HZ) VAN JUNTOS',
];
let count3 = 0;
carrierBlocks.forEach(sku => {
  const escaped = sku.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&').replace(/\s+/g, '\\s+');
  // Fix category
  const catPattern = new RegExp(
    `("sku":\\s*"${escaped}"[\\s\\S]*?"category":\\s*)""`,
  );
  if (catPattern.test(src)) {
    src = src.replace(catPattern, `$1"mini-splits"`);
  }
  // Fix subcategory
  const subPattern = new RegExp(
    `("sku":\\s*"${escaped}"[\\s\\S]*?"subcategory":\\s*)""`,
  );
  if (subPattern.test(src)) {
    src = src.replace(subPattern, `$1"Heat Pump"`);
  }
  // Fix brand
  const brandPattern = new RegExp(
    `("sku":\\s*"${escaped}"[\\s\\S]*?"brand":\\s*)""`,
  );
  if (brandPattern.test(src)) {
    src = src.replace(brandPattern, `$1"CARRIER"`);
    count3++;
    console.log(`  ✅ ${sku.substring(0, 60)}... → mini-splits / Heat Pump / CARRIER`);
  } else {
    console.log(`  ⚠️  No encontrado: ${sku.substring(0, 60)}...`);
  }
});

// ── 4. Eliminar entradas basura "Modelo" y "MODELO_HEADER" ──────────────────
// Eliminamos el bloque completo { ... } incluyendo la coma/nueva-línea anterior
const junkIds = ['Modelo', 'MODELO_HEADER'];
let count4 = 0;
junkIds.forEach(junkId => {
  const escaped = junkId.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  // Matches the full object block preceded by optional comma+whitespace
  const blockPattern = new RegExp(
    `,?\\s*\\{[^{}]*"id":\\s*"${escaped}"[^{}]*\\}`,
    's'
  );
  if (blockPattern.test(src)) {
    src = src.replace(blockPattern, '');
    count4++;
    console.log(`  🗑  Eliminado: ${junkId}`);
  } else {
    console.log(`  ⚠️  No encontrado: ${junkId}`);
  }
});

// ── Escribir ─────────────────────────────────────────────────────────────────
fs.writeFileSync(dataPath, src, 'utf8');

console.log('\n─'.repeat(60));
console.log(`✅ Packaged sin marca corregidos:   ${count1}/8 → CARRIER`);
console.log(`✅ Mini-splits EHV corregidos:      ${count2}/2 → TLC`);
console.log(`✅ Carrier sin categoría corregidos: ${count3}/4 → mini-splits/Heat Pump/CARRIER`);
console.log(`🗑  Entradas basura eliminadas:      ${count4}/2`);
console.log('📁 data.js actualizado');
