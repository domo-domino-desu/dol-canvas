// These values are used only when the i18n source does not expose a stable
// machine-readable mapping. Keep this file small and prefer i18n-derived data.
export const FALLBACK_HAIR_LENGTHS: Record<string, { en: string }> = {
  短: { en: "short" },
  及肩: { en: "shoulder" },
  到胸: { en: "chest" },
  到腹: { en: "navel" },
  到大腿: { en: "thighs" },
  到脚: { en: "feet" },
};

export const FALLBACK_TRANSFORM_TYPES: Record<string, { en: string }> = {
  天使: { en: "angel" },
  堕天使: { en: "fallen" },
  恶魔: { en: "demon" },
  猫: { en: "cat" },
  狐: { en: "fox" },
  狼: { en: "wolf" },
  牛: { en: "cow" },
  鹰: { en: "bird" },
};

export const BROW_CN_TO_EN: Record<string, string> = {
  低: "low",
  中: "mid",
  高: "top",
  高潮: "orgasm",
};

export const MOUTH_CN_TO_EN: Record<string, string> = {
  平静: "neutral",
  微笑: "smile",
  皱眉: "frown",
  哭泣: "cry",
  咀嚼: "chew",
};
