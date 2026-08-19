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
});
