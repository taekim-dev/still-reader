import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Plugin to copy manifest and popup HTML
function copyExtensionFiles(): Plugin {
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

      // Copy settings.html
      copyFileSync(
        resolve(__dirname, 'src/extension/settings.html'),
        resolve(distDir, 'settings.html')
      );

      // Generate icons
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }
      try {
        execSync('node scripts/generate-icons.js', { stdio: 'inherit', cwd: resolve(__dirname) });
      } catch (error) {
        console.warn('Failed to generate icons:', error);
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
        settings: resolve(__dirname, 'src/extension/settings.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        format: 'es', // ES modules (default, but explicit for clarity)
        inlineDynamicImports: false,
        manualChunks: undefined, // Let Vite decide chunking
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});

