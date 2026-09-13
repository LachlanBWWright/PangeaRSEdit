import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, okAsync } from "neverthrow";
import { Game } from "@/data/globals/globals";
import type { Level } from "@/data/levels";

const fetchPlayBytesMock = vi.fn();
const validateLevelBytesForGameMock = vi.fn();
const getFeatureFlagsMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("./downloadLevelUtils", () => ({
  downloadLevelArchive: vi.fn(),
  fetchPlayBytes: fetchPlayBytesMock,
  triggerBrowserDownload: vi.fn(),
}));

vi.mock("@/data/level-io/levelValidationGate", () => ({
  validateLevelBytesForGame: validateLevelBytesForGameMock,
}));

vi.mock("@/config/featureFlags", () => ({
  getFeatureFlags: getFeatureFlagsMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

const level = {
  id: "test-level",
  name: "Test Level",
  game: "ottoMatic",
  gameDisplayName: "Otto Matic",
  summary: "Test level",
  description: "Test level",
  previewLevelNumber: 0,
  rsrcFile: "/test-level.rsrc",
} satisfies Level;

describe("play level validation gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFeatureFlagsMock.mockReturnValue({ levelValidation: true });
  });

  it("does not launch when validation fails", async () => {
    const bytes = new Uint8Array(new ArrayBuffer(1));
    fetchPlayBytesMock.mockReturnValue(okAsync([null, bytes]));
    validateLevelBytesForGameMock.mockResolvedValue(
      err("missing required level resource"),
    );
    const onPlayInBrowser = vi.fn();
    const setIsFetchingPlay = vi.fn();

    const { createPlayInBrowserHandler } = await import("./levelCardActions");
    createPlayInBrowserHandler({
      level,
      onPlayInBrowser,
      setIsFetchingPlay,
    })();

    await vi.waitFor(() => expect(setIsFetchingPlay).toHaveBeenLastCalledWith(false));
    expect(onPlayInBrowser).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Level validation failed: missing required level resource",
    );
  });

  it("launches after validation passes", async () => {
    const bytes = new Uint8Array(new ArrayBuffer(1));
    fetchPlayBytesMock.mockReturnValue(okAsync([null, bytes]));
    validateLevelBytesForGameMock.mockResolvedValue(okAsync(undefined));
    const onPlayInBrowser = vi.fn();
    const setIsFetchingPlay = vi.fn();

    const { createPlayInBrowserHandler } = await import("./levelCardActions");
    createPlayInBrowserHandler({
      level,
      onPlayInBrowser,
      setIsFetchingPlay,
    })();

    await vi.waitFor(() => expect(onPlayInBrowser).toHaveBeenCalledTimes(1));
    expect(onPlayInBrowser).toHaveBeenCalledWith(
      Game.OTTO_MATIC,
      0,
      null,
      bytes,
    );
  });
});
