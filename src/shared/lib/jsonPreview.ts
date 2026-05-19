export function jsonPreview(value: unknown, max = 96): string {
  if (value == null) return "null";
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > max
      ? `${serialized.slice(0, max)}…`
      : serialized;
  } catch {
    return "…";
  }
}

export function textPreview(
  value: string | null | undefined,
  max = 96,
): string {
  if (value == null || value === "") return "null";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
