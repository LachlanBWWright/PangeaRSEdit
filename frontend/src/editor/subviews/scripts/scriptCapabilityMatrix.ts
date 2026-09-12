import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { getNativeItemAudit } from "./scriptNativeAudit";

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
  | "objectTriggerEvents"
  | "objectAnimationCompletionEvents"
  | "objectAnimationMarkerEvents"
  | "checkpointEvents"
  | "raceProgressEvents"
  | "objectiveEvents"
  | "damageEvents"
  | "playerLifecycleEvents"
  | "pickupEvents"
  | "pickupScoreEffects"
  | "weaponScoreEffects"
  | "weaponHitEvents"
  | "nativeSpawn"
  | "scriptedSpawn"
  | "playerLookup"
  | "playerScore"
  | "playerLives"
  | "playerInventory"
  | "playerForm"
  | "playerCommands"
  | "playerInvulnerability"
  | "raceMetadata"
  | "objectiveMetadata"
  | "objectCollision"
  | "levelMetadata"
  | "timeAPIs"
  | "logging"
  | "statusReporting"
  | "persistence"
  | "multiplayer";

export interface GameCapabilityRow {
  readonly levelHooks: ScriptCapabilityStatus;
  readonly globalFrameHooks: ScriptCapabilityStatus;
  readonly terrainItemHooks: ScriptCapabilityStatus;
  readonly splineItemHooks: ScriptCapabilityStatus;
  readonly mapItemHooks: ScriptCapabilityStatus;
  readonly objectFrameHooks: ScriptCapabilityStatus;
  readonly objectTriggerEvents: ScriptCapabilityStatus;
  readonly objectAnimationCompletionEvents: ScriptCapabilityStatus;
  readonly objectAnimationMarkerEvents: ScriptCapabilityStatus;
  readonly checkpointEvents: ScriptCapabilityStatus;
  readonly raceProgressEvents: ScriptCapabilityStatus;
  readonly objectiveEvents: ScriptCapabilityStatus;
  readonly damageEvents: ScriptCapabilityStatus;
  readonly playerLifecycleEvents: ScriptCapabilityStatus;
  readonly pickupEvents: ScriptCapabilityStatus;
  readonly pickupScoreEffects: ScriptCapabilityStatus;
  readonly weaponScoreEffects: ScriptCapabilityStatus;
  readonly weaponHitEvents: ScriptCapabilityStatus;
  readonly nativeSpawn: ScriptCapabilityStatus;
  readonly scriptedSpawn: ScriptCapabilityStatus;
  readonly playerLookup: ScriptCapabilityStatus;
  readonly playerScore: ScriptCapabilityStatus;
  readonly playerLives: ScriptCapabilityStatus;
  readonly playerInventory: ScriptCapabilityStatus;
  readonly playerForm: ScriptCapabilityStatus;
  readonly playerCommands: ScriptCapabilityStatus;
  readonly playerInvulnerability: ScriptCapabilityStatus;
  readonly raceMetadata: ScriptCapabilityStatus;
  readonly objectiveMetadata: ScriptCapabilityStatus;
  readonly objectCollision: ScriptCapabilityStatus;
  readonly levelMetadata: ScriptCapabilityStatus;
  readonly timeAPIs: ScriptCapabilityStatus;
  readonly logging: ScriptCapabilityStatus;
  readonly statusReporting: ScriptCapabilityStatus;
  readonly persistence: ScriptCapabilityStatus;
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
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "unsupported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsupported",
  },
  "Bugdom-android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "supported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "supported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsupported",
  },
  "Bugdom2-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "supported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsupported",
  },
  "Nanosaur-android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "unsupported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "unsupported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsupported",
  },
  "Nanosaur2-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "supported",
    objectiveEvents: "supported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "unsupported",
    weaponScoreEffects: "unsupported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "unsupported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "supported",
    objectiveMetadata: "supported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsafeInMultiplayer",
  },
  "CroMagRally-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "supported",
    raceProgressEvents: "supported",
    objectiveEvents: "unsupported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "unsupported",
    weaponScoreEffects: "unsupported",
    weaponHitEvents: "unsupported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "unsupported",
    playerLives: "unsupported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "unsupported",
    raceMetadata: "supported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsafeInMultiplayer",
  },
  "BillyFrontier-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "supported",
    splineItemHooks: "supported",
    mapItemHooks: "unsupported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "supported",
    checkpointEvents: "unsupported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "unsupported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
    multiplayer: "unsupported",
  },
  "MightyMike-Android": {
    levelHooks: "supported",
    globalFrameHooks: "supported",
    terrainItemHooks: "unsupported",
    splineItemHooks: "unsupported",
    mapItemHooks: "supported",
    objectFrameHooks: "supported",
    objectTriggerEvents: "supported",
    objectAnimationCompletionEvents: "supported",
    objectAnimationMarkerEvents: "unsupported",
    checkpointEvents: "unsupported",
    raceProgressEvents: "unsupported",
    objectiveEvents: "unsupported",
    damageEvents: "supported",
    playerLifecycleEvents: "supported",
    pickupEvents: "supported",
    pickupScoreEffects: "supported",
    weaponScoreEffects: "supported",
    weaponHitEvents: "supported",
    nativeSpawn: "supported",
    scriptedSpawn: "supported",
    playerLookup: "supported",
    playerScore: "supported",
    playerLives: "supported",
    playerInventory: "supported",
    playerForm: "unsupported",
    playerCommands: "supported",
    playerInvulnerability: "supported",
    raceMetadata: "unsupported",
    objectiveMetadata: "unsupported",
    objectCollision: "supported",
    levelMetadata: "supported",
    timeAPIs: "supported",
    logging: "supported",
    statusReporting: "supported",
    persistence: "supported",
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
  objectTriggerEvents: "unsupported",
  objectAnimationCompletionEvents: "unsupported",
  objectAnimationMarkerEvents: "unsupported",
  checkpointEvents: "unsupported",
  raceProgressEvents: "unsupported",
  objectiveEvents: "unsupported",
  damageEvents: "unsupported",
  playerLifecycleEvents: "unsupported",
  pickupEvents: "unsupported",
  pickupScoreEffects: "unsupported",
  weaponScoreEffects: "unsupported",
  weaponHitEvents: "unsupported",
  nativeSpawn: "unsupported",
  scriptedSpawn: "unsupported",
  playerLookup: "unsupported",
  playerScore: "unsupported",
  playerLives: "unsupported",
  playerInventory: "unsupported",
  playerForm: "unsupported",
  playerCommands: "unsupported",
  playerInvulnerability: "unsupported",
  raceMetadata: "unsupported",
  objectiveMetadata: "unsupported",
  objectCollision: "unsupported",
  levelMetadata: "unsupported",
  timeAPIs: "unsupported",
  logging: "unsupported",
  statusReporting: "unsupported",
  persistence: "unsupported",
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
      return "objectFrameHooks";
    case "onPickupCollected":
      return "pickupEvents";
    case "onWeaponHit":
      return "weaponHitEvents";
    case "onTriggerEnter":
      return "objectTriggerEvents";
    case "onCheckpointReached":
      return "checkpointEvents";
    case "onLapComplete":
    case "onRaceFinish":
      return "raceProgressEvents";
    case "onObjectiveComplete":
      return "objectiveEvents";
    case "onDamage":
    case "onDamageApplied":
      return "damageEvents";
    case "onDeath":
    case "onPlayerSpawn":
    case "onPlayerRespawn":
      return "playerLifecycleEvents";
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

  for (const definition of state.customObjects) {
    const requiredAssetPaths =
      definition.visual.kind === "customDisplayGroup"
        ? [definition.visual.modelPath]
        : definition.visual.kind === "customSkeleton"
          ? [definition.visual.modelPath, `${definition.visual.skeletonPath}.rsrc`]
          : [];
    for (const assetPath of requiredAssetPaths) {
      if (!state.assets[assetPath]) {
        warnings.push(
          `Custom object '${definition.label}' requires asset '${assetPath}' before preview/export.`,
        );
      }
    }
  }

  for (const [levelKey, levelState] of Object.entries(state.levels)) {
    const replacementGroups = [
      ["terrain", levelState.terrainReplacements],
      ["spline", levelState.splineReplacements],
      ["map", levelState.mapReplacements],
    ] as const;
    for (const [surface, replacements] of replacementGroups) {
      for (const replacement of replacements) {
        const audit = getNativeItemAudit(gameId, replacement.nativeType, surface);
        if (!audit) {
          warnings.push(
            `Level '${levelKey}' ${surface} replacement '${replacement.id}' has no registered native adapter for type ${String(replacement.nativeType)}.`,
          );
          continue;
        }
        for (const dependency of audit.requiredAssets) {
          warnings.push(
            `Level '${levelKey}' replacement '${replacement.id}' requires native dependency '${dependency}' before preview/export.`,
          );
        }
        if (audit.modeAudit !== "all-declared-modes") {
          warnings.push(
            `Level '${levelKey}' replacement '${replacement.id}' has incomplete native mode coverage; verify the selected runtime mode before preview/export.`,
          );
        }
      }
    }
  }

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

  const checkApis = AUTHORITATIVE_API_SCHEMA.apis.flatMap((api) =>
    api.availabilityCapability === undefined
      ? []
      : [{ key: api.name, capability: api.availabilityCapability, name: api.name }],
  );

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
      if (file.content.includes("scoreDelta")) {
        const scoreStatus = getCapability(gameId, "pickupScoreEffects");
        if (scoreStatus === "unsupported") {
          warnings.push("Script returns pickup scoreDelta, but scripted pickup score effects are unsupported on this game.");
        } else if (scoreStatus === "planned") {
          warnings.push("Script returns pickup scoreDelta, but scripted pickup score effects are planned on this game.");
        }
		const weaponScoreStatus = getCapability(gameId, "weaponScoreEffects");
		if (weaponScoreStatus === "unsupported" && file.content.includes("onWeaponHit")) {
			warnings.push("Script returns weapon-hit scoreDelta, but scripted weapon score effects are unsupported on this game.");
		}
      }
    }
  }

  return [...new Set(warnings)];
}
