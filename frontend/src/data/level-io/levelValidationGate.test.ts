import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { validateLevelDataForGameIfEnabled } from "./levelValidationGate";

describe("level validation gate", () => {
  it("allows invalid data through when the feature is disabled", () => {
    const result = validateLevelDataForGameIfEnabled(
      {},
      Game.OTTO_MATIC,
      false,
    );

    expect(result.isOk()).toBe(true);
  });

  it("rejects invalid data when the feature is enabled", () => {
    const result = validateLevelDataForGameIfEnabled(
      {},
      Game.OTTO_MATIC,
      true,
    );

    expect(result.isErr()).toBe(true);
  });
});
