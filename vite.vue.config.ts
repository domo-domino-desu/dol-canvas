import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/vue/index.ts",
      name: "DolCanvasVue",
      formats: ["es", "umd"],
      fileName: (format) => `dol-canvas-vue.${format === "es" ? "esm" : "umd"}.js`,
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
