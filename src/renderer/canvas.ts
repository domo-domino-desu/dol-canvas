import type { LayerSpec } from "@/types";
import { applyFilter } from "@/renderer/color";

// ── Image loading ────────────────────────────────────────────────────────────

const _cache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (_cache.has(src)) return Promise.resolve(_cache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      _cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export function clearImageCache(): void {
  _cache.clear();
}

// ── Compositor ───────────────────────────────────────────────────────────────

export interface RenderError {
  src: string;
  error: Error;
}

export interface RenderResult {
  errors: RenderError[];
}

function sourceSize(source: CanvasImageSource): { width: number; height: number } {
  if ("naturalWidth" in source && "naturalHeight" in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if ("displayWidth" in source && "displayHeight" in source) {
    return { width: source.displayWidth, height: source.displayHeight };
  }
  const width = typeof source.width === "number" ? source.width : source.width.baseVal.value;
  const height = typeof source.height === "number" ? source.height : source.height.baseVal.value;
  return { width, height };
}

function frameInfo(source: CanvasImageSource, layer: LayerSpec) {
  const { width, height } = sourceSize(source);
  const frameWidth = height;
  const inferredCount = Math.max(1, Math.ceil(width / frameWidth));
  const frameCount = layer.frameCount ?? inferredCount;
  const rawFrame = Math.max(0, Math.floor(layer.frame ?? 0));
  const frame = layer.animation ? rawFrame % frameCount : Math.min(rawFrame, frameCount - 1);
  const sx = frame * frameWidth;
  const sw = Math.max(0, Math.min(frameWidth, width - sx));

  return { sx, sw, frameWidth, frameHeight: height };
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  layer: LayerSpec,
): void {
  const { sx, sw, frameWidth, frameHeight } = frameInfo(source, layer);
  if (sw <= 0) return;

  const clip = layer.sourceClip;
  if (!clip) {
    const dw = canvas.width * (sw / frameWidth);
    ctx.drawImage(source, sx, 0, sw, frameHeight, 0, 0, dw, canvas.height);
    return;
  }

  const clipX = Math.max(0, Math.floor(clip.x));
  const clipY = Math.max(0, Math.floor(clip.y));
  const availableW = Math.max(0, sw - clipX);
  const sourceW = Math.max(0, Math.min(Math.floor(clip.width), frameWidth - clipX, availableW));
  const sourceH = Math.max(0, Math.min(Math.floor(clip.height), frameHeight - clipY));
  if (sourceW <= 0 || sourceH <= 0) return;

  const sourceX = sx + clipX;
  const destX = canvas.width * (clipX / frameWidth);
  const destY = canvas.height * (clipY / frameHeight);
  const destW = canvas.width * (sourceW / frameWidth);
  const destH = canvas.height * (sourceH / frameHeight);

  ctx.drawImage(source, sourceX, clipY, sourceW, sourceH, destX, destY, destW, destH);
}

/**
 * Render a list of LayerSpecs onto the given canvas.
 * Layers are sorted by z-index before drawing.
 * Images that fail to load are silently skipped (reported in result.errors).
 */
export async function renderLayers(
  canvas: HTMLCanvasElement,
  layers: LayerSpec[],
  onError?: (e: RenderError) => void,
): Promise<RenderResult> {
  const errors: RenderError[] = [];

  // Filter visible layers and sort by z
  const visible = layers.filter((l) => l.show !== false).sort((a, b) => a.z - b.z);

  // Load all images in parallel
  const loaded = await Promise.allSettled(visible.map((l) => loadImage(l.src)));

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < visible.length; i++) {
    const result = loaded[i]!;
    if (result.status === "rejected") {
      const err: RenderError = { src: visible[i]!.src, error: result.reason as Error };
      errors.push(err);
      onError?.(err);
      continue;
    }

    const layer = visible[i]!;
    const img = result.value;

    let source: CanvasImageSource = img;
    if (layer.filter) {
      source = applyFilter(img, layer.filter);
    }

    if (layer.alpha != null && layer.alpha !== 1) {
      ctx.globalAlpha = layer.alpha;
    }
    drawLayer(ctx, canvas, source, layer);
    if (layer.alpha != null && layer.alpha !== 1) {
      ctx.globalAlpha = 1;
    }
  }

  return { errors };
}
