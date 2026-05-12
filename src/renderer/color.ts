import type { ColorFilter } from "@/types";

function makeCanvas(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d")!;
}

function grayHex(v: number): string {
  const b = Math.round(Math.min(1, Math.max(0, v)) * 255);
  const s = b.toString(16).padStart(2, "0");
  return `#${s}${s}${s}`;
}

/**
 * Apply a ColorFilter to an image and return a new canvas.
 * Replicates DoL's rendering pipeline: desaturate → brightness → blend.
 *
 * If filter is empty/undefined, returns original image as a canvas.
 */
export function applyFilter(
  img: HTMLImageElement | HTMLCanvasElement,
  filter?: ColorFilter,
): HTMLCanvasElement {
  const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

  // Start with original image on a fresh canvas
  const ctx = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0);

  if (!filter) return ctx.canvas;

  // Step 1: desaturate — blend 'saturation' mode with black over source
  if (filter.desaturate) {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    // Restore original alpha
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  // Step 2: brightness adjustment (color-dodge for positive, multiply for negative)
  if (filter.brightness != null && filter.brightness !== 0) {
    if (filter.brightness > 0) {
      ctx.globalCompositeOperation = "color-dodge";
      ctx.fillStyle = grayHex(filter.brightness);
    } else {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = grayHex(1 + filter.brightness);
    }
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    // Restore alpha after brightness
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  // Step 3: blend color (composeOverRect: fill → draw image over with blendMode)
  if (filter.blend) {
    const blendMode = filter.blendMode ?? "hard-light";
    const tmp = makeCanvas(w, h);
    tmp.fillStyle = filter.blend;
    tmp.fillRect(0, 0, w, h);
    tmp.globalCompositeOperation = blendMode as GlobalCompositeOperation;
    tmp.drawImage(ctx.canvas, 0, 0);
    // Cut out using original alpha
    tmp.globalCompositeOperation = "destination-in";
    tmp.drawImage(img, 0, 0);
    return tmp.canvas;
  }

  return ctx.canvas;
}
