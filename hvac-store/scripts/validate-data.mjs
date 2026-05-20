import { categories, products } from '../src/data.js';

console.log('--- STARTING DATA VALIDATION ---');
console.log(`Total products in data.js: ${products.length}\n`);

const validCatIds = categories.map(c => c.id);
const catSubMap = {};
categories.forEach(c => {
  catSubMap[c.id] = c.subs;
});

const invalidCategories = [];
const invalidSubcategories = [];
const missingFields = [];

products.forEach((p, idx) => {
  // Check category
  if (!p.category) {
    missingFields.push({ index: idx, id: p.id, field: 'category' });
  } else if (!validCatIds.includes(p.category)) {
    invalidCategories.push({ index: idx, id: p.id, category: p.category });
  }

  // Check subcategory
  if (!p.subcategory) {
    missingFields.push({ index: idx, id: p.id, field: 'subcategory' });
  } else if (p.category && validCatIds.includes(p.category)) {
    const allowedSubs = catSubMap[p.category];
    // Check case-insensitive match or slug match
    const isValid = allowedSubs.some(sub => sub.toLowerCase() === p.subcategory.toLowerCase());
    if (!isValid) {
      invalidSubcategories.push({
        index: idx,
        id: p.id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        allowed: allowedSubs
      });
    }
  }

  // Check brand
  if (!p.brand) {
    missingFields.push({ index: idx, id: p.id, field: 'brand' });
  }
});

console.log(`❌ Products with invalid categories: ${invalidCategories.length}`);
invalidCategories.forEach(item => {
  console.log(`  - Product ID: ${item.id}, Invalid Category: "${item.category}"`);
});

console.log(`\n❌ Products with invalid subcategories: ${invalidSubcategories.length}`);
invalidSubcategories.forEach(item => {
  console.log(`  - Product ID: ${item.id}, Name: "${item.name}"`);
  console.log(`    Category: "${item.category}"`);
  console.log(`    Subcategory: "${item.subcategory}" (Expected one of: ${JSON.stringify(item.allowed)})`);
});

console.log(`\n❌ Products with missing fields: ${missingFields.length}`);
missingFields.forEach(item => {
  console.log(`  - Product ID: ${item.id}, Missing Field: "${item.field}"`);
});

console.log('\n--- VALIDATION COMPLETE ---');
