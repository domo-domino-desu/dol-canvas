import type { LayerSpec } from "@/types";
import { compileLayers } from "@/renderer/compiler";
import { clearImageCache } from "@/renderer/image-cache";
import type { CompiledLayer, FrameResolver, RenderError, RenderResult } from "@/renderer/types";

export { clearImageCache };
export type { RenderError, RenderResult };

export function drawCompiledLayers(
  canvas: HTMLCanvasElement,
  layers: CompiledLayer[],
  frameResolver?: FrameResolver,
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const layer of layers) {
    const rawFrame = frameResolver?.(layer) ?? layer.frame;
    const frame = Math.max(0, Math.floor(rawFrame)) % layer.frameCount;
    const sx = frame * layer.frameWidth;

    if (layer.alpha !== 1) ctx.globalAlpha = layer.alpha;
    ctx.drawImage(
      layer.source,
      sx,
      0,
      layer.frameWidth,
      layer.frameHeight,
      layer.dx,
      layer.dy,
      layer.frameWidth,
      layer.frameHeight,
    );
    if (layer.alpha !== 1) ctx.globalAlpha = 1;
  }
}

/**
 * Render a list of LayerSpecs onto the given canvas.
 * Layers are compiled first so static rendering and animation share the same path.
 */
export async function renderLayers(
  canvas: HTMLCanvasElement,
  layers: LayerSpec[],
  onError?: (e: RenderError) => void,
): Promise<RenderResult> {
  const compiled = await compileLayers(canvas, layers, onError);
  drawCompiledLayers(canvas, compiled.layers);
  return compiled.result;
}
