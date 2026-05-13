import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "@rslib/core";
import { pluginVue } from "@rsbuild/plugin-vue";

const srcRoot = fileURLToPath(new URL("src", import.meta.url));

const dts = {
  alias: {
    "@": "./src",
  },
};

export default defineConfig({
  plugins: [pluginVue()],
  resolve: {
    alias: {
      "@": srcRoot,
    },
  },
  output: {
    target: "web",
    distPath: {
      root: "dist",
      js: ".",
    },
    filename: {
      js: "[name].js",
    },
    filenameHash: false,
    cleanDistPath: true,
  },
  lib: [
    {
      id: "core-esm",
      format: "esm",
      source: {
        tsconfigPath: "./tsconfig.build.json",
        entry: {
          "dol-canvas.esm": "./src/index.ts",
        },
      },
      dts,
    },
    {
      id: "core-umd",
      format: "umd",
      umdName: "DolCanvas",
      source: {
        tsconfigPath: "./tsconfig.build.json",
        entry: {
          "dol-canvas.umd": "./src/index.ts",
        },
      },
      dts: false,
    },
    {
      id: "vue-esm",
      format: "esm",
      source: {
        tsconfigPath: "./tsconfig.build.json",
        entry: {
          "dol-canvas-vue.esm": "./src/vue/index.ts",
        },
      },
      output: {
        externals: ["vue"],
      },
      dts: {
        ...dts,
      },
    },
    {
      id: "vue-umd",
      format: "umd",
      umdName: "DolCanvasVue",
      source: {
        tsconfigPath: "./tsconfig.build.json",
        entry: {
          "dol-canvas-vue.umd": "./src/vue/index.ts",
        },
      },
      output: {
        externals: {
          vue: "Vue",
        },
      },
      dts: false,
    },
  ],
});
