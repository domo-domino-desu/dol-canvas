export function findBalancedSlice(
  text: string,
  startIndex: number,
  openChar: "[" | "{",
  closeChar: "]" | "}",
): string | undefined {
  const start = text.indexOf(openChar, startIndex);
  if (start === -1) return undefined;

  let depth = 0;
  let quote: '"' | "'" | "`" | undefined;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i]!;
    const next = text[i + 1];
    const prev = text[i - 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (char === quote && prev !== "\\") quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return undefined;
}
