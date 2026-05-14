import type { ColorEntry, Dynamic, PayloadBooleanOption, PayloadListItem, PayloadListOption, PayloadNumberOption, PayloadOption, PayloadOptionCategory, PayloadOptionContext } from "./types";
export declare function resolveDynamic<T>(value: Dynamic<T>, ctx: PayloadOptionContext): T;
export declare function byPinyin(a: PayloadListItem, b: PayloadListItem): number;
export declare function sortedByPinyin(options: PayloadListItem[]): PayloadListItem[];
export declare function entriesToOptions(entries: Record<string, {
    en?: string;
}>, sort?: (options: PayloadListItem[]) => PayloadListItem[]): PayloadListItem[];
export declare function colorsToOptions(entries: ColorEntry[] | undefined): PayloadListItem[];
export declare function rawValuesToOptions(values: readonly string[], labels?: Record<string, string>): PayloadListItem[];
export declare function booleanOption(key: string, label: string, category: PayloadOptionCategory, enabled?: PayloadOption["enabled"]): PayloadBooleanOption;
export declare function numberOption(key: string, label: string, category: PayloadOptionCategory, min: Dynamic<number>, max: Dynamic<number>, enabled?: PayloadOption["enabled"]): PayloadNumberOption;
export declare function listOption(key: string, label: string, category: PayloadOptionCategory, options: Dynamic<PayloadListItem[]>, enabled?: PayloadOption["enabled"]): PayloadListOption;
