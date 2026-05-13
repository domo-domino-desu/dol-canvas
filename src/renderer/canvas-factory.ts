import type { RenderCanvas, RenderContext } from "@/renderer/types";

function offscreenAvailable(): boolean {
  return typeof OffscreenCanvas !== "undefined";
}

export function createWorkCanvas(
  width: number,
  height: number,
  options?: CanvasRenderingContext2DSettings,
): { canvas: RenderCanvas; ctx: RenderContext } {
  const canvas: RenderCanvas = offscreenAvailable()
    ? new OffscreenCanvas(width, height)
    : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", options) as RenderContext | null;
  if (!ctx) throw new Error("Failed to create 2D canvas context");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function resizeWorkCanvas(canvas: RenderCanvas, width: number, height: number): void {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
