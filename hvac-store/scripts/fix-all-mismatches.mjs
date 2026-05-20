import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { categories, products, brands } from '../src/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

console.log('--- RUNNING programmatic mismatch fixer ---');
console.log(`Original product count: ${products.length}`);

// Apply correction rules
let fixedCount = 0;
products.forEach((p) => {
  const originalCat = p.category;
  const originalSub = p.subcategory;

  if (p.category === 'comercial') {
    p.category = 'commercial';
  }

  // 1. ACCC products (Condensadora Comercial SF) -> category: central-ac, subcategory: Condensadoras
  if (p.id.startsWith('ACCC')) {
    p.category = 'central-ac';
    p.subcategory = 'Condensadoras';
  }
  // 2. ACADX products (Manejadora Comercial SF) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('ACADX')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 3. 42QSS products (Evaporador inverter fan coil) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('42QSS')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 4. 40EIQ products (Fan coil inverter) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('40EIQ')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 5. 38INQ products (Condensadora inverter) -> category: central-ac, subcategory: Condensadoras
  else if (p.id.startsWith('38INQ')) {
    p.category = 'central-ac';
    p.subcategory = 'Condensadoras';
  }
  // 6. 38LVMB products (Condensadora) -> category: central-ac, subcategory: Condensadoras
  else if (p.id.startsWith('38LVMB')) {
    p.category = 'central-ac';
    p.subcategory = 'Condensadoras';
  }
  // 7. 42QHG products (Evaporador high wall) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('42QHG')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 8. t-mbq4-01e (Panel Cassette) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id === 't-mbq4-01e') {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 9. 42QTD products (Cassette inverter) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('42QTD')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 10. 40CAS products (Panel Cassette) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('40CAS-')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 11. 40KIQ products (Cassette inverter) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('40KIQ')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 12. 40VIQ products (Piso techo inverter) -> category: central-ac, subcategory: Evaporadoras
  else if (p.id.startsWith('40VIQ')) {
    p.category = 'central-ac';
    p.subcategory = 'Evaporadoras';
  }
  // 13. IPRHI3616KC-3 -> category: packaged, subcategory: Bombas de Calor Empacadas
  else if (p.id === 'IPRHI3616KC-3') {
    p.category = 'packaged';
    p.subcategory = 'Bombas de Calor Empacadas';
  }
  // 14. 50NPB and 50NL (Paquete res SF) -> category: packaged, subcategory: Gas/Eléctricas
  else if (p.id.startsWith('50NPB') || p.id.startsWith('50NL-')) {
    p.category = 'packaged';
    p.subcategory = 'Gas/Eléctricas';
  }
  // 15. 50NHB and 50NT (Paquete res HP) -> category: packaged, subcategory: Bombas de Calor Empacadas
  else if (p.id.startsWith('50NHB') || p.id.startsWith('50NT-')) {
    p.category = 'packaged';
    p.subcategory = 'Bombas de Calor Empacadas';
  }
  // 16. 48NL products (Paquete res GAS HEAT) -> category: packaged, subcategory: Gas/Eléctricas
  else if (p.id.startsWith('48NL-')) {
    p.category = 'packaged';
    p.subcategory = 'Gas/Eléctricas';
  }
  // 17. 50VSQ products (Paquete Inverter res HP) -> category: packaged, subcategory: Bombas de Calor Empacadas
  else if (p.id.startsWith('50VSQ')) {
    p.category = 'packaged';
    p.subcategory = 'Bombas de Calor Empacadas';
  }
  // 18. 38AU products (Condensadoras Comerciales) -> category: commercial, subcategory: Condensadoras
  else if (p.id.startsWith('38AU')) {
    p.category = 'commercial';
    p.subcategory = 'Condensadoras';
  }
  // 19. 40RF and 40RU products (Manejadoras Comerciales) -> category: commercial, subcategory: Manejadoras
  else if (p.id.startsWith('40RF') || p.id.startsWith('40RU')) {
    p.category = 'commercial';
    p.subcategory = 'Manejadoras';
  }
  // 20. 42CT and 42BB products (Fan & Coil Comerciales) -> category: commercial, subcategory: Fan and Coil
  else if (p.id.startsWith('42CT') || p.id.startsWith('42BB')) {
    p.category = 'commercial';
    p.subcategory = 'Fan and Coil';
  }

  if (p.category !== originalCat || p.subcategory !== originalSub) {
    fixedCount++;
    console.log(`  Updated ${p.id}:`);
    console.log(`    Cat: "${originalCat}" -> "${p.category}"`);
    console.log(`    Sub: "${originalSub}" -> "${p.subcategory}"`);
  }
});

console.log(`\nModified ${fixedCount} products in memory.`);

// In-memory validation
const validCatIds = categories.map(c => c.id);
const catSubMap = {};
categories.forEach(c => {
  catSubMap[c.id] = c.subs;
});

const invalidCategories = [];
const invalidSubcategories = [];
const missingFields = [];

products.forEach((p, idx) => {
  if (!p.category) {
    missingFields.push({ id: p.id, field: 'category' });
  } else if (!validCatIds.includes(p.category)) {
    invalidCategories.push({ id: p.id, category: p.category });
  }

  if (!p.subcategory) {
    missingFields.push({ id: p.id, field: 'subcategory' });
  } else if (p.category && validCatIds.includes(p.category)) {
    const allowedSubs = catSubMap[p.category];
    const isValid = allowedSubs.some(sub => sub.toLowerCase() === p.subcategory.toLowerCase());
    if (!isValid) {
      invalidSubcategories.push({ id: p.id, category: p.category, subcategory: p.subcategory });
    }
  }

  if (!p.brand) {
    missingFields.push({ id: p.id, field: 'brand' });
  }
});

console.log(`\nValidation results:`);
console.log(`  - Invalid Categories: ${invalidCategories.length}`);
console.log(`  - Invalid Subcategories: ${invalidSubcategories.length}`);
console.log(`  - Missing/Empty Fields: ${missingFields.length}`);

if (invalidCategories.length > 0 || invalidSubcategories.length > 0 || missingFields.length > 0) {
  console.log('⚠️ Still have validation issues! Will not write to file. Issues:');
  console.log('Invalid subcategories left:', invalidSubcategories);
  console.log('Missing fields left:', missingFields);
  process.exit(1);
}

// Perform safe replacement in data.js file
console.log('\nAll validation checks passed! Saving changes...');

let fileContent = fs.readFileSync(dataPath, 'utf8');

// We find where export const products starts
const startMarker = 'export const products = [';
const startIndex = fileContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Could not find start of products array in data.js!');
  process.exit(1);
}

// We generate the formatted products array string
const formattedProducts = JSON.stringify(products, null, 2);

// Construct new file content: keeping everything before "export const products = ["
// and replacing the rest with the updated array
const newContent = fileContent.substring(0, startIndex) + 'export const products = ' + formattedProducts + ';\n';

fs.writeFileSync(dataPath, newContent, 'utf8');
console.log('🎉 data.js successfully updated with clean categories and subcategories!');
