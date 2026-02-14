import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { buildItemAuditEntries, createItemAuditReport } from "@/pages/itemAuditUtils";

describe("itemAuditUtils", () => {
  it("builds item audit entries for a game", () => {
    const entries = buildItemAuditEntries(Game.OTTO_MATIC, {});
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.itemType).toBe(0);
    expect(entries[0]?.itemName.length).toBeGreaterThan(0);
  });

  it("includes custom decisions in exported report", () => {
    const report = createItemAuditReport(Game.OTTO_MATIC, {
      0: {
        modelStatus: "correct",
        paramStatus: {
          p0: "incorrect",
          p1: "unknown",
          p2: "unknown",
          p3: "unknown",
        },
        notes: "checked in test",
      },
    });
    expect(report.entries.length).toBeGreaterThan(0);
    const first = report.entries.find((entry) => entry.itemType === 0);
    expect(first?.decision.modelStatus).toBe("correct");
    expect(first?.decision.paramStatus.p0).toBe("incorrect");
  });
});
