import type { BrightnessGradient, ColorFilter, ColorGradient } from "@/types";
import { createWorkCanvas, resizeWorkCanvas } from "@/renderer/canvas-factory";
import { sourceSize } from "@/renderer/geometry";
import type { RenderCanvas, RenderContext } from "@/renderer/types";

const scratch: Array<{ canvas: RenderCanvas; ctx: RenderContext } | undefined> = [];

function scratchCanvas(
  index: number,
  w: number,
  h: number,
): { canvas: RenderCanvas; ctx: RenderContext } {
  const entry =
    scratch[index] ?? (scratch[index] = createWorkCanvas(1, 1, { willReadFrequently: true }));
  resizeWorkCanvas(entry.canvas, w, h);
  entry.ctx.setTransform(1, 0, 0, 1, 0, 0);
  entry.ctx.globalAlpha = 1;
  entry.ctx.globalCompositeOperation = "source-over";
  entry.ctx.clearRect(0, 0, w, h);
  entry.ctx.imageSmoothingEnabled = false;
  return entry;
}

function grayHex(v: number): string {
  const b = Math.round(Math.min(1, Math.max(0, v)) * 255);
  const s = b.toString(16).padStart(2, "0");
  return `#${s}${s}${s}`;
}

function frameWidthFor(w: number, h: number): number {
  return w > h && w % h === 0 ? h : w;
}

function createGradient(
  ctx: RenderContext,
  spec: ColorGradient | BrightnessGradient,
): CanvasGradient {
  const values = spec.values;
  const gradient =
    spec.gradient === "radial"
      ? ctx.createRadialGradient(
          values[0] ?? 0,
          values[1] ?? 0,
          values[2] ?? 0,
          values[3] ?? 0,
          values[4] ?? 0,
          values[5] ?? 0,
        )
      : ctx.createLinearGradient(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 0);

  const stops =
    "colors" in spec
      ? spec.colors
      : spec.adjustments.map(([offset, value]) => [offset, grayHex(1 + value)] as [number, string]);
  for (const [offset, color] of stops) {
    gradient.addColorStop(Math.min(1, Math.max(0, offset)), color);
  }
  return gradient;
}

function drawFill(
  ctx: RenderContext,
  w: number,
  h: number,
  fill: string | ColorGradient | BrightnessGradient,
): void {
  if (typeof fill === "string") {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const fw = frameWidthFor(w, h);
  const frames = Math.max(1, Math.ceil(w / fw));
  ctx.fillStyle = createGradient(ctx, fill);
  ctx.fillRect(0, 0, fw, h);

  for (let frame = 1; frame < frames; frame++) {
    ctx.drawImage(ctx.canvas, 0, 0, fw, h, frame * fw, 0, Math.min(fw, w - frame * fw), h);
  }
}

function applyContrast(ctx: RenderContext, w: number, h: number, contrast: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i]! - 128) * contrast + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1]! - 128) * contrast + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2]! - 128) * contrast + 128));
  }

  ctx.putImageData(imageData, 0, 0);
}

function restoreAlpha(ctx: RenderContext, img: CanvasImageSource): void {
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

function composeFillUnder(
  ctx: RenderContext,
  w: number,
  h: number,
  fill: string | ColorGradient | BrightnessGradient,
  blendMode: GlobalCompositeOperation,
): void {
  const fillCtx = scratchCanvas(0, w, h).ctx;
  drawFill(fillCtx, w, h, fill);
  ctx.globalCompositeOperation = blendMode;
  ctx.drawImage(fillCtx.canvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

function applyBrightnessGradient(
  ctx: RenderContext,
  w: number,
  h: number,
  img: CanvasImageSource,
  brightness: BrightnessGradient,
): void {
  const inits = brightness.adjustments.map(([offset, value]) => ({
    offset,
    grey: value > 0 ? grayHex(value) : grayHex(1 + value),
    neutral: value > 0 ? "#000000" : "#FFFFFF",
    blendMode: (value > 0 ? "color-dodge" : "multiply") as GlobalCompositeOperation,
  }));
  const [first, second] = inits;
  if (!first || !second) return;

  if (first.blendMode !== second.blendMode) {
    composeFillUnder(
      ctx,
      w,
      h,
      {
        gradient: brightness.gradient,
        values: brightness.values,
        colors: [
          [first.offset, first.grey],
          [second.offset, first.neutral],
        ],
      },
      first.blendMode,
    );
    restoreAlpha(ctx, img);
    composeFillUnder(
      ctx,
      w,
      h,
      {
        gradient: brightness.gradient,
        values: brightness.values,
        colors: [
          [first.offset, second.neutral],
          [second.offset, second.grey],
        ],
      },
      second.blendMode,
    );
    restoreAlpha(ctx, img);
    return;
  }

  composeFillUnder(
    ctx,
    w,
    h,
    {
      gradient: brightness.gradient,
      values: brightness.values,
      colors: [
        [first.offset, first.grey],
        [second.offset, second.grey],
      ],
    },
    first.blendMode,
  );
  restoreAlpha(ctx, img);
}

/**
 * Apply a ColorFilter into an existing context.
 * Replicates DoL's rendering pipeline: desaturate -> brightness -> contrast -> blend.
 */
export function applyFilterToContext(
  ctx: RenderContext,
  img: CanvasImageSource,
  filter?: ColorFilter,
): void {
  const { width: w, height: h } = sourceSize(img);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);

  if (!filter) return;

  if (filter.desaturate) {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    restoreAlpha(ctx, img);
  }

  if (filter.brightness != null && filter.brightness !== 0) {
    if (typeof filter.brightness === "object") {
      applyBrightnessGradient(ctx, w, h, img, filter.brightness);
    } else if (filter.brightness > 0) {
      ctx.globalCompositeOperation = "color-dodge";
      ctx.fillStyle = grayHex(filter.brightness);
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = grayHex(1 + filter.brightness);
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";
    restoreAlpha(ctx, img);
  }

  if (filter.contrast != null && filter.contrast !== 1) {
    applyContrast(ctx, w, h, filter.contrast);
    restoreAlpha(ctx, img);
  }

  if (filter.blend) {
    const blendMode = filter.blendMode ?? "hard-light";
    const tmp = scratchCanvas(1, w, h).ctx;
    drawFill(tmp, w, h, filter.blend);
    tmp.globalCompositeOperation = blendMode as GlobalCompositeOperation;
    tmp.drawImage(ctx.canvas, 0, 0);
    restoreAlpha(tmp, img);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tmp.canvas, 0, 0);
  }
}

export function applyFilter(img: CanvasImageSource, filter?: ColorFilter): CanvasImageSource {
  const { width, height } = sourceSize(img);
  const { canvas, ctx } = createWorkCanvas(width, height, { willReadFrequently: true });
  applyFilterToContext(ctx, img, filter);
  return canvas;
}
