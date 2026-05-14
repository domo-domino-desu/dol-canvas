import type { CharacterPayload } from "../../types";
export type PayloadOptionCategory = "body" | "hair" | "face" | "clothing" | "transformation";
export type PayloadOptionType = "list" | "number" | "boolean";
export type PayloadOptionContext = {
    payload: CharacterPayload;
};
export type PayloadListItem = {
    value: string;
    label: string;
    meta?: Record<string, unknown>;
};
export type Dynamic<T> = T | ((ctx: PayloadOptionContext) => T);
type PayloadOptionBase = {
    type: PayloadOptionType;
    key: string;
    label: string;
    category: PayloadOptionCategory;
    enabled?: (ctx: PayloadOptionContext) => boolean;
    meta?: Record<string, unknown>;
};
export type PayloadListOption = PayloadOptionBase & {
    type: "list";
    options: Dynamic<PayloadListItem[]>;
};
export type PayloadNumberOption = PayloadOptionBase & {
    type: "number";
    min: Dynamic<number>;
    max: Dynamic<number>;
    step?: number;
};
export type PayloadBooleanOption = PayloadOptionBase & {
    type: "boolean";
};
export type PayloadOption = PayloadListOption | PayloadNumberOption | PayloadBooleanOption;
export type ResolvedPayloadListOption = Omit<PayloadListOption, "enabled" | "options"> & {
    options: PayloadListItem[];
};
export type ResolvedPayloadNumberOption = Omit<PayloadNumberOption, "enabled" | "min" | "max"> & {
    min: number;
    max: number;
};
export type ResolvedPayloadBooleanOption = Omit<PayloadBooleanOption, "enabled">;
export type ResolvedPayloadOption = ResolvedPayloadListOption | ResolvedPayloadNumberOption | ResolvedPayloadBooleanOption;
export type ColorEntry = {
    variable: string;
    name: string;
    cnName: string;
};
export type TransformEntry = {
    cnName: string;
    label?: string;
    parts: Record<string, string[]>;
    partLabels?: Record<string, string>;
    variantLabels?: Record<string, Record<string, string>>;
};
export {};
