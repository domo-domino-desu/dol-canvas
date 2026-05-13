import type { LayerSpec } from "@/types";
import { createWorkCanvas } from "@/renderer/canvas-factory";
import { applyFilter } from "@/renderer/color";
import { drawSourceFrame, sourceFrameCount } from "@/renderer/geometry";
import { loadImage } from "@/renderer/image-cache";
import type { CompiledLayer, RenderError, RenderResult } from "@/renderer/types";

interface CompileLayerResult {
  layer?: CompiledLayer;
  error?: RenderError;
}

function initialFrame(layer: LayerSpec, frameCount: number): number {
  const rawFrame = Math.max(0, Math.floor(layer.frame ?? 0));
  return layer.animation ? rawFrame % frameCount : Math.min(rawFrame, frameCount - 1);
}

async function loadMasks(layer: LayerSpec): Promise<HTMLImageElement[]> {
  const srcs = (layer.maskSrcs ?? []).filter(Boolean);
  if (!srcs.length) return [];
  const result = await Promise.allSettled(srcs.map((src) => loadImage(src)));
  if (result.some((entry) => entry.status === "rejected")) return [];
  return result.map((entry) => (entry as PromiseFulfilledResult<HTMLImageElement>).value);
}

async function compileLayer(
  canvas: HTMLCanvasElement,
  layer: LayerSpec,
): Promise<CompileLayerResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(layer.src);
  } catch (error) {
    return { error: { src: layer.src, error: error as Error } };
  }

  const masks = await loadMasks(layer);
  const source = layer.filter ? applyFilter(img, layer.filter) : img;
  const frameCount = sourceFrameCount(source, layer);
  const sheet = createWorkCanvas(canvas.width * frameCount, canvas.height);
  const maskLayer: LayerSpec = { ...layer, dx: 0, dy: 0, sourceClip: undefined };

  for (let frame = 0; frame < frameCount; frame++) {
    const destFrameX = frame * canvas.width;
    drawSourceFrame(sheet.ctx, canvas.width, canvas.height, source, layer, frame, destFrameX);
  }

  for (const mask of masks) {
    const maskSheet = createWorkCanvas(canvas.width * frameCount, canvas.height);
    for (let frame = 0; frame < frameCount; frame++) {
      const destFrameX = frame * canvas.width;
      drawSourceFrame(
        maskSheet.ctx,
        canvas.width,
        canvas.height,
        mask,
        maskLayer,
        frame,
        destFrameX,
      );
    }
    sheet.ctx.globalCompositeOperation = "destination-in";
    sheet.ctx.drawImage(maskSheet.canvas, 0, 0);
    sheet.ctx.globalCompositeOperation = "source-over";
  }

  return {
    layer: {
      id: layer.id,
      source: sheet.canvas,
      z: layer.z,
      dx: 0,
      dy: 0,
      frameWidth: canvas.width,
      frameHeight: canvas.height,
      frameCount,
      animation: layer.animation,
      alpha: layer.alpha ?? 1,
      frame: initialFrame(layer, frameCount),
    },
  };
}

export async function compileLayers(
  canvas: HTMLCanvasElement,
  layers: LayerSpec[],
  onError?: (e: RenderError) => void,
): Promise<{ layers: CompiledLayer[]; result: RenderResult }> {
  const visible = layers.filter((l) => l.show !== false).sort((a, b) => a.z - b.z);
  const compiled = await Promise.all(visible.map((layer) => compileLayer(canvas, layer)));
  const errors: RenderError[] = [];
  const compiledLayers: CompiledLayer[] = [];

  for (const entry of compiled) {
    if (entry.error) {
      errors.push(entry.error);
      onError?.(entry.error);
    }
    if (entry.layer) compiledLayers.push(entry.layer);
  }

  return { layers: compiledLayers, result: { errors } };
}
