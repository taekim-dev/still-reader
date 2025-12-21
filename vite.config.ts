import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

// Plugin to copy manifest and popup HTML
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy popup.html
      copyFileSync(
        resolve(__dirname, 'src/extension/popup.html'),
        resolve(distDir, 'popup.html')
      );

      // Create icons directory placeholder (user should add actual icons)
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [copyExtensionFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/extension/content.ts'),
        background: resolve(__dirname, 'src/extension/background.ts'),
        popup: resolve(__dirname, 'src/extension/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});

