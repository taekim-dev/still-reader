import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';


// Shared state to track which chunks have been inlined
const inlinedChunks = new Set<string>();

// Plugin to inline dependencies for specific entry points
function inlineDependencies(entryName: string): Plugin {
  return {
    name: `inline-dependencies-${entryName}`,
    generateBundle(options, bundle) {
      const entryChunk = bundle[entryName];
      if (!entryChunk || entryChunk.type !== 'chunk') return;
      
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
        
        findDeps(entryName);
        
        if (chunksToInline.length > 0) {
          let combinedCode = entryChunk.code;
          
          chunksToInline.forEach((chunkName) => {
            const chunk = bundle[chunkName];
            if (chunk && chunk.type === 'chunk') {
              processedChunks.add(chunkName);
              
              // Remove import statements (handle both regular and minified formats)
              // But don't remove for settings.js - it needs the import to load the chunk file
              if (entryName !== 'settings.js') {
                // Match: import{...}from"./chunk-name.js" or import {...} from "./chunk-name.js"
                const importRegex1 = new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]\\./${chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"];?\\s*`, 'g');
                const importRegex2 = new RegExp(`import[^'"]*from['"]\\./${chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"];?\\s*`, 'g');
                const importRegex3 = new RegExp(`import\\(['"]\\./${chunkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"]\\)`, 'g');
                combinedCode = combinedCode.replace(importRegex1, '');
                combinedCode = combinedCode.replace(importRegex2, '');
                combinedCode = combinedCode.replace(importRegex3, '');
              }
              
              // Remove export statements from inlined code
              let chunkCode = chunk.code;
              chunkCode = chunkCode.replace(/export\s+{[^}]*}\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\{[^}]*\}\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\s+[^;{}]*\s*;?/g, '');
              chunkCode = chunkCode.replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '');
              
              // For settings.js, don't inline - let it use the chunk file normally
              // This avoids variable name conflicts
              // Just don't process it - leave the import statement and chunk file as-is
              if (entryName === 'settings.js') {
                return; // Skip inlining for settings.js - it will use the chunk file
              } else {
                // For background.js, just prepend (it's already handled differently)
                combinedCode = chunkCode + '\n' + combinedCode;
              }
              inlinedChunks.add(chunkName);
            } else {
              console.warn(`[${entryName}] Chunk ${chunkName} not found in bundle`);
            }
          });
          
          // Remove any remaining export/import statements
          combinedCode = combinedCode.replace(/export\s+{[^}]*}\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\{[^}]*\}\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\s+[^;{}]*\s*;?/g, '');
          combinedCode = combinedCode.replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '');
          combinedCode = combinedCode.replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '');
          combinedCode = combinedCode.replace(/import\s*\([^)]*\)\s*;?/g, '');
          
          entryChunk.code = combinedCode;
        }
        
        // Clean up inlined chunks at the end (after all entries have processed)
        // Don't delete chunks that settings.js needs - it uses them as separate files
        if (entryName === 'background.js') {
          // Only delete chunks that were inlined into background.js
          // settings.js will use the chunk file directly
          inlinedChunks.forEach((chunkName) => {
            // Only delete if it was actually inlined (check if it's still in bundle)
            // Actually, don't delete at all - let settings.js use the chunk file
          });
        }
        
      // For background.js, remove all export/import statements (service worker can't use ES modules)
      if (entryName === 'background.js') {
        entryChunk.code = entryChunk.code
          .replace(/export\s+{[^}]*}\s*;?/g, '')
          .replace(/export\{[^}]*\}\s*;?/g, '')
          .replace(/export\s+[^;{}]*\s*;?/g, '')
          .replace(/export\s+(default\s+)?(function|const|let|var|class|async\s+function)\s+/g, '')
          .replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '')
          .replace(/import\s*\([^)]*\)\s*;?/g, '');
      } else if (entryName === 'settings.js') {
        // For settings.js, keep import statements - it uses chunk files
        // Don't remove imports for settings.js
      } else {
        // For other entries, remove all import statements
        entryChunk.code = entryChunk.code
          .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?/g, '')
          .replace(/import\s+[^'"]*from\s+['"][^'"]*['"]\s*;?/g, '')
          .replace(/import\s*\([^)]*\)\s*;?/g, '');
      }
    },
  };
}

// Plugin to ensure background worker is self-contained (no ES module syntax)
function inlineBackgroundWorker(): Plugin {
  return inlineDependencies('background.js');
}

// Plugin to inline storage into settings.js
function inlineSettingsDependencies(): Plugin {
  return inlineDependencies('settings.js');
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

      // Fix function reference: m() and u() should be t() (getAIConfig is minified as t)
      // The storage functions are: t=getAIConfig, c=saveAIConfig, n=clearAIConfig
      // If m() or u() is called, it's likely the minified name for getAIConfig which should be t
      code = code.replace(/\bawait\s+m\(\)/g, 'await t()');
      code = code.replace(/\bm\(\)/g, 't()');
      code = code.replace(/\bawait\s+u\(\)/g, 'await t()');
      code = code.replace(/\bu\(\)/g, 't()');

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
  plugins: [inlineBackgroundWorker(), inlineSettingsDependencies(), fixBackgroundWorker(), copyExtensionFiles()],
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
        manualChunks: undefined, // Let Vite decide chunking
      },
      // Don't inline dependencies for settings.js - let it use the chunk file
      external: (id) => {
        // Don't externalize anything - we want to inline for background.js but not for settings.js
        return false;
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});

