import { describe, expect, it } from "vitest";
import { AUTHORITATIVE_API_SCHEMA } from "@/editor/subviews/scripts/scriptApiSchema";

describe("scripting API schema", () => {
  it("contains every shared Lua runtime function exactly once", () => {
    const names = AUTHORITATIVE_API_SCHEMA.apis.map((api) => api.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining([
      "pangea.api.requireVersion",
      "pangea.events.emit",
      "pangea.object.findByTag",
      "pangea.object.nearest",
      "pangea.random.integer",
      "pangea.spawn.nativeResult",
      "pangea.task.wait",
      "pangea.time.every",
    ]));
  });

  it("does not advertise duplicate native IDs for a game", () => {
    for (const game of AUTHORITATIVE_API_SCHEMA.games) {
      const ids = game.nativeSpawns.map((spawn) => spawn.id);
      expect(new Set(ids).size, game.gameName).toBe(ids.length);
    }
  });

  it("exposes native action discovery and consistent structured mutation results", () => {
    const methods = [
      "carry", "drop", "handover", "mount", "dismount", "fire", "reload", "transform",
      "respawn", "capture", "deliver", "resetCarried", "releaseBuddy", "grab", "interact", "commandBuddy",
    ];
    for (const method of methods) {
      const api = AUTHORITATIVE_API_SCHEMA.apis.find((candidate) => candidate.name === `pangea.player.${method}`);
      expect(api?.returnType, method).toBe("GameplayOperationResult");
      expect(api?.command?.capability, method).toBe(`player-${method}`);
      expect(api?.availabilityCapability, method).toBeUndefined();
    }
    expect(AUTHORITATIVE_API_SCHEMA.apis.find((api) => api.name === "pangea.player.actions")?.returnType).toBe("string[]");
    expect(AUTHORITATIVE_API_SCHEMA.apis.find((api) => api.name === "pangea.player.relations")?.returnType).toBe("PlayerRelations|nil");
  });
});
