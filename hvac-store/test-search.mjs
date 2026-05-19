import { products } from './src/data.js';
function normalizeSearchString(str){ return String(str||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function search(query){ const qNorm = normalizeSearchString(query);
  return products.filter(p=> normalizeSearchString([p.name,p.model,p.sku,p.description,p.brand,p.category,p.subcategory,p.btus].filter(Boolean).join(' ')).includes(qNorm));
}
['S12P-ECV23','S12PECV23','s12p-ecv23','S12P-ECV13','S12P-EHV23','50FCQA04A2A3-0A0A0'].forEach(q=>{
  const r = search(q);
  console.log(q, '=>', r.length ? r.map(p=>p.model || p.name) : 'NO MATCH');
});
