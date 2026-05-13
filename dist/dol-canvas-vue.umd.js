(function(root, factory) {
    if ('object' == typeof exports && 'object' == typeof module) module.exports = factory(require("Vue"), require("dol-canvas"));
    else if ('function' == typeof define && define.amd) define([
        "Vue",
        "dol-canvas"
    ], factory);
    else if ('object' == typeof exports) exports["DolCanvasVue"] = factory(require("Vue"), require("dol-canvas"));
    else root["DolCanvasVue"] = factory(root["Vue"], root["DolCanvas"]);
})(globalThis, (__rspack_external_vue, __rspack_external__index)=>(()=>{
        "use strict";
        var __webpack_modules__ = {
            vue (module1) {
                module1.exports = __rspack_external_vue;
            },
            "@/index" (module1) {
                module1.exports = __rspack_external__index;
            }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(moduleId) {
            var cachedModule = __webpack_module_cache__[moduleId];
            if (void 0 !== cachedModule) return cachedModule.exports;
            var module1 = __webpack_module_cache__[moduleId] = {
                exports: {}
            };
            __webpack_modules__[moduleId](module1, module1.exports, __webpack_require__);
            return module1.exports;
        }
        (()=>{
            __webpack_require__.d = (exports1, definition)=>{
                for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
                    enumerable: true,
                    get: definition[key]
                });
            };
        })();
        (()=>{
            __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
        })();
        (()=>{
            __webpack_require__.r = (exports1)=>{
                if ("u" > typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
                    value: 'Module'
                });
                Object.defineProperty(exports1, '__esModule', {
                    value: true
                });
            };
        })();
        var __webpack_exports__ = {};
        (()=>{
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                DolCanvas: ()=>DolCanvas,
                DolCanvasRenderer: ()=>external_commonjs2_dol_canvas_root_DolCanvas_amd_dol_canvas_commonjs_dol_canvas_.DolCanvas,
                default: ()=>vue
            });
            var external_Vue_ = __webpack_require__("vue");
            var external_commonjs2_dol_canvas_root_DolCanvas_amd_dol_canvas_commonjs_dol_canvas_ = __webpack_require__("@/index");
            const _hoisted_1 = [
                "width",
                "height"
            ];
            const DolCanvasvue_type_script_setup_true_lang_ts = /*@__PURE__*/ (0, external_Vue_.defineComponent)({
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
                    const canvasRef = (0, external_Vue_.ref)(null);
                    let instance = null;
                    const style = (0, external_Vue_.computed)(()=>({
                            imageRendering: "pixelated",
                            display: "block"
                        }));
                    function renderNow() {
                        if (!instance) return;
                        if (props.animate) instance.startAnimation(props.payload, props.onError);
                        else instance.render(props.payload, props.onError);
                    }
                    (0, external_Vue_.onMounted)(()=>{
                        if (!canvasRef.value) return;
                        instance = new external_commonjs2_dol_canvas_root_DolCanvas_amd_dol_canvas_commonjs_dol_canvas_.DolCanvas(canvasRef.value, props.baseUrl);
                        renderNow();
                    });
                    (0, external_Vue_.onUnmounted)(()=>{
                        instance?.stopAnimation();
                        instance = null;
                    });
                    (0, external_Vue_.watch)(()=>props.payload, ()=>{
                        if (!instance) return;
                        if (props.animate && instance.isAnimating) instance.updateAnimation(props.payload, props.onError);
                        else renderNow();
                    }, {
                        deep: true
                    });
                    (0, external_Vue_.watch)(()=>props.animate, renderNow);
                    (0, external_Vue_.watch)(()=>props.baseUrl, (url)=>{
                        if (!canvasRef.value) return;
                        instance?.stopAnimation();
                        instance = new external_commonjs2_dol_canvas_root_DolCanvas_amd_dol_canvas_commonjs_dol_canvas_.DolCanvas(canvasRef.value, url);
                        renderNow();
                    });
                    return (_ctx, _cache)=>((0, external_Vue_.openBlock)(), (0, external_Vue_.createElementBlock)("canvas", {
                            ref_key: "canvasRef",
                            ref: canvasRef,
                            width: __props.size,
                            height: __props.size,
                            style: (0, external_Vue_.normalizeStyle)(style.value)
                        }, null, 12, _hoisted_1));
                }
            });
            const __exports__ = DolCanvasvue_type_script_setup_true_lang_ts;
            const DolCanvas = __exports__;
            const vue = {
                install (app) {
                    app.component("DolCanvas", DolCanvas);
                }
            };
        })();
        return __webpack_exports__;
    })());
