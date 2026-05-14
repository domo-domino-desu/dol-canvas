import TinyPinyin from "tiny-pinyin";
import type {
  ColorEntry,
  Dynamic,
  PayloadBooleanOption,
  PayloadListItem,
  PayloadListOption,
  PayloadNumberOption,
  PayloadOption,
  PayloadOptionCategory,
  PayloadOptionContext,
} from "@/data/options/types";

export function resolveDynamic<T>(value: Dynamic<T>, ctx: PayloadOptionContext): T {
  return typeof value === "function" ? (value as (ctx: PayloadOptionContext) => T)(ctx) : value;
}

function pinyinSortKey(value: string): string {
  return TinyPinyin.convertToPinyin(value, "", true);
}

export function byPinyin(a: PayloadListItem, b: PayloadListItem): number {
  return (
    pinyinSortKey(a.label).localeCompare(pinyinSortKey(b.label), "en") ||
    a.label.localeCompare(b.label, "zh-Hans-CN") ||
    a.value.localeCompare(b.value, "en")
  );
}

export function sortedByPinyin(options: PayloadListItem[]): PayloadListItem[] {
  return [...options].sort(byPinyin);
}

export function entriesToOptions(
  entries: Record<string, { en?: string }>,
  sort = (options: PayloadListItem[]) => options,
): PayloadListItem[] {
  return sort(
    Object.entries(entries).map(([value, meta]) => ({
      value,
      label: value,
      meta,
    })),
  );
}

export function colorsToOptions(entries: ColorEntry[] | undefined): PayloadListItem[] {
  return sortedByPinyin(
    (entries ?? []).map((entry) => ({
      value: entry.cnName,
      label: entry.cnName,
      meta: {
        variable: entry.variable,
        name: entry.name,
      },
    })),
  );
}

export function rawValuesToOptions(
  values: readonly string[],
  labels?: Record<string, string>,
): PayloadListItem[] {
  return [...new Set(values)].map((value) => ({
    value,
    label: labels?.[value] ?? value,
  }));
}

export function booleanOption(
  key: string,
  label: string,
  category: PayloadOptionCategory,
  enabled?: PayloadOption["enabled"],
): PayloadBooleanOption {
  return { type: "boolean", key, label, category, enabled };
}

export function numberOption(
  key: string,
  label: string,
  category: PayloadOptionCategory,
  min: Dynamic<number>,
  max: Dynamic<number>,
  enabled?: PayloadOption["enabled"],
): PayloadNumberOption {
  return { type: "number", key, label, category, min, max, step: 1, enabled };
}

export function listOption(
  key: string,
  label: string,
  category: PayloadOptionCategory,
  options: Dynamic<PayloadListItem[]>,
  enabled?: PayloadOption["enabled"],
): PayloadListOption {
  return { type: "list", key, label, category, options, enabled };
}
