import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');
const outputPath = path.join(__dirname, 'ac-cooling-list.txt');

import(pathToFileURL(dataPath).href).then(module => {
  const products = module.products;
  const acCoolingProducts = products.filter(p => p.brand === 'AC COOLING');
  let output = `Analyzing ${acCoolingProducts.length} AC COOLING products...\n`;
  
  acCoolingProducts.forEach((p, index) => {
    output += `----------------------------------------\n`;
    output += `Index: ${index}\n`;
    output += `SKU: ${p.sku}\n`;
    output += `Name: ${p.name}\n`;
    output += `Brand: ${p.brand}\n`;
    output += `Img: ${p.img}\n`;
    output += `Image: ${p.image}\n`;
    output += `Category: ${p.category}\n`;
    output += `Subcategory: ${p.subcategory}\n`;
    output += `Description: ${p.description}\n`;
  });
  
  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`Saved output to ${outputPath}`);
}).catch(err => {
  console.error('Error importing data:', err);
});
