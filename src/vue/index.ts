import type { App } from "vue";
import DolCanvasVue from "@/vue/DolCanvas.vue";

export { DolCanvasVue as DolCanvas };
export { DolCanvas as DolCanvasRenderer } from "@/index";
export type * from "@/index";

export default {
  install(app: App) {
    app.component("DolCanvas", DolCanvasVue);
  },
};
