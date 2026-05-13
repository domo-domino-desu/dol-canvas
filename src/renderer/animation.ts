import type { LayerSpec } from "@/types";
import { compileLayers } from "@/renderer/compiler";
import { drawCompiledLayers } from "@/renderer/canvas";
import type { CompiledLayer, RenderError } from "@/renderer/types";

// ── Keyframe sequences (from DoL canvasmodel-animations.js) ─────────────────

interface AnimationKeyframe {
  frame: number;
  duration: number;
}

interface TimelineAnimation {
  type: "keyframes";
  sequence: AnimationKeyframe[];
}

interface LoopAnimation {
  type: "loop";
  duration: number;
}

type AnimationDefinition = TimelineAnimation | LoopAnimation;

const BLINK_SEQUENCE: AnimationKeyframe[] = [
  { frame: 0, duration: 9000 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 14400 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 5400 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 1100 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 12500 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 23400 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 9000 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 1800 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 7200 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 10800 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 7200 },
  { frame: 1, duration: 100 },
  { frame: 0, duration: 7200 },
  { frame: 1, duration: 100 },
];

const ANIMATIONS: Record<string, AnimationDefinition> = {
  blink: { type: "keyframes", sequence: BLINK_SEQUENCE },
  breath: { type: "loop", duration: 700 },
  playerBreath: { type: "loop", duration: 700 },
};

interface AnimationState {
  keyframeIndex: number;
  keyframeStart: number;
  frame: number;
}

// ── Animation controller ──────────────────────────────────────────────────────

export class AnimationController {
  private canvas: HTMLCanvasElement;
  private sourceLayers: LayerSpec[];
  private compiledLayers: CompiledLayer[] = [];
  private onError?: (e: RenderError) => void;

  private rafId: number | null = null;
  private states = new Map<string, AnimationState>();
  private compileVersion = 0;

  constructor(canvas: HTMLCanvasElement, layers: LayerSpec[], onError?: (e: RenderError) => void) {
    this.canvas = canvas;
    this.sourceLayers = layers;
    this.onError = onError;
  }

  /** Replace the layer list (e.g., after payload change) without stopping. */
  async updateLayers(layers: LayerSpec[]): Promise<boolean> {
    this.sourceLayers = layers;
    const version = ++this.compileVersion;
    const compiled = await compileLayers(this.canvas, layers, this.onError);
    if (version !== this.compileVersion) return false;

    this.compiledLayers = compiled.layers;
    this.ensureAnimationStates();
    this.draw();
    return true;
  }

  async start(): Promise<void> {
    if (this.rafId !== null) return;
    this.states.clear();
    const applied = await this.updateLayers(this.sourceLayers);
    if (!applied) return;
    this.tick();
  }

  stop(): void {
    this.compileVersion++;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.states.clear();
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);

    const now = performance.now();
    let changed = false;

    this.ensureAnimationStates(now);

    for (const [name, state] of this.states) {
      const animation = ANIMATIONS[name];
      if (!animation) continue;

      if (animation.type === "loop") {
        if (now - state.keyframeStart >= animation.duration) {
          state.keyframeStart = now;
          state.frame += 1;
          changed = true;
        }
        continue;
      }

      const kf = animation.sequence[state.keyframeIndex]!;
      if (now - state.keyframeStart >= kf.duration) {
        state.keyframeStart = now;
        state.keyframeIndex = (state.keyframeIndex + 1) % animation.sequence.length;
        const nextKf = animation.sequence[state.keyframeIndex]!;
        if (nextKf.frame !== state.frame) {
          state.frame = nextKf.frame;
          changed = true;
        }
      }
    }

    if (changed) this.draw();
  };

  private draw(): void {
    drawCompiledLayers(this.canvas, this.compiledLayers, (layer) =>
      layer.animation ? (this.states.get(layer.animation)?.frame ?? layer.frame) : layer.frame,
    );
  }

  private ensureAnimationStates(now = performance.now()): void {
    const active = new Set(
      this.compiledLayers.map((l) => l.animation).filter((a): a is string => !!a),
    );

    for (const name of active) {
      if (this.states.has(name)) continue;
      const animation = ANIMATIONS[name];
      if (!animation) continue;
      this.states.set(name, {
        keyframeIndex: 0,
        keyframeStart: now,
        frame: animation.type === "keyframes" ? (animation.sequence[0]?.frame ?? 0) : 0,
      });
    }

    for (const name of this.states.keys()) {
      if (!active.has(name)) this.states.delete(name);
    }
  }
}
