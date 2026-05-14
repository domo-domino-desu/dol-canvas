import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import type {
  DolClothingInfo,
  HairGradientEntry,
  HairGradientPrototype,
  ParsedColours,
} from "../types";

type SandboxObject = Record<string, unknown>;

function slotInitName(slot: string): string {
  return `init${slot
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("")}`;
}

function sourceSlotKey(slot: string): string {
  return slot.replace(/-/g, "_");
}

function moddedClothesProxy(): Record<string, DolClothingInfo[]> {
  return new Proxy<Record<string, DolClothingInfo[]>>(
    {},
    {
      get(target, prop: string) {
        target[prop] ??= [];
        return target[prop];
      },
    },
  );
}

export function parseClothingJs(filePath: string, slot: string): DolClothingInfo[] {
  if (!existsSync(filePath)) return [];

  const sandbox = {
    window: {},
    setup: {
      clothes: {},
      moddedClothes: moddedClothesProxy(),
    },
    console,
  } as SandboxObject;

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(filePath, "utf8"), sandbox, { filename: filePath });

  const windowObject = sandbox.window as Record<string, unknown>;
  const init = windowObject[slotInitName(slot)];
  if (typeof init !== "function") {
    throw new Error(`No clothing initializer found for slot ${slot} in ${filePath}`);
  }

  init.call(windowObject);
  const clothes = (sandbox.setup as { clothes: Record<string, DolClothingInfo[]> }).clothes[
    sourceSlotKey(slot)
  ];
  return Array.isArray(clothes) ? clothes.map(normalizeClothingInfo) : [];
}

function normalizeClothingInfo(item: DolClothingInfo): DolClothingInfo {
  return {
    ...item,
    nameCapEn: item.name_cap ?? item.nameCapEn ?? item.name,
  };
}

function cloneFilter<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function convertGradientPrototype(raw: unknown): HairGradientPrototype | undefined {
  const entry = raw as {
    gradient?: "linear" | "radial";
    values?: number[];
    colors?: Array<[number, string]>;
    lengthFunctions?: Array<(...args: unknown[]) => unknown>;
  };
  if (!entry.gradient || !Array.isArray(entry.values) || !Array.isArray(entry.colors))
    return undefined;

  const stops = entry.colors.map((color) => color[0]);
  if (stops.length < 2 || typeof stops[0] !== "number" || typeof stops[1] !== "number") {
    return undefined;
  }

  const prototype: HairGradientPrototype = {
    gradient: entry.gradient,
    values: [...entry.values],
    stops: [stops[0], stops[1]],
  };

  if (entry.lengthFunctions?.some((fn) => String(fn).includes("length / 1000 / 2"))) {
    prototype.lengthOffset = "minus-half";
  }

  return prototype;
}

function convertGradientEntry(raw: unknown): HairGradientEntry | undefined {
  const direct = convertGradientPrototype(raw);
  if (direct) return direct;

  const variants: Record<string, HairGradientPrototype> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.startsWith("combat")) continue;
    const prototype = convertGradientPrototype(value);
    if (prototype) variants[key] = prototype;
  }

  if (Object.keys(variants).length === 0) return undefined;
  if (Object.keys(variants).length === 1 && variants.all) return variants.all;
  return variants;
}

function convertHairGradients(raw: unknown): ParsedColours["hairGradients"] {
  const result: ParsedColours["hairGradients"] = { fringe: {}, sides: {} };
  const root = raw as Record<"fringe" | "sides", Record<string, unknown>>;
  for (const part of ["fringe", "sides"] as const) {
    for (const [style, entry] of Object.entries(root[part] ?? {})) {
      const converted = convertGradientEntry(entry);
      if (converted) result[part][style] = converted;
    }
  }
  return result;
}

export function parseColoursJs(filePath: string): ParsedColours {
  const sandbox = {
    window: {},
    setup: {},
    V: { custom_eyecolours: [] },
    Renderer: {
      mergeLayerData: (target: Record<string, unknown>, defaults: Record<string, unknown>) =>
        Object.assign(target, defaults, target),
    },
    console,
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(filePath, "utf8"), sandbox, { filename: filePath });

  const colors = (sandbox.setup as { colours: Record<string, unknown> }).colours;
  return {
    hair: cloneFilter(colors.hair ?? []),
    eyes: cloneFilter(colors.eyes ?? []),
    clothes: cloneFilter(colors.clothes ?? []),
    condom: cloneFilter(colors.condom ?? []),
    skin: cloneFilter(colors.skin_options ?? {}),
    hairGradients: convertHairGradients(colors.hairgradients_prototypes),
  } as ParsedColours;
}

export function parseAllClothing(
  dolPath: string,
  slots: Array<{ slot: string; jsFile: string }>,
): Record<string, DolClothingInfo[]> {
  const result: Record<string, DolClothingInfo[]> = {};
  for (const { slot, jsFile } of slots) {
    result[slot] = parseClothingJs(join(dolPath, "game/base-clothing", jsFile), slot);
  }
  return result;
}
