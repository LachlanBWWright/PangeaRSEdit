import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { buildItemAuditEntries } from "@/pages/itemAuditUtils";
import { ItemType as BugdomItemType } from "@/data/items/bugdomItemType";

describe("itemAuditUtils", () => {
  it("marks source-derived Bugdom mappings as verified", () => {
    const entries = buildItemAuditEntries(Game.BUGDOM, {});
    const detonatorEntry = entries.find(
      (entry) => entry.itemType === BugdomItemType.Detonator,
    );

    expect(detonatorEntry?.verificationStatus).toBe("verified");
    expect(detonatorEntry?.modelPartCount).toBe(2);
    expect(detonatorEntry?.staticAnalysisIssues).toEqual([]);
  });

  it("flags approximate Bugdom mappings", () => {
    const entries = buildItemAuditEntries(Game.BUGDOM, {});
    const spiderEntry = entries.find(
      (entry) => entry.itemType === BugdomItemType.Enemy_Spider,
    );

    expect(spiderEntry?.verificationStatus).toBe("approximate");
    expect(
      spiderEntry?.staticAnalysisIssues.includes(
        "Mapping is still approximate and not fully source-derived.",
      ),
    ).toBe(true);
  });
});
