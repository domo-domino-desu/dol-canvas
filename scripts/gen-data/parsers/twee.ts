import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import type { DolHairSections, DolHairStyle } from "../types";
import { findBalancedSlice } from "./source-slice";

function widgetText(text: string, widgetName: string): string | undefined {
  const start = text.indexOf(`<<widget "${widgetName}">>`);
  if (start === -1) return undefined;
  const end = text.indexOf("<</widget>>", start);
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

function parseSetArray<T>(section: string, target: string): T[] {
  const marker = section.indexOf(`<<set ${target} to `);
  if (marker === -1) return [];

  const arrayLiteral = findBalancedSlice(section, marker, "[", "]");
  if (!arrayLiteral) return [];

  const sandbox = { result: undefined as T[] | undefined };
  vm.createContext(sandbox);
  vm.runInContext(`result = ${arrayLiteral};`, sandbox);
  return Array.isArray(sandbox.result) ? sandbox.result : [];
}

export function parseHairStylesTwee(filePath: string): DolHairSections {
  if (!existsSync(filePath)) return { sides: [], fringe: [] };
  const text = readFileSync(filePath, "utf8");
  const sides = widgetText(text, "init_hairsides");
  const fringe = widgetText(text, "init_hairfringe");

  return {
    sides: sides ? parseSetArray<DolHairStyle>(sides, "setup.hairstyles.sides") : [],
    fringe: fringe ? parseSetArray<DolHairStyle>(fringe, "setup.hairstyles.fringe") : [],
  };
}
