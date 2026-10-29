export function nativeMilliseconds(value: number): string {
  if (value > 0 && value < 0.001) return "<0.001 ms";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ms`;
}
