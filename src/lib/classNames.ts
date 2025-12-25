export function cx(
  ...parts: Array<string | null | undefined | false | Record<string, boolean>>
) {
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === "string") {
      out.push(part);
      continue;
    }
    for (const [cls, enabled] of Object.entries(part)) {
      if (enabled) out.push(cls);
    }
  }
  return out.join(" ");
}

