import { OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals, type GlobalsInterface } from "@/data/globals/globals";

const gameGlobals: Readonly<Record<string, GlobalsInterface>> = {
  "OttoMatic-Android": OttoGlobals,
  "Bugdom-android": BugdomGlobals,
  "Bugdom2-Android": Bugdom2Globals,
  "Nanosaur-android": NanosaurGlobals,
  "Nanosaur2-Android": Nanosaur2Globals,
  "CroMagRally-Android": CroMagGlobals,
  "BillyFrontier-Android": BillyFrontierGlobals,
  "MightyMike-Android": MightyMikeGlobals,
};

export function placementWorldPosition(gameId: string, position: { x: number; y: number; z: number }) {
  const globals = gameGlobals[gameId];
  const scale = globals ? globals.TILE_INGAME_SIZE / globals.TILE_SIZE : 1;
  return { x: position.x * scale, y: position.y, z: position.z * scale };
}
