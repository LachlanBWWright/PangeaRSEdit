import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export type ScriptCapabilityStatus =
  | "supported"
  | "previewOnly"
  | "nativeOnly"
  | "stubbed"
  | "unsupported"
  | "unsafeInMultiplayer"
  | "planned";

export type ScriptCapabilityKey =
  | "levelHooks"
  | "globalFrameHooks"
  | "terrainItemHooks"
  | "splineItemHooks"
  | "mapItemHooks"
  | "objectFrameHooks"
  | "nativeSpawn"
  | "scriptedSpawn"
  | "playerLookup"
  | "levelMetadata"
  | "timeAPIs"
  | "logging"
  | "statusReporting"
  | "multiplayer";

export interface GameCapabilityRow {
  readonly levelHooks: ScriptCapabilityStatus;
  readonly globalFrameHooks: ScriptCapabilityStatus;
  readonly terrainItemHooks: ScriptCapabilityStatus;
  readonly splineItemHooks: ScriptCapabilityStatus;
  readonly mapItemHooks: ScriptCapabilityStatus;
  readonly objectFrameHooks: ScriptCapabilityStatus;
  readonly nativeSpawn: ScriptCapabilityStatus;
  readonly scriptedSpawn: ScriptCapabilityStatus;
  readonly playerLookup: ScriptCapabilityStatus;
  readonly levelMetadata: ScriptCapabilityStatus;
  readonly timeAPIs: ScriptCapabilityStatus;
  readonly logging: ScriptCapabilityStatus;
  readonly statusReporting: ScriptCapabilityStatus;
  readonly multiplayer: ScriptCapabilityStatus;
}

export const CAPABILITY_MATRIX: Record<string, GameCapabilityRow> = {
  "OttoMatic-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
  "Bugdom-android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
  "Bugdom2-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
  "Nanosaur-android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "unsupported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
  "Nanosaur2-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsafeInMultiplayer",
  },
  "CroMagRally-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "unsupported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsafeInMultiplayer",
  },
  "BillyFrontier-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
  "MightyMike-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "unsupported",
    splineItemHooks: "unsupported",
    mapItemHooks: "supported",
    objectFrameHooks: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    multiplayer: "unsupported",
  },
};

const DEFAULT_CAPABILITY_ROW: GameCapabilityRow = {
  levelHooks: "unsupported",
  globalFrameHooks: "unsupported",
  terrainItemHooks: "unsupported",
  splineItemHooks: "unsupported",
  mapItemHooks: "unsupported",
  objectFrameHooks: "unsupported",
  nativeSpawn: "unsupported",
  scriptedSpawn: "unsupported",
  playerLookup: "unsupported",
  levelMetadata: "unsupported",
  timeAPIs: "unsupported",
  logging: "unsupported",
  statusReporting: "unsupported",
  multiplayer: "unsupported",
};

export function getCapability(
  gameId: string,
  key: ScriptCapabilityKey,
): ScriptCapabilityStatus {
  const row = CAPABILITY_MATRIX[gameId] ?? DEFAULT_CAPABILITY_ROW;
  return row[key];
}

export function isCapabilitySupported(
  gameId: string,
  key: ScriptCapabilityKey,
): boolean {
  const status = getCapability(gameId, key);
  return status === "supported" || status === "previewOnly" || status === "nativeOnly";
}

export function getHookCapabilityKey(hookId: string): ScriptCapabilityKey {
  switch (hookId) {
    case "onTerrainItem":
      return "terrainItemHooks";
    case "onSplineItem":
      return "splineItemHooks";
    case "onMapItem":
      return "mapItemHooks";
    case "onObjectFrame":
    case "onPickupCollected":
    case "onWeaponHit":
    case "onTriggerEnter":
      return "objectFrameHooks";
    case "onFrame":
    case "onAreaFrame":
      return "globalFrameHooks";
    default:
      return "levelHooks";
  }
}

export function getWorkspaceWarnings(
  state: ScriptWorkspaceState,
): readonly string[] {
  const warnings: string[] = [];
  const gameId = state.context.gameId;

  const mpStatus = getCapability(gameId, "multiplayer");
  if (mpStatus === "unsafeInMultiplayer") {
    warnings.push("Multiplayer support is untested and unsafe for scripting on this game.");
  }

  const activeHooks = new Set<string>();
  for (const levelState of Object.values(state.levels)) {
    for (const globalHook of levelState.globalHooks) {
      activeHooks.add(globalHook.hookId);
    }
    if (levelState.terrainBindings.length > 0) {
      activeHooks.add("onTerrainItem");
    }
    if (levelState.splineBindings.length > 0) {
      activeHooks.add("onSplineItem");
    }
    if (levelState.mapItemBindings.length > 0) {
      activeHooks.add("onMapItem");
    }
  }

  for (const hook of activeHooks) {
    const capKey = getHookCapabilityKey(hook);
    const capStatus = getCapability(gameId, capKey);
    if (capStatus === "stubbed") {
      warnings.push(`Hook '${hook}' is stubbed (not fully implemented) on this game.`);
    } else if (capStatus === "planned") {
      warnings.push(`Hook '${hook}' is planned but currently unimplemented on this game.`);
    } else if (capStatus === "unsupported") {
      warnings.push(`Hook '${hook}' is unsupported on this game.`);
    }
  }

  const checkApis: {
    key: string;
    capability: ScriptCapabilityKey;
    name: string;
  }[] = [
    {
      key: "pangea.spawn.native",
      capability: "nativeSpawn",
      name: "pangea.spawn.native",
    },
    {
      key: "pangea.spawn.scripted",
      capability: "scriptedSpawn",
      name: "pangea.spawn.scripted",
    },
    {
      key: "pangea.player.get",
      capability: "playerLookup",
      name: "pangea.player.get",
    },
    {
      key: "pangea.level.current",
      capability: "levelMetadata",
      name: "pangea.level.current",
    },
  ];

  for (const file of Object.values(state.sourceFiles)) {
    if (file.path.startsWith("Data/Scripts/src/") && file.path !== "Data/Scripts/src/main.lua") {
      for (const api of checkApis) {
        if (file.content.includes(api.key)) {
          const capStatus = getCapability(gameId, api.capability);
          if (capStatus === "stubbed") {
            warnings.push(`Script uses API '${api.name}' which is stubbed on this game.`);
          } else if (capStatus === "planned") {
            warnings.push(`Script uses API '${api.name}' which is planned but unimplemented on this game.`);
          } else if (capStatus === "unsupported") {
            warnings.push(`Script uses API '${api.name}' which is unsupported on this game.`);
          }
        }
      }
    }
  }

  return [...new Set(warnings)];
}
