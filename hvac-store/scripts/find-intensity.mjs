import { products } from '../src/data.js';

const intensityProds = products.filter(p => p.brand === 'INTENSITY');
console.log('Intensity products:', intensityProds.length);
intensityProds.forEach(p => {
  console.log(`ID: ${p.id}, Brand: ${p.brand}, Category: ${p.category}, Subcategory: ${p.subcategory}, Description: ${p.description.substring(0, 60)}, Image: ${p.img}`);
});
