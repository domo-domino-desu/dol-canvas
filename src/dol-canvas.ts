import type { CharacterPayload, LayerSpec } from "@/types";
import { buildLayers } from "@/character/builder";
import { renderLayers, clearImageCache, type RenderError } from "@/renderer/canvas";
import { AnimationController } from "@/renderer/animation";

interface DolCanvasConfig {
  baseUrl: string;
}

const _config: DolCanvasConfig = {
  baseUrl: "https://cdn.jsdelivr.net/gh/domo-domino-desu/dol-canvas@main/img/",
};

export class DolCanvas {
  private _canvas: HTMLCanvasElement;
  private _baseUrl: string;
  private _rendering = false;
  private _pending: CharacterPayload | null = null;
  private _anim: AnimationController | null = null;

  constructor(canvas: HTMLCanvasElement, baseUrl?: string) {
    this._canvas = canvas;
    this._baseUrl = (baseUrl ?? _config.baseUrl).replace(/\/?$/, "/");
  }

  /** Override the CDN base URL globally (e.g., for local testing). */
  static configure(config: Partial<DolCanvasConfig>): void {
    if (config.baseUrl != null) _config.baseUrl = config.baseUrl.replace(/\/?$/, "/");
  }

  /**
   * Render a character payload once (static, no animation).
   * Queues one pending re-render if a render is already in progress.
   */
  async render(payload: CharacterPayload, onError?: (e: RenderError) => void): Promise<void> {
    this.stopAnimation();

    if (this._rendering) {
      this._pending = payload;
      return;
    }

    this._rendering = true;
    try {
      const layers = buildLayers(payload, this._baseUrl);
      await renderLayers(this._canvas, layers, onError);

      if (this._pending) {
        const next = this._pending;
        this._pending = null;
        this._rendering = false;
        await this.render(next, onError);
        return;
      }
    } finally {
      this._rendering = false;
    }
  }

  /**
   * Start animated rendering (blink loop).
   * Pre-loads images, then begins the blink animation.
   * Call stopAnimation() or render() to stop.
   */
  async startAnimation(
    payload: CharacterPayload,
    onError?: (e: RenderError) => void,
  ): Promise<void> {
    this.stopAnimation();

    const layers = buildLayers(payload, this._baseUrl);
    await renderLayers(this._canvas, layers, onError);

    this._anim = new AnimationController(this._canvas, layers, onError);
    this._anim.start();
  }

  /**
   * Update the payload while animation is running.
   * If animation is not active, falls back to a static render.
   */
  async updateAnimation(
    payload: CharacterPayload,
    onError?: (e: RenderError) => void,
  ): Promise<void> {
    if (!this._anim) {
      return this.render(payload, onError);
    }
    const layers = buildLayers(payload, this._baseUrl);
    await renderLayers(this._canvas, layers, onError);
    this._anim.updateLayers(layers);
  }

  /** Stop the animation loop (restores eyes-open state). */
  stopAnimation(): void {
    if (this._anim) {
      this._anim.stop();
      this._anim = null;
    }
  }

  get isAnimating(): boolean {
    return this._anim !== null;
  }

  /** Render from pre-built LayerSpecs directly (bypasses builder). */
  async renderLayers(layers: LayerSpec[], onError?: (e: RenderError) => void): Promise<void> {
    this.stopAnimation();
    await renderLayers(this._canvas, layers, onError);
  }

  clear(): void {
    const ctx = this._canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  static clearCache(): void {
    clearImageCache();
  }
}
