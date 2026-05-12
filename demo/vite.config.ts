import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const demoRoot = fileURLToPath(new URL(".", import.meta.url));
const imgRoot = fileURLToPath(new URL("../img", import.meta.url));
const cdnRoot = "https://cdn.jsdelivr.net/gh/domo-domino-desu/dol-canvas@main/";
const cdnImgBase = `${cdnRoot}img/`;
const importSource = process.env.DOL_CANVAS_SOURCE === "cdn" ? "cdn" : "local";
const base = process.env.DOL_CANVAS_BASE ?? "/";

export default defineConfig({
  root: demoRoot,
  base,
  plugins: [vue()],
  define: {
    __DOL_CANVAS_IMPORT_SOURCE__: JSON.stringify(importSource),
    __DOL_CANVAS_LOCAL_IMG_BASE__: JSON.stringify(`/@fs/${imgRoot}/`),
    __DOL_CANVAS_CDN_IMG_BASE__: JSON.stringify(cdnImgBase),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
      "dol-canvas/vue": fileURLToPath(new URL("../src/vue/index.ts", import.meta.url)),
      "dol-canvas":
        importSource === "cdn"
          ? `${cdnRoot}dist/dol-canvas.esm.js`
          : fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
