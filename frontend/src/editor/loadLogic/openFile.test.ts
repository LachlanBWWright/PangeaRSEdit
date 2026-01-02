import { describe, it, expect, vi } from "vitest";
import { openFile } from "./openFile";
import type { GlobalsInterface } from "@/data/globals/globals";
import { DataType } from "@/data/globals/globals";

describe("openFile", () => {
  it("should fetch resource and call setters for MIGHTY_MIKE", async () => {
    const fakeBlob = new Blob(["dummy"], { type: "application/octet-stream" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ blob: async () => fakeBlob }),
    );

    // mock parseLevelDataFile so we don't run complex parsing
    vi.mock("./parseLevelDataFile", () => ({
      parseLevelDataFile: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    }));
    // Import after mocking to ensure mock is applied
    const { parseLevelDataFile: _parse } = await import("./parseLevelDataFile");

    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setMapImagesFile = vi.fn();
    const setMapImages = vi.fn();
    const setData = vi.fn();

    const gameTypeUnknown: unknown = {
      DATA_TYPE: "MIGHTY_MIKE",
      GAME_TYPE: "MIGHTY_MIKE",
    };
    function assertIsGlobals(x: unknown): asserts x is GlobalsInterface {
      if (typeof x !== 'object' || x === null || !('DATA_TYPE' in x)) {
        throw new Error('Invalid gameType');
      }
    }
    assertIsGlobals(gameTypeUnknown);

    await openFile({
      url: "assets/mightyMike/terrain/candy.map-1",
      gameType: gameTypeUnknown,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

    expect(setGlobals).toHaveBeenCalledWith(gameTypeUnknown);
    expect(setMapFile).toHaveBeenCalled();
    expect(setMapImages).toHaveBeenCalledWith([]);
    // parseLevelDataFile should have been called
    expect(_parse).toHaveBeenCalled();
  });

  it("should set a synthetic images file and canvases for RSRC_FORK (Bugdom 1)", async () => {
    vi.resetModules();
    const fakeBlob = new Blob(["dummy"], { type: "application/octet-stream" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ blob: async () => fakeBlob }),
    );

    // mock parseLevelDataFile to return Timg hex data
    const tileBytes = 2 * 32 * 32;
    const hex = "00".repeat(tileBytes);

    vi.mock("./parseLevelDataFile", () => ({
      parseLevelDataFile: vi.fn(),
    }));
    const { parseLevelDataFile: parseMock } = await import("./parseLevelDataFile");
    if (typeof parseMock === 'function' && 'mockResolvedValue' in parseMock) {
      // @ts-expect-error - mocking helper
      parseMock.mockResolvedValue({ ok: true, value: { Timg: { "1000": { data: hex } } } });
    }

    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setMapImagesFile = vi.fn();
    const setMapImages = vi.fn();
    const setData = vi.fn();

    const gameTypeUnknown: unknown = {
      DATA_TYPE: DataType.RSRC_FORK,
      GAME_TYPE: "BUGDOM",
    };
    function assertIsGlobals(x: unknown): asserts x is GlobalsInterface {
      if (typeof x !== 'object' || x === null || !('DATA_TYPE' in x)) {
        throw new Error('Invalid gameType');
      }
    }
    assertIsGlobals(gameTypeUnknown);

    await openFile({
      url: "Training.ter",
      gameType: gameTypeUnknown,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

    expect(setMapImagesFile).toHaveBeenCalled();
    const maybeMock = setMapImagesFile as unknown;
    if (typeof maybeMock === 'object' && maybeMock && 'mock' in maybeMock) {
      // @ts-expect-error - inspect mock calls
      const calls = maybeMock.mock?.calls;
      const fileArg = Array.isArray(calls) && calls[0] && Array.isArray(calls[0]) ? calls[0][0] : undefined;
      if (!fileArg) throw new Error("File arg is undefined");
      function hasName(x: unknown): x is { name: unknown } {
        return typeof x === 'object' && x !== null && 'name' in x;
      }
      const maybeName = hasName(fileArg) ? fileArg.name : undefined;
      if (typeof maybeName !== 'string') throw new Error('File arg missing name');
      expect(maybeName).toMatch(/_tiles\.bin$/);
    } else {
      throw new Error('setMapImagesFile is not a mock');
    }
    expect(setMapImages).toHaveBeenCalled();
  });
});
