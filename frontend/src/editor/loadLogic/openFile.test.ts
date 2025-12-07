import { describe, it, expect, vi } from "vitest";
import openFile from "./openFile";

describe("openFile", () => {
  it("should fetch resource and call setters for MIGHTY_MIKE", async () => {
    const fakeBlob = new Blob(["dummy"], { type: "application/octet-stream" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ blob: async () => fakeBlob }),
    );

    // mock parseLevelDataFile so we don't run complex parsing
    vi.mock("./parseLevelDataFile", () => ({
      default: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    }));
    // Import after mocking to ensure mock is applied
    const { default: _parse } = await import("./parseLevelDataFile");

    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setMapImagesFile = vi.fn();
    const setMapImages = vi.fn();
    const setData = vi.fn();
    const pyodideWorker = {} as Worker;

    const gameType = {
      DATA_TYPE: "MIGHTY_MIKE",
      GAME_TYPE: "MIGHTY_MIKE",
    } as any;

    await openFile({
      url: "assets/mightyMike/terrain/candy.map-1",
      gameType,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      pyodideWorker,
      setData,
    });

    expect(setGlobals).toHaveBeenCalledWith(gameType);
    expect(setMapFile).toHaveBeenCalled();
    expect(setMapImages).toHaveBeenCalledWith([]);
    // parseLevelDataFile should have been called
    expect(_parse).toHaveBeenCalled();
  });
});
