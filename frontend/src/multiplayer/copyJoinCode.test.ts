import { describe, expect, it, vi } from "vitest";
import { copyJoinCode } from "./copyJoinCode";

describe("copyJoinCode", () => {
  it("copies the player-facing code", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    const result = await copyJoinCode("RALLY3", { writeText });
    expect(result.isOk()).toBe(true);
    expect(writeText).toHaveBeenCalledWith("RALLY3");
  });

  it("offers manual copying when the clipboard is unavailable", async () => {
    const result = await copyJoinCode("RALLY3", undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("manually");
  });

  it("handles clipboard permission rejection without rejecting its caller", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error("Permission denied"));
    const result = await copyJoinCode("RALLY3", { writeText });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("manually");
  });
});
