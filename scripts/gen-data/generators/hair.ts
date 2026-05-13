import { join } from "node:path";
import type { BuildContext } from "../types";
import { listPngStems } from "../utils/fs";

const LENGTH_ORDER = ["short", "shoulder", "chest", "navel", "thighs", "feet"];

const HAIR_LENGTH_LABELS: Record<string, string> = {
  short: "短",
  shoulder: "及肩",
  chest: "到胸",
  navel: "到腹",
  thighs: "到大腿",
  feet: "到脚",
};

export function generateHair(ctx: BuildContext) {
  const hairImgDir = join(ctx.imgDir, "hair");
  const hairStyles = [];
  for (const cnName of ctx.validWhitelist["发型"] ?? []) {
    const variable = ctx.mappings.hairStyles[cnName]?.variable;
    if (!variable) continue;

    const backDir = join(hairImgDir, "back", variable);
    const sidesDir = join(hairImgDir, "sides", variable);
    const backLengths = listPngStems(backDir)
      .filter((file) => LENGTH_ORDER.includes(file))
      .sort((a, b) => LENGTH_ORDER.indexOf(a) - LENGTH_ORDER.indexOf(b));

    hairStyles.push({
      name: variable,
      cnName,
      backLengths,
      sideFiles: listPngStems(sidesDir),
    });
  }

  const fringeStyles = [];
  for (const cnName of ctx.validWhitelist["刘海"] ?? []) {
    const variable = ctx.mappings.fringeStyles[cnName]?.variable;
    if (!variable) continue;

    fringeStyles.push({
      name: variable,
      cnName,
      files: listPngStems(join(hairImgDir, "fringe", variable)),
    });
  }

  console.log(`  发型: ${hairStyles.length} styles`);
  console.log(`  刘海: ${fringeStyles.length} styles`);

  return { hairStyles, fringeStyles, hairLengthLabels: HAIR_LENGTH_LABELS };
}
