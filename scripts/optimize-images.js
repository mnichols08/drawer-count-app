/**
 * Optimize images in ./src/images while preserving transparency.
 * - Recompress .png files losslessly (or near-lossless)
 * - Generate .webp versions with alpha
 *
 * Usage:
 *   node ./scripts/optimize-images.js [--all]
 * By default, optimizes known background images. Use --all to process all PNGs in ./src/images.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.resolve(__dirname, '../src/images');
const TARGET_FILES = [
  '1g-eclipse-bg.png',
  'crownvic-bg.png',
  'eclipse-challenge-bg.png',
  'vw-bg.png',
];

async function optimizePng(pngPath) {
  const buf = await fs.promises.readFile(pngPath);
  const pipeline = sharp(buf);
  // Ensure we keep alpha; apply max compression level
  const optimized = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  // Only overwrite if smaller
  if (optimized.length < buf.length) {
    await fs.promises.writeFile(pngPath, optimized);
    console.log(`PNG optimized: ${path.basename(pngPath)} -> ${(optimized.length/1024).toFixed(1)} KB`);
  } else {
    console.log(`PNG unchanged (no smaller): ${path.basename(pngPath)}`);
  }
}

async function generateWebp(pngPath) {
  const base = pngPath.replace(/\.png$/i, '');
  const webpPath = `${base}.webp`;
  const buf = await fs.promises.readFile(pngPath);
  const webp = await sharp(buf)
    // Use WebP with alpha support; moderate quality for size/smoothness
    .webp({ quality: 82, alphaQuality: 80, effort: 6 })
    .toBuffer();
  // Write/overwrite .webp
  await fs.promises.writeFile(webpPath, webp);
  console.log(`WebP created: ${path.basename(webpPath)} -> ${(webp.length/1024).toFixed(1)} KB`);
}

async function main() {
  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  let files = [];
  if (processAll) {
    files = (await fs.promises.readdir(IMAGES_DIR))
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .map((f) => path.join(IMAGES_DIR, f));
  } else {
    files = TARGET_FILES.map((f) => path.join(IMAGES_DIR, f)).filter((p) => fs.existsSync(p));
  }
  if (!files.length) {
    console.log('No PNG files found to optimize.');
    return;
  }
  for (const file of files) {
    try {
      await optimizePng(file);
      await generateWebp(file);
    } catch (err) {
      console.error(`Failed to optimize ${path.basename(file)}:`, err.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
