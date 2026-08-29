import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result, err, ok } from "neverthrow";
import {
  SCRIPT_API_VERSION,
  SCRIPT_CONTRACT_VERSION,
  SCRIPT_FAILURE_CODES,
  SCRIPTING_CONTRACT,
  validateScriptingContract,
} from "../src/editor/subviews/scripts/scriptContract";
import { validateNativeItemAuditCatalog } from "../src/editor/subviews/scripts/scriptNativeAudit";
import {
  renderScriptingContractCMetadata,
  scriptingContractCapabilityMacros,
} from "./scriptingContractCMetadata";
import {
  getScriptingContractResultShapes,
  renderScriptingContractDocumentationIndex,
} from "./scriptingContractDocumentation";

interface RuntimeCommandDescriptor {
  readonly id: string;
  readonly capability: string;
  readonly authority: string;
  readonly applicationPhase: string;
  readonly validation: string;
}

interface RuntimeObjectEventDescriptor {
  readonly id: string;
  readonly handler: string;
  readonly applicationPhase: string;
  readonly cleanup: string;
  readonly statePolicy: string;
  readonly invalidatesHandle: boolean;
}

interface RuntimeEventDescriptor {
  readonly id: string;
  readonly applicationPhase: string;
  readonly payload: string;
  readonly result: string;
}

interface RuntimeGameCapabilities {
  readonly gameId: string;
  readonly terrainItems: boolean;
  readonly splineItems: boolean;
  readonly mapItems: boolean;
  readonly pickupScoreEffects: boolean;
  readonly objectCollision: boolean;
  readonly playerCommands: boolean;
  readonly playerInvulnerability: boolean;
}

interface RuntimeNativeItem {
  readonly id: string;
  readonly nativeType: number;
  readonly category: string;
  readonly dependencySummary: string;
}

type AdapterCapabilityKey = "terrainItems" | "splineItems" | "mapItems";

const adapterPathsByGameId: Readonly<Record<string, string>> = {
  "OttoMatic-Android": "../games/pangea-ports/games/OttoMatic-Android/src/Scripting/ScriptBindings.c",
  "Bugdom-android": "../games/pangea-ports/games/Bugdom-android/src/Scripting/ScriptBindings.c",
  "Bugdom2-Android": "../games/pangea-ports/games/Bugdom2-Android/Source/Scripting/ScriptBindings.c",
  "Nanosaur-android": "../games/pangea-ports/games/Nanosaur-android/src/Scripting/ScriptBindings.c",
  "Nanosaur2-Android": "../games/pangea-ports/games/Nanosaur2-Android/Source/Scripting/ScriptBindings.c",
  "CroMagRally-Android": "../games/pangea-ports/games/CroMagRally-Android/Source/Scripting/ScriptBindings.c",
  "BillyFrontier-Android": "../games/pangea-ports/games/BillyFrontier-Android/Source/Scripting/ScriptBindings.c",
  "MightyMike-Android": "../games/pangea-ports/games/MightyMike-Android/src/Scripting/ScriptBindings.c",
};

const adapterLifecycleCallSites: readonly {
  readonly gameId: string;
  readonly replacementFunctions: readonly string[];
  readonly sourceKinds: readonly string[];
}[] = [
  { gameId: "OttoMatic-Android", replacementFunctions: ["OttoScript_TryReplaceTerrainItem", "OttoScript_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "Bugdom-android", replacementFunctions: ["BugdomScript_TryReplaceTerrainItem", "BugdomScript_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "Bugdom2-Android", replacementFunctions: ["Bugdom2Script_TryReplaceTerrainItem", "Bugdom2Script_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "Nanosaur-android", replacementFunctions: ["NanosaurScript_TryReplaceTerrainItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN"] },
  { gameId: "Nanosaur2-Android", replacementFunctions: ["Nanosaur2Script_TryReplaceTerrainItem", "Nanosaur2Script_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "CroMagRally-Android", replacementFunctions: ["CroMagScript_TryReplaceTerrainItem", "CroMagScript_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "BillyFrontier-Android", replacementFunctions: ["BillyScript_TryReplaceTerrainItem", "BillyScript_TryReplaceSplineItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_TERRAIN", "PANGEA_SCRIPT_SOURCE_SPLINE"] },
  { gameId: "MightyMike-Android", replacementFunctions: ["MikeScript_TryReplaceMapItem"], sourceKinds: ["PANGEA_SCRIPT_SOURCE_MAP"] },
];

const adapterHookCalls: Readonly<Record<string, string>> = {
  onTerrainItem: "PangeaScript_CallTerrainItemHook",
  onSplineItem: "PangeaScript_CallSplineItemHook",
  onMapItem: "PangeaScript_CallMapItemHook",
  onObjectFrame: "PangeaScript_CallObjectFrame",
  onTriggerEnter: "PangeaScript_CallObjectTrigger",
  onPickupCollected: "PangeaScript_CallObjectTrigger",
  onWeaponHit: "PangeaScript_CallWeaponHitHook",
  onDamage: "PangeaScript_CallDamageHook",
  onDamageApplied: "PangeaScript_CallDamageAppliedHook",
  onDeath: "PangeaScript_CallPlayerEvent",
  onPlayerSpawn: "PangeaScript_CallPlayerEvent",
  onPlayerRespawn: "PangeaScript_CallPlayerEvent",
  onCheckpointReached: "PangeaScript_CallPlayerEvent",
};

const adapterSaveLoadCallSites: readonly {
  readonly gameId: string;
  readonly sourcePath: string;
  readonly saveCall: string;
  readonly loadCall: string;
}[] = [
  {
    gameId: "OttoMatic-Android",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/System/File.c",
    saveCall: "OttoScript_OnSave(saveSlot);",
    loadCall: "OttoScript_OnLoad(saveSlot);",
  },
  {
    gameId: "Bugdom-android",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/System/File.c",
    saveCall: "PangeaScript_CallNativeSaveHook(gRealLevel, slot, false)",
    loadCall: "PangeaScript_CallNativeSaveHook(gRealLevel, slot, true)",
  },
  {
    gameId: "Bugdom2-Android",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/System/File.c",
    saveCall: "PangeaScript_CallNativeSaveHook(gLevelNum, slot, false)",
    loadCall: "PangeaScript_CallNativeSaveHook(gLevelNum, slot, true)",
  },
  {
    gameId: "Nanosaur2-Android",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/System/File.c",
    saveCall: "PangeaScript_CallNativeSaveHook(gLevelNum, fileSlot, false)",
    loadCall: "PangeaScript_CallNativeSaveHook(gLevelNum, gScriptLoadedSaveSlot, true)",
  },
  {
    gameId: "BillyFrontier-Android",
    sourcePath: "../games/pangea-ports/games/BillyFrontier-Android/Source/System/File.c",
    saveCall: "PangeaScript_CallNativeSaveHook(0, fileSlot, false)",
    loadCall: "PangeaScript_CallNativeSaveHook(0, gScriptLoadedSaveSlot, true)",
  },
  {
    gameId: "MightyMike-Android",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/Heart/Main.c",
    saveCall: "PangeaScript_CallNativeSaveHook(gSceneNum, gameNum, false)",
    loadCall: "PangeaScript_CallNativeSaveHook(gSceneNum, gameNum, true)",
  },
];

const playerCommandBinding = (
  gameId: string,
  field: "setPlayerHealth" | "setPlayerInvulnerable" | "setPlayerPosition",
  functionName: string,
): {
  readonly gameId: string;
  readonly field: "setPlayerHealth" | "setPlayerInvulnerable" | "setPlayerPosition";
  readonly functionName: string;
} => ({ gameId, field, functionName });

const adapterPlayerCommandBindings: readonly {
  readonly gameId: string;
  readonly field: "setPlayerHealth" | "setPlayerInvulnerable" | "setPlayerPosition";
  readonly functionName: string;
}[] = [
  playerCommandBinding("OttoMatic-Android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("Bugdom-android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("Bugdom2-Android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("Nanosaur-android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("Nanosaur2-Android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("CroMagRally-Android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("BillyFrontier-Android", "setPlayerHealth", "SetScriptPlayerHealth"),
  playerCommandBinding("OttoMatic-Android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("Bugdom-android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("Bugdom2-Android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("Nanosaur-android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("Nanosaur2-Android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("BillyFrontier-Android", "setPlayerInvulnerable", "SetScriptPlayerInvulnerable"),
  playerCommandBinding("OttoMatic-Android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("Bugdom-android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("Bugdom2-Android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("Nanosaur-android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("Nanosaur2-Android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("CroMagRally-Android", "setPlayerPosition", "SetScriptPlayerPosition"),
  playerCommandBinding("BillyFrontier-Android", "setPlayerPosition", "SetScriptPlayerPosition"),
];

const adapterLifecycleCalls: readonly string[] = [
  "PangeaScript_CallFrameHook",
  "PangeaScript_CallLevelHook",
  "PangeaScript_CallObjectFrame",
  "PangeaScript_CallObjectEvent",
];

const nativeLifecycleCallSites: readonly {
  readonly gameId: string;
  readonly sourcePath: string;
  readonly calls: readonly string[];
}[] = [
  {
    gameId: "OttoMatic-Android",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/System/GameMain.c",
    calls: ["OttoScript_OnLevelLoad", "OttoScript_OnLevelStart", "OttoScript_OnFrame", "OttoScript_OnLevelComplete", "OttoScript_OnLevelUnload"],
  },
  {
    gameId: "Bugdom-android",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/System/Main.c",
    calls: ["BugdomScript_OnLevelLoad", "BugdomScript_OnLevelStart", "BugdomScript_OnFrame", "BugdomScript_OnLevelComplete", "BugdomScript_OnLevelUnload"],
  },
  {
    gameId: "Bugdom2-Android",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/System/Main.c",
    calls: ["Bugdom2Script_OnLevelLoad", "Bugdom2Script_OnLevelStart", "Bugdom2Script_OnFrame", "Bugdom2Script_OnLevelComplete", "Bugdom2Script_OnLevelUnload"],
  },
  {
    gameId: "Nanosaur-android",
    sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/System/Main.c",
    calls: ["NanosaurScript_OnLevelLoad", "NanosaurScript_OnLevelStart", "NanosaurScript_OnFrame", "NanosaurScript_OnLevelComplete", "NanosaurScript_OnLevelUnload"],
  },
  {
    gameId: "Nanosaur2-Android",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/System/Main.c",
    calls: ["Nanosaur2Script_OnLevelLoad", "Nanosaur2Script_OnLevelStart", "Nanosaur2Script_OnFrame", "Nanosaur2Script_OnLevelComplete", "Nanosaur2Script_OnLevelUnload"],
  },
  {
    gameId: "CroMagRally-Android",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/System/Main.c",
    calls: ["CroMagScript_OnRaceLoad", "CroMagScript_OnRaceStart", "CroMagScript_OnRaceFrame", "CroMagScript_OnRaceComplete", "CroMagScript_OnRaceUnload"],
  },
  {
    gameId: "BillyFrontier-Android",
    sourcePath: "../games/pangea-ports/games/BillyFrontier-Android/Source/System/Areas/Stampede.c",
    calls: ["BillyScript_OnAreaLoad", "BillyScript_OnAreaStart", "BillyScript_OnAreaFrame", "BillyScript_OnAreaComplete", "BillyScript_OnAreaUnload"],
  },
  {
    gameId: "MightyMike-Android",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/Heart/Main.c",
    calls: ["MikeScript_OnAreaLoad", "MikeScript_OnAreaStart", "MikeScript_OnAreaFrame", "MikeScript_OnAreaComplete", "MikeScript_OnAreaUnload"],
  },
];

const adapterAssetLoaders: readonly {
  readonly gameId: string;
  readonly modelLoader: string;
  readonly assetKind: "bg3d" | "3dmf" | "shapes";
  readonly hasSkeletonLoader: boolean;
  readonly requiresAssetPreflight: boolean;
  readonly assetPreflightMarker?: string;
  readonly assetBoundaryMarker?: string;
  readonly requiresDefinitionGuard: boolean;
  readonly postLoadRegistryCheck: string;
}[] = [
  { gameId: "OttoMatic-Android", modelLoader: "PangeaScript_LoadCustomBG3D", assetKind: "bg3d", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gBG3DContainerList[group]" },
  { gameId: "Bugdom-android", modelLoader: "BugdomScript_LoadCustom3DMF", assetKind: "3dmf", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gNumObjectsInGroupList[group]" },
  { gameId: "Bugdom2-Android", modelLoader: "PangeaScript_LoadCustomBG3D", assetKind: "bg3d", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gBG3DContainerList[group]" },
  { gameId: "Nanosaur-android", modelLoader: "NanosaurScript_LoadCustom3DMF", assetKind: "3dmf", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gNumObjectsInGroupList[group]" },
  { gameId: "Nanosaur2-Android", modelLoader: "Nanosaur2Script_LoadCustomBG3D", assetKind: "bg3d", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gNumObjectsInBG3DGroupList[group]" },
  { gameId: "CroMagRally-Android", modelLoader: "PangeaScript_LoadCustomBG3D", assetKind: "bg3d", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gBG3DContainerList[group]" },
  { gameId: "BillyFrontier-Android", modelLoader: "PangeaScript_LoadCustomBG3D", assetKind: "bg3d", hasSkeletonLoader: true, requiresAssetPreflight: true, requiresDefinitionGuard: true, postLoadRegistryCheck: "gBG3DContainerList[group]" },
  { gameId: "MightyMike-Android", modelLoader: "LoadShapeTable", assetKind: "shapes", hasSkeletonLoader: false, requiresAssetPreflight: true, assetPreflightMarker: "MightyMikeScript_OpenDataFile", assetBoundaryMarker: "gMightyMikeScriptAssetBoundaryActive", requiresDefinitionGuard: false, postLoadRegistryCheck: "gShapeTableHandle[group]" },
];

const animationMarkerCallSites: readonly {
  readonly gameId: string;
  readonly functionName: string;
  readonly skeletonPath: string;
}[] = [
  {
    gameId: "OttoMatic-Android",
    functionName: "OttoScript_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/OttoMatic-Android/src/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "Bugdom-android",
    functionName: "BugdomScript_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/Bugdom-android/src/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "Bugdom2-Android",
    functionName: "Bugdom2Script_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/Bugdom2-Android/Source/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "Nanosaur-android",
    functionName: "NanosaurScript_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/Nanosaur-android/src/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "Nanosaur2-Android",
    functionName: "Nanosaur2Script_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "CroMagRally-Android",
    functionName: "CroMagScript_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/CroMagRally-Android/Source/Skeleton/SkeletonAnim.c",
  },
  {
    gameId: "BillyFrontier-Android",
    functionName: "BillyScript_OnAnimationEvent",
    skeletonPath: "../games/pangea-ports/games/BillyFrontier-Android/Source/Skeleton/SkeletonAnim.c",
  },
];

const animationCompletionCallSites: readonly {
  readonly gameId: string;
  readonly sourcePath: string;
}[] = [
  { gameId: "OttoMatic-Android", sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/Scripting/ScriptBindings.c" },
  { gameId: "Bugdom-android", sourcePath: "../games/pangea-ports/games/Bugdom-android/src/Scripting/ScriptBindings.c" },
  { gameId: "Bugdom2-Android", sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Scripting/ScriptBindings.c" },
  { gameId: "Nanosaur-android", sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/Scripting/ScriptBindings.c" },
  { gameId: "Nanosaur2-Android", sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Scripting/ScriptBindings.c" },
  { gameId: "CroMagRally-Android", sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Scripting/ScriptBindings.c" },
  { gameId: "BillyFrontier-Android", sourcePath: "../games/pangea-ports/games/BillyFrontier-Android/Source/Scripting/ScriptBindings.c" },
  { gameId: "MightyMike-Android", sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/Scripting/ScriptBindings.c" },
];

const playerIntegrationCallSites: readonly {
  readonly gameId: string;
  readonly hook: string;
  readonly sourcePath: string;
  readonly call: string;
}[] = [
  {
    gameId: "MightyMike-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/Scripting/ScriptBindings.c",
    call: "MikeScript_OnPlayerSpawn(playerObj);",
  },
  {
    gameId: "MightyMike-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/MeAndMo/MyGuy.c",
    call: "MikeScript_OnDeath(gMyNodePtr, 0);",
  },
  {
    gameId: "MightyMike-Android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/MeAndMo/MyGuy.c",
    call: "MikeScript_OnPlayerRespawn(gMyNodePtr);",
  },
  {
    gameId: "MightyMike-Android",
    hook: "onWeaponHit",
    sourcePath: "../games/pangea-ports/games/MightyMike-Android/src/MeAndMo/Enemy.c",
    call: "MikeScript_OnWeaponHit(weapon, gThisNodePtr",
  },
  {
    gameId: "OttoMatic-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/Player/Player_Robot.c",
    call: "OttoScript_RegisterPlayerObject(newObj);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Player/Player_Car.c",
    call: "CroMagScript_RegisterPlayerObject(newObj, playerNum);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Player/Player_Submarine.c",
    call: "CroMagScript_RegisterPlayerObject(newObj, playerNum);",
  },
  {
    gameId: "BillyFrontier-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/BillyFrontier-Android/Source/Player/Billy.c",
    call: "BillyScript_RegisterPlayerObject(player);",
  },
  {
    gameId: "OttoMatic-Android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/Player/Player.c",
    call: "OttoScript_OnPlayerRespawn(player);",
  },
  {
    gameId: "OttoMatic-Android",
    hook: "onCheckpointReached",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/Items/Triggers.c",
    call: "OttoScript_OnCheckpointReached(theNode->CheckpointNum);",
  },
  {
    gameId: "Bugdom-android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/Player/Player_Bug.c",
    call: "BugdomScript_RegisterPlayerObject(newObj);",
  },
  {
    gameId: "Bugdom-android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/Player/MyGuy.c",
    call: "BugdomScript_OnPlayerRespawn(gPlayerObj);",
  },
  {
    gameId: "Bugdom-android",
    hook: "onCheckpointReached",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/Items/Triggers2.c",
    call: "BugdomScript_OnCheckpointReached(num);",
  },
  {
    gameId: "Bugdom2-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Player/Player_Terrain.c",
    call: "Bugdom2Script_RegisterPlayerObject(newObj);",
  },
  {
    gameId: "Bugdom2-Android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Player/Player.c",
    call: "Bugdom2Script_OnPlayerRespawn(player);",
  },
  {
    gameId: "Bugdom2-Android",
    hook: "onCheckpointReached",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Items/Powerups.c",
    call: "Bugdom2Script_OnCheckpointReached(checkpoint->Special[0]);",
  },
  {
    gameId: "Bugdom2-Android",
    hook: "onWeaponHit",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Enemies/Enemy.c",
    call: "Bugdom2Script_OnWeaponHit(hitObj, theEnemy",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onWeaponHit",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Enemies/Enemy.c",
    call: "Nanosaur2Script_OnWeaponHit(hitObj, theEnemy",
  },
  {
    gameId: "Nanosaur-android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/Player/MyGuy.c",
    call: "NanosaurScript_RegisterPlayerObject(newObj);",
  },
  {
    gameId: "Nanosaur-android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/Player/MyGuy.c",
    call: "NanosaurScript_OnPlayerRespawn(theNode);",
  },
  {
    gameId: "Nanosaur-android",
    hook: "onWeaponHit",
    sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/Enemies/Enemy.c",
    call: "NanosaurScript_OnWeaponHit(theHurter, theEnemy",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onPlayerSpawn",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player_Terrain.c",
    call: "Nanosaur2Script_RegisterPlayerObject(newObj);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onPlayerRespawn",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player.c",
    call: "Nanosaur2Script_OnPlayerRespawn(player);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onCheckpointReached",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player_Race.c",
    call: "Nanosaur2Script_OnCheckpointReached(p, newCheckpoint);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onRaceFinish",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player_Race.c",
    call: "Nanosaur2Script_OnRaceFinish(playerNum, gPlayerInfo[playerNum].place);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onLapComplete",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player_Race.c",
    call: "Nanosaur2Script_OnLapComplete(p, gPlayerInfo[p].lapNum);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onObjectiveComplete",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Items/Eggs.c",
    call: "Nanosaur2Script_OnObjectiveComplete(0, 0);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onObjectiveComplete",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player.c",
    call: "Nanosaur2Script_OnObjectiveComplete(playerNum, 1);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onCheckpointReached",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Terrain/Checkpoints.c",
    call: "CroMagScript_OnCheckpointReached(p, newCheckpoint);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onRaceFinish",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Terrain/Checkpoints.c",
    call: "CroMagScript_OnRaceFinish(playerNum, rankInScoreboard >= 0 ? rankInScoreboard : gPlayerInfo[playerNum].place);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onLapComplete",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Terrain/Checkpoints.c",
    call: "CroMagScript_OnLapComplete(p, gPlayerInfo[p].lapNum);",
  },
  {
    gameId: "OttoMatic-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/OttoMatic-Android/src/Player/Player.c",
    call: "OttoScript_OnDeath(deathType);",
  },
  {
    gameId: "Bugdom-android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/Bugdom-android/src/Player/MyGuy.c",
    call: "BugdomScript_OnDeath(changeAnims ? 1 : 0);",
  },
  {
    gameId: "Bugdom2-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/Bugdom2-Android/Source/Player/Player.c",
    call: "Bugdom2Script_OnDeath(deathType);",
  },
  {
    gameId: "Nanosaur-android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/Nanosaur-android/src/Player/MyGuy.c",
    call: "NanosaurScript_OnDeath(0);",
  },
  {
    gameId: "Nanosaur2-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/Nanosaur2-Android/Source/Player/Player.c",
    call: "Nanosaur2Script_OnDeath(playerNum, deathType);",
  },
  {
    gameId: "CroMagRally-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/CroMagRally-Android/Source/Player/Player.c",
    call: "CroMagScript_OnDeath(p, 0);",
  },
  {
    gameId: "BillyFrontier-Android",
    hook: "onDeath",
    sourcePath: "../games/pangea-ports/games/BillyFrontier-Android/Source/System/Areas/Shootout.c",
    call: "BillyScript_OnDeath(player, 0);",
  },
];

const indexedPlayerTriggerAdapters: readonly {
  readonly gameId: string;
  readonly call: string;
  readonly playerTable: string;
}[] = [
  {
    gameId: "CroMagRally-Android",
    call: "PangeaScript_CallObjectTriggerWithOtherAndPlayer",
    playerTable: "gPlayerInfo[index].objNode",
  },
  {
    gameId: "Nanosaur2-Android",
    call: "PangeaScript_CallObjectTriggerWithOtherAndPlayer",
    playerTable: "gPlayerInfo[index].objNode",
  },
];

function readRuntimeSource(path: string): Result<string, string> {
  return Result.fromThrowable(
    () => readFileSync(path, "utf8"),
    () => `Could not read runtime contract source: ${path}`,
  )();
}

function parseVersion(source: string, macro: string): Result<number, string> {
  const match = source.match(
    new RegExp(`#define\\s+${macro}\\s+(\\d+)`),
  );
  const value = match?.[1];
  if (!value) return err(`Runtime contract is missing ${macro}`);
  return ok(Number(value));
}

function parseRuntimeFailureCodes(source: string): Result<readonly string[], string> {
  const block = source.match(
    /typedef enum PangeaScriptStatus\s*\{([\s\S]*?)\}\s*PangeaScriptStatus;/,
  )?.[1];
  if (!block) return err("Runtime contract is missing PangeaScriptStatus");
  const codes = [...block.matchAll(/PANGEA_SCRIPT_([A-Z_]+)\s*(?:=\s*\d+)?\s*,/g)]
    .map((match) => match[1]?.toLowerCase().replaceAll("_", "-"))
    .filter((code): code is string => code !== undefined);
  return ok(codes);
}

function parseRuntimeCommands(source: string): Result<readonly RuntimeCommandDescriptor[], string> {
  const block = source.match(
    /#define\s+PANGEA_SCRIPT_COMMAND_DESCRIPTOR_LIST\(X\)\s*\\\n([\s\S]*?)(?=\n\s*#define|\s*$)/,
  )?.[1];
  if (!block) return err("Runtime contract is missing generated command descriptors");
  const descriptors = [...block.matchAll(
    /X\("([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\)/g,
  )].map((match) => ({
    id: match[1] ?? "",
    capability: match[2] ?? "",
    authority: match[3] ?? "",
    applicationPhase: match[4] ?? "",
    validation: match[5] ?? "",
  }));
  return ok(descriptors);
}

function parseRuntimeObjectEvents(source: string): Result<readonly RuntimeObjectEventDescriptor[], string> {
  const block = source.match(
    /#define\s+PANGEA_SCRIPT_OBJECT_EVENT_DESCRIPTOR_LIST\(X\)\s*\\\n([\s\S]*?)(?=\n\s*#define|\s*$)/,
  )?.[1];
  if (!block) return err("Runtime contract is missing generated object-event descriptors");
  const descriptors = [...block.matchAll(
    /X\("([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(true|false)\)/g,
  )].map((match) => ({
    id: match[1] ?? "",
    handler: match[2] ?? "",
    applicationPhase: match[3] ?? "",
    cleanup: match[4] ?? "",
    statePolicy: match[5] ?? "",
    invalidatesHandle: match[6] === "true",
  }));
  return ok(descriptors);
}

function parseRuntimeEvents(source: string): Result<readonly RuntimeEventDescriptor[], string> {
  const block = source.match(
    /#define\s+PANGEA_SCRIPT_EVENT_DESCRIPTOR_LIST\(X\)\s*\\\n([\s\S]*?)(?=\n\s*#define|\s*$)/,
  )?.[1];
  if (!block) return err("Runtime contract is missing generated event descriptors");
  const descriptors = [...block.matchAll(
    /X\("([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\)/g,
  )].map((match) => ({
    id: match[1] ?? "",
    applicationPhase: match[2] ?? "",
    payload: match[3] ?? "",
    result: match[4] ?? "",
  }));
  return ok(descriptors);
}

function parseLuaBindings(source: string): Result<readonly string[], string> {
  const bindings: string[] = [];
  for (const line of source.split("\n")) {
    const namespaceMatches = [...line.matchAll(/lua_setfield\(lua, -2, "([^"]+)"\)/g)];
    const namespace = namespaceMatches.at(-1)?.[1];
    if (!namespace) continue;
    const functions = [
      ...line.matchAll(/set_(?:backend_)?function\(lua, "([^"]+)"/g),
    ].map((match) => match[1]);
    for (const functionName of functions) {
      if (functionName) bindings.push(`pangea.${namespace}.${functionName}`);
    }
  }
  if (source.includes('lua_setfield(lua, -2, level == PANGEA_LOG_INFO ? "info" : level == PANGEA_LOG_WARN ? "warn" : "error")')) {
    bindings.push("pangea.log.info", "pangea.log.warn", "pangea.log.error");
  }
  return ok([...new Set(bindings)].sort());
}

function compareLuaBindings(source: string): Result<true, string> {
  const actual = parseLuaBindings(source);
  if (actual.isErr()) return err(actual.error);
  const expected = SCRIPTING_CONTRACT.api.apis
    .map((api) => api.name)
    .filter((name) => name.startsWith("pangea."))
    .sort();
  if (JSON.stringify(actual.value) !== JSON.stringify(expected)) {
    return err("Lua binding registration drift");
  }
  return ok(true);
}

function parseContractHookList(source: string, macroName: string): Result<readonly string[], string> {
  const block = source.match(
    new RegExp(`#define\\s+${macroName}\\(X\\)\\s*\\\\\\n([\\s\\S]*?)(?=\\n\\s*#define|\\s*$)`),
  )?.[1];
  if (!block) return err(`Runtime contract is missing ${macroName} hook metadata`);
  return ok([...block.matchAll(/X\("([^"]+)"\)/g)].map((match) => match[1] ?? ""));
}

function compareLuaSupportedHooks(source: string, metadataSource: string): Result<true, string> {
  const generatedLists = [
    "PANGEA_SCRIPT_OTTO_MATIC_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_BUGDOM_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_BUGDOM2_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_NANOSAUR_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_NANOSAUR2_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_CRO_MAG_RALLY_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_BILLY_FRONTIER_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
    "PANGEA_SCRIPT_MIGHTY_MIKE_HOOK_LIST(PANGEA_SCRIPT_HOOK_NAME)",
  ];
  const missingGeneratedLists = generatedLists.filter((entry) => !source.includes(entry));
  if (missingGeneratedLists.length > 0) {
    return err(`Lua backend is not generating hook tables: ${missingGeneratedLists.join(", ")}`);
  }

  const macroByArrayName: Readonly<Record<string, string>> = {
    ottoMaticHooks: "PANGEA_SCRIPT_OTTO_MATIC_HOOK_LIST",
    bugdomHooks: "PANGEA_SCRIPT_BUGDOM_HOOK_LIST",
    bugdom2Hooks: "PANGEA_SCRIPT_BUGDOM2_HOOK_LIST",
    nanosaurHooks: "PANGEA_SCRIPT_NANOSAUR_HOOK_LIST",
    nanosaur2Hooks: "PANGEA_SCRIPT_NANOSAUR2_HOOK_LIST",
    croMagRallyHooks: "PANGEA_SCRIPT_CRO_MAG_RALLY_HOOK_LIST",
    billyFrontierHooks: "PANGEA_SCRIPT_BILLY_FRONTIER_HOOK_LIST",
    mightyMikeHooks: "PANGEA_SCRIPT_MIGHTY_MIKE_HOOK_LIST",
  };
  const arrays = new Map<string, readonly string[]>();
  for (const arrayName of Object.keys(macroByArrayName)) {
    const macroName = macroByArrayName[arrayName];
    if (!macroName) return err(`No hook macro is configured for ${arrayName}`);
    const hooks = parseContractHookList(metadataSource, macroName);
    if (hooks.isErr()) return err(hooks.error);
    arrays.set(arrayName, hooks.value);
  }
  for (const game of SCRIPTING_CONTRACT.api.games) {
    const arrayNameByGameId: Readonly<Record<string, string>> = {
      "OttoMatic-Android": "ottoMaticHooks",
      "Bugdom-android": "bugdomHooks",
      "Bugdom2-Android": "bugdom2Hooks",
      "Nanosaur-android": "nanosaurHooks",
      "Nanosaur2-Android": "nanosaur2Hooks",
      "CroMagRally-Android": "croMagRallyHooks",
      "BillyFrontier-Android": "billyFrontierHooks",
      "MightyMike-Android": "mightyMikeHooks",
    };
    const arrayName = arrayNameByGameId[game.gameId];
    if (arrayName === undefined) return err(`No hook array is configured for ${game.gameId}`);
    const actual = arrays.get(arrayName);
    if (
      !actual ||
      JSON.stringify([...actual].sort()) !== JSON.stringify([...game.supportedHooks].sort())
    ) {
      return err(`Lua supported-hook metadata drift: ${game.gameId}`);
    }
  }
  return ok(true);
}

function parseAdapterCapabilities(
  source: string,
  path: string,
  metadataSource: string,
): Result<RuntimeGameCapabilities, string> {
  const block = source.match(
    /const PangeaScriptGameInfo gameInfo\s*=\s*\{([\s\S]*?)\n\s*\};/,
  )?.[1];
  if (!block) return err(`Adapter is missing gameInfo declaration: ${path}`);
  const gameId = block.match(/\.gameId\s*=\s*"([^"]+)"/)?.[1];
  const capabilityMacro = block.match(/\.capabilities\s*=\s*(PANGEA_SCRIPT_[A-Z0-9_]+_CAPABILITIES)\s*,/)?.[1];
  const definition = scriptingContractCapabilityMacros.find((candidate) => candidate.gameId === gameId);
  if (!gameId || !capabilityMacro || !definition || capabilityMacro !== definition.macro) {
    return err(`Adapter capability metadata is incomplete: ${path}`);
  }
  const capabilityValues = metadataSource.match(
    new RegExp(`#define\\s+${capabilityMacro}\\s+\\{\\s*(true|false)\\s*,\\s*(true|false)\\s*,\\s*(true|false)\\s*,\\s*(true|false)\\s*,\\s*(true|false)\\s*\\}`),
  );
  if (!capabilityValues) return err(`Generated capability metadata is missing: ${capabilityMacro}`);
  return ok({
    gameId,
    terrainItems: capabilityValues[1] === "true",
    splineItems: capabilityValues[2] === "true",
    mapItems: capabilityValues[3] === "true",
    pickupScoreEffects: capabilityValues[4] === "true",
    objectCollision: capabilityValues[5] === "true",
    playerCommands: source.includes(".setPlayerHealth =") || source.includes(".setPlayerInvulnerable =") || source.includes(".setPlayerPosition ="),
    playerInvulnerability: source.includes(".setPlayerInvulnerable ="),
  });
}

function parseAdapterNativeItems(
  source: string,
  path: string,
): Result<readonly RuntimeNativeItem[], string> {
  const block = source.match(
    /static const PangeaScriptNativeItem kNativeItems\[\]\s*=\s*\{([\s\S]*?)\n\};/,
  )?.[1];
  if (!block) return err(`Adapter is missing native item metadata: ${path}`);
  const items = [...block.matchAll(
    /\{\s*\.id\s*=\s*"([^"]+)"[\s\S]*?\.nativeType\s*=\s*(-?\d+)[\s\S]*?\.category\s*=\s*"([^"]+)"[\s\S]*?\.dependencySummary\s*=\s*"([^"]*)"\s*,?\s*\}/g,
  )].map((match) => ({
    id: match[1] ?? "",
    nativeType: Number(match[2] ?? "-1"),
    category: match[3] ?? "",
    dependencySummary: match[4] ?? "",
  }));
  if (items.length === 0) return err(`Adapter has no readable native item metadata: ${path}`);
  return ok(items);
}

function validateAnimationMarkerCallSites(): Result<true, string> {
  for (const callSite of animationMarkerCallSites) {
    const adapterPath = adapterPathsByGameId[callSite.gameId];
    if (!adapterPath) return err(`Animation marker has no adapter source path: ${callSite.gameId}`);
    const adapterSource = readRuntimeSource(resolve(process.cwd(), adapterPath));
    if (adapterSource.isErr()) return err(adapterSource.error);
    if (!adapterSource.value.includes(`${callSite.functionName}(ObjNode*`)) {
      return err(`Animation marker adapter function is missing: ${callSite.gameId}`);
    }
    if (!adapterSource.value.includes("PangeaScript_CallObjectEventWithValue")) {
      return err(`Animation marker value is not forwarded to the runtime: ${callSite.gameId}`);
    }
    const skeletonSource = readRuntimeSource(resolve(process.cwd(), callSite.skeletonPath));
    if (skeletonSource.isErr()) return err(skeletonSource.error);
    if (!skeletonSource.value.includes(`${callSite.functionName}(theNode, eventValue)`)) {
      return err(`Animation marker call site is missing: ${callSite.gameId}`);
    }
  }
  return ok(true);
}

function validateAnimationCompletionCallSites(): Result<true, string> {
  const contractEvent = SCRIPTING_CONTRACT.objectEvents.find(
    (event) => event.id === "animationComplete" && event.handler === "onAnimationComplete",
  );
  if (!contractEvent) return err("Animation completion is missing from the object-event contract");

  for (const callSite of animationCompletionCallSites) {
    const source = readRuntimeSource(resolve(process.cwd(), callSite.sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes("PangeaScript_CallObjectEvent") || !source.value.includes('"animationComplete"')) {
      return err(`Animation completion call site is missing: ${callSite.gameId}`);
    }
    if (!source.value.includes("ScriptAnimationCompletionSent")) {
      return err(`Animation completion is not guarded against duplicate delivery: ${callSite.gameId}`);
    }
  }
  return ok(true);
}

function validateAdapterLifecycleCallSites(): Result<true, string> {
  for (const callSite of adapterLifecycleCallSites) {
    const adapterPath = adapterPathsByGameId[callSite.gameId];
    if (!adapterPath) return err(`Lifecycle audit has no adapter source path: ${callSite.gameId}`);
    const sourceResult = readRuntimeSource(resolve(process.cwd(), adapterPath));
    if (sourceResult.isErr()) return err(sourceResult.error);
    const source = sourceResult.value;
    for (const functionName of callSite.replacementFunctions) {
      if (!source.includes(`${functionName}(`)) {
        return err(`Replacement entry point is missing: ${callSite.gameId}/${functionName}`);
      }
    }
    for (const sourceKind of callSite.sourceKinds) {
      if (!source.includes(sourceKind)) {
        return err(`Source identity is not associated by ${callSite.gameId}: ${sourceKind}`);
      }
    }
    for (const requiredCall of [
      "PangeaScript_AssociateObjectSource",
      "PANGEA_SCRIPT_OBJECT_STREAM_IN",
      "PangeaScript_ApplyObjectLifecycleToAll",
      "PANGEA_SCRIPT_OBJECT_DESTROY",
      "PangeaScript_ResetObjects",
      "PANGEA_SCRIPT_OBJECT_STREAM_OUT",
    ]) {
      if (!source.includes(requiredCall)) {
        return err(`Adapter lifecycle call site is missing ${requiredCall}: ${callSite.gameId}`);
      }
    }
  }
  return ok(true);
}

function validatePlayerIntegrationCallSites(): Result<true, string> {
  for (const callSite of playerIntegrationCallSites) {
    const game = SCRIPTING_CONTRACT.api.games.find(
      (candidate) => candidate.gameId === callSite.gameId,
    );
    if (!game?.supportedHooks.includes(callSite.hook)) continue;
    const source = readRuntimeSource(resolve(process.cwd(), callSite.sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes(callSite.call)) {
      return err(
        `Player integration call site is missing ${callSite.hook}: ${callSite.gameId}`,
      );
    }
  }
  for (const adapter of indexedPlayerTriggerAdapters) {
    const sourcePath = adapterPathsByGameId[adapter.gameId];
    if (!sourcePath) return err(`Indexed player trigger has no adapter source path: ${adapter.gameId}`);
    const source = readRuntimeSource(resolve(process.cwd(), sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes(adapter.call) || !source.value.includes(adapter.playerTable)) {
      return err(`Indexed player number is not forwarded by ${adapter.gameId}`);
    }
  }
  return ok(true);
}

function validateAdapterSaveLoadCallSites(): Result<true, string> {
  const auditedGames = new Set(adapterSaveLoadCallSites.map((callSite) => callSite.gameId));
  for (const callSite of adapterSaveLoadCallSites) {
    const source = readRuntimeSource(resolve(process.cwd(), callSite.sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes(callSite.saveCall)) {
      return err(`Adapter save call site is missing: ${callSite.gameId}`);
    }
    if (!source.value.includes(callSite.loadCall)) {
      return err(`Adapter load call site is missing: ${callSite.gameId}`);
    }
  }
  for (const game of SCRIPTING_CONTRACT.api.games) {
    const advertisesSaveLoad = game.supportedHooks.includes("onSave") || game.supportedHooks.includes("onLoad");
    if (advertisesSaveLoad !== auditedGames.has(game.gameId)) {
      return err(`Save/load capability does not match native boundaries: ${game.gameId}`);
    }
  }
  return ok(true);
}

function validateAdapterPlayerCommandBindings(): Result<true, string> {
  for (const binding of adapterPlayerCommandBindings) {
    const sourcePath = adapterPathsByGameId[binding.gameId];
    if (!sourcePath) return err(`Player command binding has no adapter source path: ${binding.gameId}`);
    const source = readRuntimeSource(resolve(process.cwd(), sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes(`${binding.functionName}(`)) {
      return err(`Player command implementation is missing: ${binding.gameId}/${binding.field}`);
    }
    if (!source.value.includes(`.${binding.field} = ${binding.functionName}`)) {
      return err(`Player command callback is not registered: ${binding.gameId}/${binding.field}`);
    }
  }
  return ok(true);
}

function validateAdapterCapabilities(metadataSource: string): Result<true, string> {
  for (const definition of scriptingContractCapabilityMacros) {
    if (!metadataSource.includes(`#define ${definition.macro} {`)) {
      return err(`Generated capability metadata is missing: ${definition.macro}`);
    }
  }
  const runtimeCapabilities: RuntimeGameCapabilities[] = [];
  for (const relativePath of Object.values(adapterPathsByGameId)) {
    const source = readRuntimeSource(resolve(process.cwd(), relativePath));
    if (source.isErr()) return err(source.error);
    const capabilities = parseAdapterCapabilities(source.value, relativePath, metadataSource);
    if (capabilities.isErr()) return err(capabilities.error);
    const requiredCalls = [
      { capability: "terrainItems", call: "PangeaScript_CallTerrainItemHook" },
      { capability: "splineItems", call: "PangeaScript_CallSplineItemHook" },
      { capability: "mapItems", call: "PangeaScript_CallMapItemHook" },
    ] satisfies readonly { readonly capability: AdapterCapabilityKey; readonly call: string }[];
    for (const requirement of requiredCalls) {
      const declared = capabilities.value[requirement.capability];
      const implemented = source.value.includes(requirement.call);
      if (declared !== implemented) {
        return err(
          `Adapter capability does not match native call site: ${capabilities.value.gameId} ${requirement.capability}`,
        );
      }
    }
    for (const call of adapterLifecycleCalls) {
      if (!source.value.includes(call)) {
        return err(`Adapter is missing required lifecycle call ${call}: ${relativePath}`);
      }
    }
    if (
      source.value.includes("ApplyScriptedCollision") &&
      !source.value.includes("collisionBoundsSet")
    ) {
      return err(`Adapter collision application is missing semantic bounds support: ${capabilities.value.gameId}`);
    }
    runtimeCapabilities.push(capabilities.value);
  }
  const expectedGameIds = Object.keys(SCRIPTING_CONTRACT.games).sort();
  const actualGameIds = runtimeCapabilities.map((value) => value.gameId).sort();
  if (JSON.stringify(actualGameIds) !== JSON.stringify(expectedGameIds)) {
    return err("Adapter game capability IDs drift from the frontend contract");
  }
  for (const game of SCRIPTING_CONTRACT.api.games) {
    const relativePath = Object.entries(adapterPathsByGameId).find(
      ([gameId]) => gameId === game.gameId,
    )?.[1];
    if (!relativePath) return err(`API game has no adapter source path: ${game.gameId}`);
    const source = readRuntimeSource(resolve(process.cwd(), relativePath));
    if (source.isErr()) return err(source.error);
    const nativeItems = parseAdapterNativeItems(source.value, relativePath);
    if (nativeItems.isErr()) return err(nativeItems.error);
    for (const hook of game.supportedHooks) {
      const call = Object.entries(adapterHookCalls).find(
        ([hookId]) => hookId === hook,
      )?.[1];
      if (call && !source.value.includes(call)) {
        return err(`Adapter advertises ${hook} without its native call site: ${game.gameId}`);
      }
    }
    const requiredRuntimeIntegrations = [
      "spawnNative =",
      "spawnScripted =",
      "getPlayerCount =",
      "getPlayer =",
      "PangeaScript_RegisterNativeItems",
    ];
    for (const integration of requiredRuntimeIntegrations) {
      if (!source.value.includes(integration)) {
        return err(`Adapter is missing required runtime integration ${integration}: ${game.gameId}`);
      }
    }
    const replacementRequirements: readonly {
      readonly capability: AdapterCapabilityKey;
      readonly entryPoint: string;
      readonly sourceField: string;
      readonly lookupCall: string;
    }[] = [
      {
        capability: "terrainItems",
        entryPoint: "TryReplaceTerrainItem",
        sourceField: "TerrainItemPtr",
        lookupCall: "PangeaScript_GetTerrainReplacement",
      },
      {
        capability: "splineItems",
        entryPoint: "TryReplaceSplineItem",
        sourceField: "SplineItemPtr",
        lookupCall: "PangeaScript_GetSplineReplacement",
      },
      {
        capability: "mapItems",
        entryPoint: "TryReplaceMapItem",
        sourceField: "ItemIndex",
        lookupCall: "PangeaScript_GetMapReplacement",
      },
    ];
    for (const requirement of replacementRequirements) {
      const adapterCapability = runtimeCapabilities.find(
        (capabilities) => capabilities.gameId === game.gameId,
      );
      if (!adapterCapability?.[requirement.capability]) continue;
      const hasReplacementEntryPoint = source.value.includes(requirement.entryPoint);
      const hasSourceAssociation = source.value.includes(requirement.sourceField);
      if (!hasReplacementEntryPoint || !hasSourceAssociation) {
        return err(
          `Adapter replacement integration is incomplete for ${requirement.capability}: ${game.gameId}`,
        );
      }
      if (!source.value.includes(requirement.lookupCall)) {
        return err(
          `Adapter replacement integration is missing the ${requirement.capability} config lookup: ${game.gameId}`,
        );
      }
      if (!source.value.includes("PANGEA_SCRIPT_OBJECT_STREAM_IN")) {
        return err(`Adapter replacement integration is missing streamIn: ${game.gameId}`);
      }
      if (!source.value.includes("PANGEA_SCRIPT_OBJECT_STREAM_OUT")) {
        return err(`Adapter replacement integration is missing streamOut: ${game.gameId}`);
      }
      if (!source.value.includes("CompleteScriptReplacement")) {
        return err(`Adapter replacement integration is missing failure cleanup: ${game.gameId}`);
      }
      if (!source.value.includes("PangeaScript_AssociateObjectSource")) {
        return err(`Adapter replacement integration is missing source association: ${game.gameId}`);
      }
      if (!source.value.includes("PangeaScript_FindObjectBySource")) {
        return err(`Adapter replacement integration is missing source-idempotent lookup: ${game.gameId}`);
      }
      if (!source.value.includes("return replacement->strict")) {
        return err(`Adapter replacement integration is missing strict fallback behavior: ${game.gameId}`);
      }
    }
    const expectedNativeItems = game.nativeSpawns.filter((spawn) =>
      spawn.id.includes("."),
    );
    for (const expected of expectedNativeItems) {
      const actual = nativeItems.value.find((item) => item.id === expected.id);
      if (!actual) {
        return err(`Adapter native item table is missing ${expected.id}: ${game.gameId}`);
      }
      if (
        expected.nativeType !== undefined &&
        actual.nativeType !== expected.nativeType
      ) {
        return err(`Adapter native type drift for ${expected.id}: ${game.gameId}`);
      }
      if (actual.category.toLowerCase() !== expected.category.toLowerCase()) {
        return err(`Adapter native category drift for ${expected.id}: ${game.gameId}`);
      }
    }
    for (const actual of nativeItems.value) {
      if (actual.dependencySummary.trim().length === 0) {
        return err(`Adapter native item is missing dependency summary ${actual.id}: ${game.gameId}`);
      }
      if (!expectedNativeItems.some((expected) => expected.id === actual.id)) {
        return err(`Adapter advertises uncontracted native item ${actual.id}: ${game.gameId}`);
      }
    }
  }
  for (const capabilities of runtimeCapabilities) {
    const contract = SCRIPTING_CONTRACT.games[capabilities.gameId];
    if (!contract) return err(`Adapter capability has unknown game ID: ${capabilities.gameId}`);
    const expected = {
      gameId: capabilities.gameId,
      terrainItems: contract.capabilities.terrainItemHooks === "supported",
      splineItems: contract.capabilities.splineItemHooks === "supported",
      mapItems: contract.capabilities.mapItemHooks === "supported",
      pickupScoreEffects: contract.capabilities.pickupScoreEffects === "supported",
      objectCollision: contract.capabilities.objectCollision === "supported",
      playerCommands: contract.capabilities.playerCommands === "supported",
      playerInvulnerability: contract.capabilities.playerInvulnerability === "supported",
    };
    if (JSON.stringify(capabilities) !== JSON.stringify(expected)) {
      return err(`Adapter capability metadata drift: ${capabilities.gameId}`);
    }
  }
  const animationMarkerValidation = validateAnimationMarkerCallSites();
  if (animationMarkerValidation.isErr()) return err(animationMarkerValidation.error);
  const animationCompletionValidation = validateAnimationCompletionCallSites();
  if (animationCompletionValidation.isErr()) return err(animationCompletionValidation.error);
  const adapterLifecycleValidation = validateAdapterLifecycleCallSites();
  if (adapterLifecycleValidation.isErr()) return err(adapterLifecycleValidation.error);
  const playerIntegrationValidation = validatePlayerIntegrationCallSites();
  if (playerIntegrationValidation.isErr()) return err(playerIntegrationValidation.error);
  const adapterAssetLoaderValidation = validateAdapterAssetLoaders();
  if (adapterAssetLoaderValidation.isErr()) return err(adapterAssetLoaderValidation.error);
  const staleHandleValidation = validateAdapterStaleHandleGuards();
  if (staleHandleValidation.isErr()) return err(staleHandleValidation.error);
  const nativeLifecycleValidation = validateNativeLifecycleCallSites();
  if (nativeLifecycleValidation.isErr()) return err(nativeLifecycleValidation.error);
  return ok(true);
}

function validateAdapterStaleHandleGuards(): Result<true, string> {
  for (const [gameId, relativePath] of Object.entries(adapterPathsByGameId)) {
    const source = readRuntimeSource(resolve(process.cwd(), relativePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes("PangeaScript_ObjectExists(handle)")) {
      return err(`Adapter object-frame boundary is missing stale-handle cleanup: ${gameId}`);
    }
  }
  return ok(true);
}

function validateNativeLifecycleCallSites(): Result<true, string> {
  for (const callSite of nativeLifecycleCallSites) {
    const source = readRuntimeSource(resolve(process.cwd(), callSite.sourcePath));
    if (source.isErr()) return err(source.error);
    for (const call of callSite.calls) {
      if (!source.value.includes(`${call}(`)) {
        return err(`Native lifecycle call site is missing ${call}: ${callSite.gameId}`);
      }
    }
  }
  return ok(true);
}

function validateAdapterAssetLoaders(): Result<true, string> {
  for (const adapter of adapterAssetLoaders) {
    const sourcePath = adapterPathsByGameId[adapter.gameId];
    if (!sourcePath) return err(`Missing adapter source path for asset loader: ${adapter.gameId}`);
    const source = readRuntimeSource(resolve(process.cwd(), sourcePath));
    if (source.isErr()) return err(source.error);
    if (!source.value.includes(adapter.modelLoader)) {
      return err(`Adapter asset loader drift for ${adapter.gameId}: expected ${adapter.modelLoader}`);
    }
    if (!source.value.includes(adapter.postLoadRegistryCheck)) {
      return err(`Adapter post-load registry validation drift for ${adapter.gameId}`);
    }
    const assetPreflightMarker = adapter.assetPreflightMarker ?? "IsSafeCustomAsset";
    if (adapter.requiresAssetPreflight && !source.value.includes(assetPreflightMarker)) {
      return err(`Adapter asset preflight drift for ${adapter.gameId}`);
    }
    if (adapter.assetBoundaryMarker && !source.value.includes(adapter.assetBoundaryMarker)) {
      return err(`Adapter asset failure boundary drift for ${adapter.gameId}`);
    }
    if (adapter.requiresDefinitionGuard &&
      !source.value.includes("if (!definition || definition->modelPath[0] == '\\0' || definition->skeletonPath[0] == '\\0')")) {
      return err(`Adapter custom skeleton input guard drift for ${adapter.gameId}`);
    }
    if (!source.value.includes("if (!modelPath || modelPath[0] == '\\0')")) {
      return err(`Adapter custom model input guard drift for ${adapter.gameId}`);
    }
    const contract = SCRIPTING_CONTRACT.games[adapter.gameId];
    if (!contract || !contract.assetKinds.includes(adapter.assetKind)) {
      return err(`Contract asset-kind drift for ${adapter.gameId}: expected ${adapter.assetKind}`);
    }
    if (adapter.hasSkeletonLoader && !source.value.includes("LoadCustomSkeleton")) {
      return err(`Adapter skeleton loader drift for ${adapter.gameId}`);
    }
    if (!adapter.hasSkeletonLoader && contract.assetKinds.includes("skeleton")) {
      return err(`Contract advertises unsupported skeleton assets for ${adapter.gameId}`);
    }
  }
  return ok(true);
}

function validateDocumentation(): Result<true, string> {
  const documentationPath = resolve(
    process.cwd(),
    "../games/pangea-ports/docs/lua-scripting.md",
  );
  const documentation = readRuntimeSource(documentationPath);
  if (documentation.isErr()) return err(documentation.error);

  const identifiers = [
    ...SCRIPTING_CONTRACT.api.hooks.map((hook) => hook.name),
    ...SCRIPTING_CONTRACT.api.apis.map((api) => api.name),
    ...SCRIPTING_CONTRACT.events.map((event) => event.id),
    ...SCRIPTING_CONTRACT.objectEvents.map((event) => event.id),
    ...SCRIPT_FAILURE_CODES,
    ...SCRIPTING_CONTRACT.api.games.map((game) => game.gameId),
  ];
  const resultShapes = getScriptingContractResultShapes(SCRIPTING_CONTRACT);
  const missing = [...identifiers, ...resultShapes].filter(
    (identifier) => !documentation.value.includes(identifier),
  );
  if (missing.length > 0) {
    return err(`Lua scripting documentation is missing contract identifiers: ${missing.join(", ")}`);
  }
  const generatedIndex = renderScriptingContractDocumentationIndex(SCRIPTING_CONTRACT);
  if (!documentation.value.includes(generatedIndex)) {
    return err("Lua scripting documentation contract index is not generated from the validated scripting contract");
  }
  return ok(true);
}

function validateLegacyDocumentation(): Result<true, string> {
  const legacyPaths = [
    "../games/pangea-ports/docs/level-editor-scripting-plan.md",
    "../games/pangea-ports/docs/otto-scripting-extension-plan.md",
    "../games/pangea-ports/docs/typescript-api.md",
    "../games/pangea-ports/docs/script-examples.md",
  ];
  for (const relativePath of legacyPaths) {
    const documentation = readRuntimeSource(resolve(process.cwd(), relativePath));
    if (documentation.isErr()) return err(documentation.error);
    if (!/historical|legacy compatibility note/i.test(documentation.value)) {
      return err(`Legacy scripting document is missing its status marker: ${relativePath}`);
    }
    if (!/Lua/i.test(documentation.value)) {
      return err(`Legacy scripting document does not point to the Lua path: ${relativePath}`);
    }
  }
  return ok(true);
}

function compareRuntimeContract(
  headerSource: string,
  runtimeSource: string,
  metadataSource: string,
): Result<true, string> {
  if (!headerSource.includes('#include "pangea_script_contract.h"')) {
    return err("C runtime public header does not expose generated contract metadata");
  }
  if (metadataSource !== renderScriptingContractCMetadata(SCRIPTING_CONTRACT)) {
    return err("C metadata header is not generated from the validated scripting contract");
  }
  const generatedLists = [
    "PANGEA_SCRIPT_COMMAND_DESCRIPTOR_LIST(PANGEA_SCRIPT_COMMAND_DESCRIPTOR_ENTRY)",
    "PANGEA_SCRIPT_EVENT_DESCRIPTOR_LIST(PANGEA_SCRIPT_EVENT_DESCRIPTOR_ENTRY)",
    "PANGEA_SCRIPT_OBJECT_EVENT_DESCRIPTOR_LIST(PANGEA_SCRIPT_OBJECT_EVENT_DESCRIPTOR_ENTRY)",
  ];
  const missingGeneratedLists = generatedLists.filter((entry) => !runtimeSource.includes(entry));
  if (missingGeneratedLists.length > 0) {
    return err(`C runtime is not generating descriptor tables: ${missingGeneratedLists.join(", ")}`);
  }

  const contractVersion = parseVersion(
    headerSource,
    "PANGEA_SCRIPT_CONTRACT_VERSION",
  );
  if (contractVersion.isErr()) return err(contractVersion.error);
  if (contractVersion.value !== SCRIPT_CONTRACT_VERSION) {
    return err(`C contract version drift: ${String(contractVersion.value)}`);
  }

  const apiVersion = parseVersion(headerSource, "PANGEA_SCRIPT_API_VERSION");
  if (apiVersion.isErr()) return err(apiVersion.error);
  if (apiVersion.value !== SCRIPT_API_VERSION) {
    return err(`C API version drift: ${String(apiVersion.value)}`);
  }

  const failureCodes = parseRuntimeFailureCodes(headerSource);
  if (failureCodes.isErr()) return err(failureCodes.error);
  if (JSON.stringify(failureCodes.value) !== JSON.stringify(SCRIPT_FAILURE_CODES)) {
    return err("C failure-code metadata drift");
  }

  const runtimeCommands = parseRuntimeCommands(metadataSource);
  if (runtimeCommands.isErr()) return err(runtimeCommands.error);
  const expectedCommands = SCRIPTING_CONTRACT.api.apis
    .filter((api) => api.command !== undefined && !api.name.endsWith("Result"))
    .map((api) => {
      const command = api.command;
      return {
        id: api.name,
        capability: command?.capability ?? "",
        authority: command?.authority ?? "",
        applicationPhase: command?.applicationPhase ?? "",
        validation: command?.validation.join("; ") ?? "",
      } satisfies RuntimeCommandDescriptor;
    });
  if (JSON.stringify(runtimeCommands.value) !== JSON.stringify(expectedCommands)) {
    return err("C command descriptor metadata drift");
  }

  const runtimeEvents = parseRuntimeEvents(metadataSource);
  if (runtimeEvents.isErr()) return err(runtimeEvents.error);
  const expectedEvents = SCRIPTING_CONTRACT.events.map((event) => ({
    id: event.id,
    applicationPhase: event.applicationPhase,
    payload: Object.entries(event.payload).map(([key, value]) => `${key}:${value}`).join(";"),
    result: event.result,
  }));
  if (JSON.stringify(runtimeEvents.value) !== JSON.stringify(expectedEvents)) {
    return err("C event descriptor metadata drift");
  }

  const runtimeObjectEvents = parseRuntimeObjectEvents(metadataSource);
  if (runtimeObjectEvents.isErr()) return err(runtimeObjectEvents.error);
  if (JSON.stringify(runtimeObjectEvents.value) !== JSON.stringify(SCRIPTING_CONTRACT.objectEvents)) {
    return err("C object-event descriptor metadata drift");
  }
  return ok(true);
}

const runtimeHeader = resolve(process.cwd(), "../games/pangea-ports/shared/script/pangea_script.h");
const runtimeSource = resolve(process.cwd(), "../games/pangea-ports/shared/script/pangea_script.c");
const runtimeMetadata = resolve(process.cwd(), "../games/pangea-ports/shared/script/pangea_script_contract.h");
const luaBackendSource = resolve(process.cwd(), "../games/pangea-ports/shared/script/pangea_script_backend_lua.c");
const headerResult = readRuntimeSource(runtimeHeader);
const sourceResult = readRuntimeSource(runtimeSource);
const metadataResult = readRuntimeSource(runtimeMetadata);
const luaBackendResult = readRuntimeSource(luaBackendSource);

const validation = validateScriptingContract();
if (validation.isErr()) {
  console.error(`Scripting contract drift: ${validation.error}`);
  process.exitCode = 1;
} else if (headerResult.isErr()) {
  console.error(headerResult.error);
  process.exitCode = 1;
} else if (sourceResult.isErr()) {
  console.error(sourceResult.error);
  process.exitCode = 1;
} else if (metadataResult.isErr()) {
  console.error(metadataResult.error);
  process.exitCode = 1;
} else if (luaBackendResult.isErr()) {
  console.error(luaBackendResult.error);
  process.exitCode = 1;
} else {
  const nativeAuditValidation = validateNativeItemAuditCatalog();
  if (nativeAuditValidation.isErr()) {
    console.error(`Native audit drift: ${nativeAuditValidation.error}`);
    process.exitCode = 1;
  } else {
  const runtimeValidation = compareRuntimeContract(
    headerResult.value,
    sourceResult.value,
    metadataResult.value,
  );
  if (runtimeValidation.isErr()) {
    console.error(`Runtime contract drift: ${runtimeValidation.error}`);
    process.exitCode = 1;
  } else {
    const luaBindingValidation = compareLuaBindings(luaBackendResult.value);
    if (luaBindingValidation.isErr()) {
      console.error(`Lua binding drift: ${luaBindingValidation.error}`);
      process.exitCode = 1;
    } else {
      const luaHookValidation = compareLuaSupportedHooks(
        luaBackendResult.value,
        metadataResult.value,
      );
      if (luaHookValidation.isErr()) {
        console.error(`Lua hook metadata drift: ${luaHookValidation.error}`);
        process.exitCode = 1;
      } else {
        const adapterValidation = validateAdapterCapabilities(metadataResult.value);
        if (adapterValidation.isErr()) {
          console.error(`Adapter capability drift: ${adapterValidation.error}`);
          process.exitCode = 1;
        } else {
          const saveLoadValidation = validateAdapterSaveLoadCallSites();
          if (saveLoadValidation.isErr()) {
            console.error(`Adapter save/load drift: ${saveLoadValidation.error}`);
            process.exitCode = 1;
          } else {
          const playerCommandValidation = validateAdapterPlayerCommandBindings();
          if (playerCommandValidation.isErr()) {
            console.error(`Player command binding drift: ${playerCommandValidation.error}`);
            process.exitCode = 1;
          } else {
          const documentationValidation = validateDocumentation();
          if (documentationValidation.isErr()) {
            console.error(`Documentation contract drift: ${documentationValidation.error}`);
            process.exitCode = 1;
          } else {
            const legacyDocumentationValidation = validateLegacyDocumentation();
            if (legacyDocumentationValidation.isErr()) {
              console.error(`Documentation migration drift: ${legacyDocumentationValidation.error}`);
              process.exitCode = 1;
            } else {
              console.log("Scripting contract is internally consistent across frontend, C runtime, Lua bindings, adapters, and documentation.");
            }
          }
          }
          }
        }
      }
    }
  }
  }
}
