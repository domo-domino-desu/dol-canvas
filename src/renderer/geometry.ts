import type { LayerSpec } from "@/types";

export interface SourceSize {
  width: number;
  height: number;
}

export interface FrameInfo {
  sx: number;
  sw: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export function sourceSize(source: CanvasImageSource): SourceSize {
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

export function sourceFrameWidth(width: number, height: number): number {
  return height;
}

export function sourceFrameCount(source: CanvasImageSource, layer: LayerSpec): number {
  const { width, height } = sourceSize(source);
  const frameWidth = sourceFrameWidth(width, height);
  const inferredCount = Math.max(1, Math.ceil(width / frameWidth));
  return layer.frameCount ?? inferredCount;
}

export function frameInfo(source: CanvasImageSource, layer: LayerSpec, frame: number): FrameInfo {
  const { width, height } = sourceSize(source);
  const frameWidth = sourceFrameWidth(width, height);
  const frameCount = sourceFrameCount(source, layer);
  const safeFrame = layer.animation
    ? Math.max(0, Math.floor(frame)) % frameCount
    : Math.min(Math.max(0, Math.floor(frame)), frameCount - 1);
  const sx = safeFrame * frameWidth;
  const sw = Math.max(0, Math.min(frameWidth, width - sx));

  return { sx, sw, frameWidth, frameHeight: height, frameCount };
}

export function drawSourceFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  source: CanvasImageSource,
  layer: LayerSpec,
  frame: number,
  destFrameX = 0,
): void {
  const { sx, sw, frameWidth, frameHeight } = frameInfo(source, layer, frame);
  if (sw <= 0) return;

  const clip = layer.sourceClip;
  if (!clip) {
    const dw = canvasWidth * (sw / frameWidth);
    const dx = destFrameX + canvasWidth * ((layer.dx ?? 0) / frameWidth);
    const dy = canvasHeight * ((layer.dy ?? 0) / frameHeight);
    ctx.drawImage(source, sx, 0, sw, frameHeight, dx, dy, dw, canvasHeight);
    return;
  }

  const clipX = Math.max(0, Math.floor(clip.x));
  const clipY = Math.max(0, Math.floor(clip.y));
  const availableW = Math.max(0, sw - clipX);
  const sourceW = Math.max(0, Math.min(Math.floor(clip.width), frameWidth - clipX, availableW));
  const sourceH = Math.max(0, Math.min(Math.floor(clip.height), frameHeight - clipY));
  if (sourceW <= 0 || sourceH <= 0) return;

  const sourceX = sx + clipX;
  const destX = destFrameX + canvasWidth * ((clipX + (layer.dx ?? 0)) / frameWidth);
  const destY = canvasHeight * ((clipY + (layer.dy ?? 0)) / frameHeight);
  const destW = canvasWidth * (sourceW / frameWidth);
  const destH = canvasHeight * (sourceH / frameHeight);

  ctx.drawImage(source, sourceX, clipY, sourceW, sourceH, destX, destY, destW, destH);
}
