import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "DolCanvas",
      formats: ["es", "umd"],
      fileName: (format) => `dol-canvas.${format === "es" ? "esm" : "umd"}.js`,
    },
    rollupOptions: {
      external: [],
      output: { exports: "named" },
    },
  },
});
