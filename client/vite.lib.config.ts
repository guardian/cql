import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.platform": '"web"',
  },
  build: {
    minify: true,
    lib: {
      entry: "src/lib.ts",
      name: "Cql",
      // the proper extensions will be added
      fileName: "lib",
      formats: ["es"],
    },
  },
});
