import { beforeEach, describe, expect, it, vi } from "vitest";
import { err } from "neverthrow";
import type { Level } from "@/data/levels";

const getFeatureFlagsMock = vi.fn();
const validateLevelBytesForGameMock = vi.fn();

vi.mock("@/config/featureFlags", () => ({
  getFeatureFlags: getFeatureFlagsMock,
}));

vi.mock("@/data/level-io/levelValidationGate", () => ({
  validateLevelBytesForGame: validateLevelBytesForGameMock,
}));

const level = {
  id: "test-level",
  name: "Test Level",
  game: "ottoMatic",
  gameDisplayName: "Otto Matic",
  summary: "Test level",
  description: "Test level",
  rsrcFile: "/test-level.rsrc",
} satisfies Level;

describe("download level validation gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
      ),
    );
  });

  it("does not create an archive when validation fails", async () => {
    getFeatureFlagsMock.mockReturnValue({ levelValidation: true });
    validateLevelBytesForGameMock.mockResolvedValue(
      err("invalid item resource"),
    );

    const { downloadLevelArchive } = await import("./downloadLevelUtils");
    const result = await downloadLevelArchive(level);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBe("invalid item resource");
  });

  it("creates an archive without validation when the flag is disabled", async () => {
    getFeatureFlagsMock.mockReturnValue({ levelValidation: false });

    const { downloadLevelArchive } = await import("./downloadLevelUtils");
    const result = await downloadLevelArchive(level);

    expect(result.isOk()).toBe(true);
    expect(validateLevelBytesForGameMock).not.toHaveBeenCalled();
  });
});
