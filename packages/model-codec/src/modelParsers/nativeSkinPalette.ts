export function nativePaletteMatch(a: readonly number[], b: readonly number[], threshold: number): boolean {
  return [0, 1, 2].every((index) => Math.abs((a[index] ?? 0) - (b[index] ?? 0)) < threshold);
}

export function nativeNormal(values: readonly number[]): [number, number, number] {
  const [x = 0, y = 0, z = 0] = values;
  const length = Math.hypot(x, y, z);
  return length > 0 ? [x / length, y / length, z / length] : [0, 0, 0];
}
