import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import {
  applyPreviewGlobals,
  buildPreviewAssetBaseUrls,
  createPreviewModule,
  getPreviewTerrainPaths,
  loadPreviewRuntime,
} from "./gamePreviewRuntime";
import { startGamePreview } from "./gamePreviewHostRuntime";

vi.mock("./gamePreviewRuntime", () => ({
  applyPreviewGlobals: vi.fn(() => vi.fn()),
  buildPreviewAssetBaseUrls: vi.fn(() => ["https://assets.test/"]),
  createPreviewModule: vi.fn((options: { canvas: HTMLCanvasElement }) => ({
    canvas: options.canvas,
    arguments: [],
    preRun: [],
    locateFile: () => "",
  })),
  getPreviewTerrainPaths: vi.fn(() => null),
  loadPreviewRuntime: vi.fn(),
}));

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 640 });
  Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 480 });
  return canvas;
}

function startOptions(canvas: HTMLCanvasElement) {
  return {
    canvas,
    config: GAME_PORT_CONFIGS[Game.CRO_MAG],
    levelNumber: 1,
    currentLevelInfo: undefined,
    terrainDataBytes: null,
    terrainRsrcBytes: null,
    terrainTextureBytes: null,
    runToken: 7,
    normalLaunch: true,
    onStatus: vi.fn(),
    onError: vi.fn(),
  };
}

describe("startGamePreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        public observe(target: Element): void {
          void target;
        }
        public disconnect(): void {
          void 0;
        }
      },
    );
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
      window.setTimeout(() => callback(performance.now()), 0),
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      window.clearTimeout(id);
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(buildPreviewAssetBaseUrls).mockReturnValue(["https://assets.test/"]);
    vi.mocked(getPreviewTerrainPaths).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts the runtime after a stable canvas size and restores globals on cleanup", async () => {
    const canvas = createCanvas();
    const previousModule = {
      canvas,
      arguments: [],
      preRun: [],
      locateFile: () => "previous",
    };
    window.Module = previousModule;
    const cleanupGlobals = vi.fn();
    const stopGame = vi.fn();
    vi.mocked(applyPreviewGlobals).mockReturnValueOnce(cleanupGlobals);
    vi.mocked(loadPreviewRuntime).mockResolvedValueOnce(stopGame);
    const options = startOptions(canvas);

    const cleanup = startGamePreview(options);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(options.onStatus).toHaveBeenCalledWith("Waiting for game canvas...");
    expect(options.onStatus).toHaveBeenCalledWith("Loading runtime script...");
    expect(loadPreviewRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ canvas }),
      "https://assets.test/CroMagRally.js?v=5-1-7",
      expect.any(Function),
    );
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);

    cleanup();

    expect(stopGame).toHaveBeenCalled();
    expect(cleanupGlobals).toHaveBeenCalled();
    expect(window.Module).toBe(previousModule);
  });

  it("tries the next asset base after a missing script and reports terminal failures", async () => {
    const canvas = createCanvas();
    vi.mocked(buildPreviewAssetBaseUrls).mockReturnValueOnce([
      "https://missing.test/",
      "https://working.test/",
    ]);
    vi.mocked(loadPreviewRuntime)
      .mockRejectedValueOnce(new Error("404 missing runtime"))
      .mockRejectedValueOnce(new Error("runtime crashed"));
    const options = startOptions(canvas);

    const cleanup = startGamePreview(options);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(loadPreviewRuntime).toHaveBeenCalledTimes(2);
    expect(options.onError).toHaveBeenCalledWith("runtime crashed");
    cleanup();
  });

  it("does not start a cancelled preview when canvas observation resolves later", async () => {
    const canvas = createCanvas();
    const options = startOptions(canvas);
    const cleanup = startGamePreview(options);

    cleanup();
    await vi.advanceTimersByTimeAsync(0);

    expect(createPreviewModule).not.toHaveBeenCalled();
    expect(loadPreviewRuntime).not.toHaveBeenCalled();
  });

  it("exits fullscreen and emits a resize pulse for the active preview canvas", async () => {
    const canvas = createCanvas();
    const exitFullscreen = document.exitFullscreen;
    let fullscreenCanvas: Element | null = canvas;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenCanvas,
    });
    vi.mocked(loadPreviewRuntime).mockResolvedValueOnce(() => undefined);
    const resizeSpy = vi.spyOn(window, "dispatchEvent");
    const cleanup = startGamePreview(startOptions(canvas));
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(exitFullscreen).toHaveBeenCalled();
    expect(resizeSpy).toHaveBeenCalledWith(expect.any(Event));
    fullscreenCanvas = null;
    cleanup();
  });
});
