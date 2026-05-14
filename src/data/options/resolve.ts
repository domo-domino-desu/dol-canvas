import type { CharacterPayload } from "@/types";
import { payloadOptionsSchema } from "@/data/options/schema";
import type { PayloadOptionContext, ResolvedPayloadOption } from "@/data/options/types";
import { resolveDynamic } from "@/data/options/utils";

export function resolvePayloadOptions(payload: CharacterPayload = {}): ResolvedPayloadOption[] {
  const ctx: PayloadOptionContext = { payload };
  const resolved: ResolvedPayloadOption[] = [];

  for (const option of payloadOptionsSchema) {
    if (option.enabled && !option.enabled(ctx)) continue;

    if (option.type === "list") {
      const options = resolveDynamic(option.options, ctx);
      if (!options.length) continue;
      const { enabled: _enabled, ...rest } = option;
      resolved.push({ ...rest, options });
      continue;
    }

    if (option.type === "number") {
      const { enabled: _enabled, min, max, ...rest } = option;
      resolved.push({
        ...rest,
        min: resolveDynamic(min, ctx),
        max: resolveDynamic(max, ctx),
      });
      continue;
    }

    const { enabled: _enabled, ...rest } = option;
    resolved.push(rest);
  }

  return resolved;
}
