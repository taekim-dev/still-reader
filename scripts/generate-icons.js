/**
 * Generate simple placeholder icons for the Chrome extension.
 * Creates minimal PNG files with a simple "S" letter design.
 */

import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createIcon(size) {
  const png = new PNG({ width: size, height: size });
  
  // Fill with a dark background (#111 - matches our theme)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 17;     // R
      png.data[idx + 1] = 17; // G
      png.data[idx + 2] = 17; // B
      png.data[idx + 3] = 255; // A
    }
  }
  
  // Draw a simple "S" letter in white
  const centerX = size / 2;
  const centerY = size / 2;
  const strokeWidth = Math.max(2, Math.floor(size / 16));
  const radius = size * 0.25;
  
  // Draw top curve of S
  for (let angle = 0; angle < Math.PI; angle += 0.1) {
    const x = Math.floor(centerX + radius * Math.cos(angle));
    const y = Math.floor(centerY - radius * 0.5 + radius * 0.3 * Math.sin(angle));
    if (x >= 0 && x < size && y >= 0 && y < size) {
      for (let dy = -strokeWidth; dy <= strokeWidth; dy++) {
        for (let dx = -strokeWidth; dx <= strokeWidth; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = (size * py + px) << 2;
            png.data[idx] = 255;     // R
            png.data[idx + 1] = 255; // G
            png.data[idx + 2] = 255; // B
          }
        }
      }
    }
  }
  
  // Draw bottom curve of S
  for (let angle = 0; angle < Math.PI; angle += 0.1) {
    const x = Math.floor(centerX - radius * Math.cos(angle));
    const y = Math.floor(centerY + radius * 0.5 + radius * 0.3 * Math.sin(angle));
    if (x >= 0 && x < size && y >= 0 && y < size) {
      for (let dy = -strokeWidth; dy <= strokeWidth; dy++) {
        for (let dx = -strokeWidth; dx <= strokeWidth; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = (size * py + px) << 2;
            png.data[idx] = 255;     // R
            png.data[idx + 1] = 255; // G
            png.data[idx + 2] = 255; // B
          }
        }
      }
    }
  }
  
  return PNG.sync.write(png);
}

const iconsDir = resolve(__dirname, '../dist/icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
const sizes = [16, 48, 128];
sizes.forEach((size) => {
  const iconData = createIcon(size);
  const filePath = resolve(iconsDir, `icon${size}.png`);
  writeFileSync(filePath, iconData);
  console.log(`Created ${filePath} (${size}x${size})`);
});

console.log('Icons generated successfully!');

