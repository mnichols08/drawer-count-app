// Generate a comprehensive icon set from the SVG using the favicons Node API
// - Writes all generated images into src/icons/
// - Ensures PWA-required icons exist as src/icons/icon-192.png and src/icons/icon-512.png
// - Writes favicon.ico to the project root for broad browser compatibility

const path = require('path');
const fs = require('fs');
let favicons;

const source = path.join(__dirname, '..', 'src', 'icons', 'favicon.svg');
const outputPath = path.join(__dirname, '..', 'src', 'icons');
const projectRoot = path.join(__dirname, '..');

(async () => {
  try {
    // ESM-only module: load via dynamic import in CJS
    ({ default: favicons } = await import('favicons'));
    if (!fs.existsSync(source)) {
      console.error('Missing src/icons/favicon.svg');
      process.exit(1);
    }

    // Config: generate common cross-platform icons
    const configuration = {
      path: './src/icons',
      appName: 'Drawer Count',
      appShortName: 'Drawers',
      background: '#0b132b',
      theme_color: '#0b132b',
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: false,
        favicons: true,
        windows: true,
        yandex: false
      }
    };

    // Ensure output directories exist
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

    const response = await favicons(source, configuration);

    // Write all generated images into src/icons
    for (const img of response.images) {
      const dest = path.join(outputPath, img.name);
      fs.writeFileSync(dest, img.contents);
      console.log('Wrote:', path.relative(process.cwd(), dest));
    }

    // Ensure PWA filenames used by our manifest exist
    const file192 = response.images.find((f) => /(?:^|\/)android-chrome-192x192\.png$/.test(f.name))
      || response.images.find((f) => /192x192\.png$/.test(f.name));
    const file512 = response.images.find((f) => /(?:^|\/)android-chrome-512x512\.png$/.test(f.name))
      || response.images.find((f) => /512x512\.png$/.test(f.name));

    if (file192) {
      const out192 = path.join(outputPath, 'icon-192.png');
      fs.writeFileSync(out192, file192.contents);
      console.log('Wrote:', path.relative(process.cwd(), out192));
    } else {
      console.warn('Warning: 192x192 icon not found in generated outputs.');
    }
    if (file512) {
      const out512 = path.join(outputPath, 'icon-512.png');
      fs.writeFileSync(out512, file512.contents);
      console.log('Wrote:', path.relative(process.cwd(), out512));
    } else {
      console.warn('Warning: 512x512 icon not found in generated outputs.');
    }

    // Write favicon.ico to project root if generated
    const ico = response.images.find((f) => /\.ico$/.test(f.name));
    if (ico) {
      const icoPath = path.join(projectRoot, 'favicon.ico');
      fs.writeFileSync(icoPath, ico.contents);
      console.log('Wrote:', path.relative(process.cwd(), icoPath));
    }

    // Optionally write additional files like browserconfig.xml (skip overwriting our manifest)
    for (const file of response.files) {
      if (file.name === 'browserconfig.xml') {
        const dest = path.join(projectRoot, file.name);
        fs.writeFileSync(dest, file.contents);
        console.log('Wrote:', path.relative(process.cwd(), dest));
      }
      // Skip writing generated manifest; we maintain our own
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
