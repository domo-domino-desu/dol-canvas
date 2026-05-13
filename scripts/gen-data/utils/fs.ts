import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { I18nData, Whitelist } from "../types";
import { IMG_DIR, I18N_PATH, ROOT } from "./env";

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadI18n(): I18nData {
  return readJson<I18nData>(I18N_PATH);
}

export function loadWhitelist(): Whitelist {
  const path = join(ROOT, "whitelist.json");
  if (!existsSync(path)) {
    console.warn("  whitelist.json not found - run: bun run gen:whitelist:reset");
    return {};
  }
  return readJson<Whitelist>(path);
}

export function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b));
}

export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

export function listPngStems(dir: string): string[] {
  return listFiles(dir)
    .filter((name) => name.endsWith(".png"))
    .map((name) => name.slice(0, -4));
}

export function listAllFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...listAllFiles(full, base));
    } else {
      result.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export function scanImages(): Set<string> {
  return new Set(listAllFiles(IMG_DIR).filter((file) => file.endsWith(".png")));
}
