import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { OUT_DIR, ROOT } from "./env";

export function ensureOutDir(): void {
  mkdirSync(OUT_DIR, { recursive: true });
}

export function writeJson(name: string, data: unknown): void {
  ensureOutDir();
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  console.log(`  wrote ${relative(ROOT, path)}`);
}
