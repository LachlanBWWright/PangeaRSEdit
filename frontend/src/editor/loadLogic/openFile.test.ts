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

    const gameType = {
      DATA_TYPE: "MIGHTY_MIKE",
      GAME_TYPE: "MIGHTY_MIKE",
    } as unknown as GlobalsInterface;

    await openFile({
      url: "assets/mightyMike/terrain/candy.map-1",
      gameType,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

    expect(setGlobals).toHaveBeenCalledWith(gameType);
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
    (parseMock as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({ ok: true, value: { Timg: { "1000": { data: hex } } } });

    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setMapImagesFile = vi.fn();
    const setMapImages = vi.fn();
    const setData = vi.fn();

    const gameType = {
      DATA_TYPE: DataType.RSRC_FORK,
      GAME_TYPE: "BUGDOM",
    } as unknown as GlobalsInterface;

    await openFile({
      url: "Training.ter",
      gameType,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

    expect(setMapImagesFile).toHaveBeenCalled();
    const fileArg = (setMapImagesFile as unknown as { mock: { calls: [File][] } }).mock.calls[0]?.[0];
    if (!fileArg) throw new Error("File arg is undefined");
    expect(fileArg.name).toMatch(/_tiles\.bin$/);
    expect(setMapImages).toHaveBeenCalled();
  });
});
