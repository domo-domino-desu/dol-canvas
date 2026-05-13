import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginVue } from "@rsbuild/plugin-vue";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const srcRoot = fileURLToPath(new URL("../src", import.meta.url));
const imgRoot = fileURLToPath(new URL("../img", import.meta.url));
const cdnRoot = "https://cdn.jsdelivr.net/gh/domo-domino-desu/dol-canvas@main/";
const importSource = process.env.DOL_CANVAS_SOURCE === "cdn" ? "cdn" : "local";

export default defineConfig({
  root: repoRoot,
  plugins: [pluginVue()],
  source: {
    entry: {
      index: "./demo/src/main.ts",
    },
    define: {
      __DOL_CANVAS_IMPORT_SOURCE__: JSON.stringify(importSource),
      __DOL_CANVAS_LOCAL_IMG_BASE__: JSON.stringify("/"),
      __DOL_CANVAS_CDN_IMG_BASE__: JSON.stringify(`${cdnRoot}img/`),
    },
  },
  html: {
    template: "./demo/index.html",
  },
  resolve: {
    alias: {
      "@": srcRoot,
      "dol-canvas/vue": fileURLToPath(new URL("../src/vue/index.ts", import.meta.url)),
      "dol-canvas": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
  server: {
    base: process.env.DOL_CANVAS_BASE ?? "/",
    host: "0.0.0.0",
    publicDir: {
      name: imgRoot,
      copyOnBuild: false,
      watch: true,
    },
  },
  output: {
    distPath: {
      root: "demo/dist",
    },
    cleanDistPath: true,
  },
});
