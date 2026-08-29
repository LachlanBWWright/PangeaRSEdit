import { describe, expect, it } from "vitest";
import { SCRIPTING_CONTRACT } from "@/editor/subviews/scripts/scriptContract";
import {
  NATIVE_ITEM_AUDIT,
  getNativeReplacementDecision,
  getNativeReplacementCompatibility,
  validateNativeReplacementBatch,
  validateNativeItemAuditCatalog,
} from "@/editor/subviews/scripts/scriptNativeAudit";

describe("native replacement audit", () => {
  it("rejects semantically inconsistent audit metadata", () => {
    expect(validateNativeItemAuditCatalog().isOk()).toBe(true);
  });

  it("contains an explicit audit for every registered native spawn", () => {
    const registeredCount = SCRIPTING_CONTRACT.api.games.reduce(
      (count, game) => count + game.nativeSpawns.length,
      0,
    );
    expect(NATIVE_ITEM_AUDIT).toHaveLength(registeredCount);
    expect(new Set(NATIVE_ITEM_AUDIT.map((audit) => audit.gameId))).toEqual(
      new Set(Object.keys(SCRIPTING_CONTRACT.games)),
    );
    for (const audit of NATIVE_ITEM_AUDIT) {
      expect(audit.nativeId.length).toBeGreaterThan(0);
      expect(audit.label.length).toBeGreaterThan(0);
      expect(audit.family.length).toBeGreaterThan(0);
      expect(audit.requiredAssets.length).toBeGreaterThan(0);
      expect(audit.auditBasis.length).toBeGreaterThan(0);
      expect(["stateless", "pickup", "trigger", "native-owned"]).toContain(
        audit.lifecycle,
      );
      expect(["source-driven", "native-owned", "not-audited"]).toContain(
        audit.streaming,
      );
      expect(["not-persistent", "native-owned", "not-audited"]).toContain(
        audit.saveBehavior,
      );
    }
  });

  it("keeps Bugdom representative terrain families semantically categorized", () => {
    const bugdom = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "Bugdom-android",
    );
    expect(bugdom).toBeDefined();
    if (bugdom === undefined) return;

    const categories = new Map(
      bugdom.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(3)).toBe("Enemy");
    expect(categories.get(4)).toBe("Decoration");
    expect(categories.get(26)).toBe("Platform");
    expect(categories.get(29)).toBe("Trigger");
    expect(categories.get(39)).toBe("Objective");
    expect(categories.get(62)).toBe("Hazard");
  });

  it("keeps Bugdom 2 representative terrain families semantically categorized", () => {
    const bugdom2 = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "Bugdom2-Android",
    );
    expect(bugdom2).toBeDefined();
    if (bugdom2 === undefined) return;

    const categories = new Map(
      bugdom2.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(4)).toBe("Enemy");
    expect(categories.get(5)).toBe("Decoration");
    expect(categories.get(14)).toBe("Platform");
    expect(categories.get(42)).toBe("Hazard");
    expect(categories.get(44)).toBe("Objective");
    expect(categories.get(49)).toBe("Pickup");
  });

  it("keeps Nanosaur 2 representative terrain families semantically categorized", () => {
    const nanosaur2 = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "Nanosaur2-Android",
    );
    expect(nanosaur2).toBeDefined();
    if (nanosaur2 === undefined) return;

    const categories = new Map(
      nanosaur2.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(1)).toBe("Decoration");
    expect(categories.get(15)).toBe("Enemy");
    expect(categories.get(17)).toBe("Hazard");
    expect(categories.get(18)).toBe("Trigger");
    expect(categories.get(21)).toBe("Pickup");
    expect(categories.get(46)).toBe("Trigger");
  });

  it("keeps Cro-Mag Rally representative terrain families semantically categorized", () => {
    const cromag = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "CroMagRally-Android",
    );
    expect(cromag).toBeDefined();
    if (cromag === undefined) return;

    const categories = new Map(
      cromag.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(1)).toBe("Hazard");
    expect(categories.get(5)).toBe("Pickup");
    expect(categories.get(6)).toBe("Objective");
    expect(categories.get(17)).toBe("Hazard");
    expect(categories.get(30)).toBe("Decoration");
    expect(categories.get(57)).toBe("Hazard");
  });

  it("keeps Billy Frontier representative terrain families semantically categorized", () => {
    const billy = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "BillyFrontier-Android",
    );
    expect(billy).toBeDefined();
    if (billy === undefined) return;

    const categories = new Map(
      billy.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(1)).toBe("Enemy");
    expect(categories.get(4)).toBe("Decoration");
    expect(categories.get(21)).toBe("Pickup");
    expect(categories.get(26)).toBe("Hazard");
    expect(categories.get(32)).toBe("Pickup");
    expect(categories.get(36)).toBe("Pickup");
  });

  it("keeps Nanosaur representative terrain families semantically categorized", () => {
    const nanosaur = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "Nanosaur-android",
    );
    expect(nanosaur).toBeDefined();
    if (nanosaur === undefined) return;

    const categories = new Map(
      nanosaur.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(2)).toBe("Enemy");
    expect(categories.get(4)).toBe("Hazard");
    expect(categories.get(6)).toBe("Hazard");
    expect(categories.get(9)).toBe("Trigger");
    expect(categories.get(10)).toBe("Decoration");
    expect(categories.get(17)).toBe("Platform");
  });

  it("keeps Otto Matic representative terrain families semantically categorized", () => {
    const otto = SCRIPTING_CONTRACT.api.games.find(
      (game) => game.gameId === "OttoMatic-Android",
    );
    expect(otto).toBeDefined();
    if (otto === undefined) return;

    const categories = new Map(
      otto.nativeSpawns.map((spawn) => [spawn.nativeType ?? Number(spawn.id), spawn.category]),
    );
    expect(categories.get(1)).toBe("Decoration");
    expect(categories.get(3)).toBe("Enemy");
    expect(categories.get(13)).toBe("Trigger");
    expect(categories.get(26)).toBe("Objective");
    expect(categories.get(27)).toBe("Trigger");
    expect(categories.get(36)).toBe("Platform");
  });

  it("keeps native fallback explicit for audited native-only families", () => {
    const nativeOnly = NATIVE_ITEM_AUDIT.filter(
      (audit) => audit.classification === "native-only",
    );
    expect(nativeOnly.length).toBeGreaterThan(0);
    for (const audit of nativeOnly) {
      const compatibility = getNativeReplacementCompatibility(
        audit.gameId,
        audit.nativeType,
        audit.replacementSurface === "none" ? undefined : audit.replacementSurface,
      );
      expect(compatibility.allowed).toBe(true);
      expect(compatibility.tone).toBe("warning");
      expect(compatibility.message).toContain("native");
    }
  });

  it("applies strict and non-strict decisions consistently for every audit", () => {
    for (const audit of NATIVE_ITEM_AUDIT) {
      const replacementSurface =
        audit.replacementSurface === "none"
          ? undefined
          : audit.replacementSurface;
      const nonStrict = getNativeReplacementDecision(
        audit.gameId,
        audit.nativeType,
        false,
        replacementSurface,
      );
      expect(nonStrict.isOk(), `${audit.gameId}/${audit.nativeId}`).toBe(true);

      const strict = getNativeReplacementDecision(
        audit.gameId,
        audit.nativeType,
        true,
        replacementSurface,
      );
      if (audit.classification === "native-only") {
        expect(strict.isErr(), `${audit.gameId}/${audit.nativeId}`).toBe(true);
      } else {
        expect(strict.isOk(), `${audit.gameId}/${audit.nativeId}`).toBe(true);
      }
    }
  });

  it("uses the same audited decision path for selected and batch replacements", () => {
    const gameIds = [...new Set(NATIVE_ITEM_AUDIT.map((audit) => audit.gameId))];
    for (const gameId of gameIds) {
      const audits = NATIVE_ITEM_AUDIT.filter((audit) => audit.gameId === gameId);
      const nativeTypes = audits.slice(0, 2).map((audit) => audit.nativeType);
      const batch = validateNativeReplacementBatch(gameId, nativeTypes, false);
      expect(batch.isOk(), gameId).toBe(true);
      if (batch.isErr()) continue;

      expect(batch.value).toHaveLength(new Set(nativeTypes).size);
      for (const audit of batch.value) {
        const selected = getNativeReplacementDecision(
          gameId,
          audit.nativeType,
          false,
          audit.replacementSurface === "none"
            ? undefined
            : audit.replacementSurface,
        );
        expect(selected.isOk(), `${gameId}/${audit.nativeId}`).toBe(true);
        if (selected.isOk()) {
          expect(selected.value.nativeId).toBe(audit.nativeId);
        }
      }
    }
  });

  it("returns explicit compatibility errors for unknown and mismatched surfaces", () => {
    const unknown = getNativeReplacementCompatibility("Bugdom-android", 999);
    expect(unknown).toEqual({
      allowed: false,
      label: "Unsupported native type",
      message: "Native type 999 is not registered for Bugdom-android. Select a registered game object before creating a replacement.",
      tone: "danger",
      auditWarnings: [],
    });

    const mismatched = getNativeReplacementCompatibility(
      "MightyMike-Android",
      1,
      "terrain",
    );
    expect(mismatched.allowed).toBe(false);
    expect(mismatched.tone).toBe("danger");
    expect(mismatched.message).toContain("no terrain replacement path");
  });
});
