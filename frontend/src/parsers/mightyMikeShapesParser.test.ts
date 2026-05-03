import { describe, it, expect, beforeAll } from "vitest";
import { parseShapesFile } from "./mightyMikeShapesParser";

describe("mightyMikeShapesParser", () => {
  let mainShapesBuffer: ArrayBuffer;
  let jurassic1Buffer: ArrayBuffer;

  beforeAll(async () => {
    // Read actual shapes files from filesystem
    // Since vitest runs in Node environment, we can use fs
    const { readFileSync } = await import("fs");
    const { resolve, join } = await import("path");

    const publicDir = resolve(__dirname, "../../public");
    const mainPath = join(publicDir, "data/mightymike/shapes/main.shapes");
    const jurassicPath = join(
      publicDir,
      "data/mightymike/shapes/jurassic1.shapes",
    );

    const mainBuffer = readFileSync(mainPath);
    const jurassicBuffer = readFileSync(jurassicPath);

    mainShapesBuffer = mainBuffer.buffer.slice(
      mainBuffer.byteOffset,
      mainBuffer.byteOffset + mainBuffer.byteLength,
    );
    jurassic1Buffer = jurassicBuffer.buffer.slice(
      jurassicBuffer.byteOffset,
      jurassicBuffer.byteOffset + jurassicBuffer.byteLength,
    );
  });

  it("should parse main.shapes file without errors", () => {
    const result = parseShapesFile(mainShapesBuffer);
    if (result.isErr()) {
      console.error("Parse failed:", result.error);
    }
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.colorTable.length).toBeGreaterThan(0);
      expect(result.value.shapes.length).toBeGreaterThan(0);
      console.log(
        `main.shapes: ${result.value.shapes.length} shapes, ${result.value.colorTable.length} colors`,
      );
    }
  });

  it("should parse jurassic1.shapes file without errors", () => {
    const result = parseShapesFile(jurassic1Buffer);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.colorTable.length).toBeGreaterThan(0);
      expect(result.value.shapes.length).toBeGreaterThan(0);
      console.log(
        `jurassic1.shapes: ${result.value.shapes.length} shapes, ${result.value.colorTable.length} colors`,
      );
    }
  });

  it("should have valid frame data in shapes", () => {
    const result = parseShapesFile(mainShapesBuffer);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const shapes = result.value.shapes;
      expect(shapes.length).toBeGreaterThan(0);

      // Check first shape
      const firstShape = shapes[0];
      expect(firstShape).toBeDefined();
      if (firstShape) {
        expect(firstShape.frames.length).toBeGreaterThan(0);

        // Check first frame
        const firstFrame = firstShape.frames[0];
        expect(firstFrame).toBeDefined();
        if (firstFrame) {
          expect(firstFrame.header.width).toBeGreaterThan(0);
          expect(firstFrame.header.height).toBeGreaterThan(0);
          expect(firstFrame.pixels.length).toBeGreaterThan(0);
          expect(firstFrame.pixels.length).toBe(
            firstFrame.header.width * firstFrame.header.height,
          );

          console.log(
            `First frame: ${firstFrame.header.width}x${firstFrame.header.height}, ${firstFrame.pixels.length} pixels`,
          );
        }
      }
    }
  });

  it("should have consistent color table references", () => {
    const result = parseShapesFile(mainShapesBuffer);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const colorTable = result.value.colorTable;
      const shapes = result.value.shapes;

      // Check that all pixel indices are valid color table indices
      for (const shape of shapes) {
        for (const frame of shape.frames) {
          for (const pixelIndex of frame.pixels) {
            expect(pixelIndex).toBeLessThan(colorTable.length);
            expect(pixelIndex).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  }, 30000); // Increase timeout for pixel iteration
});
