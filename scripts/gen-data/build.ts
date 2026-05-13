import { createContext } from "./context";
import { generateClothes } from "./generators/clothes";
import { generateColors } from "./generators/colors";
import { generateFace } from "./generators/face";
import { generateHair } from "./generators/hair";
import { generateI18n } from "./generators/i18n";
import { generateTransformations } from "./generators/transformations";
import { writeJson } from "./utils/json";
import { checkWhitelist, resetWhitelist } from "./whitelist";

const args = Bun.argv.slice(2);
const strict = args.includes("--strict");
const reset = args.includes("--reset-whitelist") || args.includes("--reset");
const checkOnly = args.includes("--check-whitelist") || args.includes("--check");

console.log("1. Initialize context...");
const ctx = createContext();

if (reset) {
  console.log("2. Reset whitelist...");
  resetWhitelist(ctx);
  process.exit(0);
}

console.log("2. Validate whitelist...");
const report = checkWhitelist(ctx);
if (strict && report.invalidCount > 0) process.exit(1);
if (checkOnly) process.exit(report.invalidCount > 0 ? 1 : 0);

console.log("3. Generate artifacts...");
const outputs = {
  i18n: generateI18n(ctx),
  colors: generateColors(ctx),
  clothes: generateClothes(ctx),
  hair: generateHair(ctx),
  transformations: generateTransformations(ctx),
  face: generateFace(ctx),
};

console.log("4. Write outputs...");
for (const [name, data] of Object.entries(outputs)) {
  writeJson(name, data);
}

console.log("gen-data: done");
