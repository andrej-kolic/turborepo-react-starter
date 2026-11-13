import { defineConfig } from 'vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';

export default defineConfig({
  plugins: [],
  build: {
    target: browserslistToEsbuild(),
  },
  // publicDir: appCorePublic
});
