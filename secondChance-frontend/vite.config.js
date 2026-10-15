import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [{
    name: 'course-jsx-files',
    enforce: 'pre',
    async transform(code, id) {
      if (/\/src\/.*\.js$/.test(id.replaceAll('\\', '/'))) {
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      }
    }
  }, react()],
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  server: { proxy: { '/api': 'http://127.0.0.1:3060', '/images': 'http://127.0.0.1:3060', '/uploads': 'http://127.0.0.1:3060' } }
});
