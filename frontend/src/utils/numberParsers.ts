export function parseU16(value: number | string) {
  if (typeof value === "string") value = parseInt(value);

  if (isNaN(value)) return 0;

  if (value > 65535) return 65535;
  if (value < 0) return 0;

  return value;
}

export function parseU8(value: number | string) {
  if (typeof value === "string") value = parseInt(value) || 0;

  if (isNaN(value)) return 0;

  if (value > 255) return 255;
  if (value < 0) return 0;

  return value;
}
