import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLOTHING_SLOTS } from "./config/slots";
import type { BuildContext, Whitelist } from "./types";

export interface WhitelistReport {
  invalidCount: number;
}

function hasAnyImageUnder(ctx: BuildContext, prefix: string): boolean {
  const normalized = prefix.replace(/\\/g, "/").replace(/\/?$/, "/");
  for (const image of ctx.fsCache.images) {
    if (image.startsWith(normalized)) return true;
  }
  return false;
}

function validateClothing(ctx: BuildContext, result: Whitelist): number {
  let invalidCount = 0;
  for (const { cn, slot } of CLOTHING_SLOTS) {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const cnName of ctx.whitelist[cn] ?? []) {
      const entry = ctx.mappings.clothingBySlot[slot]?.[cnName];
      if (!entry) {
        invalid.push(`  x "${cnName}" - 无i18n映射`);
        continue;
      }
      if (!hasAnyImageUnder(ctx, `clothes/${slot}/${entry.variable}`)) {
        invalid.push(`  x "${cnName}" (${entry.variable}) - img目录不存在`);
        continue;
      }
      valid.push(cnName);
    }
    result[cn] = valid;
    if (invalid.length) {
      console.warn(`[${cn}] ${invalid.length} 项无效:`);
      invalid.forEach((line) => console.warn(line));
      invalidCount += invalid.length;
    }
  }
  return invalidCount;
}

function validateHair(ctx: BuildContext, result: Whitelist): number {
  let invalidCount = 0;
  const sections: Array<[string, Record<string, { variable: string }>, string[]]> = [
    ["发型", ctx.mappings.hairStyles, ["hair/back", "hair/sides"]],
    ["刘海", ctx.mappings.fringeStyles, ["hair/fringe"]],
  ];

  for (const [section, mappings, imageDirs] of sections) {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const cnName of ctx.whitelist[section] ?? []) {
      const variable = mappings[cnName]?.variable;
      if (!variable) {
        invalid.push(`  x "${cnName}" - 无i18n映射`);
        continue;
      }
      if (!imageDirs.some((dir) => hasAnyImageUnder(ctx, `${dir}/${variable}`))) {
        invalid.push(`  x "${cnName}" (${variable}) - img目录不存在`);
        continue;
      }
      valid.push(cnName);
    }
    result[section] = valid;
    if (invalid.length) {
      console.warn(`[${section}] ${invalid.length} 项无效:`);
      invalid.forEach((line) => console.warn(line));
      invalidCount += invalid.length;
    }
  }
  return invalidCount;
}

function validateStaticSections(ctx: BuildContext, result: Whitelist): number {
  let invalidCount = 0;
  const sections: Array<[string, Record<string, unknown>]> = [
    ["转化", ctx.mappings.transformTypes],
    ["仪态", ctx.mappings.demeanor],
  ];
  for (const [section, mappings] of sections) {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const cnName of ctx.whitelist[section] ?? []) {
      if (cnName in mappings) {
        valid.push(cnName);
      } else {
        invalid.push(`  x "${cnName}" - 无i18n映射`);
      }
    }
    result[section] = valid;
    if (invalid.length) {
      console.warn(`[${section}] ${invalid.length} 项无效:`);
      invalid.forEach((line) => console.warn(line));
      invalidCount += invalid.length;
    }
  }
  return invalidCount;
}

export function checkWhitelist(ctx: BuildContext): WhitelistReport {
  const valid: Whitelist = {};
  const invalidCount =
    validateClothing(ctx, valid) + validateHair(ctx, valid) + validateStaticSections(ctx, valid);

  for (const [section, names] of Object.entries(ctx.whitelist)) {
    valid[section] ??= names;
  }

  ctx.validWhitelist = valid;
  if (invalidCount === 0) console.log("  whitelist: all entries valid");
  else console.warn(`  whitelist: ${invalidCount} invalid entries will be skipped`);
  return { invalidCount };
}

function clothingDisplayNames(ctx: BuildContext, slot: string): string[] {
  return Object.entries(ctx.mappings.clothingBySlot[slot] ?? {})
    .filter(([, entry]) => existsSync(join(ctx.dolPath, "img/clothes", slot, entry.variable)))
    .map(([cn]) => cn);
}

export function resetWhitelist(ctx: BuildContext): Whitelist {
  const result: Whitelist = {};
  for (const { cn, slot } of CLOTHING_SLOTS) {
    result[cn] = clothingDisplayNames(ctx, slot);
    console.log(`  ${cn}: ${result[cn]!.length} 项`);
  }

  result["发型"] = Object.entries(ctx.mappings.hairStyles)
    .filter(
      ([, entry]) =>
        existsSync(join(ctx.dolPath, "img/hair/back", entry.variable)) ||
        existsSync(join(ctx.dolPath, "img/hair/sides", entry.variable)),
    )
    .map(([cn]) => cn);
  console.log(`  发型: ${result["发型"]!.length} 项`);

  result["刘海"] = Object.entries(ctx.mappings.fringeStyles)
    .filter(([, entry]) => existsSync(join(ctx.dolPath, "img/hair/fringe", entry.variable)))
    .map(([cn]) => cn);
  console.log(`  刘海: ${result["刘海"]!.length} 项`);

  result["转化"] = Object.keys(ctx.mappings.transformTypes);
  result["仪态"] = Object.keys(ctx.mappings.demeanor);

  writeFileSync(join(ctx.root, "whitelist.json"), JSON.stringify(result, null, 2), "utf8");
  console.log("  wrote whitelist.json");
  return result;
}
