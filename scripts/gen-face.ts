/**
 * gen-face.ts
 * 扫描 img/face/ 目录，提取仪态变体、表情层文件清单，
 * 输出 src/data/generated/face.json
 */

import { join } from "path";
import { ensureOutDir, writeJson, listDirs, listPngStems, IMG_DIR } from "./utils";

const DEMEANOR_CN: Record<string, string> = {
  default: "温柔",
  aloof: "高冷",
  catty: "妩媚",
  sweet: "甜美",
  foxy: "勾人",
  gloomy: "忧郁",
};

// CN → English dir name (inverted for runtime lookup)
const DEMEANOR_EN: Record<string, string> = Object.fromEntries(
  Object.entries(DEMEANOR_CN).map(([en, cn]) => [cn, en]),
);

// Brow CN → file suffix
const BROW_CN_TO_EN: Record<string, string> = {
  低: "low",
  中: "mid",
  高: "top",
  高潮: "orgasm",
};

// Mouth CN → file suffix
const MOUTH_CN_TO_EN: Record<string, string> = {
  平静: "neutral",
  微笑: "smile",
  皱眉: "frown",
  哭泣: "cry",
  咀嚼: "chew",
};

const faceDefaultDir = join(IMG_DIR, "face", "default");

const demeanor = listDirs(faceDefaultDir).filter((d) => d !== "masks");

const eyeLayerSet = new Set<string>();
for (const d of demeanor) {
  for (const f of listPngStems(join(faceDefaultDir, d))) eyeLayerSet.add(f);
}
const eyeLayers = [...eyeLayerSet].sort();

const commonFiles = listPngStems(faceDefaultDir);
const mouth = commonFiles
  .filter((f) => f.startsWith("mouth-"))
  .map((f) => f.replace("mouth-", ""))
  .sort();
const lipstick = commonFiles
  .filter((f) => f.startsWith("lipstick-"))
  .map((f) => f.replace("lipstick-", ""))
  .sort();
const blush = commonFiles
  .filter((f) => /^blush-\d+$/.test(f))
  .map((f) => parseInt(f.replace("blush-", "")))
  .sort((a, b) => a - b);
const tears = commonFiles
  .filter((f) => /^tears-\d+$/.test(f))
  .map((f) => parseInt(f.replace("tears-", "")))
  .sort((a, b) => a - b);
const brow = eyeLayers.filter((f) => f.startsWith("brow-")).map((f) => f.replace("brow-", ""));

const output = {
  demeanor,
  demeanorCn: DEMEANOR_CN,
  demeanorEn: DEMEANOR_EN,
  eyeLayers: eyeLayers.filter((f) => !f.startsWith("brow-")),
  commonLayers: {
    mouth,
    lipstick,
    blush,
    tears,
    brow,
    other: commonFiles.filter(
      (f) =>
        !f.startsWith("mouth-") &&
        !f.startsWith("lips") &&
        !f.startsWith("blush-") &&
        !f.startsWith("tears-") &&
        f !== "blusher" &&
        f !== "freckles" &&
        f !== "ears",
    ),
  },
  browsMap: BROW_CN_TO_EN,
  mouthMap: MOUTH_CN_TO_EN,
};

ensureOutDir();
writeJson("face", output);
console.log(`gen-face: demeanor=[${demeanor.join(", ")}]`);
console.log(`  eyeLayers: ${output.eyeLayers.length}, mouth: ${mouth.length}`);
console.log("gen-face: done");
