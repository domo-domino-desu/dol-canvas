import { join } from "node:path";
import { BROW_CN_TO_EN, MOUTH_CN_TO_EN } from "../config/fallbacks";
import type { BuildContext } from "../types";
import { listDirs, listPngStems } from "../utils/fs";

export function generateFace(ctx: BuildContext) {
  const faceDefaultDir = join(ctx.imgDir, "face", "default");
  const demeanor = listDirs(faceDefaultDir).filter((dir) => dir !== "masks");
  const demeanorCn = Object.fromEntries(
    Object.entries(ctx.mappings.demeanor).map(([cn, entry]) => [entry.en, cn]),
  );
  const demeanorEn = Object.fromEntries(Object.entries(demeanorCn).map(([en, cn]) => [cn, en]));

  const eyeLayerSet = new Set<string>();
  for (const dir of demeanor) {
    for (const file of listPngStems(join(faceDefaultDir, dir))) eyeLayerSet.add(file);
  }
  const eyeLayers = [...eyeLayerSet].sort();
  const commonFiles = listPngStems(faceDefaultDir);
  const mouth = commonFiles
    .filter((file) => file.startsWith("mouth-"))
    .map((file) => file.replace("mouth-", ""))
    .sort();
  const lipstick = commonFiles
    .filter((file) => file.startsWith("lipstick-"))
    .map((file) => file.replace("lipstick-", ""))
    .sort();
  const blush = commonFiles
    .filter((file) => /^blush-\d+$/.test(file))
    .map((file) => parseInt(file.replace("blush-", "")))
    .sort((a, b) => a - b);
  const tears = commonFiles
    .filter((file) => /^tears-\d+$/.test(file))
    .map((file) => parseInt(file.replace("tears-", "")))
    .sort((a, b) => a - b);
  const brow = eyeLayers
    .filter((file) => file.startsWith("brow-"))
    .map((file) => file.replace("brow-", ""));

  const output = {
    demeanor,
    demeanorCn,
    demeanorEn,
    eyeLayers: eyeLayers.filter((file) => !file.startsWith("brow-")),
    commonLayers: {
      mouth,
      lipstick,
      blush,
      tears,
      brow,
      other: commonFiles.filter(
        (file) =>
          !file.startsWith("mouth-") &&
          !file.startsWith("lips") &&
          !file.startsWith("blush-") &&
          !file.startsWith("tears-") &&
          file !== "blusher" &&
          file !== "freckles" &&
          file !== "ears",
      ),
    },
    browsMap: BROW_CN_TO_EN,
    mouthMap: MOUTH_CN_TO_EN,
  };

  console.log(`  face demeanor=[${demeanor.join(", ")}]`);
  console.log(`  eyeLayers: ${output.eyeLayers.length}, mouth: ${mouth.length}`);
  return output;
}
