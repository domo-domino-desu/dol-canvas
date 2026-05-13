import type { App } from "vue";
import DolCanvasVue from "./DolCanvas.vue";
export { DolCanvasVue as DolCanvas };
export { DolCanvas as DolCanvasRenderer } from "../index";
export type * from "../index";
declare const _default: {
    install(app: App): void;
};
export default _default;
