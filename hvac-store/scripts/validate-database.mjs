import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { products, categories } from '../src/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(__dirname, '..', 'public', 'images');

// 1. Load actual image list
let actualImages = new Set();
try {
  const files = fs.readdirSync(imagesDir);
  actualImages = new Set(files.map(f => f.toLowerCase()));
} catch (e) {
  console.error('Error reading images directory:', e);
  process.exit(1);
}

// 2. Load categories structure
const catMap = new Map(categories.map(c => [c.id, c]));

console.log('--- STARTING DATABASE VALIDATION ---');
console.log(`Total products to validate: ${products.length}\n`);

const brokenImages = [];
const invalidCategories = [];
const invalidSubcategories = [];
const nullPrices = [];
const missingImages = [];
const potentialMismatches = [];

products.forEach((p, idx) => {
  const model = p.model || 'UNKNOWN';
  const name = p.name || 'UNKNOWN';
  const sku = p.sku || 'UNKNOWN';
  const brand = p.brand || 'UNKNOWN';
  const desc = p.description || '';
  const price = p.price;
  
  // A. Check image fields
  const imgPath = p.img;
  const imagePath = p.image;
  
  if (!imgPath && !imagePath) {
    missingImages.push({ idx, model, brand, sku, reason: 'Both img and image fields are empty/missing' });
  } else {
    [imgPath, imagePath].forEach((img, fIdx) => {
      const fieldName = fIdx === 0 ? 'img' : 'image';
      if (!img) {
        missingImages.push({ idx, model, brand, sku, reason: `Field "${fieldName}" is empty` });
        return;
      }
      
      if (!img.startsWith('/images/')) {
        brokenImages.push({ idx, model, brand, sku, img, reason: `Path "${img}" does not start with "/images/"` });
        return;
      }
      
      const fileName = img.replace('/images/', '');
      if (!actualImages.has(fileName.toLowerCase())) {
        brokenImages.push({ idx, model, brand, sku, img, reason: `File "${fileName}" does not exist in public/images/` });
      }
    });
  }

  // B. Check category
  if (!p.category) {
    invalidCategories.push({ idx, model, brand, sku, reason: 'Category field is empty' });
  } else if (!catMap.has(p.category)) {
    invalidCategories.push({ idx, model, brand, sku, category: p.category, reason: 'Category does not exist in categories definition' });
  } else {
    // Check subcategory
    const cat = catMap.get(p.category);
    if (!p.subcategory) {
      invalidSubcategories.push({ idx, model, brand, sku, reason: 'Subcategory field is empty' });
    } else if (!cat.subs.includes(p.subcategory)) {
      invalidSubcategories.push({ idx, model, brand, sku, category: p.category, subcategory: p.subcategory, reason: `Subcategory "${p.subcategory}" is not valid for category "${p.category}"` });
    }
  }

  // C. Check price
  if (price === null || price === undefined) {
    nullPrices.push({ idx, model, brand, sku, price, reason: 'Price is null or undefined' });
  } else if (typeof price !== 'number' || isNaN(price)) {
    nullPrices.push({ idx, model, brand, sku, price, reason: `Price is not a valid number: ${typeof price}` });
  } else if (price <= 0) {
    nullPrices.push({ idx, model, brand, sku, price, reason: 'Price is 0 or negative' });
  }

  // D. Check category/product-type mismatches (Categorías correctas)
  // Let's check some common keywords
  const descLower = desc.toLowerCase();
  const nameLower = name.toLowerCase();
  const modelLower = model.toLowerCase();
  const brandLower = brand.toLowerCase();
  
  // 1. Minisplits:
  // If category is mini-splits, make sure it's a minisplit (or has minisplit/muro/piso techo in description/model)
  // If category is central-ac, make sure it's central AC (e.g. condesadoras, evaporadoras, fan coils, manejadoras)
  // Let's highlight any products that might be miscategorized
  
  if (p.category === 'mini-splits') {
    // If it contains "manejadora" or "fan coil" or "paquete", it might be commercial/central-ac
    if (descLower.includes('manejadora multiposicion') || descLower.includes('divided fan coil') || descLower.includes('paquete')) {
      potentialMismatches.push({
        idx, model, brand, sku,
        category: p.category,
        subcategory: p.subcategory,
        desc,
        reason: 'Product in mini-splits contains central/commercial terms (manejadora, fan coil, paquete)'
      });
    }
  }
  
  if (p.category === 'central-ac') {
    // central-ac has subcategories: Sistemas Divididos, Condensadoras, Evaporadoras
    if (p.subcategory === 'Evaporadoras' && descLower.includes('minisplit')) {
      // Check if it's really central-ac, because a minisplit evaporator pair is minisplit
      if (!descLower.includes('manejadora') && !descLower.includes('fan coil') && !descLower.includes('piso techo') && !descLower.includes('cassette')) {
        potentialMismatches.push({
          idx, model, brand, sku,
          category: p.category,
          subcategory: p.subcategory,
          desc,
          reason: 'Product in central-ac is described as minisplit evaporadora but has no central AC keywords'
        });
      }
    }
  }
});

console.log('=== SUMMARY OF VALIDATION ===');
console.log(`Broken/missing image references: ${brokenImages.length}`);
if (brokenImages.length > 0) {
  brokenImages.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Path: ${err.img} | Reason: ${err.reason}`));
}

console.log(`\nProducts with completely empty/missing images: ${missingImages.length}`);
if (missingImages.length > 0) {
  missingImages.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Reason: ${err.reason}`));
}

console.log(`\nInvalid category fields: ${invalidCategories.length}`);
if (invalidCategories.length > 0) {
  invalidCategories.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Cat: ${err.category} | Reason: ${err.reason}`));
}

console.log(`\nInvalid subcategory fields: ${invalidSubcategories.length}`);
if (invalidSubcategories.length > 0) {
  invalidSubcategories.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Subcat: ${err.subcategory} | Reason: ${err.reason}`));
}

console.log(`\nInvalid/Null/Zero prices: ${nullPrices.length}`);
if (nullPrices.length > 0) {
  nullPrices.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Price: ${err.price} | Reason: ${err.reason}`));
}

console.log(`\nPotential category mismatches: ${potentialMismatches.length}`);
if (potentialMismatches.length > 0) {
  potentialMismatches.forEach(err => console.log(`  - [Idx ${err.idx}] SKU: ${err.sku} | Brand: ${err.brand} | Cat/Sub: ${err.category}/${err.subcategory} | Desc: "${err.desc}" | Reason: ${err.reason}`));
}

console.log('\n--- VALIDATION COMPLETED ---');
