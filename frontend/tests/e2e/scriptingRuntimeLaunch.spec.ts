import { expect, test } from "@playwright/test";
import { z } from "zod";

const runtimeScript = `local pangea = require("pangea")
local entry = {}

function entry.onLevelStart(ctx)
  pangea.log.info("browser runtime regression")
end

return entry
`;

function buildRuntimeScript(
  nativeProbeIds: readonly string[] | undefined,
  playerCommandProbe: boolean,
  playerVelocityProbe: boolean,
  pickupScoreCapabilityProbe: boolean,
  damageProbe: boolean,
  splineEventProbe: boolean,
  capabilityExpectations: RuntimeCapabilityExpectations | undefined,
  contextExpectations: RuntimeContextExpectations | undefined,
  lifecycleProbe: boolean,
  childCleanupProbe: boolean,
  recreationProbe: boolean,
  checkpointResetProbe: boolean,
  objectCommandProbe: boolean,
  replacementLifecycleProbe: boolean,
  levelStartProbe: boolean,
  levelCompleteProbe: boolean,
  raceCompletionProbe: boolean,
  raceCompletionCompleteProbe: boolean,
  areaCompletionProbe: boolean,
  objectiveCompletionProbe: boolean,
  persistenceProbe: boolean,
): string {
  void replacementLifecycleProbe;
  if ((nativeProbeIds === undefined || nativeProbeIds.length === 0) && !playerCommandProbe && !playerVelocityProbe && !pickupScoreCapabilityProbe && !damageProbe && !splineEventProbe && !lifecycleProbe && !childCleanupProbe && !recreationProbe && !checkpointResetProbe && !objectCommandProbe && !levelStartProbe && !levelCompleteProbe && !raceCompletionProbe && !areaCompletionProbe && !objectiveCompletionProbe && !persistenceProbe) {
    return runtimeScript;
  }
  const probes = (nativeProbeIds ?? []).map((nativeProbeId) => `
    local result = pangea.spawn.nativeResult(${JSON.stringify(nativeProbeId)}, {x = 100, y = 100, z = 100})
    assert(result.ok and result.primary, result.message)
    assert(pangea.object.delete(result.primary), "browser native probe cleanup failed")`).join("");
  const recreation = recreationProbe && nativeProbeIds?.[0] !== undefined ? `
    local firstRecreation = pangea.spawn.nativeResult(${JSON.stringify(nativeProbeIds[0])}, {x = 110, y = 100, z = 100})
    assert(firstRecreation.ok and firstRecreation.primary, firstRecreation.message)
    assert(pangea.object.delete(firstRecreation.primary), "browser recreation first cleanup failed")
    local secondRecreation = pangea.spawn.nativeResult(${JSON.stringify(nativeProbeIds[0])}, {x = 120, y = 100, z = 100})
    assert(secondRecreation.ok and secondRecreation.primary, secondRecreation.message)
    assert(pangea.object.delete(secondRecreation.primary), "browser recreation second cleanup failed")` : "";
  const playerProbe = playerCommandProbe && !playerVelocityProbe ? `
    local player = pangea.player.get(0)
    assert(player and player.position, "player command probe could not read the player")
    assert(pangea.player.setHealth(0, player.health), "player health command failed")
    local healthCommand = pangea.player.setHealthResult(0, player.health)
    assert(healthCommand.ok and healthCommand.playerNum == 0, healthCommand.message)
    local healthResult = pangea.player.get(0)
    assert(healthResult and healthResult.health == player.health, "player health command did not round-trip")
    local healCommand = pangea.player.healResult(0, 0)
    assert(healCommand.ok, healCommand.message)
    assert(pangea.player.setInvulnerable(0, 1), "player invulnerability command failed")
    local invulnerabilityCommand = pangea.player.setInvulnerableResult(0, 1)
    assert(invulnerabilityCommand.ok, invulnerabilityCommand.message)
    local target = {x = player.position.x + 1, y = player.position.y, z = player.position.z}
    assert(pangea.player.setPosition(0, target), "player position command failed")
    local positionCommand = pangea.player.setPositionResult(0, target)
    assert(positionCommand.ok, positionCommand.message)
    local positionResult = pangea.player.get(0)
    assert(positionResult and math.abs(positionResult.position.x - target.x) < 0.01, "player position command did not round-trip")
    assert(pangea.player.setVelocity(0, {x = 0, y = 0, z = 0}), "player velocity command failed")
    local velocityCommand = pangea.player.setVelocityResult(0, {x = 0, y = 0, z = 0})
    assert(velocityCommand.ok and velocityCommand.playerNum == 0, velocityCommand.message)` : "";
  const playerVelocityProbeScript = playerVelocityProbe ? `
    local velocityCommand = pangea.player.setVelocityResult(0, {x = 0, y = 0, z = 0})
    assert(velocityCommand.ok and velocityCommand.playerNum == 0, velocityCommand.message)` : "";
  const pickupScoreProbe = pickupScoreCapabilityProbe ? `
    assert(pangea.api.capabilities().pickupScoreEffects == true, "pickup score capability was not published by the adapter")` : "";
  const damageProbeScript = damageProbe ? `
function entry.onDamage(ctx)
  assert(ctx.damage == 2 and ctx.cause == 4, "Bugdom 2 damage probe context drifted")
  return {handled = true, damage = 0.5, applyDamage = true}
end

function entry.onDamageApplied(ctx)
  assert(ctx.damage == 0.5 and ctx.cause == 4, "Bugdom 2 applied-damage probe context drifted")
end
` : "";
  const splineEventProbeScript = splineEventProbe ? `
function entry.onSplineItem(ctx)
  assert(ctx.splineNum >= 0 and ctx.placement >= 0 and ctx.placement <= 1, "Bugdom 2 spline probe context drifted")
  return {handled = true, markInUse = true}
end
` : "";
  const capabilityProbe = capabilityExpectations ? `
    local capabilities = pangea.api.capabilities()
    assert(capabilities.objectCollision == ${capabilityExpectations.objectCollision ? "true" : "false"}, "object collision capability drifted")
    assert(capabilities.playerCommands == ${capabilityExpectations.playerCommands ? "true" : "false"}, "player command capability drifted")
    assert(capabilities.playerInvulnerability == ${capabilityExpectations.playerInvulnerability ? "true" : "false"}, "player invulnerability capability drifted")
    assert(capabilities.pickupScoreEffects == ${capabilityExpectations.pickupScoreEffects ? "true" : "false"}, "pickup score capability drifted")
    assert(capabilities.persistence == ${capabilityExpectations.persistence ? "true" : "false"}, "persistence capability drifted")` : "";
  const contextProbe = contextExpectations ? `
    ${contextExpectations.mode ? `assert(ctx.mode == ${JSON.stringify(contextExpectations.mode)}, "script context mode drifted")` : ""}
    assert(ctx.networked == ${contextExpectations.networked ? "true" : "false"}, "script context networked flag drifted")${contextExpectations.trackName ? `
    assert(ctx.trackName == ${JSON.stringify(contextExpectations.trackName)}, "script context track name drifted")` : ""}${contextExpectations.sceneName ? `
    assert(ctx.sceneName == ${JSON.stringify(contextExpectations.sceneName)}, "script context scene name drifted")` : ""}${contextExpectations.areaName ? `
    assert(ctx.areaName == ${JSON.stringify(contextExpectations.areaName)}, "script context area name drifted")` : ""}${contextExpectations.levelName ? `
    assert(ctx.levelName == ${JSON.stringify(contextExpectations.levelName)}, "script context level name drifted")` : ""}${contextExpectations.playerMode ? `
    assert(ctx.playerMode == ${JSON.stringify(contextExpectations.playerMode)}, "script context player mode drifted")` : ""}` : "";
  const levelStartHandler = levelStartProbe ? `
local levelStarted = false

function entry.onLevelStart(ctx)
  levelStarted = true
end
` : "";
  const levelCompleteHandler = levelCompleteProbe ? `
local levelCompleted = false

function entry.onLevelComplete(ctx)
  levelCompleted = true
end
` : "";
  const raceCompletionHandler = raceCompletionProbe ? `
local raceFinished = false
local raceCompleted = false

function entry.onRaceFinish(ctx)
  raceFinished = true
  pangea.log.info("browser race finish")
end

${raceCompletionCompleteProbe ? `function entry.onRaceComplete(ctx)
  raceCompleted = true
  pangea.log.info("browser race complete")
end` : ""}
` : "";
  const areaCompletionHandler = areaCompletionProbe ? `
local areaCompleted = false

function entry.onAreaComplete(ctx)
  areaCompleted = true
  pangea.log.info("browser area complete")
end
` : "";
  const objectiveCompletionHandler = objectiveCompletionProbe ? `
local objectiveCompleted = false

  function entry.onObjectiveComplete(ctx)
    local results = pangea.player.objectiveResults()
    assert(results and results[1], "browser objective result row was not published")
    assert(results[1].playerNum == ctx.playerNum, "browser objective result player drifted")
    assert(results[1].levelNum == ctx.levelNum, "browser objective result level drifted")
    assert(results[1].outcome == ctx.eventValue, "browser objective result outcome drifted")
    objectiveCompleted = true
    pangea.log.info("browser objective complete")
  end
` : "";
  const persistenceProbeScript = persistenceProbe ? `
  assert(pangea.api.capabilities().persistence == true, "persistence capability was not published")
  assert(pangea.persistence.set("browser-runtime", 1, "persisted"), "persistence set failed")
  assert(pangea.persistence.get("browser-runtime", 1) == "persisted", "persistence get failed")
  assert(pangea.persistence.get("browser-runtime", 2) == nil, "persistence version mismatch was not rejected")
  assert(pangea.persistence.delete("browser-runtime"), "persistence delete failed")
  assert(pangea.persistence.get("browser-runtime", 1) == nil, "persistence delete did not clear the value")
` : "";
  const objectFrameHandlers = lifecycleProbe || childCleanupProbe || checkpointResetProbe || objectCommandProbe ? `
${lifecycleProbe || checkpointResetProbe ? `local lifecycle = { spawn = false, destroy = false, streamIn = false, streamOut = false, checkpointReset = false }` : ""}
${childCleanupProbe ? `local childHandle = nil
local childSpawned = false
local childDestroyed = false` : ""}
${objectCommandProbe ? `local objectCommandsChecked = false` : ""}

function entry.onObjectFrame(ctx)
  if ctx.objectType == "browser-custom-object" then
${childCleanupProbe ? `    if ctx.event == "spawn" and not childSpawned then
      childSpawned = true
      childHandle = pangea.spawn.scripted("browser-custom-object", {x = 101, y = 100, z = 100})
      assert(childHandle, "scripted child spawn failed")
    end` : ""}
${childCleanupProbe ? `    if ctx.event == "destroy" and childHandle and ctx.object.id == childHandle.id then
      childDestroyed = true
      pangea.log.info("browser child destroy")
    end` : ""}
${lifecycleProbe || checkpointResetProbe ? `    if ctx.event == "spawn" then lifecycle.spawn = true; pangea.log.info("browser lifecycle spawn") end
    if ctx.event == "destroy" then lifecycle.destroy = true; pangea.log.info("browser lifecycle destroy") end
    if ctx.event == "streamIn" then lifecycle.streamIn = true; pangea.log.info("browser lifecycle streamIn") end
    if ctx.event == "streamOut" then lifecycle.streamOut = true; pangea.log.info("browser lifecycle streamOut") end
    if ctx.event == "checkpointReset" then
      lifecycle.checkpointReset = true
      pangea.log.info("browser checkpoint reset")
    end` : ""}
${objectCommandProbe ? `    if ctx.event == "update" and not objectCommandsChecked then
      local position = ctx.position
      assert(pangea.object.setPositionResult(ctx.object, position).ok, "custom object position command failed")
      assert(pangea.object.setPositionOffsetResult(ctx.object, {x = 0, y = 0, z = 0}).ok, "custom object position offset command failed")
      assert(pangea.object.setVelocityResult(ctx.object, {x = 0, y = 0, z = 0}).ok, "custom object velocity command failed")
      assert(pangea.object.setRotationResult(ctx.object, {x = 0, y = 0, z = 0}).ok, "custom object rotation command failed")
      assert(pangea.object.setScaleResult(ctx.object, 1).ok, "custom object scale command failed")
      assert(pangea.object.setCollisionEnabledResult(ctx.object, true).ok, "custom object collision command failed")
      objectCommandsChecked = true
    end` : ""}
  end
end
` : "";
  const objectCommandCheck = objectCommandProbe ? `
  assert(objectCommandsChecked, "custom object command probe was not delivered")` : "";
  const lifecycleCheck = lifecycleProbe ? `
  if probed then lifecycleFrames = lifecycleFrames + 1 end` : "";
  const levelStartCheck = levelStartProbe ? `
  assert(levelStarted, "level start event was not delivered")` : "";
  const levelCompleteCheck = levelCompleteProbe ? `
  assert(levelCompleted, "level complete event was not delivered")` : "";
  const raceCompletionCheck = raceCompletionProbe ? `
  assert(raceFinished, "race finish event was not delivered")
${raceCompletionCompleteProbe ? `  assert(raceCompleted, "race complete event was not delivered")` : ""}` : "";
  const areaCompletionCheck = areaCompletionProbe ? `
  assert(areaCompleted, "area complete event was not delivered")` : "";
  return `local pangea = require("pangea")
local entry = {}
local probed = false
local lifecycleChecked = false
local lifecycleFrames = 0

${objectFrameHandlers}
${levelStartHandler}
${levelCompleteHandler}
${raceCompletionHandler}
${areaCompletionHandler}
${objectiveCompletionHandler}
${damageProbeScript}
${splineEventProbeScript}

function entry.onFrame(ctx)
  pangea.log.info("browser runtime regression")
  if not probed then
    probed = true
${probes}
${recreation}
${playerProbe}
${playerVelocityProbeScript}
${pickupScoreProbe}
${capabilityProbe}
${contextProbe}
${persistenceProbeScript}
  end
${lifecycleCheck}
${objectCommandCheck}
${levelStartCheck}
${levelCompleteCheck}
${raceCompletionCheck}
${areaCompletionCheck}
end

return entry
`;
}

const runtimeStatusSchema = z.object({
  enabled: z.boolean(),
  bundleLoaded: z.boolean(),
  scriptsDisabled: z.boolean(),
  errorCount: z.number(),
  hooksCalled: z.number(),
  lastError: z.string(),
});

interface RuntimeFixture {
  readonly assetPath: string;
  readonly convertedAssetPath?: string;
  readonly assetUrl: string;
  readonly nativeProbeIds?: readonly string[];
  readonly playerCommandProbe?: boolean;
  readonly playerVelocityProbe?: boolean;
  readonly damageProbe?: boolean;
  readonly damageProbeFunction?: string;
  readonly splineEventProbe?: boolean;
  readonly splineEventProbeFunction?: string;
  readonly splineEventProbeResult?: number;
  readonly mapReplacementProbe?: boolean;
  readonly pickupScoreCapabilityProbe?: boolean;
  readonly lifecycleProbe?: boolean;
  readonly recreationProbe?: boolean;
  readonly checkpointResetProbe?: boolean;
  readonly checkpointResetProbeFunction?: string;
  readonly checkpointResetProbeResult?: number;
  readonly saveLoadProbe?: boolean;
  readonly saveLoadProbeFunction?: string;
  readonly saveLoadProbeResult?: number;
  readonly checkpointResetEventLogProbe?: boolean;
  readonly objectCommandProbe?: boolean;
  readonly replacementLifecycleProbe?: boolean;
  readonly levelStartProbe?: boolean;
  readonly levelCompleteProbe?: boolean;
  readonly raceCompletionProbe?: boolean;
  readonly raceCompletionProbeFunction?: string;
  readonly raceCompletionProbeResult?: number;
  readonly raceCompletionCompleteProbe?: boolean;
  readonly objectiveCompletionProbe?: boolean;
  readonly objectiveCompletionProbeFunction?: string;
  readonly objectiveCompletionProbeResult?: number;
  readonly persistenceProbe?: boolean;
  readonly areaCompletionProbe?: boolean;
  readonly runtimeWarmupMs?: number;
  readonly scriptedObjectProbe?: boolean;
  readonly terrainPath?: string;
  readonly terrainUrl?: string;
  readonly mapPath?: string;
  readonly mapUrl?: string;
  readonly tilesetPath?: string;
  readonly tilesetUrl?: string;
  readonly applyTerrainOverride?: boolean;
  readonly levelNum?: number;
  readonly nativeItems: readonly string[];
  readonly manualStart?: boolean;
  readonly startSelector?: string;
  readonly verifyMalformedAsset?: boolean;
  readonly hostModulePreRunProbe?: boolean;
  readonly contextExpectations?: RuntimeContextExpectations;
  readonly terrainReplacement?: {
    readonly itemIndex: number;
    readonly nativeType: number;
    readonly x: number;
    readonly z: number;
  };
  readonly terrainReplacementProbes?: readonly {
    readonly replacement: {
      readonly itemIndex: number;
      readonly nativeType: number;
      readonly x: number;
      readonly z: number;
    };
    readonly expectedResult?: number;
  }[];
  readonly terrainReplacementCustomObjectId?: string;
  readonly terrainReplacementProbe?: string;
  readonly terrainReplacementExpectedResult?: number;
  readonly terrainReplacementStrict?: boolean;
  readonly expectReplacementLog?: boolean;
  readonly splineReplacementExpectedResult?: number;
  readonly splineReplacementStrict?: boolean;
  readonly expectSplineReplacementLog?: boolean;
  readonly mapReplacementStrict?: boolean;
  readonly mapReplacementExpectedResult?: number;
  readonly expectMapReplacementLog?: boolean;
  readonly customObjectAssetPath?: string;
  readonly customObjectModelObject?: number;
  readonly skeletonAssetPath?: string;
  readonly skeletonAssetUrl?: string;
  readonly splineReplacement?: {
    readonly splineNum: number;
    readonly itemIndex: number;
    readonly nativeType: number;
    readonly placement: number;
  };
  readonly splineReplacementProbe?: string;
  readonly splineReplacementFromFirstItem?: boolean;
  readonly splineReplacementProbeFunction?: string;
  readonly splineReplacementProbeResult?: number;
}

interface RuntimeCapabilityExpectations {
  readonly objectCollision: boolean;
  readonly playerCommands: boolean;
  readonly playerInvulnerability: boolean;
  readonly pickupScoreEffects: boolean;
  readonly persistence: boolean;
}

interface RuntimeContextExpectations {
  readonly mode?: string;
  readonly networked: boolean;
  readonly trackName?: string;
  readonly sceneName?: string;
  readonly areaName?: string;
  readonly levelName?: string;
  readonly playerMode?: string;
}

interface RuntimeTarget {
  readonly id: string;
  readonly path: string;
  readonly requiresStartup: boolean;
  readonly query?: string;
  readonly fixture: RuntimeFixture;
}

function createTerrainReplacementProbes(
  nativeTypes: readonly number[],
  itemIndexStart: number,
): readonly {
  readonly replacement: {
    readonly itemIndex: number;
    readonly nativeType: number;
    readonly x: number;
    readonly z: number;
  };
}[] {
  return nativeTypes.map((nativeType, index) => ({
    replacement: {
      itemIndex: itemIndexStart + index,
      nativeType,
      x: index * 10,
      z: 100,
    },
  }));
}

const billyCallableTerrainTypes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 36,
] as const;

const cromagCallableTerrainTypes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20,
  21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 55, 56, 57, 59,
  60, 62, 63, 65,
] as const;

const ottoCallableTerrainTypes = Array.from({ length: 108 }, (_, index) => index + 1).filter(
  (nativeType) => ![35, 40, 41, 79, 86, 103].includes(nativeType),
);

const bugdom2CallableTerrainTypes = Array.from({ length: 85 }, (_, index) => index + 1).filter(
  (nativeType) => ![25, 40, 58, 63].includes(nativeType),
);

const mightyMikeAreaDefinitions: readonly (readonly [number, string, string])[] = [
  [0, "Jurassic", "jurassic"],
  [1, "Candy", "candy"],
  [2, "Fairy", "fairy"],
  [3, "Clown", "clown"],
  [4, "Bargain", "bargain"],
];

const mightyMikeAdditionalAreaTargets: readonly RuntimeTarget[] = mightyMikeAreaDefinitions.flatMap(([scene, sceneName, mapName]) => [1, 2].map((area) => ({
  id: `Mighty Mike ${sceneName} Area ${area + 1}`,
  path: "mightymike/index.html",
  requiresStartup: false,
  query: `level=${scene}:${area}&mapOverride=:Maps:${mapName}.map-${area + 1}`,
  fixture: {
    assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
    assetUrl: "../../../../data/mightymike/shapes/main.shapes",
    nativeItems: [],
    contextExpectations: { mode: "local", networked: false, sceneName: mapName, areaName: `area-${area + 1}` },
    playerCommandProbe: true,
    lifecycleProbe: true,
    mapPath: `Data/Maps/${mapName}.map-${area + 1}`,
    mapUrl: `../../../../assets/mightyMike/terrain/${mapName}.map-${area + 1}`,
    tilesetPath: `Data/Maps/${mapName}.tileset`,
    tilesetUrl: `../../../../assets/mightyMike/terrain/${mapName}.tileset`,
    verifyMalformedAsset: true,
  },
})));

const runtimeTargets: readonly RuntimeTarget[] = [
  {
    id: "Billy Frontier",
    path: "billyfrontier/billyfrontier.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/billyfrontier/skeletons/Billy.bg3d",
      contextExpectations: { mode: "duel", networked: false, levelName: "level1" },
      nativeProbeIds: ["billy.peso", "billy.freeLifePow", "billy.boost"],
      nativeItems: ["billy.peso", "billy.freeLifePow", "billy.boost"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      pickupScoreCapabilityProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      areaCompletionProbe: true,
      saveLoadProbe: true,
      saveLoadProbeFunction: "BillyScript_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "BillyScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(billyCallableTerrainTypes.slice(1), 1),
      replacementLifecycleProbe: true,
      terrainPath: "Data/Terrain/town_duel.ter",
      terrainUrl: "../../../../assets/billyFrontier/terrain/town_duel.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Bugdom",
    path: "bugdom/game.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.3dmf",
      assetUrl: "../../../../games/bugdom1/models/Global_Models1.3dmf",
      contextExpectations: { networked: false, levelName: "training" },
      nativeProbeIds: ["bugdom.nut", "bugdom.clover", "bugdom.checkpoint"],
      nativeItems: ["bugdom.nut", "bugdom.clover", "bugdom.checkpoint"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "BugdomScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: [
        { replacement: { itemIndex: 107, nativeType: 1, x: 160, z: 100 } },
        { replacement: { itemIndex: 108, nativeType: 2, x: 170, z: 100 } },
        { replacement: { itemIndex: 101, nativeType: 3, x: 100, z: 100 } },
        { replacement: { itemIndex: 102, nativeType: 4, x: 110, z: 100 } },
        { replacement: { itemIndex: 109, nativeType: 5, x: 180, z: 100 } },
        { replacement: { itemIndex: 110, nativeType: 6, x: 190, z: 100 } },
        { replacement: { itemIndex: 111, nativeType: 7, x: 200, z: 100 } },
        { replacement: { itemIndex: 112, nativeType: 9, x: 210, z: 100 } },
        { replacement: { itemIndex: 113, nativeType: 10, x: 220, z: 100 } },
        { replacement: { itemIndex: 114, nativeType: 11, x: 230, z: 100 } },
        { replacement: { itemIndex: 115, nativeType: 12, x: 240, z: 100 } },
        { replacement: { itemIndex: 116, nativeType: 13, x: 250, z: 100 } },
        { replacement: { itemIndex: 117, nativeType: 14, x: 260, z: 100 } },
        { replacement: { itemIndex: 118, nativeType: 15, x: 270, z: 100 } },
        { replacement: { itemIndex: 119, nativeType: 16, x: 280, z: 100 } },
        { replacement: { itemIndex: 120, nativeType: 17, x: 290, z: 100 } },
        { replacement: { itemIndex: 121, nativeType: 18, x: 300, z: 100 } },
        { replacement: { itemIndex: 122, nativeType: 19, x: 310, z: 100 } },
        { replacement: { itemIndex: 123, nativeType: 20, x: 320, z: 100 } },
        { replacement: { itemIndex: 124, nativeType: 21, x: 330, z: 100 } },
        { replacement: { itemIndex: 125, nativeType: 22, x: 340, z: 100 } },
        { replacement: { itemIndex: 126, nativeType: 23, x: 350, z: 100 } },
        { replacement: { itemIndex: 127, nativeType: 24, x: 360, z: 100 } },
        { replacement: { itemIndex: 103, nativeType: 26, x: 120, z: 100 } },
        { replacement: { itemIndex: 128, nativeType: 27, x: 370, z: 100 } },
        { replacement: { itemIndex: 129, nativeType: 28, x: 380, z: 100 } },
        { replacement: { itemIndex: 104, nativeType: 29, x: 130, z: 100 } },
        { replacement: { itemIndex: 130, nativeType: 30, x: 390, z: 100 } },
        { replacement: { itemIndex: 131, nativeType: 31, x: 400, z: 100 } },
        { replacement: { itemIndex: 132, nativeType: 32, x: 410, z: 100 } },
        { replacement: { itemIndex: 133, nativeType: 33, x: 420, z: 100 } },
        { replacement: { itemIndex: 134, nativeType: 34, x: 430, z: 100 } },
        { replacement: { itemIndex: 105, nativeType: 39, x: 140, z: 100 } },
        { replacement: { itemIndex: 135, nativeType: 36, x: 440, z: 100 } },
        { replacement: { itemIndex: 136, nativeType: 38, x: 450, z: 100 } },
        { replacement: { itemIndex: 137, nativeType: 40, x: 460, z: 100 } },
        { replacement: { itemIndex: 138, nativeType: 41, x: 470, z: 100 } },
        { replacement: { itemIndex: 139, nativeType: 43, x: 480, z: 100 } },
        { replacement: { itemIndex: 140, nativeType: 44, x: 490, z: 100 } },
        { replacement: { itemIndex: 141, nativeType: 45, x: 500, z: 100 } },
        { replacement: { itemIndex: 142, nativeType: 46, x: 510, z: 100 } },
        { replacement: { itemIndex: 143, nativeType: 47, x: 520, z: 100 } },
        { replacement: { itemIndex: 144, nativeType: 48, x: 530, z: 100 } },
        { replacement: { itemIndex: 145, nativeType: 49, x: 540, z: 100 } },
        { replacement: { itemIndex: 146, nativeType: 50, x: 550, z: 100 } },
        { replacement: { itemIndex: 147, nativeType: 51, x: 560, z: 100 } },
        { replacement: { itemIndex: 148, nativeType: 52, x: 570, z: 100 } },
        { replacement: { itemIndex: 149, nativeType: 53, x: 580, z: 100 } },
        { replacement: { itemIndex: 150, nativeType: 54, x: 590, z: 100 } },
        { replacement: { itemIndex: 151, nativeType: 55, x: 600, z: 100 } },
        { replacement: { itemIndex: 152, nativeType: 56, x: 610, z: 100 } },
        { replacement: { itemIndex: 153, nativeType: 57, x: 620, z: 100 } },
        { replacement: { itemIndex: 154, nativeType: 58, x: 630, z: 100 } },
        { replacement: { itemIndex: 155, nativeType: 59, x: 640, z: 100 } },
        { replacement: { itemIndex: 156, nativeType: 60, x: 650, z: 100 } },
        { replacement: { itemIndex: 157, nativeType: 61, x: 660, z: 100 } },
        { replacement: { itemIndex: 106, nativeType: 62, x: 150, z: 100 } },
        { replacement: { itemIndex: 158, nativeType: 63, x: 670, z: 100 } },
      ],
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "BugdomScript_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      saveLoadProbe: true,
      saveLoadProbeFunction: "BugdomScript_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      replacementLifecycleProbe: true,
      terrainPath: "Data/Terrain/Lawn.ter.rsrc",
      terrainUrl: "../../../../assets/bugdom/terrain/Lawn.ter.rsrc",
      manualStart: true,
      startSelector: "#loading-card",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Bugdom 2",
    path: "bugdom2/Bugdom2.html",
    requiresStartup: true,
    query: "level=3",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/bugdom2/skeletons/Mouse.bg3d",
      contextExpectations: { networked: false, levelName: "plumbing" },
      nativeProbeIds: ["bugdom2.powerup", "bugdom2.dcell", "bugdom2.gliderPart"],
      terrainPath: "Data/Terrain/Level3_DogHair.ter",
      terrainUrl: "../../../../assets/bugdom2/terrain/Level3_DogHair.ter",
      levelNum: 3,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "Bugdom2Script_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(bugdom2CallableTerrainTypes.slice(1), 1),
      nativeItems: ["bugdom2.powerup", "bugdom2.dcell", "bugdom2.gliderPart"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      damageProbe: true,
      damageProbeFunction: "Bugdom2Script_ProbeDamageJS",
      splineEventProbe: false,
      splineEventProbeFunction: "Bugdom2Script_ProbeFirstSplineJS",
      splineEventProbeResult: -1,
      lifecycleProbe: true,
      recreationProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Bugdom2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      objectCommandProbe: true,
      replacementLifecycleProbe: true,
      levelStartProbe: true,
      levelCompleteProbe: true,
      runtimeWarmupMs: 5_000,
      manualStart: true,
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Cro-Mag Rally",
    path: "cromagrally/CroMagRally.html",
    requiresStartup: false,
    query: "track=3&car=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/cromagrally/skeletons/GragStanding.bg3d",
      nativeProbeIds: [
        "cromag.pow",
        "cromag.token",
        "cromag.stickyTiresPow",
        "cromag.suspensionPow",
        "cromag.invisibilityPow",
      ],
      nativeItems: [
        "cromag.pow",
        "cromag.token",
        "cromag.stickyTiresPow",
        "cromag.suspensionPow",
        "cromag.invisibilityPow",
      ],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "CroMagScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(cromagCallableTerrainTypes.slice(1), 1),
      contextExpectations: { mode: "practice", networked: false, trackName: "ice" },
      replacementLifecycleProbe: true,
      raceCompletionProbe: true,
      raceCompletionCompleteProbe: true,
      terrainPath: "Data/Terrain/IronAge_Europe.ter",
      terrainUrl: "../../../../assets/croMag/terrain/IronAge_Europe.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Mighty Mike",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=1:0&mapOverride=:Maps:candy.map-1",
    fixture: {
    contextExpectations: { mode: "local", networked: false, sceneName: "candy", areaName: "area-1" },
    assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
    assetUrl: "../../../../data/mightymike/shapes/main.shapes",
    nativeProbeIds: ["mightymike.bunny", "mightymike.healthPow", "mightymike.key"],
    nativeItems: ["mightymike.bunny", "mightymike.healthPow", "mightymike.key"],
    playerCommandProbe: true,
    mapReplacementProbe: true,
    replacementLifecycleProbe: true,
    lifecycleProbe: true,
      saveLoadProbe: true,
      saveLoadProbeFunction: "MikeScript_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      mapPath: "Data/Maps/candy.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/candy.map-1",
      tilesetPath: "Data/Maps/candy.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/candy.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Mighty Mike Jurassic Area 1",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=0:0&mapOverride=:Maps:jurassic.map-1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      mapPath: "Data/Maps/jurassic.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/jurassic.map-1",
      tilesetPath: "Data/Maps/jurassic.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/jurassic.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Mighty Mike Bargain Area 1",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=4:0&mapOverride=:Maps:bargain.map-1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      mapPath: "Data/Maps/bargain.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/bargain.map-1",
      tilesetPath: "Data/Maps/bargain.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/bargain.tileset",
      verifyMalformedAsset: true,
    },
  },
  ...mightyMikeAdditionalAreaTargets,
  {
    id: "Mighty Mike Fairy Area 1",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=2:0&mapOverride=:Maps:fairy.map-1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      mapPath: "Data/Maps/fairy.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/fairy.map-1",
      tilesetPath: "Data/Maps/fairy.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/fairy.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Mighty Mike Clown Area 1",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=3:0&mapOverride=:Maps:clown.map-1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      mapPath: "Data/Maps/clown.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/clown.map-1",
      tilesetPath: "Data/Maps/clown.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/clown.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur",
    path: "nanosaur/index.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.3dmf",
      assetUrl: "../../../../games/nanosaur1/models/Global_Models.3dmf",
      nativeProbeIds: ["nanosaur.powerup", "nanosaur.egg", "nanosaur.crystal"],
      terrainPath: "Data/Terrain/Level1.ter",
      terrainUrl: "../../../../assets/nanosaur/terrain/Level1.ter",
      applyTerrainOverride: true,
      terrainReplacement: { itemIndex: 46, nativeType: 1, x: 1855, z: 10710 },
      terrainReplacementProbe: "NanosaurScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: [
        { replacement: { itemIndex: 46, nativeType: 2, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 4, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 6, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 9, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 10, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 17, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 3, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 5, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 7, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 8, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 11, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 12, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 13, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 14, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 15, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 16, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 18, x: 1855, z: 10710 } },
        { replacement: { itemIndex: 46, nativeType: 19, x: 1855, z: 10710 } },
      ],
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "NanosaurScript_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      levelNum: 0,
      nativeItems: ["nanosaur.powerup", "nanosaur.egg", "nanosaur.crystal"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      replacementLifecycleProbe: true,
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur 2",
    path: "nanosaur2/Nanosaur2.html",
    requiresStartup: false,
    query: "level=0&terrainFile=/Data/Terrain/level1.ter",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/nanosaur2/models/global.bg3d",
      contextExpectations: { mode: "adventure", networked: false, levelName: "adventure1" },
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      terrainPath: "Data/Terrain/level1.ter",
      terrainUrl: "../../../../assets/nanosaur2/terrain/level1.ter",
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "Nanosaur2Script_ProbeTerrainReplacementJS",
      terrainReplacementProbes: [
        { replacement: { itemIndex: 0, nativeType: 15, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 17, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 18, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 21, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 46, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 2, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 3, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 4, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 5, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 6, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 7, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 8, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 9, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 10, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 11, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 12, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 13, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 14, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 16, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 19, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 20, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 22, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 23, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 24, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 25, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 26, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 27, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 28, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 29, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 30, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 31, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 32, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 33, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 34, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 35, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 36, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 37, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 38, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 39, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 40, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 41, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 42, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 43, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 44, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 45, x: 0, z: 0 } },
        { replacement: { itemIndex: 0, nativeType: 47, x: 0, z: 0 } },
      ],
      lifecycleProbe: true,
      recreationProbe: true,
      replacementLifecycleProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Nanosaur2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      checkpointResetEventLogProbe: true,
      saveLoadProbe: true,
      saveLoadProbeFunction: "Nanosaur2Script_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur 2 Race 1",
    path: "nanosaur2/Nanosaur2.html",
    requiresStartup: false,
    query: "level=3&terrainFile=/Data/Terrain/race1.ter",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/nanosaur2/models/global.bg3d",
      contextExpectations: { mode: "race", networked: false, levelName: "race1" },
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      levelNum: 3,
      raceCompletionProbe: true,
      raceCompletionProbeFunction: "Nanosaur2Script_ProbeRaceCompletionJS",
      raceCompletionProbeResult: 1,
      lifecycleProbe: true,
      terrainPath: "Data/Terrain/race1.ter",
      terrainUrl: "../../../../assets/nanosaur2/terrain/race1.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur 2 Battle 1",
    path: "nanosaur2/Nanosaur2.html",
    requiresStartup: false,
    query: "level=5&terrainFile=/Data/Terrain/battle1.ter",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/nanosaur2/models/global.bg3d",
      contextExpectations: { mode: "battle", networked: false, levelName: "battle1" },
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      levelNum: 5,
      objectiveCompletionProbe: true,
      objectiveCompletionProbeFunction: "Nanosaur2Script_ProbeObjectiveCompletionJS",
      objectiveCompletionProbeResult: 1,
      recreationProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Nanosaur2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      checkpointResetEventLogProbe: true,
      terrainPath: "Data/Terrain/battle1.ter",
      terrainUrl: "../../../../assets/nanosaur2/terrain/battle1.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur 2 Capture the Flag 1",
    path: "nanosaur2/Nanosaur2.html",
    requiresStartup: false,
    query: "level=7&terrainFile=/Data/Terrain/flag1.ter",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/nanosaur2/models/global.bg3d",
      contextExpectations: { mode: "capture", networked: false, levelName: "flag1" },
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      playerCommandProbe: true,
      playerVelocityProbe: true,
      levelNum: 7,
      objectiveCompletionProbe: true,
      objectiveCompletionProbeFunction: "Nanosaur2Script_ProbeObjectiveCompletionJS",
      objectiveCompletionProbeResult: 1,
      recreationProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Nanosaur2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      checkpointResetEventLogProbe: true,
      terrainPath: "Data/Terrain/flag1.ter",
      terrainUrl: "../../../../assets/nanosaur2/terrain/flag1.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Otto Matic",
    path: "ottomatic/OttoMatic.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      assetUrl: "../../../../games/ottomatic/models/global.bg3d",
      nativeProbeIds: [
        "ottomatic.human",
        "ottomatic.checkpoint",
        "ottomatic.powerupPod",
        "ottomatic.teleporter",
      ],
      nativeItems: [
        "ottomatic.checkpoint",
        "ottomatic.powerupPod",
        "ottomatic.teleporter",
      ],
      contextExpectations: { networked: false, levelName: "farm", playerMode: "robot" },
      playerCommandProbe: true,
      playerVelocityProbe: true,
      persistenceProbe: true,
      terrainPath: "Data/Terrain/EarthFarm.ter",
      terrainUrl: "../../../../assets/ottoMatic/terrain/EarthFarm.ter",
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "OttoScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(ottoCallableTerrainTypes.slice(1), 1),
      splineReplacement: {
        splineNum: 0,
        itemIndex: 0,
        nativeType: 40,
        placement: 0.5,
      },
      splineReplacementProbe: "OttoScript_ProbeSplineReplacementJS",
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "OttoScript_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      saveLoadProbe: true,
      saveLoadProbeFunction: "OttoScript_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      lifecycleProbe: true,
      replacementLifecycleProbe: true,
      recreationProbe: true,
      hostModulePreRunProbe: true,
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Otto Matic native fallback",
    path: "ottomatic/OttoMatic.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      assetUrl: "../../../../games/ottomatic/models/global.bg3d",
      nativeItems: [],
      levelNum: 0,
      terrainPath: "Data/Terrain/EarthFarm.ter",
      terrainUrl: "../../../../assets/ottoMatic/terrain/EarthFarm.ter",
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      customObjectAssetPath: "Data/Scripts/assets/models/missing.bg3d",
      scriptedObjectProbe: false,
      terrainReplacementProbe: "OttoScript_ProbeTerrainReplacementJS",
      terrainReplacementExpectedResult: 4,
    },
  },
  {
    id: "Otto Matic strict construction failure",
    path: "ottomatic/OttoMatic.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      assetUrl: "../../../../games/ottomatic/models/global.bg3d",
      nativeItems: [],
      levelNum: 0,
      terrainPath: "Data/Terrain/EarthFarm.ter",
      terrainUrl: "../../../../assets/ottoMatic/terrain/EarthFarm.ter",
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      customObjectModelObject: 999,
      scriptedObjectProbe: false,
      terrainReplacementProbe: "OttoScript_ProbeTerrainReplacementJS",
      terrainReplacementExpectedResult: 4,
      terrainReplacementStrict: true,
      expectReplacementLog: true,
    },
  },
];

const bugdomLevelRuntimeTargets: readonly RuntimeTarget[] = runtimeTargets.flatMap((target) => {
  if (target.id !== "Bugdom" || target.fixture === undefined) return [];
  const levels = [
    [1, "lawn", "Lawn"],
    [2, "pond", "Pond"],
    [3, "beach", "Beach"],
    [4, "flight", "Flight"],
    [5, "hive", "BeeHive"],
    [6, "queenbee", "QueenBee"],
    [7, "night", "Night"],
    [8, "anthill", "AntHill"],
    [9, "antking", "AntKing"],
  ] as const;
  return levels.map(([level, levelName, terrainName]) => ({
    ...target,
    id: `Bugdom ${levelName}`,
    query: `level=${level}`,
    fixture: {
      ...target.fixture,
      contextExpectations: { networked: false, levelName },
      levelNum: level,
      terrainPath: `Data/Terrain/${terrainName}.ter.rsrc`,
      terrainUrl: `../../../../assets/bugdom/terrain/${terrainName}.ter.rsrc`,
      manualStart: true,
    },
  }));
});

const nanosaur2RemainingModeRuntimeTargets: readonly RuntimeTarget[] = (() => {
  const baseTarget = runtimeTargets.find((target) => target.id === "Nanosaur 2");
  if (!baseTarget?.fixture) return [];
  const modes = [
    [1, "adventure2", "adventure", "level2"],
    [2, "adventure3", "adventure", "level3"],
    [4, "race2", "race", "race2"],
    [6, "battle2", "battle", "battle2"],
    [8, "flag2", "capture", "flag2"],
  ] as const;
  return modes.map(([level, levelName, mode, terrainName]) => ({
    ...baseTarget,
    id: `Nanosaur 2 ${levelName}`,
    query: `level=${level}&terrainFile=/Data/Terrain/${terrainName}.ter`,
    fixture: {
      ...baseTarget.fixture,
      contextExpectations: { mode, networked: false, levelName },
      levelNum: level,
      terrainPath: `Data/Terrain/${terrainName}.ter`,
      terrainUrl: `../../../../assets/nanosaur2/terrain/${terrainName}.ter`,
      raceCompletionProbe: false,
      raceCompletionProbeFunction: undefined,
      raceCompletionProbeResult: undefined,
      objectiveCompletionProbe: mode === "battle" || mode === "capture",
      objectiveCompletionProbeFunction: mode === "battle" || mode === "capture"
        ? "Nanosaur2Script_ProbeObjectiveCompletionJS"
        : undefined,
      objectiveCompletionProbeResult: mode === "battle" || mode === "capture" ? 1 : undefined,
      verifyMalformedAsset: false,
    },
  }));
})();

const bugdom2LevelRuntimeTargets: readonly RuntimeTarget[] = runtimeTargets.flatMap((target) => {
  if (target.id !== "Bugdom 2" || target.fixture === undefined) return [];
  const levels = [
    [0, "gnomegarden", "Level1_Garden"],
    [1, "sidewalk", "Level2_SideWalk"],
    [2, "fido", "Level3_DogHair"],
    [4, "playroom", "Level5_Playroom"],
    [5, "closet", "Level6_Closet"],
    [6, "gutter", undefined],
    [7, "garbage", "Level8_Garbage"],
    [8, "balsa", "Level9_Balsa"],
    [9, "park", "Level10_Park"],
  ] as const;
  return levels.map(([level, levelName, terrainName]) => ({
    ...target,
    id: `Bugdom 2 ${levelName}`,
    query: `level=${level}`,
    fixture: {
      ...target.fixture,
      contextExpectations: { networked: false, levelName },
      levelNum: level,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      checkpointResetProbe: false,
      objectCommandProbe: false,
      replacementLifecycleProbe: false,
      levelStartProbe: false,
      levelCompleteProbe: false,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      terrainPath: terrainName === undefined ? undefined : `Data/Terrain/${terrainName}.ter`,
      terrainUrl: terrainName === undefined ? undefined : `../../../../assets/bugdom2/terrain/${terrainName}.ter`,
      splineEventProbe: true,
      damageProbe: false,
      splineEventProbeResult: level === 2 || level === 6 ? -1 : 1,
      splineReplacementFromFirstItem: true,
      splineReplacementProbeFunction: "Bugdom2Script_ProbeFirstSplineReplacementJS",
      splineReplacementProbeResult: level === 2 || level === 6 ? -1 : 1,
      runtimeWarmupMs: 5_000,
      verifyMalformedAsset: false,
    },
  }));
});

const croMagTrackRuntimeTargets: readonly RuntimeTarget[] = runtimeTargets.flatMap((target) => {
  if (target.id !== "Cro-Mag Rally" || target.fixture === undefined) return [];
  const tracks = [
    [0, "desert", "StoneAge_Desert"],
    [1, "jungle", "StoneAge_Jungle"],
    [2, "ice", "StoneAge_Ice"],
    [3, "crete", "BronzeAge_Crete"],
    [4, "china", "BronzeAge_China"],
    [5, "egypt", "BronzeAge_Egypt"],
    [6, "europe", "IronAge_Europe"],
    [7, "scandinavia", "IronAge_Scandinavia"],
    [8, "atlantis", "IronAge_Atlantis"],
    [9, "stonehenge", "Battle_StoneHenge"],
    [10, "aztec", "Battle_Aztec"],
    [11, "coliseum", "Battle_Coliseum"],
    [12, "maze", "Battle_Maze"],
    [13, "celtic", "Battle_Celtic"],
    [14, "tarpits", "Battle_TarPits"],
    [15, "spiral", "Battle_Spiral"],
    [16, "ramps", "Battle_Ramps"],
  ] as const;
  return tracks.map(([track, trackName, terrainName]) => ({
    ...target,
    id: `Cro-Mag Rally ${trackName}`,
    query: `track=${track + 1}&car=1`,
    fixture: {
      ...target.fixture,
      contextExpectations: { mode: "practice", networked: false, trackName },
      levelNum: track,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      replacementLifecycleProbe: false,
      raceCompletionProbe: track < 9,
      raceCompletionCompleteProbe: track < 9,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      terrainPath: `Data/Terrain/${terrainName}.ter`,
      terrainUrl: `../../../../assets/croMag/terrain/${terrainName}.ter`,
      verifyMalformedAsset: false,
    },
  }));
});

const billyModeRuntimeTargets: readonly RuntimeTarget[] = (() => {
  const baseTarget = runtimeTargets.find((target) => target.id === "Billy Frontier");
  if (!baseTarget?.fixture) return [];
  const modeTargets = [
    { id: "Billy Frontier Shootout", level: 2, mode: "shootout", terrain: "town_shootout" },
    { id: "Billy Frontier Stampede", level: 4, mode: "stampede", terrain: "town_stampede" },
    { id: "Billy Frontier Target Practice", level: 6, mode: "targetPractice", terrain: undefined },
  ] as const;
  return modeTargets.map((modeTarget) => ({
    ...baseTarget,
    id: modeTarget.id,
    query: `level=${modeTarget.level}`,
    fixture: {
      ...baseTarget.fixture,
      contextExpectations: { mode: modeTarget.mode, networked: false },
      terrainPath: modeTarget.terrain ? `Data/Terrain/${modeTarget.terrain}.ter` : undefined,
      terrainUrl: modeTarget.terrain
        ? `../../../../assets/billyFrontier/terrain/${modeTarget.terrain}.ter`
        : undefined,
    },
  }));
})();

const ottoLevelRuntimeTargets: readonly RuntimeTarget[] = (() => {
  const baseTarget = runtimeTargets.find((target) => target.id === "Otto Matic");
  if (!baseTarget?.fixture) return [];
  const levels = [
    [1, "blob", "robot"],
    [2, "blob-boss", "robot"],
    [3, "apocalypse", "robot"],
    [4, "cloud", "robot"],
    [5, "jungle", "robot"],
    [6, "jungle-boss", "robot"],
    [7, "fire-ice", "robot"],
    [8, "saucer", "saucer"],
    [9, "brain-boss", "robot"],
  ] as const;
  return levels.map(([levelNum, levelName, playerMode]) => ({
    ...baseTarget,
    id: `Otto Matic ${levelName}`,
    query: `level=${levelNum}`,
    fixture: {
      ...baseTarget.fixture,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      persistenceProbe: false,
      lifecycleProbe: false,
      replacementLifecycleProbe: false,
      recreationProbe: false,
      checkpointResetProbe: false,
      saveLoadProbe: false,
      terrainPath: undefined,
      terrainUrl: undefined,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      splineReplacement: undefined,
      splineReplacementProbe: undefined,
      verifyMalformedAsset: false,
      contextExpectations: { networked: false, levelName, playerMode },
    },
  }));
})();

interface SkeletonRuntimeSource {
  readonly modelPath: string;
  readonly modelUrl: string;
  readonly skeletonUrl: string;
}

const skeletonRuntimeSources: Readonly<Record<string, SkeletonRuntimeSource>> = {
  "Billy Frontier": {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
    modelUrl: "../../../../games/billyfrontier/skeletons/Billy.bg3d",
    skeletonUrl: "../../../../games/billyfrontier/skeletons/Billy.skeleton.rsrc",
  },
  Bugdom: {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.3dmf",
    modelUrl: "../../../../games/bugdom1/skeletons/FireFly.3dmf",
    skeletonUrl: "../../../../games/bugdom1/skeletons/FireFly.skeleton.rsrc",
  },
  "Bugdom 2": {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
    modelUrl: "../../../../games/bugdom2/skeletons/Mouse.bg3d",
    skeletonUrl: "../../../../games/bugdom2/skeletons/Mouse.skeleton.rsrc",
  },
  "Cro-Mag Rally": {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
    modelUrl: "../../../../games/cromagrally/skeletons/GragStanding.bg3d",
    skeletonUrl: "../../../../games/cromagrally/skeletons/GragStanding.skeleton.rsrc",
  },
  Nanosaur: {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.3dmf",
    modelUrl: "../../../../games/nanosaur1/skeletons/Rex.3dmf",
    skeletonUrl: "../../../../games/nanosaur1/skeletons/Rex.skeleton.rsrc",
  },
  "Nanosaur 2": {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
    modelUrl: "../../../../games/nanosaur2/skeletons/nano.bg3d",
    skeletonUrl: "../../../../games/nanosaur2/skeletons/nano.skeleton.rsrc",
  },
  "Otto Matic": {
    modelPath: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
    modelUrl: "../../../../games/ottomatic/skeletons/Blob.bg3d",
    skeletonUrl: "../../../../games/ottomatic/skeletons/Blob.skeleton.rsrc",
  },
};

const customSkeletonRuntimeTargets: readonly RuntimeTarget[] = runtimeTargets.flatMap(
  (target) => {
    const fixture = target.fixture;
    const source = skeletonRuntimeSources[target.id];
    if (!fixture || !source) return [];
    return [{
      ...target,
      id: `${target.id} custom skeleton`,
      fixture: {
        ...fixture,
        assetPath: source.modelPath,
        convertedAssetPath: undefined,
        assetUrl: source.modelUrl,
        skeletonAssetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton",
        skeletonAssetUrl: source.skeletonUrl,
        terrainReplacement: undefined,
        splineReplacement: undefined,
        replacementLifecycleProbe: false,
        nativeProbeIds: undefined,
        nativeItems: [],
        playerCommandProbe: false,
        playerVelocityProbe: false,
        pickupScoreCapabilityProbe: false,
        lifecycleProbe: false,
        recreationProbe: false,
        checkpointResetProbe: false,
        checkpointResetEventLogProbe: false,
        objectCommandProbe: false,
        levelStartProbe: false,
        levelCompleteProbe: false,
        raceCompletionProbe: false,
        raceCompletionCompleteProbe: false,
        areaCompletionProbe: false,
        objectiveCompletionProbe: false,
        verifyMalformedAsset: true,
        runtimeWarmupMs: target.id === "Nanosaur 2" ? 5_000 : undefined,
      },
    }];
  },
);

function missingAssetPath(assetPath: string): string {
  const extensionIndex = assetPath.lastIndexOf(".");
  return extensionIndex < 0
    ? `${assetPath}.missing`
    : `${assetPath.slice(0, extensionIndex)}.missing${assetPath.slice(extensionIndex)}`;
}

function replacementFallbackFixture(fixture: RuntimeFixture): RuntimeFixture {
  return {
    ...fixture,
    nativeProbeIds: undefined,
    nativeItems: [],
    playerCommandProbe: false,
    playerVelocityProbe: false,
    pickupScoreCapabilityProbe: false,
    lifecycleProbe: false,
    recreationProbe: false,
    checkpointResetProbe: false,
    checkpointResetEventLogProbe: false,
    objectCommandProbe: false,
    replacementLifecycleProbe: false,
    levelStartProbe: false,
    levelCompleteProbe: false,
    raceCompletionProbe: false,
    areaCompletionProbe: false,
    objectiveCompletionProbe: false,
    scriptedObjectProbe: false,
    customObjectAssetPath: missingAssetPath(fixture.assetPath),
    terrainReplacementProbes: fixture.terrainReplacementProbes?.map(({ replacement }) => ({
      replacement,
      expectedResult: 4,
    })),
    verifyMalformedAsset: false,
  };
}

function runtimeCapabilityExpectations(target: RuntimeTarget): RuntimeCapabilityExpectations | undefined {
  if (target.id.includes("fallback")) return undefined;
  return {
    objectCollision: !target.id.startsWith("Mighty Mike"),
    playerCommands: true,
    playerInvulnerability: !target.id.startsWith("Cro-Mag Rally"),
    pickupScoreEffects: target.id.startsWith("Billy Frontier"),
    persistence: true,
  };
}

const nativeTerrainFallbackTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (
    !fixture?.terrainReplacement ||
    !fixture.terrainReplacementProbe ||
    target.id.includes("Race") ||
    target.id.includes("Battle") ||
    target.id.includes("Capture") ||
    target.id.includes("native fallback") ||
    fixture.terrainReplacementStrict === true
  ) {
    continue;
  }
  nativeTerrainFallbackTargets.push({
    ...target,
    id: `${target.id} native terrain fallback`,
    fixture: {
      ...replacementFallbackFixture(fixture),
      splineReplacement: undefined,
      splineReplacementProbe: undefined,
      terrainReplacementExpectedResult: 4,
    },
  });
}

const nativeTerrainConstructionFailureTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (
    !fixture?.terrainReplacement ||
    !fixture.terrainReplacementProbe ||
    target.id.includes("Race") ||
    target.id.includes("Battle") ||
    target.id.includes("Capture") ||
    target.id.includes("fallback") ||
    target.id.includes("strict construction")
  ) {
    continue;
  }
  nativeTerrainConstructionFailureTargets.push({
    ...target,
    id: `${target.id} native terrain construction failure`,
    fixture: {
      ...fixture,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      pickupScoreCapabilityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      checkpointResetProbe: false,
      checkpointResetEventLogProbe: false,
      saveLoadProbe: false,
      objectCommandProbe: false,
      replacementLifecycleProbe: false,
      levelStartProbe: false,
      levelCompleteProbe: false,
      raceCompletionProbe: false,
      areaCompletionProbe: false,
      objectiveCompletionProbe: false,
      persistenceProbe: false,
      scriptedObjectProbe: false,
      verifyMalformedAsset: false,
      terrainReplacementStrict: true,
      expectReplacementLog: true,
      customObjectModelObject: 999,
      terrainReplacementExpectedResult: 4,
      terrainReplacementProbes: undefined,
      splineReplacement: undefined,
      splineReplacementProbe: undefined,
    },
  });
}

const nativeSplineFallbackTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (!fixture?.splineReplacement || !fixture.splineReplacementProbe) continue;
  nativeSplineFallbackTargets.push({
    ...target,
    id: `${target.id} native spline fallback`,
    fixture: {
      ...replacementFallbackFixture(fixture),
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      splineReplacementExpectedResult: 4,
    },
  });
}

const nativeSplineConstructionFailureTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (!fixture?.splineReplacement || !fixture.splineReplacementProbe) continue;
  nativeSplineConstructionFailureTargets.push({
    ...target,
    id: `${target.id} native spline construction failure`,
    fixture: {
      ...fixture,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      checkpointResetProbe: false,
      checkpointResetEventLogProbe: false,
      saveLoadProbe: false,
      replacementLifecycleProbe: false,
      scriptedObjectProbe: false,
      verifyMalformedAsset: false,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      splineReplacementStrict: true,
      splineReplacementExpectedResult: 4,
      customObjectModelObject: 999,
    },
  });
}

const nativeMapFallbackTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (target.id !== "Mighty Mike" || !fixture?.mapReplacementProbe) continue;
  nativeMapFallbackTargets.push({
    ...target,
    id: `${target.id} native map fallback`,
    fixture: {
      ...replacementFallbackFixture(fixture),
      mapReplacementStrict: false,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      mapReplacementExpectedResult: 4,
    },
  });
}

const nativeMapConstructionFailureTargets: RuntimeTarget[] = [];
for (const target of runtimeTargets) {
  const fixture = target.fixture;
  if (target.id !== "Mighty Mike" || !fixture?.mapReplacementProbe) continue;
  nativeMapConstructionFailureTargets.push({
    ...target,
    id: `${target.id} native map construction failure`,
    fixture: {
      ...fixture,
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      scriptedObjectProbe: false,
      verifyMalformedAsset: false,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      splineReplacement: undefined,
      splineReplacementProbe: undefined,
      mapReplacementStrict: true,
      mapReplacementExpectedResult: 4,
      customObjectModelObject: 999,
    },
  });
}

test.describe.configure({ mode: "serial" });

for (const target of [
  ...runtimeTargets,
  ...nanosaur2RemainingModeRuntimeTargets,
  ...bugdomLevelRuntimeTargets,
  ...bugdom2LevelRuntimeTargets,
  ...croMagTrackRuntimeTargets,
  ...billyModeRuntimeTargets,
  ...ottoLevelRuntimeTargets,
  ...customSkeletonRuntimeTargets,
  ...nativeTerrainFallbackTargets,
  ...nativeTerrainConstructionFailureTargets,
  ...nativeSplineFallbackTargets,
  ...nativeSplineConstructionFailureTargets,
  ...nativeMapFallbackTargets,
  ...nativeMapConstructionFailureTargets,
]) {
  const description = target.requiresStartup
    ? "keeps scripting enabled through a real WASM launch"
    : "launches its generated WASM shell";
  test(`${target.id} ${description}`, async ({ page }) => {
  test.setTimeout(90_000);
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => consoleMessages.push(message.text()));
  page.on("pageerror", (error) => pageErrors.push(error.message));

  if (target.fixture?.hostModulePreRunProbe) {
    await page.addInitScript(
      "window.Module = { preRun: [function () { window.__ottoHostPreRun = true; }] };",
    );
  }

  await page.goto(`generated/pangea-ports/wasm/${target.path}?${target.query ?? "level=0"}`);
  await page.waitForFunction(() => window.Module?.ccall !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(() => window.Module?.calledRun === true, null, {
    timeout: 30_000,
  });
  if (target.fixture?.hostModulePreRunProbe) {
    await expect.poll(
      () => page.evaluate(() => window.__ottoHostPreRun === true),
      { timeout: 30_000 },
    ).toBe(true);
  }
  if (target.fixture !== undefined) {
    await page.waitForFunction(
      () => window.Module?.FS?.writeFile !== undefined,
      null,
      { timeout: 30_000 },
    );
    if (target.fixture.manualStart) {
      await page.locator(target.fixture.startSelector ?? "#play-btn").waitFor({ state: "visible", timeout: 30_000 });
    }
    const scriptWritten = await page.evaluate((script) => {
      const runtime = window.Module;
      if (!runtime?.FS?.writeFile) {
        return false;
      }
      runtime.FS.writeFile(
        "Data/Scripts/dist/main.lua",
        new TextEncoder().encode(script),
      );
      return true;
    }, buildRuntimeScript(target.fixture.nativeProbeIds, target.fixture.playerCommandProbe === true, target.fixture.playerVelocityProbe === true, target.fixture.pickupScoreCapabilityProbe === true, target.fixture.damageProbe === true, target.fixture.splineEventProbe === true, runtimeCapabilityExpectations(target), target.fixture.contextExpectations, target.fixture.lifecycleProbe === true, target.fixture.lifecycleProbe === true, target.fixture.recreationProbe === true, target.fixture.checkpointResetProbe === true, target.fixture.objectCommandProbe === true, target.fixture.replacementLifecycleProbe === true, target.fixture.levelStartProbe === true, target.fixture.levelCompleteProbe === true, target.fixture.raceCompletionProbe === true, target.fixture.raceCompletionCompleteProbe === true, target.fixture.areaCompletionProbe === true, target.fixture.objectiveCompletionProbe === true, target.fixture.persistenceProbe === true));
    expect(scriptWritten).toBe(true);
    const assetFixtureWritten = await page.evaluate(async (fixture) => {
      const runtime = window.Module;
      if (!runtime?.FS?.writeFile) return "runtime-fs-unavailable";
      const runtimeAssetPath = fixture.convertedAssetPath ?? fixture.assetPath;
      let convertedBytes: Uint8Array | null = null;
      if (fixture.convertedAssetPath !== undefined) {
        const fixtureModulePath = "/PangeaRSEdit/tests/e2e/convertedGltfFixture.ts";
        const fixtureModule = await import(fixtureModulePath);
        const conversion = await fixtureModule.createConvertedTriangleAsset();
        if (conversion.isErr()) return `conversion:${conversion.error}`;
        convertedBytes = conversion.value;
      }
      const ensureDirectory = (path: string): void => {
        if (runtime.FS?.analyzePath?.(path).exists) return;
        runtime.FS?.mkdir?.(path);
      };
      ensureDirectory("/Data");
      ensureDirectory("/Data/Scripts");
      ensureDirectory("/Data/Scripts/assets");
      ensureDirectory("/Data/Scripts/assets/models");
      ensureDirectory("/Data/Scripts/assets/skeletons");
      ensureDirectory("/Data/Scripts/config");
      if (fixture.terrainPath !== undefined) {
        ensureDirectory("/Data/Terrain");
      }
      if (fixture.mapPath !== undefined || fixture.tilesetPath !== undefined) {
        ensureDirectory("/Data/Maps");
      }
      if (runtimeAssetPath.startsWith("Data/Shapes/")) {
        ensureDirectory("/Data/Shapes");
      }
      const config = JSON.stringify({
        version: 1,
        levels: {
          [fixture.levelNum ?? 0]: {
            script: "Data/Scripts/dist/main.lua",
        extraNativeItems: fixture.nativeItems ?? [],
            itemOverrides: [],
            terrainReplacements: [
              ...(fixture.terrainReplacement === undefined ? [] : [fixture.terrainReplacement]),
              ...(fixture.terrainReplacementProbes?.map(({ replacement }) => replacement) ?? []),
            ].map((replacement) => ({
              ...replacement,
              customObjectId: fixture.terrainReplacementCustomObjectId ?? "browser-custom-object",
              strict: fixture.terrainReplacementStrict ?? false,
            })),
            mapReplacements: [],
            splineReplacements: fixture.splineReplacement === undefined
              ? []
              : [{
                ...fixture.splineReplacement,
                customObjectId: "browser-custom-object",
                strict: fixture.splineReplacementStrict ?? false,
              }],
            customObjects: [{
              id: "browser-custom-object",
              visual: fixture.skeletonAssetPath === undefined
                ? {
                  kind: "customDisplayGroup",
                  modelPath: fixture.customObjectAssetPath ?? runtimeAssetPath,
                  modelObject: fixture.customObjectModelObject ?? 0,
                }
                : {
                  kind: "customSkeleton",
                  modelPath: fixture.customObjectAssetPath ?? runtimeAssetPath,
                  skeletonPath: fixture.skeletonAssetPath,
                  animations: { idle: 0 },
                  initialAnimation: "idle",
                  animationSpeed: 1,
                  scale: 1,
                  slot: 450,
                },
              collision: {
                preset: "solidBox",
                bounds: { width: 1, height: 1, depth: 1 },
              },
            }],
          },
        },
      });
      const response = fixture.convertedAssetPath === undefined
        ? await fetch(new URL(fixture.assetUrl, window.location.href))
        : null;
      if (fixture.convertedAssetPath === undefined && (!response || !response.ok)) return "source-asset-fetch-failed";
      if (fixture.terrainPath !== undefined && fixture.terrainUrl !== undefined) {
        const terrainResponse = await fetch(new URL(fixture.terrainUrl, window.location.href));
        if (!terrainResponse.ok) return "terrain-fetch-failed";
        runtime.FS.writeFile(
          fixture.terrainPath,
          new Uint8Array(await terrainResponse.arrayBuffer()),
        );
      }
      const mapFiles = [
        { path: fixture.mapPath, url: fixture.mapUrl },
        { path: fixture.tilesetPath, url: fixture.tilesetUrl },
      ];
      for (const mapFile of mapFiles) {
        if (mapFile.path === undefined || mapFile.url === undefined) continue;
        const mapResponse = await fetch(new URL(mapFile.url, window.location.href));
        if (!mapResponse.ok) return `map-asset-fetch-failed:${mapFile.path}`;
        runtime.FS.writeFile(
          mapFile.path,
          new Uint8Array(await mapResponse.arrayBuffer()),
        );
      }
      runtime.FS.writeFile(
        "Data/Scripts/config/levels.json",
        new TextEncoder().encode(config),
      );
      const assetBytes = convertedBytes ?? (response ? new Uint8Array(await response.arrayBuffer()) : null);
      if (!assetBytes) return "converted-asset-bytes-missing";
      runtime.FS.writeFile(runtimeAssetPath, assetBytes);
      if (fixture.skeletonAssetPath !== undefined && fixture.skeletonAssetUrl !== undefined) {
        const skeletonResponse = await fetch(new URL(fixture.skeletonAssetUrl, window.location.href));
        if (!skeletonResponse.ok) return "skeleton-asset-fetch-failed";
        const skeletonBytes = new Uint8Array(await skeletonResponse.arrayBuffer());
        runtime.FS.writeFile(
          fixture.skeletonAssetPath,
          skeletonBytes,
        );
        runtime.FS.writeFile(
          `${fixture.skeletonAssetPath}.rsrc`,
          skeletonBytes,
        );
      }
      if (fixture.applyTerrainOverride && runtime.ccall) {
        const configStatus = runtime.ccall(
          "PangeaScript_SetConfigPath",
          "number",
          ["string"],
          ["/Data/Scripts/config/levels.json"],
        );
        const loadStatus = runtime.ccall(
          "PangeaScript_LoadLevelConfig",
          "number",
          ["number"],
          [fixture.levelNum ?? 0],
        );
        if (configStatus !== 0 || loadStatus !== 0) return "terrain-config-load-failed";
        runtime.ccall(
          "SetCustomTerrainFile",
          "void",
          ["string"],
          [`/${fixture.terrainPath}`],
        );
      }
      return true;
    }, target.fixture);
    expect(assetFixtureWritten).toBe(true);
    if (target.fixture.runtimeWarmupMs !== undefined) {
      await page.waitForTimeout(target.fixture.runtimeWarmupMs);
    }
  }

  if (target.fixture?.mapReplacementProbe === true) {
    await page.waitForFunction(
      () => (window.Module?.ccall?.("MikeScript_SelectMapItemForReplacementJS", "number", [], []) ?? -1) >= 0,
      null,
      { timeout: 30_000 },
    );
    const mapReplacementResult = await page.evaluate((fixture) => {
      const runtime = window.Module;
      if (!runtime?.ccall || !runtime.FS?.writeFile) return "runtime-unavailable";
      const itemIndex = runtime.ccall(
        "MikeScript_SelectMapItemForReplacementJS",
        "number",
        [],
        [],
      );
      if (itemIndex < 0) return "map-item-unavailable";
      const x = runtime.ccall("MikeScript_GetSelectedMapItemFieldJS", "number", ["number"], [0]);
      const y = runtime.ccall("MikeScript_GetSelectedMapItemFieldJS", "number", ["number"], [1]);
      const nativeType = runtime.ccall("MikeScript_GetSelectedMapItemFieldJS", "number", ["number"], [2]);
      const config = JSON.stringify({
        version: 1,
        levels: {
          [fixture.levelNum ?? 0]: {
            script: "Data/Scripts/dist/main.lua",
            extraNativeItems: [],
            itemOverrides: [],
            terrainReplacements: [],
            mapReplacements: [{
              itemIndex,
              nativeType,
              x,
              y,
              customObjectId: "browser-custom-object",
              strict: fixture.mapReplacementStrict ?? true,
            }],
            splineReplacements: [],
            customObjects: [{
              id: "browser-custom-object",
              visual: {
                kind: "customDisplayGroup",
                modelPath: fixture.customObjectAssetPath ?? fixture.assetPath,
                  modelObject: fixture.customObjectModelObject ?? 0,
              },
              collision: {
                preset: "solidBox",
                bounds: { width: 1, height: 1, depth: 1 },
              },
            }],
          },
        },
      });
      runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(config));
      const configStatus = runtime.ccall("PangeaScript_SetConfigPath", "number", ["string"], ["/Data/Scripts/config/levels.json"]);
      const loadStatus = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [fixture.levelNum ?? 0]);
      if (configStatus !== 0 || loadStatus !== 0) return `config:${configStatus}:${loadStatus}`;
      return runtime.ccall("MikeScript_ProbeSelectedMapReplacementJS", "number", [], []);
    }, target.fixture);
    expect(mapReplacementResult).toBe(target.fixture.mapReplacementExpectedResult ?? 0);
    if (target.fixture.expectMapReplacementLog === true) {
      expect(consoleMessages.some((message) => message.includes("map replacement failed"))).toBe(true);
    }
  }

  if (target.fixture?.manualStart) {
    const startControl = page.locator(target.fixture.startSelector ?? "#play-btn");
    await startControl.waitFor({ state: "visible", timeout: 30_000 });
    await startControl.click();
  }
  if (target.requiresStartup && !target.fixture?.manualStart) {
    await page.waitForFunction(
      () => window.Module?.ccall?.("PangeaScript_IsEnabled", "boolean", [], []) === true,
      null,
      { timeout: 30_000 },
    );
  }
  if (target.requiresStartup) {
    const startupResult = await page.evaluate(() => {
      const runtime = window.Module;
      if (!runtime?.ccall) return null;
      return {
        status: runtime.ccall(
          "PangeaScript_SetStartupScript",
          "number",
          ["string"],
          ["Data/Scripts/dist/main.lua"],
        ),
        error: runtime.ccall(
          "PangeaScript_GetStatusLastError",
          "string",
          [],
          [],
        ),
      };
    });
    expect(startupResult?.status, startupResult?.error).toBe(0);
  }
  if (target.fixture !== undefined && !target.requiresStartup) {
    await page.waitForFunction(
      () => window.Module?.ccall?.("PangeaScript_IsEnabled", "boolean", [], []) === true,
      null,
      { timeout: 30_000 },
    );
  }
  if (target.fixture !== undefined) {
    if (target.fixture.verifyMalformedAsset) {
      const malformedResult = await page.evaluate(async ({ fixture }) => {
        const runtime = window.Module;
        if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
        const runtimeAssetPath = fixture.convertedAssetPath ?? fixture.assetPath;
        const configPath = "Data/Scripts/config/levels.json";
        const originalConfig = runtime.FS.readFile === undefined
          ? ""
          : new TextDecoder().decode(runtime.FS.readFile(configPath));
        if (originalConfig === "") return "config-read-failed";
        const extensionIndex = runtimeAssetPath.lastIndexOf(".");
        const malformedAssetPath = extensionIndex < 0
          ? `${runtimeAssetPath}.invalid`
          : `${runtimeAssetPath.slice(0, extensionIndex)}.invalid${runtimeAssetPath.slice(extensionIndex)}`;
        const missingAssetPath = extensionIndex < 0
          ? `${runtimeAssetPath}.missing`
          : `${runtimeAssetPath.slice(0, extensionIndex)}.missing${runtimeAssetPath.slice(extensionIndex)}`;
        const malformedConfig = originalConfig.replaceAll(runtimeAssetPath, malformedAssetPath);
        const missingConfig = originalConfig.replaceAll(runtimeAssetPath, missingAssetPath);
        runtime.FS.writeFile(configPath, new TextEncoder().encode(malformedConfig));
        runtime.FS.writeFile(malformedAssetPath, new Uint8Array([0, 1, 2, 3]));
        const invalidLoadStatus = runtime.ccall(
          "PangeaScript_SetConfigPath",
          "number",
          ["string"],
          [`/${configPath}`],
        );
        const invalidConfigLoadStatus = runtime.ccall(
          "PangeaScript_LoadLevelConfig",
          "number",
          ["number"],
          [fixture.levelNum ?? 0],
        );
        const invalidProbeStatus = runtime.ccall(
          "PangeaScript_ProbeScriptedObjectJS",
          "number",
          ["string", "number", "number", "number"],
          ["browser-custom-object", 0, 0, 0],
        );
        runtime.FS.writeFile(configPath, new TextEncoder().encode(missingConfig));
        const missingConfigLoadStatus = runtime.ccall(
          "PangeaScript_LoadLevelConfig",
          "number",
          ["number"],
          [fixture.levelNum ?? 0],
        );
        const missingProbeStatus = runtime.ccall(
          "PangeaScript_ProbeScriptedObjectJS",
          "number",
          ["string", "number", "number", "number"],
          ["browser-custom-object", 0, 0, 0],
        );
        const response = fixture.convertedAssetPath === undefined
          ? await fetch(new URL(fixture.assetUrl, window.location.href))
          : null;
        if (fixture.convertedAssetPath === undefined && (!response || !response.ok)) return { invalidLoadStatus, invalidConfigLoadStatus, invalidProbeStatus, missingConfigLoadStatus, missingProbeStatus, validProbeStatus: -1 };
        runtime.FS.writeFile(configPath, new TextEncoder().encode(originalConfig));
        if (response) {
          runtime.FS.writeFile(
            runtimeAssetPath,
            new Uint8Array(await response.arrayBuffer()),
          );
        }
        const validLoadStatus = runtime.ccall(
          "PangeaScript_SetConfigPath",
          "number",
          ["string"],
          [`/${configPath}`],
        );
        const validConfigLoadStatus = runtime.ccall(
          "PangeaScript_LoadLevelConfig",
          "number",
          ["number"],
          [fixture.levelNum ?? 0],
        );
        const validProbeStatus = runtime.ccall(
          "PangeaScript_ProbeScriptedObjectJS",
          "number",
          ["string", "number", "number", "number"],
          ["browser-custom-object", 0, 0, 0],
        );
        return {
          invalidLoadStatus,
          invalidConfigLoadStatus,
          invalidProbeStatus,
          missingConfigLoadStatus,
          missingProbeStatus,
          validLoadStatus,
          validConfigLoadStatus,
          validProbeStatus,
        };
      }, { fixture: target.fixture });
      expect(malformedResult).toMatchObject({
        invalidLoadStatus: 0,
        invalidConfigLoadStatus: 0,
        invalidProbeStatus: 4,
        missingConfigLoadStatus: 0,
        missingProbeStatus: 4,
        validLoadStatus: 0,
        validConfigLoadStatus: 0,
        validProbeStatus: 0,
      });
    }
      const probeResult = await page.evaluate(async (fixture) => {
      const runtime = window.Module;
      if (!runtime?.ccall || !runtime.FS?.writeFile) {
        return null;
      }
      const configExists = runtime.FS?.analyzePath?.("/Data/Scripts/config/levels.json").exists ?? false;
      let configStatus = await runtime.ccall(
        "PangeaScript_SetConfigPath",
        "number",
        ["string"],
        ["/Data/Scripts/config/levels.json"],
      );
      let loadStatus = await runtime.ccall(
        "PangeaScript_LoadLevelConfig",
        "number",
        ["number"],
        [fixture.levelNum ?? 0],
      );
      if (fixture.splineReplacementFromFirstItem === true) {
        const selected = await runtime.ccall(
          "Bugdom2Script_SelectSplineItemForReplacementJS",
          "number",
          [],
          [],
        );
        if (selected === 0) {
          const splineReplacement = {
            splineNum: await runtime.ccall(
              "Bugdom2Script_GetSelectedSplineItemFieldJS",
              "number",
              ["number"],
              [0],
            ),
            itemIndex: await runtime.ccall(
              "Bugdom2Script_GetSelectedSplineItemFieldJS",
              "number",
              ["number"],
              [1],
            ),
            nativeType: await runtime.ccall(
              "Bugdom2Script_GetSelectedSplineItemFieldJS",
              "number",
              ["number"],
              [2],
            ),
            placement: await runtime.ccall(
              "Bugdom2Script_GetSelectedSplinePlacementJS",
              "number",
              [],
              [],
            ),
          };
          const config = JSON.stringify({
            version: 1,
            levels: {
              [fixture.levelNum ?? 0]: {
                script: "Data/Scripts/dist/main.lua",
                extraNativeItems: fixture.nativeItems ?? [],
                itemOverrides: [],
                terrainReplacements: [],
                mapReplacements: [],
                splineReplacements: [{
                  ...splineReplacement,
                  customObjectId: "browser-custom-object",
                  strict: fixture.splineReplacementStrict ?? false,
                }],
                customObjects: [{
                  id: "browser-custom-object",
                  visual: {
                    kind: "customDisplayGroup",
                    modelPath: fixture.customObjectAssetPath ?? fixture.convertedAssetPath ?? fixture.assetPath,
                    modelObject: fixture.customObjectModelObject ?? 0,
                  },
                  collision: {
                    preset: "solidBox",
                    bounds: { width: 1, height: 1, depth: 1 },
                  },
                }],
              },
            },
          });
          runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(config));
          configStatus = await runtime.ccall(
            "PangeaScript_SetConfigPath",
            "number",
            ["string"],
            ["/Data/Scripts/config/levels.json"],
          );
          loadStatus = await runtime.ccall(
            "PangeaScript_LoadLevelConfig",
            "number",
            ["number"],
            [fixture.levelNum ?? 0],
          );
        }
      }
      const probeStatus = fixture.scriptedObjectProbe === false
        ? null
        : await runtime.ccall(
          "PangeaScript_ProbeScriptedObjectJS",
          "number",
          ["string", "number", "number", "number"],
          ["browser-custom-object", 0, 0, 0],
        );
      const replacementProbeStatus = fixture.terrainReplacement === undefined
        ? null
        : await runtime.ccall(
          fixture.terrainReplacementProbe ?? "PangeaScript_ProbeTerrainReplacementJS",
          "number",
          ["number", "number", "number", "number"],
          [
            fixture.terrainReplacement.itemIndex,
            fixture.terrainReplacement.nativeType,
            fixture.terrainReplacement.x,
            fixture.terrainReplacement.z,
          ],
        );
      const call = runtime.ccall;
      const replacementProbeStatuses = await Promise.all(
        (fixture.terrainReplacementProbes ?? []).map(async ({ replacement }) => call(
          fixture.terrainReplacementProbe ?? "PangeaScript_ProbeTerrainReplacementJS",
          "number",
          ["number", "number", "number", "number"],
          [replacement.itemIndex, replacement.nativeType, replacement.x, replacement.z],
        )),
      );
      const splineReplacementProbeStatus = fixture.splineReplacementFromFirstItem === true
        ? await runtime.ccall(
          fixture.splineReplacementProbeFunction ?? "Bugdom2Script_ProbeFirstSplineReplacementJS",
          "number",
          [],
          [],
        )
        : fixture.splineReplacement === undefined
          ? null
          : await runtime.ccall(
            fixture.splineReplacementProbe ?? "Nanosaur2Script_ProbeSplineReplacementJS",
            "number",
            ["number", "number", "number", "number"],
            [
              fixture.splineReplacement.splineNum,
              fixture.splineReplacement.itemIndex,
              fixture.splineReplacement.nativeType,
              fixture.splineReplacement.placement,
            ],
          );
      const damageProbeStatus = fixture.damageProbe === true
        ? await runtime.ccall(
          fixture.damageProbeFunction ?? "Bugdom2Script_ProbeDamageJS",
          "number",
          ["number"],
          [2],
        )
        : null;
      const splineEventProbeStatus = fixture.splineEventProbe === true
        ? await runtime.ccall(
          fixture.splineEventProbeFunction ?? "Bugdom2Script_ProbeFirstSplineJS",
          "number",
          [],
          [],
        )
        : null;
      return {
        configStatus,
        loadStatus,
        probeStatus,
        replacementProbeStatus,
        replacementProbeStatuses,
        splineReplacementProbeStatus,
        damageProbeStatus,
        splineEventProbeStatus,
        configExists,
        error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
      };
      }, target.fixture);
    expect(probeResult).not.toBeNull();
    expect(probeResult?.configStatus).toBe(0);
    expect(probeResult, JSON.stringify({ probeResult, consoleMessages, pageErrors })).toMatchObject({
      configExists: true,
      loadStatus: 0,
      probeStatus: target.fixture.scriptedObjectProbe === false ? null : 0,
    });
    if (target.fixture.terrainReplacement !== undefined) {
      expect(probeResult?.replacementProbeStatus).toBe(target.fixture.terrainReplacementExpectedResult ?? 0);
    }
    if (target.fixture.expectReplacementLog === true) {
      expect(consoleMessages.some((message) => message.includes("terrain replacement failed"))).toBe(true);
    }
    if (target.fixture.terrainReplacementProbes !== undefined) {
      expect(probeResult?.replacementProbeStatuses).toEqual(
        target.fixture.terrainReplacementProbes.map(({ expectedResult }) => expectedResult ?? 0),
      );
    }
    if (target.fixture.splineReplacement !== undefined) {
      expect(probeResult?.splineReplacementProbeStatus).toBe(target.fixture.splineReplacementExpectedResult ?? 0);
    }
    if (target.fixture.splineReplacementFromFirstItem === true) {
      expect(probeResult?.splineReplacementProbeStatus).toBe(target.fixture.splineReplacementProbeResult ?? 1);
    }
    if (target.fixture.damageProbe === true) {
      expect(probeResult?.damageProbeStatus).toBe(500);
    }
    if (target.fixture.splineEventProbe === true) {
      expect(probeResult?.splineEventProbeStatus).toBe(target.fixture.splineEventProbeResult ?? 1);
    }
    if (target.fixture.expectSplineReplacementLog === true) {
      expect(consoleMessages.some((message) => message.includes("spline replacement failed"))).toBe(true);
    }
    if (target.fixture.checkpointResetProbe === true) {
      await page.waitForTimeout(500);
      const checkpointResult = await page.evaluate(
        (probeFunction) => {
          const runtime = window.Module;
          if (!runtime?.ccall) return 0;
          return runtime.ccall(probeFunction ?? "Bugdom2Script_ProbeCheckpointResetJS", "number", [], []);
        },
        target.fixture.checkpointResetProbeFunction,
      );
      expect(checkpointResult).toBe(target.fixture.checkpointResetProbeResult ?? 1);
    }
    if (target.fixture.saveLoadProbe === true) {
      const saveLoadResult = await page.evaluate((probeFunction) => {
        const runtime = window.Module;
        if (!runtime?.ccall) return -1;
        return runtime.ccall(probeFunction ?? "OttoScript_ProbeSaveLoadJS", "number", ["number"], [0]);
      }, target.fixture.saveLoadProbeFunction);
      expect(saveLoadResult).toBe(target.fixture.saveLoadProbeResult ?? 0);
    }
    if (target.fixture.levelCompleteProbe === true) {
      const completed = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return false;
        runtime.ccall("WinLevel", "void", [], []);
        return true;
      });
      expect(completed).toBe(true);
    }
    if (target.fixture.raceCompletionProbe === true) {
      const completionResult = await page.evaluate(
        (probeFunction) => {
          const runtime = window.Module;
          if (!runtime?.ccall) return false;
        return runtime.ccall(
          probeFunction ?? "CroMagScript_ProbeRaceCompletionJS",
          "number",
          [],
          [],
        );
        },
        target.fixture.raceCompletionProbeFunction,
      );
      expect(completionResult).toBe(
        target.fixture.raceCompletionProbeResult ?? 0,
      );
    }
    if (target.fixture.areaCompletionProbe === true) {
      const completed = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return false;
        runtime.ccall("BillyScript_ProbeAreaCompletionJS", "number", [], []);
        return true;
      });
      expect(completed).toBe(true);
    }
    if (target.fixture.objectiveCompletionProbe === true) {
      const objectiveResult = await page.evaluate((probeFunction) => {
        const runtime = window.Module;
        if (!runtime?.ccall) return { result: 0, error: "runtime unavailable" };
        const result = runtime.ccall(
          probeFunction ?? "Nanosaur2Script_ProbeObjectiveCompletionJS",
          "number",
          [],
          [],
        );
        return {
          result,
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture.objectiveCompletionProbeFunction);
      expect(objectiveResult?.result, JSON.stringify(objectiveResult)).toBe(target.fixture.objectiveCompletionProbeResult ?? 1);
      await expect.poll(
        () => consoleMessages.some((message) => message.includes("browser objective complete")),
      ).toBe(true);
    }
  }
  if (target.fixture?.lifecycleProbe === true) {
    await expect.poll(
      () => consoleMessages.some((message) => message.includes("browser lifecycle spawn")),
    ).toBe(true);
    await expect.poll(
      () => consoleMessages.some((message) => message.includes("browser lifecycle destroy")),
    ).toBe(true);
    if (target.fixture.replacementLifecycleProbe === true) {
      await expect.poll(
        () => consoleMessages.some((message) => message.includes("browser lifecycle streamIn")),
      ).toBe(true);
      await expect.poll(
        () => consoleMessages.some((message) => message.includes("browser lifecycle streamOut")),
      ).toBe(true);
    }
    await expect.poll(
      () => consoleMessages.some((message) => message.includes("browser child destroy")),
    ).toBe(true);
  }
  await page.waitForTimeout(
    target.fixture?.levelCompleteProbe === true ||
      target.fixture?.raceCompletionProbe === true ||
      target.fixture?.areaCompletionProbe === true
      ? target.fixture?.raceCompletionProbe === true
        ? 7_000
        : 500
      : 8_000,
  );

  const completionProbeRequested =
    target.fixture?.levelCompleteProbe === true ||
    target.fixture?.raceCompletionProbe === true ||
    target.fixture?.areaCompletionProbe === true ||
    target.fixture?.objectiveCompletionProbe === true;

  const rawStatus = await page.evaluate(() => {
    const runtime = window.Module;
    if (!runtime?.ccall) {
      return null;
    }
    return {
      enabled: runtime.ccall(
        "PangeaScript_GetStatusEnabled",
        "boolean",
        [],
        [],
      ),
      bundleLoaded: runtime.ccall(
        "PangeaScript_GetStatusBundleLoaded",
        "boolean",
        [],
        [],
      ),
      scriptsDisabled: runtime.ccall(
        "PangeaScript_GetStatusScriptsDisabled",
        "boolean",
        [],
        [],
      ),
      errorCount: runtime.ccall(
        "PangeaScript_GetStatusErrorCount",
        "number",
        [],
        [],
      ),
      hooksCalled: runtime.ccall(
        "PangeaScript_GetStatusHooksCalledCount",
        "number",
        [],
        [],
      ),
      lastError: runtime.ccall(
        "PangeaScript_GetStatusLastError",
        "string",
        [],
        [],
      ),
    };
  });
  const statusResult = runtimeStatusSchema.safeParse(rawStatus);
  expect(statusResult.success).toBe(true);
  if (!statusResult.success) {
    return;
  }
  const status = statusResult.data;

  expect(status.scriptsDisabled).toBe(false);
  expect(status.lastError, consoleMessages.filter((message) => message.includes("scripting")).join("\n")).toBe("");
  if (!completionProbeRequested) {
    expect(status.enabled).toBe(true);
    expect(status.bundleLoaded).toBe(true);
    expect(status.hooksCalled).toBeGreaterThan(0);
  }
  if (target.fixture?.areaCompletionProbe === true) {
    expect(
      consoleMessages.some((message) => message.includes("browser area complete")),
    ).toBe(true);
  }
  expect(
    consoleMessages.some((message) =>
      /stale object handle|Disabling scripting host/i.test(message),
    ),
  ).toBe(false);
  expect(pageErrors).toEqual([]);

  if (target.fixture.checkpointResetEventLogProbe === true) {
    expect(
      consoleMessages.some((message) => message.includes("browser checkpoint reset")),
    ).toBe(true);
  }

  const invalidStartupPathStatus = await page.evaluate(() => {
    const runtime = window.Module;
    if (!runtime?.ccall) {
      return null;
    }
    return runtime.ccall(
      "PangeaScript_SetStartupScript",
      "number",
      ["string"],
      ["/absolute/path.lua"],
    );
  });
  expect(invalidStartupPathStatus).toBe(8);
  });
}
