import { err, ok } from "neverthrow";

function paletteRange(bytes: Uint8Array) {
  if (bytes.length < 18) return err("TGA header is incomplete");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(5, true), start = 18 + (bytes[0] ?? 0);
  if (bytes[1] !== 1 || (bytes[2] !== 1 && bytes[2] !== 9) || view.getUint16(3, true) !== 0
    || bytes[7] !== 24 || bytes[16] !== 8 || count < 1 || count > 256 || start + count * 3 > bytes.length)
    return err("Palette replacement requires an indexed TGA with a 24-bit palette");
  return ok({ start, end: start + count * 3, count });
}

export function replaceTgaPalette(source: Uint8Array, target: Uint8Array) {
  const palette = paletteRange(source), image = paletteRange(target);
  if (palette.isErr()) return err(palette.error);
  if (image.isErr()) return err(image.error);
  if (palette.value.count !== 256) return err("Choose a complete 256-color palette");
  const difference = 768 - (image.value.end - image.value.start);
  const result = new Uint8Array(target.length + difference);
  result.set(target.subarray(0, image.value.start));
  result.set(source.subarray(palette.value.start, palette.value.end), image.value.start);
  result.set(target.subarray(image.value.end), image.value.start + 768);
  const view = new DataView(result.buffer);
  view.setUint16(5, 256, true);
  const footer = result.length - 26;
  if (footer >= 0 && new TextDecoder().decode(result.subarray(footer + 8)) === "TRUEVISION-XFILE.\0") {
    for (const offset of [footer, footer + 4]) {
      const previous = view.getUint32(offset, true);
      if (previous >= image.value.end) view.setUint32(offset, previous + difference, true);
    }
  }
  return ok(result);
}
