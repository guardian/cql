import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  define: {
    "process.platform": '"web"',
  },
  build: {
    sourcemap: true,
  },
  plugins: [
    react({
        jsxImportSource: "@emotion/react",

    }),

  ],
});
