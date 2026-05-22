import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

import(pathToFileURL(dataPath).href).then(module => {
  const products = module.products;
  const carrierProducts = products.filter(p => p.brand === 'CARRIER');
  
  // Let's count the unique image paths for Carrier
  const imageCounts = {};
  carrierProducts.forEach(p => {
    imageCounts[p.img] = (imageCounts[p.img] || 0) + 1;
  });
  
  console.log('Carrier products image paths and counts:');
  console.log(imageCounts);
  
}).catch(err => {
  console.error('Error importing data:', err);
});
