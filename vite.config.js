import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  root: 'src',
  base: '/modules/hintz-manor/',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/scripts/main.js'),
      name: 'HintzManor',
      formats: ['es'],
      fileName: () => 'scripts/main.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'styles/hintz-manor.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  plugins: [
    {
      name: 'copy-manifest-and-assets',
      writeBundle() {
        if (fs.existsSync('src/module.json')) {
          fs.copyFileSync('src/module.json', 'dist/module.json');
        }
        if (fs.existsSync('src/templates')) {
          fs.cpSync('src/templates', 'dist/templates', { recursive: true });
        }
        if (fs.existsSync('src/styles')) {
          fs.cpSync('src/styles', 'dist/styles', { recursive: true });
        }
      }
    }
  ]
});
