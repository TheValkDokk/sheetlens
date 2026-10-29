import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: "index.html",
        g1: "guides/what-does-this-excel-formula-mean.html",
        g2: "guides/understand-a-spreadsheet-someone-else-built.html",
        g3: "guides/find-hardcoded-numbers-in-an-excel-model.html",
        g4: "guides/excel-ref-error-what-to-do.html",
      },
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
} as any);
