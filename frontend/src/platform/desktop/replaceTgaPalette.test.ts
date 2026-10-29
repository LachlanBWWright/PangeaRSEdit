import { expect, it } from "vitest";
import { replaceTgaPalette } from "./replaceTgaPalette";

function image(colors: number, footer = false) {
  const bytes = new Uint8Array(18 + colors * 3 + 4 + (footer ? 26 : 0));
  bytes[1] = 1; bytes[2] = 9; bytes[7] = 24; bytes[16] = 8;
  const view = new DataView(bytes.buffer);
  view.setUint16(5, colors, true);
  view.setUint16(12, 2, true); view.setUint16(14, 2, true);
  bytes.set([3, 2, 1, 0], 18 + colors * 3);
  if (footer) {
    view.setUint32(bytes.length - 26, 18 + colors * 3, true);
    bytes.set(new TextEncoder().encode("TRUEVISION-XFILE.\0"), bytes.length - 18);
  }
  return bytes;
}

it("replaces palette colors while preserving dimensions and compressed pixel bytes", () => {
  const source = image(256), target = image(4, true);
  source.fill(73, 18, 786);
  const replaced = replaceTgaPalette(source, target);
  expect(replaced.isOk()).toBe(true);
  if (replaced.isErr()) return;
  expect(replaced.value.subarray(18, 786)).toEqual(source.subarray(18, 786));
  expect(replaced.value.subarray(786, 790)).toEqual(new Uint8Array([3, 2, 1, 0]));
  expect(replaced.value.subarray(12, 18)).toEqual(target.subarray(12, 18));
  expect(new DataView(replaced.value.buffer).getUint32(replaced.value.length - 26, true)).toBe(786);
  expect(new DataView(replaced.value.buffer).getUint16(5, true)).toBe(256);
  expect(target.length).toBe(60);
});

it("rejects truncated, nonindexed and incomplete palette inputs", () => {
  expect(replaceTgaPalette(new Uint8Array(12), image(256)).isErr()).toBe(true);
  expect(replaceTgaPalette(image(4), image(256)).isErr()).toBe(true);
  const invalid = image(256); invalid[2] = 2;
  expect(replaceTgaPalette(image(256), invalid).isErr()).toBe(true);
  expect(replaceTgaPalette(image(256).subarray(0, 20), image(256)).isErr()).toBe(true);
});
