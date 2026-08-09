import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

export function getDefaultHoverBeaconVisual(
  gameId: string,
): ScriptCustomObjectDefinition["visual"] {
  if (gameId === "OttoMatic-Android") {
    return {
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject: 1,
      scale: 1,
      slot: 450,
    };
  }

  if (gameId === "Bugdom-android") {
    return {
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject: 2,
      scale: 1,
      slot: 450,
    };
  }

  if (gameId === "Nanosaur-android") {
    return {
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject: 15,
      scale: 1,
      slot: 450,
    };
  }

  const visibleGlobalModelByGame: Readonly<Record<string, number>> = {
    "Bugdom2-Android": 13,
    "Nanosaur2-Android": 10,
    "CroMagRally-Android": 0,
    "BillyFrontier-Android": 10,
    "MightyMike-Android": 4,
  };
  const modelObject = visibleGlobalModelByGame[gameId];
  if (modelObject !== undefined) {
    return {
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject,
      scale: 1,
      slot: 450,
    };
  }

  return { kind: "none" };
}
