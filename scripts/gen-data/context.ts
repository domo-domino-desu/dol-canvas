import { join } from "node:path";
import { I18N_CLOTHING_SLOTS } from "./config/slots";
import { parseAllClothing, parseColoursJs } from "./parsers/dol-js";
import { parseHairStylesTwee } from "./parsers/twee";
import { buildMappings } from "./registry/mappings";
import type { BuildContext } from "./types";
import { DOL_PATH, I18N_PATH, IMG_DIR, OUT_DIR, ROOT } from "./utils/env";
import { loadI18n, loadWhitelist, scanImages } from "./utils/fs";

export function createContext(): BuildContext {
  const ctx: BuildContext = {
    root: ROOT,
    imgDir: IMG_DIR,
    outDir: OUT_DIR,
    dolPath: DOL_PATH,
    i18nPath: I18N_PATH,
    i18nRaw: loadI18n(),
    whitelist: loadWhitelist(),
    fsCache: {
      images: scanImages(),
    },
    dol: {
      clothing: parseAllClothing(
        DOL_PATH,
        I18N_CLOTHING_SLOTS.map((slot) => ({
          slot: slot.slot,
          jsFile: `${slot.js}.js`,
        })),
      ),
      hair: parseHairStylesTwee(join(DOL_PATH, "game/04-Variables/hair-styles.twee")),
      colors: parseColoursJs(join(DOL_PATH, "game/04-Variables/colours.js")),
    },
    mappings: {
      clothing: {},
      clothingBySlot: {},
      colors: {},
      hairStyles: {},
      fringeStyles: {},
      demeanor: {},
      bodyShapes: {},
      hairLengths: {},
      hairColorStyles: {},
      transformTypes: {},
    },
    validWhitelist: {},
    warnings: [],
  };

  ctx.mappings = buildMappings(ctx);
  return ctx;
}
