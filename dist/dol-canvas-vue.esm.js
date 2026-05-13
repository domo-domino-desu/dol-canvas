import { computed, createElementBlock, defineComponent, normalizeStyle, onMounted, onUnmounted, openBlock, ref, watch } from "vue";
import { DolCanvas } from "dol-canvas";
const _hoisted_1 = [
    "width",
    "height"
];
const DolCanvasvue_type_script_setup_true_lang_ts = /*@__PURE__*/ defineComponent({
    __name: 'DolCanvas',
    props: {
        payload: {},
        size: {
            default: 256
        },
        baseUrl: {},
        animate: {
            type: Boolean,
            default: false
        },
        onError: {}
    },
    setup (__props) {
        const props = __props;
        const canvasRef = ref(null);
        let instance = null;
        const style = computed(()=>({
                imageRendering: "pixelated",
                display: "block"
            }));
        function renderNow() {
            if (!instance) return;
            if (props.animate) instance.startAnimation(props.payload, props.onError);
            else instance.render(props.payload, props.onError);
        }
        onMounted(()=>{
            if (!canvasRef.value) return;
            instance = new DolCanvas(canvasRef.value, props.baseUrl);
            renderNow();
        });
        onUnmounted(()=>{
            instance?.stopAnimation();
            instance = null;
        });
        watch(()=>props.payload, ()=>{
            if (!instance) return;
            if (props.animate && instance.isAnimating) instance.updateAnimation(props.payload, props.onError);
            else renderNow();
        }, {
            deep: true
        });
        watch(()=>props.animate, renderNow);
        watch(()=>props.baseUrl, (url)=>{
            if (!canvasRef.value) return;
            instance?.stopAnimation();
            instance = new DolCanvas(canvasRef.value, url);
            renderNow();
        });
        return (_ctx, _cache)=>(openBlock(), createElementBlock("canvas", {
                ref_key: "canvasRef",
                ref: canvasRef,
                width: __props.size,
                height: __props.size,
                style: normalizeStyle(style.value)
            }, null, 12, _hoisted_1));
    }
});
const __exports__ = DolCanvasvue_type_script_setup_true_lang_ts;
const vue_DolCanvas = __exports__;
const vue = {
    install (app) {
        app.component("DolCanvas", vue_DolCanvas);
    }
};
export default vue;
export { DolCanvas as DolCanvasRenderer, vue_DolCanvas as DolCanvas };
