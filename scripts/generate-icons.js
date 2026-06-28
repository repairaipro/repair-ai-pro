#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, '../public/favicon.svg');
const outputDir = path.join(__dirname, '../public');

const svg = fs.readFileSync(svgPath, 'utf8');

async function generateIcons() {
  try {
    // Generate 192×192
    await sharp(Buffer.from(svg))
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'icon-192x192.png'));
    console.log('✓ Generated icon-192x192.png');

    // Generate 512×512
    await sharp(Buffer.from(svg))
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'icon-512x512.png'));
    console.log('✓ Generated icon-512x512.png');

    // Generate maskable 192×192 (adds padding for safe zone)
    await sharp(Buffer.from(svg))
      .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 21,
        bottom: 21,
        left: 21,
        right: 21,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outputDir, 'icon-192x192-maskable.png'));
    console.log('✓ Generated icon-192x192-maskable.png');

    // Generate maskable 512×512
    await sharp(Buffer.from(svg))
      .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outputDir, 'icon-512x512-maskable.png'));
    console.log('✓ Generated icon-512x512-maskable.png');

    console.log('\n✅ All PWA icons generated successfully');
  } catch (err) {
    console.error('❌ Icon generation failed:', err.message);
    process.exit(1);
  }
}

generateIcons();
