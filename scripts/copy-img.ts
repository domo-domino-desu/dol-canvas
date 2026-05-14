/**
 * copy-img.ts
 * 从 DoL 仓库同步 img 资源到本项目的 img/ 目录。
 *
 * 用法:
 *   bun scripts/copy-img.ts
 *   DOL_PATH=/path/to/dol bun scripts/copy-img.ts
 */

import { join } from "path";
import { existsSync } from "fs";
import { ROOT, DOL_PATH } from "./utils";

const DOL_IMG = join(DOL_PATH, "img");
const CANVAS_IMG = join(ROOT, "img");

if (!existsSync(DOL_IMG)) {
  console.error(`DoL img dir not found: ${DOL_IMG}`);
  console.error("Set DOL_PATH env var to point to the DoL repo root.");
  process.exit(1);
}

interface CopyEntry {
  src: string;
  dest: string;
}

const COPIES: CopyEntry[] = [
  { src: "body/", dest: "body/" },
  { src: "hair/back/", dest: "hair/back/" },
  { src: "hair/sides/", dest: "hair/sides/" },
  { src: "hair/fringe/", dest: "hair/fringe/" },
  { src: "hair/hair/", dest: "hair/hair/" },
  { src: "face/default/", dest: "face/default/" },
  { src: "face/masks/", dest: "face/masks/" },
  { src: "transformations/", dest: "transformations/" },
  { src: "clothes/upper/", dest: "clothes/upper/" },
  { src: "clothes/belly/", dest: "clothes/belly/" },
  { src: "clothes/masks/", dest: "clothes/masks/" },
  { src: "clothes/lower/", dest: "clothes/lower/" },
  { src: "clothes/under-upper/", dest: "clothes/under-upper/" },
  { src: "clothes/under-lower/", dest: "clothes/under-lower/" },
  { src: "clothes/head/", dest: "clothes/head/" },
  { src: "clothes/face/", dest: "clothes/face/" },
  { src: "clothes/neck/", dest: "clothes/neck/" },
  { src: "clothes/hands/", dest: "clothes/hands/" },
  { src: "clothes/handheld/", dest: "clothes/handheld/" },
  { src: "clothes/feet/", dest: "clothes/feet/" },
  { src: "clothes/legs/", dest: "clothes/legs/" },
  { src: "clothes/genitals/", dest: "clothes/genitals/" },
];

let ok = 0,
  skipped = 0;
for (const { src, dest } of COPIES) {
  const srcPath = join(DOL_IMG, src);
  const destPath = join(CANVAS_IMG, dest);

  if (!existsSync(srcPath.replace(/\/$/, ""))) {
    console.warn(`  skip (not found): ${src}`);
    skipped++;
    continue;
  }

  const result = await Bun.$`rsync -a --update --mkpath ${srcPath} ${destPath}`.quiet();
  if (result.exitCode !== 0) {
    console.error(`  FAILED: ${src} → ${dest}`);
    console.error(result.stderr.toString());
    process.exit(1);
  }

  console.log(`  ✓ ${src}`);
  ok++;
}

console.log(`\ncopy-img: ${ok} synced${skipped ? `, ${skipped} skipped` : ""}`);
