import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

import(pathToFileURL(dataPath).href).then(module => {
  const products = module.products;
  const acCoolingProducts = products.filter(p => p.brand === 'AC COOLING');
  console.log(`Found ${acCoolingProducts.length} AC COOLING products.`);
  
  acCoolingProducts.forEach((p, index) => {
    console.log(`[${index}] SKU: ${p.sku} | Name: "${p.name}" | Img: "${p.img}" | Desc: "${p.description?.substring(0, 60)}"`);
  });
}).catch(err => {
  console.error('Error importing data:', err);
});
