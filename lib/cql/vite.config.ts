import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.platform": '"web"',
  },
  build: {
    sourcemap: true,
  },
});
