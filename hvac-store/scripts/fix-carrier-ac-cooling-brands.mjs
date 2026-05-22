import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data.js');

let src = fs.readFileSync(dataPath, 'utf8');

// Target SKUs to move from AC COOLING to CARRIER
const targetCarrierSkus = [
  '50NPB024---3',
  '50NPB036---3',
  '50NPB048---3',
  '50NPB060---3',
  '50NHB024---3',
  '50NHB036---3',
  '50NHB048---3',
  '50NHB060---3',
  '40KIQ363A32-E',
  '40KIQ603A32-E',
  '40VIQ363A32-E',
  '40VIQ603A32-E'
];

let brandCount = 0;
let imageCount = 0;

// Image corrections configuration
const imageCorrections = {
  '40KIQ363A32-E': '/images/CASSETTE.png',
  '40KIQ603A32-E': '/images/CASSETTE.png',
  '40VIQ363A32-E': '/images/PISO TECHO.png',
  '40VIQ603A32-E': '/images/PISO TECHO.png',
  '38ACHP363-CO': '/images/CONDENSADORA HP.png'
};

// Precise block-based replacement for each SKU
const allTargetSkus = Array.from(new Set([...targetCarrierSkus, ...Object.keys(imageCorrections)]));

allTargetSkus.forEach(sku => {
  const skuStr = `"sku": "${sku}"`;
  const skuIndex = src.indexOf(skuStr);
  
  if (skuIndex === -1) {
    console.log(`  ⚠️ SKU not found: ${sku}`);
    return;
  }
  
  // Find the start brace { before skuIndex
  const startBraceIndex = src.lastIndexOf('{', skuIndex);
  // Find the end brace } after skuIndex
  const endBraceIndex = src.indexOf('}', skuIndex);
  
  if (startBraceIndex === -1 || endBraceIndex === -1 || startBraceIndex > skuIndex || endBraceIndex < skuIndex) {
    console.log(`  ❌ Failed to parse block boundaries for SKU: ${sku}`);
    return;
  }
  
  // Extract block
  const originalBlock = src.substring(startBraceIndex, endBraceIndex + 1);
  let updatedBlock = originalBlock;
  
  // 1. Correct brand if in target list
  if (targetCarrierSkus.includes(sku)) {
    const brandPattern = /"brand":\s*"AC COOLING"/;
    if (brandPattern.test(updatedBlock)) {
      updatedBlock = updatedBlock.replace(brandPattern, `"brand": "CARRIER"`);
      brandCount++;
      console.log(`  ✅ Brand corrected for SKU ${sku} → CARRIER`);
    }
  }
  
  // 2. Correct images if in imageCorrections list
  if (sku in imageCorrections) {
    const newImg = imageCorrections[sku];
    
    // Replace "img"
    const imgPattern = /"img":\s*"[^"]*"/;
    if (imgPattern.test(updatedBlock)) {
      updatedBlock = updatedBlock.replace(imgPattern, `"img": "${newImg}"`);
    }
    
    // Replace "image"
    const imagePattern = /"image":\s*"[^"]*"/;
    if (imagePattern.test(updatedBlock)) {
      updatedBlock = updatedBlock.replace(imagePattern, `"image": "${newImg}"`);
    }
    
    if (updatedBlock !== originalBlock) {
      imageCount++;
      console.log(`  📸 Image corrected for SKU ${sku} → ${newImg}`);
    }
  }
  
  // Replace the block in source string
  if (originalBlock !== updatedBlock) {
    src = src.substring(0, startBraceIndex) + updatedBlock + src.substring(endBraceIndex + 1);
  }
});

if (brandCount > 0 || imageCount > 0) {
  fs.writeFileSync(dataPath, src, 'utf8');
  console.log(`\n🎉 Success! Corrected ${brandCount} brand labels and ${imageCount} image references in data.js.`);
} else {
  console.log('\n⚠️ No changes were made.');
}
