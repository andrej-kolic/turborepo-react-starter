import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths"; // set up aliases from tsconfig

export default defineConfig({
  plugins: [tsconfigPaths()],
  // publicDir: appCorePublic
});
