import type { BuildContext } from "../types";

export function generateI18n(ctx: BuildContext) {
  return {
    clothing: ctx.mappings.clothing,
    clothingBySlot: ctx.mappings.clothingBySlot,
    colors: ctx.mappings.colors,
    hairStyles: ctx.mappings.hairStyles,
    fringeStyles: ctx.mappings.fringeStyles,
    demeanor: ctx.mappings.demeanor,
    bodyShapes: ctx.mappings.bodyShapes,
    hairLengths: ctx.mappings.hairLengths,
    hairColorStyles: ctx.mappings.hairColorStyles,
    transformTypes: ctx.mappings.transformTypes,
  };
}
