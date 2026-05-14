/**
 * warmup-cdn.ts
 * 请求仓库 img/ 目录里的所有 PNG 文件，用于预热 CDN 缓存。
 *
 * 用法:
 *   bun scripts/warmup-cdn.ts
 *   bun scripts/warmup-cdn.ts --base-url https://cdn.example.com/img/
 *   bun scripts/warmup-cdn.ts --concurrency 5
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const IMG_DIR = join(ROOT, "img");
const DEFAULT_BASE_URL = "https://cdn.jsdelivr.net/gh/domo-domino-desu/dol-canvas@v0.1.10/img/";
const DEFAULT_CONCURRENCY = 3000;

interface Options {
  baseUrl: string;
  concurrency: number;
}

interface Result {
  file: string;
  ok: boolean;
  status?: number;
  error?: string;
}

function renderProgress(completed: number, total: number, failed: number): void {
  const failedText = failed > 0 ? ` failed: ${failed}` : "";
  const suffix = ` (${completed}/${total})${failedText}`;
  const width = getProgressBarWidth(suffix);
  const ratio = total === 0 ? 1 : completed / total;
  const filled = Math.round(ratio * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;

  process.stdout.write(`\r[${bar}]${suffix}`);
}

function getProgressBarWidth(suffix: string): number {
  const fallbackColumns = 80;
  const columns = process.stdout.columns ?? fallbackColumns;
  const reserved = suffix.length + 3;
  return Math.max(10, Math.min(80, columns - reserved));
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    baseUrl: process.env.CDN_BASE_URL ?? DEFAULT_BASE_URL,
    concurrency: Number(process.env.CDN_WARMUP_CONCURRENCY ?? DEFAULT_CONCURRENCY),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--base-url") {
      options.baseUrl = args[++i] ?? "";
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--concurrency") {
      options.concurrency = Number(args[++i]);
    } else if (arg.startsWith("--concurrency=")) {
      options.concurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.baseUrl) {
    throw new Error("Missing --base-url.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency must be a positive integer.");
  }

  options.baseUrl = options.baseUrl.replace(/\/?$/, "/");
  return options;
}

function printHelp(): void {
  console.log(`Usage: bun scripts/warmup-cdn.ts [options]

Options:
  --base-url <url>       CDN img root. Defaults to ${DEFAULT_BASE_URL}
  --concurrency <count>  Concurrent requests. Defaults to ${DEFAULT_CONCURRENCY}

Environment:
  CDN_BASE_URL
  CDN_WARMUP_CONCURRENCY`);
}

function listPngFiles(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listPngFiles(full, base));
    } else if (entry.toLowerCase().endsWith(".png")) {
      files.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function toAssetUrl(baseUrl: string, file: string): string {
  return new URL(file.split("/").map(encodeURIComponent).join("/"), baseUrl).toString();
}

async function warmupFile(baseUrl: string, file: string): Promise<Result> {
  const url = toAssetUrl(baseUrl, file);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
      },
    });

    await response.arrayBuffer();

    return {
      file,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      file,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]!;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

const options = parseArgs(Bun.argv.slice(2));
const files = listPngFiles(IMG_DIR);

if (files.length === 0) {
  console.error(`No PNG files found in ${IMG_DIR}`);
  process.exit(1);
}

console.log(`warmup-cdn: ${files.length} PNG files`);
console.log(`base-url: ${options.baseUrl}`);
console.log(`concurrency: ${options.concurrency}\n`);

let completed = 0;
let failed = 0;
const failures: Result[] = [];

renderProgress(completed, files.length, failed);

await runPool(files, options.concurrency, async (file) => {
  const result = await warmupFile(options.baseUrl, file);
  completed++;

  if (!result.ok) {
    failed++;
    failures.push(result);
    const reason = result.status ? `HTTP ${result.status}` : result.error;
    renderProgress(completed, files.length, failed);
    process.stderr.write(`\nFAIL ${completed}/${files.length}: ${file} (${reason})\n`);
    renderProgress(completed, files.length, failed);
    return;
  }

  renderProgress(completed, files.length, failed);
});

process.stdout.write("\n");

if (failures.length > 0) {
  console.error(`\nwarmup-cdn: ${files.length - failed} ok, ${failed} failed`);
  for (const failure of failures.slice(0, 20)) {
    const reason = failure.status ? `HTTP ${failure.status}` : failure.error;
    console.error(`  ${failure.file}: ${reason}`);
  }
  if (failures.length > 20) {
    console.error(`  ... ${failures.length - 20} more`);
  }
  process.exit(1);
}

console.log(`\nwarmup-cdn: ${files.length} ok`);
