import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(fileURLToPath(import.meta.url), "../..");
export const IMG_DIR = join(ROOT, "img");
export const OUT_DIR = join(ROOT, "src/data/generated");

function loadDotEnv(): void {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key || process.env[key] != null) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Set it in .env or your shell.`);
  }
  return value;
}

loadDotEnv();

export const DOL_PATH = requireEnv("DOL_PATH");
export const I18N_PATH = requireEnv("I18N_PATH");

export interface I18nItem {
  f?: string;
  t?: string;
  fileName?: string;
  pN?: string;
  pos?: number;
}

export interface I18nData {
  typeB: {
    TypeBOutputText: I18nItem[];
    TypeBInputStoryScript: I18nItem[];
  };
}

export function ensureOutDir(): void {
  mkdirSync(OUT_DIR, { recursive: true });
}

export function writeJson(name: string, data: unknown): void {
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(`  wrote ${relative(ROOT, path)}`);
}

export function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory());
}

export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
}

export function listPngStems(dir: string): string[] {
  return listFiles(dir)
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4));
}

export function listAllFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...listAllFiles(full, base));
    } else {
      result.push(relative(base, full));
    }
  }
  return result;
}

let _i18n: I18nData | null = null;
export function loadI18n(): I18nData {
  if (_i18n) return _i18n;
  _i18n = JSON.parse(readFileSync(I18N_PATH, "utf8")) as I18nData;
  return _i18n;
}

export type Whitelist = Record<string, string[]>;

let _whitelist: Whitelist | null = null;
export function loadWhitelist(): Whitelist {
  if (_whitelist) return _whitelist;
  const path = join(ROOT, "whitelist.json");
  if (!existsSync(path)) {
    console.warn("  whitelist.json not found — run: bun scripts/gen-whitelist.ts");
    return (_whitelist = {});
  }
  _whitelist = JSON.parse(readFileSync(path, "utf8")) as Whitelist;
  return _whitelist;
}

export function hasInWhitelist(whitelist: Whitelist, prefix: string): boolean {
  const p = prefix.replace(/\\/g, "/");
  return whitelist["__all__"]?.some((f: string) => f.startsWith(p + "/") || f === p) ?? false;
}
