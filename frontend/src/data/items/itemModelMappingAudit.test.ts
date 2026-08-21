import { describe, expect, it } from "vitest";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  Game,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "../globals/globals";
import { getGameMapper } from "./mappers";
import {
  getItemModelAuditEntries,
  getItemModelAuditEntry,
} from "./itemModelMappingAudit";

const games: readonly [Game, GlobalsInterface][] = [
  [Game.OTTO_MATIC, OttoGlobals],
  [Game.BUGDOM, BugdomGlobals],
  [Game.BUGDOM_2, Bugdom2Globals],
  [Game.NANOSAUR, NanosaurGlobals],
  [Game.NANOSAUR_2, Nanosaur2Globals],
  [Game.CRO_MAG, CroMagGlobals],
  [Game.BILLY_FRONTIER, BillyFrontierGlobals],
];

describe("item model mapping audit", () => {
  it("has an individual audit disposition for every unresolved preview entry", () => {
    const unresolved: string[] = [];

    for (const [game, globals] of games) {
      const mapper = getGameMapper(game);
      const sources = [
        ["terrainItem", globals.ITEM_TYPES],
        ["splineItem", globals.SPLINE_ITEM_TYPES ?? {}],
      ] as const;

      for (const [kind, items] of sources) {
        for (const [rawType] of Object.entries(items)) {
          const itemType = Number.parseInt(rawType, 10);
          if (Number.isNaN(itemType)) continue;
          const mapping = mapper?.getMapping(
            itemType,
            undefined,
            { p0: 0, p1: 0, p2: 0, p3: 0 },
            0,
            kind,
          );
          if (!mapping && !getItemModelAuditEntry(game, kind, itemType)) {
            unresolved.push(`${game}:${kind}:${itemType}`);
          }
        }
      }
    }

    expect(unresolved).toEqual([]);
  });

  it("does not contain duplicate audit keys", () => {
    const keys = getItemModelAuditEntries().map(
      (entry) => `${entry.game}:${entry.kind}:${entry.itemType}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
