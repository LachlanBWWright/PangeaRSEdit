import { describe, expect, it, vi } from "vitest";
import { parseTGAToCanvas } from "./tgaImageParser";

function makeTga(options: {
  imageType: number;
  width: number;
  height: number;
  pixelDepth: number;
  descriptor?: number;
  colorMapType?: number;
  colorMapDepth?: number;
  colorMap?: number[];
  pixels: number[];
}): ArrayBuffer {
  const colorMap = options.colorMap ?? [];
  const header = new Uint8Array(18);
  header[2] = options.imageType;
  header[1] = options.colorMapType ?? 0;
  new DataView(header.buffer).setUint16(5, colorMap.length / ((options.colorMapDepth ?? 0) / 8), true);
  header[7] = options.colorMapDepth ?? 0;
  new DataView(header.buffer).setUint16(12, options.width, true);
  new DataView(header.buffer).setUint16(14, options.height, true);
  header[16] = options.pixelDepth;
  header[17] = options.descriptor ?? 0x20;
  const result = new Uint8Array(header.length + colorMap.length + options.pixels.length);
  result.set(header);
  result.set(colorMap, header.length);
  result.set(options.pixels, header.length + colorMap.length);
  return result.buffer;
}

describe("parseTGAToCanvas", () => {
  it("decodes uncompressed BGR pixels and honors top-left origin", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({ imageType: 2, width: 2, height: 1, pixelDepth: 24, pixels: [3, 2, 1, 6, 5, 4] }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
    putImageData.mockRestore();
  });

  it("decodes 32-bit alpha and flips bottom-left origin", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({
        imageType: 2,
        width: 1,
        height: 2,
        pixelDepth: 32,
        descriptor: 0,
        pixels: [3, 2, 1, 9, 6, 5, 4, 8],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([4, 5, 6, 8, 1, 2, 3, 9]);
    putImageData.mockRestore();
  });

  it("decodes RLE packets without writing beyond the image", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({ imageType: 10, width: 3, height: 1, pixelDepth: 24, pixels: [0x82, 3, 2, 1] }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([
      1, 2, 3, 255,
      1, 2, 3, 255,
      1, 2, 3, 255,
    ]);
    putImageData.mockRestore();
  });

  it("decodes 16-bit 5-5-5 pixels with and without alpha attributes", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({ imageType: 2, width: 2, height: 1, pixelDepth: 16, descriptor: 1, pixels: [0x00, 0xfc, 0x00, 0x7c] }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([
      255, 0, 0, 255,
      255, 0, 0, 0,
    ]);
    putImageData.mockRestore();
  });

  it("decodes a repeated 16-bit RLE packet", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({ imageType: 11, width: 2, height: 1, pixelDepth: 16, pixels: [0x81, 0xe0, 0x03] }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([
      0, 255, 0, 255,
      0, 255, 0, 255,
    ]);
    putImageData.mockRestore();
  });

  it("decodes indexed color maps using the pixel index", () => {
    const putImageData = vi.spyOn(CanvasRenderingContext2D.prototype, "putImageData");
    const result = parseTGAToCanvas(
      makeTga({
        imageType: 9,
        width: 2,
        height: 1,
        pixelDepth: 8,
        colorMapType: 1,
        colorMapDepth: 24,
        colorMap: [30, 20, 10, 60, 50, 40],
        pixels: [1, 0, 1],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(Array.from(putImageData.mock.lastCall?.[0].data ?? [])).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
    putImageData.mockRestore();
  });

  it.each([
    [0, "Invalid TGA: image dimensions are zero"],
    [1, "Unsupported TGA image type: 1 (only types 2, 3, 9, 10, 11 supported)"],
  ])("returns a typed error for invalid image type or dimensions", (width, message) => {
    const result = parseTGAToCanvas(
      makeTga({ imageType: width === 0 ? 2 : 1, width, height: 1, pixelDepth: 24, pixels: [] }),
    );
    expect(result.isErr() ? result.error : "").toBe(message);
  });

  it("rejects unsupported indexed and true-color depths", () => {
    const indexed = parseTGAToCanvas(
      makeTga({ imageType: 9, width: 1, height: 1, pixelDepth: 16, colorMapType: 1, colorMapDepth: 24, pixels: [0] }),
    );
    const trueColor = parseTGAToCanvas(
      makeTga({ imageType: 2, width: 1, height: 1, pixelDepth: 8, pixels: [0] }),
    );

    expect(indexed.isErr() ? indexed.error : "").toContain("indexed color");
    expect(trueColor.isErr() ? trueColor.error : "").toContain("Unsupported pixel depth");
  });
});
