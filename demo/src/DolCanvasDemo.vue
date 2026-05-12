<template>
  <canvas ref="canvasRef" :width="size" :height="size" :style="style" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { DolCanvas } from "dol-canvas";
import type { CharacterPayload, RenderError } from "dol-canvas";

const props = withDefaults(
  defineProps<{
    payload: CharacterPayload;
    size?: number;
    baseUrl?: string;
    animate?: boolean;
    onError?: (e: RenderError) => void;
  }>(),
  {
    size: 256,
    animate: false,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let instance: DolCanvas | null = null;

const style = computed(() => ({
  imageRendering: "pixelated",
  display: "block",
}));

function renderNow() {
  if (!instance) return;
  if (props.animate) {
    instance.startAnimation(props.payload, props.onError);
  } else {
    instance.render(props.payload, props.onError);
  }
}

onMounted(() => {
  if (!canvasRef.value) return;
  instance = new DolCanvas(canvasRef.value, props.baseUrl);
  renderNow();
});

onUnmounted(() => {
  instance?.stopAnimation();
  instance = null;
});

watch(
  () => props.payload,
  () => {
    if (!instance) return;
    if (props.animate && instance.isAnimating) {
      instance.updateAnimation(props.payload, props.onError);
    } else {
      renderNow();
    }
  },
  { deep: true },
);

watch(() => props.animate, renderNow);

watch(
  () => props.baseUrl,
  (url) => {
    if (!canvasRef.value) return;
    instance?.stopAnimation();
    instance = new DolCanvas(canvasRef.value, url);
    renderNow();
  },
);
</script>
