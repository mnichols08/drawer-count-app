// Generate PNG icons (192, 512) from the SVG using the favicons Node API
// Writes to src/icons/icon-192.png and src/icons/icon-512.png

const path = require('path');
const fs = require('fs');
let favicons;

const source = path.join(__dirname, '..', 'src', 'icons', 'favicon.svg');
const outputPath = path.join(__dirname, '..', 'src', 'icons');

(async () => {
  try {
    // ESM-only module: load via dynamic import in CJS
    ({ default: favicons } = await import('favicons'));
    if (!fs.existsSync(source)) {
      console.error('Missing src/icons/favicon.svg');
      process.exit(1);
    }

    // Minimal config: only generate the android chrome icons we want, no HTML/manifest outputs
    const configuration = {
      path: './src/icons',
      appName: 'Drawer Count',
      appShortName: 'Drawers',
      background: '#0b132b',
      icons: {
        android: true,
        appleIcon: false,
        appleStartup: false,
        favicons: true,
        windows: false,
        yandex: false
      }
    };

    const response = await favicons(source, configuration);

    // Find 192 and 512 from the generated files
    const file192 = response.images.find((f) => /192x192\.png$/.test(f.name));
    const file512 = response.images.find((f) => /512x512\.png$/.test(f.name));

    if (!file192 || !file512) {
      console.error('Failed to generate required PNG sizes.');
      process.exit(1);
    }

    const out192 = path.join(outputPath, 'icon-192.png');
    const out512 = path.join(outputPath, 'icon-512.png');

    fs.writeFileSync(out192, file192.contents);
    fs.writeFileSync(out512, file512.contents);

    console.log('Wrote:', path.relative(process.cwd(), out192));
    console.log('Wrote:', path.relative(process.cwd(), out512));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
