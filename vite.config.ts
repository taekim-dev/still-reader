import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';


// Plugin to ensure background worker is self-contained (no ES module syntax)
function inlineBackgroundWorker(): Plugin {
  return {
    name: 'inline-background-worker',
    generateBundle(options, bundle) {
      const backgroundChunk = bundle['background.js'];
      if (backgroundChunk && backgroundChunk.type === 'chunk') {
        const chunksToInline: string[] = [];
        const processedChunks = new Set<string>();
        
        const findDeps = (chunkName: string, visited = new Set<string>()) => {
          if (visited.has(chunkName)) return;
          visited.add(chunkName);
          
          const chunk = bundle[chunkName];
          if (chunk && chunk.type === 'chunk') {
            [...(chunk.imports || []), ...(chunk.dynamicImports || [])].forEach((imp) => {
              if (!chunksToInline.includes(imp) && !processedChunks.has(imp)) {
                chunksToInline.push(imp);
                findDeps(imp, visited);
              }
            });
          }
        };
        
        findDeps('background.js');
        
        if (chunksToInline.length > 0) {
          let combinedCode = backgroundChunk.code;
          
          chunksToInline.forEach((chunkName) => {
            const chunk = bundle[chunkName];
            if (chunk && chunk.type === 'chunk') {
              processedChunks.add(chunkName);
              
              // Remove import statements
              const importRegex1 = new RegExp(`import[^'"]*from['"]\\./${chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"];?\\s*`, 'g');
              const importRegex2 = new RegExp(`import\\(['"]\\./${chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"]\\)`, 'g');
              combinedCode = combinedCode.replace(importRegex1, '');
              combinedCode = combinedCode.replace(importRegex2, '');
              
              // Remove export statements from inlined code
              let chunkCode = chunk.code;
              chunkCode = chunkCode.replace(/export\s+{[^}]*}\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\{[^}]*\}\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\s+[^;{}]*\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '');
              
              combinedCode = chunkCode + '\n' + combinedCode;
              delete bundle[chunkName];
            }
          });
          
          // Remove any remaining export/import statements
          combinedCode = combinedCode.replace(/export\s+{[^}]*}\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\{[^}]*\}\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\s+[^;{}]*\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '');
          combinedCode = combinedCode.replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '');
          combinedCode = combinedCode.replace(/import\s*\([^)]*\)\s*;?/g, '');
          
          backgroundChunk.code = combinedCode;
        }
        
        // Always remove export/import statements from background.js
        backgroundChunk.code = backgroundChunk.code
          .replace(/export\s+{[^}]*}\s*;?/g, '')
          .replace(/export\{[^}]*\}\s*;?/g, '')
          .replace(/export\s+[^;{}]*\s*;?/g, '')
          .replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '')
          .replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '')
          .replace(/import\s*\([^)]*\)\s*;?/g, '');
      }
    },
  };
}

// Plugin to fix background.js after build (remove imports/exports, fix function references)
function fixBackgroundWorker(): Plugin {
  return {
    name: 'fix-background-worker',
    writeBundle() {
      const backgroundPath = resolve(__dirname, 'dist/background.js');
      if (!existsSync(backgroundPath)) return;

      let code = readFileSync(backgroundPath, 'utf-8');

      // Remove all import statements
      code = code.replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '');
      code = code.replace(/import\s*\([^)]*\)\s*;?/g, '');
      code = code.replace(/import\s*\{[^}]*\}\s*from\s+['"][^'"]*['"]\s*;?/g, '');
      code = code.replace(/import\s+['"][^'"]*['"]\s*;?/g, '');
      code = code.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, '');
      code = code.replace(/import\s+\w+\s+from\s+['"][^'"]*['"]\s*;?/g, '');

      // Remove all export statements
      code = code.replace(/export\s+{[^}]*}\s*;?/g, '');
      code = code.replace(/export\{[^}]*\}\s*;?/g, '');
      code = code.replace(/export\s+[^;{}]*\s*;?/g, '');
      code = code.replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '');

      // Fix function reference: m() should be t() (getAIConfig is minified as t)
      // The storage functions are: t=getAIConfig, c=saveAIConfig, n=clearAIConfig
      // If m() is called, it's likely the minified name for getAIConfig which should be t
      code = code.replace(/\bawait\s+m\(\)/g, 'await t()');
      code = code.replace(/\bm\(\)/g, 't()');

      writeFileSync(backgroundPath, code, 'utf-8');
    },
  };
}

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
  plugins: [inlineBackgroundWorker(), fixBackgroundWorker(), copyExtensionFiles()],
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
        inlineDynamicImports: false,
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});

