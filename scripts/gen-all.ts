/**
 * gen-all.ts
 * 依次运行所有数据生成脚本，将结果写入 src/data/generated/
 *
 * 用法: bun scripts/gen-all.ts
 * 环境变量:
 *   DOL_PATH  — DoL 仓库路径
 *   I18N_PATH — i18n JSON 路径
 */

import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { spawnSync } from "child_process";

const __dir = dirname(fileURLToPath(import.meta.url));

const scripts = [
  "gen-i18n.ts",
  "gen-colors.ts",
  "gen-clothes.ts",
  "gen-hair.ts",
  "gen-transformations.ts",
  "gen-face.ts",
];

let ok = 0,
  failed = 0;
for (const script of scripts) {
  const scriptPath = join(__dir, script);
  console.log(`\n── ${script} ─────────────────────────────`);
  const result = spawnSync("bun", [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status === 0) {
    ok++;
  } else {
    console.error(`  FAILED (exit ${result.status})`);
    failed++;
  }
}

console.log(`\n── summary ─────────────────────────────`);
console.log(`  ${ok} succeeded, ${failed} failed`);
if (failed > 0) process.exit(1);
