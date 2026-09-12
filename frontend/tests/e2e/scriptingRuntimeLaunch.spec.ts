import { expect, test } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";

const runtimeScript = `local pangea = require("pangea")
local entry = {}

function entry.onLevelStart(ctx)
  pangea.log.info("browser runtime regression")
end

return entry
`;

const nativeLifecycleTraceSchema = z.object({
  eventCount: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
  overflow: z.boolean(),
  entries: z.array(z.object({
    eventId: z.string(),
    applicationPhase: z.string(),
    order: z.number().int().nonnegative(),
    targetId: z.number().int(),
    targetGeneration: z.number().int().nonnegative(),
    status: z.number().int(),
  })),
});

function buildRuntimeScript(
  nativeProbeIds: readonly string[] | undefined,
  playerStateProbe: boolean,
  playerObjectiveStateProbe: boolean,
  playerEggStateProbe: boolean,
  playerCaptureStateProbe: boolean,
  vehicleStateProbe: boolean,
  modeStateProbe: boolean,
  playerFormTransitionProbe: boolean,
  playerCommandProbe: boolean,
  playerVelocityProbe: boolean,
  pickupScoreCapabilityProbe: boolean,
  pickupProbe: boolean,
  weaponHitProbe: boolean,
  damageProbe: boolean,
  splineEventProbe: boolean,
  mapItemProbe: boolean,
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
  raceProgressProbe: boolean,
  areaCompletionProbe: boolean,
  objectiveCompletionProbe: boolean,
  persistenceProbe: boolean,
  buddyLaunchProbe: boolean,
  deathProbe: boolean,
): string {
  void replacementLifecycleProbe;
  if ((nativeProbeIds === undefined || nativeProbeIds.length === 0) && !playerStateProbe && !playerObjectiveStateProbe && !playerEggStateProbe && !playerCaptureStateProbe && !vehicleStateProbe && !modeStateProbe && !playerFormTransitionProbe && !playerCommandProbe && !playerVelocityProbe && !pickupScoreCapabilityProbe && !pickupProbe && !weaponHitProbe && !damageProbe && !splineEventProbe && !mapItemProbe && !lifecycleProbe && !childCleanupProbe && !recreationProbe && !checkpointResetProbe && !objectCommandProbe && !levelStartProbe && !levelCompleteProbe && !raceCompletionProbe && !areaCompletionProbe && !objectiveCompletionProbe && !persistenceProbe && !buddyLaunchProbe && !deathProbe) {
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
  const playerStateProbeScript = playerStateProbe ? `
    local playerState = pangea.player.get(0)
    assert(playerState and playerState.score == 0 and playerState.lives == 3, "native player score/lives snapshot drifted")
    if ctx.gameId == "MightyMike-Android" then
      assert(playerState.coinCount ~= nil and playerState.coinCount >= 0, "Mighty Mike coin state was not published")
      assert(playerState.sceneNum ~= nil and playerState.areaNum ~= nil and playerState.areaComplete ~= nil, "Mighty Mike level-flow state was not published")
      assert(playerState.sceneNum >= 0 and playerState.areaNum >= 0, "Mighty Mike level-flow state drifted")
      assert(playerState.camera ~= nil, "Mighty Mike camera state was not published")
      assert(playerState.camera.x >= 0 and playerState.camera.y >= 0, "Mighty Mike camera state drifted")
    elseif ctx.gameId == "Bugdom-android" then
      assert(playerState.camera ~= nil, "Bugdom camera state was not published")
    elseif ctx.gameId == "OttoMatic-Android" then
      assert(playerState.fuel ~= nil and playerState.fuel >= 0, "Otto Matic fuel state was not published")
      assert(playerState.aim ~= nil, "Otto Matic aim state was not published")
      assert(playerState.camera ~= nil, "Otto Matic camera state was not published")
      local aimLength = math.sqrt(playerState.aim.x * playerState.aim.x + playerState.aim.y * playerState.aim.y + playerState.aim.z * playerState.aim.z)
      assert(math.abs(aimLength - 1) < 0.01, "Otto Matic aim state was not normalized")
      assert(playerState.activeWeapon ~= nil and playerState.weapons ~= nil, "Otto Matic weapon inventory state was not published")
      for index, weapon in ipairs(playerState.weapons) do
        assert(weapon.type ~= nil and weapon.quantity ~= nil and weapon.type >= 0 and weapon.quantity >= 0, "Otto Matic weapon inventory state drifted at slot " .. index)
      end
    elseif ctx.gameId == "BillyFrontier-Android" then
      assert(playerState.aim ~= nil, "Billy Frontier aim state was not published")
      local aimLength = math.sqrt(playerState.aim.x * playerState.aim.x + playerState.aim.y * playerState.aim.y + playerState.aim.z * playerState.aim.z)
      assert(math.abs(aimLength - 1) < 0.01, "Billy Frontier aim state was not normalized")
      assert(playerState.camera ~= nil, "Billy Frontier camera state was not published")
      assert(playerState.activeWeapon == 0 and playerState.weapons ~= nil and #playerState.weapons == 1, "Billy Frontier bounded weapon state drifted")
    end` : "";
  const billyCurrencyProbeScript = playerStateProbe ? `
    if ctx.gameId == "BillyFrontier-Android" then
      local playerState = pangea.player.get(0)
      assert(playerState and playerState.pesoCount ~= nil and playerState.pesoCount >= 0, "Billy Frontier peso state was not published")
    end` : "";
  const playerObjectiveStateProbeScript = playerObjectiveStateProbe ? `
    local playerState = pangea.player.get(0)
    assert(playerState and playerState.miceRescued ~= nil and playerState.miceTotal ~= nil, "Bugdom 2 mouse snapshot fields were not published")
    assert(playerState.drowningMiceRescued ~= nil and playerState.drowningMiceRequired ~= nil, "Bugdom 2 drowning-mouse snapshot fields were not published")
    assert(playerState.childObjectCount ~= nil and playerState.childObjectCount >= 0, "Bugdom 2 child-object state was not published")
    assert(playerState.miceRescued >= 0 and playerState.miceTotal >= playerState.miceRescued, "Bugdom 2 mouse snapshot totals drifted")
    assert(playerState.drowningMiceRescued >= 0 and playerState.drowningMiceRequired >= playerState.drowningMiceRescued, "Bugdom 2 drowning-mouse snapshot totals drifted")
    assert(playerState.aim ~= nil, "Bugdom 2 aim state was not published")
    local aimLength = math.sqrt(playerState.aim.x * playerState.aim.x + playerState.aim.y * playerState.aim.y + playerState.aim.z * playerState.aim.z)
    assert(math.abs(aimLength - 1) < 0.01, "Bugdom 2 aim state was not normalized")
    assert(playerState.camera ~= nil, "Bugdom 2 camera state was not published")` : "";
  const playerEggStateProbeScript = playerEggStateProbe ? `
    local playerState = pangea.player.get(0)
    assert(playerState and playerState.eggs ~= nil and #playerState.eggs == 5, "Nanosaur egg snapshot fields were not published")
    for index, progress in ipairs(playerState.eggs) do
      assert(progress.recovered >= 0 and progress.required >= progress.recovered, "Nanosaur egg recovery count drifted at species " .. index)
    end
    if ctx.gameId == "Nanosaur-android" or ctx.gameId == "Nanosaur2-Android" then
      assert(playerState.fuel ~= nil and playerState.fuel >= 0, "Nanosaur fuel state was not published")
      assert(playerState.activeWeapon ~= nil and playerState.weapons ~= nil, "Nanosaur weapon inventory state was not published")
      assert(playerState.aim ~= nil, "Nanosaur aim state was not published")
      local aimLength = math.sqrt(playerState.aim.x * playerState.aim.x + playerState.aim.y * playerState.aim.y + playerState.aim.z * playerState.aim.z)
      assert(math.abs(aimLength - 1) < 0.01, "Nanosaur aim state was not normalized")
      assert(playerState.camera ~= nil, "Nanosaur camera state was not published")
      for index, weapon in ipairs(playerState.weapons) do
        assert(weapon.type ~= nil and weapon.quantity ~= nil and weapon.type >= 0 and weapon.quantity >= 0, "Nanosaur weapon inventory state drifted at slot " .. index)
      end
    end
    if ctx.mode == "race" then
      assert(playerState.checkpointNum ~= nil and playerState.placement ~= nil and playerState.raceComplete ~= nil, "Nanosaur 2 race snapshot fields were not published")
      assert(playerState.checkpointNum >= 0 and playerState.placement >= 0, "Nanosaur 2 race snapshot values drifted")
    elseif ctx.mode == "capture" then
      assert(playerState.team ~= nil and playerState.captureScore ~= nil and playerState.carryingFlag ~= nil, "Nanosaur 2 capture snapshot fields were not published")
      assert(playerState.team >= 0 and playerState.captureScore >= 0, "Nanosaur 2 capture snapshot values drifted")
    end
    if ctx.gameId == "Nanosaur2-Android" and playerState.lives ~= nil then
      assert(pangea.player.setLives(0, 0), "Nanosaur 2 low-lives setup failed")
      lowLivesResetPending = true
    end` : "";
  const pickupScoreProbe = pickupScoreCapabilityProbe ? `
    assert(pangea.api.capabilities().pickupScoreEffects == true, "pickup score capability was not published by the adapter")` : "";
  const pickupProbeScript = pickupProbe ? `
function entry.onPickupCollected(ctx)
${lifecycleProbe ? `  recordLifecycleCallback("pickup")` : ""}
  assert(ctx.pickupId == "nanosaur.powerup" or ctx.pickupId == "nanosaur.crystal" or ctx.pickupId == "nanosaur.egg" or ctx.pickupId == "nanosaur2.fuelPow" or ctx.pickupId == "nanosaur2.shieldPow" or ctx.pickupId == "nanosaur2.freeLifePow" or ctx.pickupId == "cromag.pow" or ctx.pickupId == "cromag.token", "Pickup id drifted")
  if ctx.pickupId == "nanosaur.powerup" then
    assert(ctx.pickupType == 0 or ctx.pickupType == 3 or ctx.pickupType == 4, "Nanosaur power-up type drifted")
  end
  assert(ctx.amount > 0, "Nanosaur pickup amount was not published")
  if ctx.pickupId == "nanosaur2.freeLifePow" then
    return {handled = true, consumePickup = false, healthDelta = 0.25, scoreDelta = 0}
  end
  if ctx.pickupId == "nanosaur2.fuelPow" or ctx.pickupId == "nanosaur2.shieldPow" then
    return {handled = true, consumePickup = true, healthDelta = 0.25, scoreDelta = 0}
  end
  if ctx.pickupId == "nanosaur.crystal" then
    return {handled = true, consumePickup = false, healthDelta = 0, scoreDelta = 7}
  end
  if ctx.pickupId == "cromag.pow" or ctx.pickupId == "cromag.token" then
    return {handled = true, consumePickup = false, healthDelta = 0, scoreDelta = 0}
  end
  return {handled = true, healthDelta = 0, scoreDelta = 7}
end
` : "";
  const weaponHitProbeScript = weaponHitProbe ? `
function entry.onWeaponHit(ctx)
${lifecycleProbe ? `  recordLifecycleCallback("weaponHit")` : ""}
  assert(ctx.damage >= 0, "weapon damage was not published")
  if ctx.gameId == "Nanosaur-android" then
    assert(ctx.weaponId == "nanosaur.projectile", "Nanosaur weapon id drifted")
    return {handled = true, damage = ctx.damage, applyDamage = true, destroyTarget = true, scoreDelta = 7}
  end
  assert(ctx.weaponId == "ottomatic.projectile", "Otto Matic weapon id drifted")
  return {handled = true, damage = ctx.damage, applyDamage = false, scoreDelta = 7}
end
` : "";
  const damageProbeScript = damageProbe ? `
function entry.onDamage(ctx)
${lifecycleProbe ? `  recordLifecycleCallback("damage")` : ""}
  assert(ctx.damage == 2 and ctx.cause == 4, "Bugdom 2 damage probe context drifted")
  return {handled = true, damage = 0.5, applyDamage = true}
end

function entry.onDamageApplied(ctx)
${lifecycleProbe ? `  recordLifecycleCallback("damageApplied")` : ""}
  assert(ctx.damage == 0.5 and ctx.cause == 4, "Bugdom 2 applied-damage probe context drifted")
end
` : "";
  const splineEventProbeScript = splineEventProbe ? `
function entry.onSplineItem(ctx)
  assert(ctx.splineNum >= 0 and ctx.placement >= 0 and ctx.placement <= 1, "Bugdom 2 spline probe context drifted")
  return {handled = true, markInUse = true}
end
` : "";
  const mapItemProbeScript = mapItemProbe ? `
local mapItemsObserved = 0
local sceneSpecificObserved = false

function entry.onMapItem(ctx)
  assert(ctx.sceneName == "jurassic" or ctx.sceneName == "candy" or ctx.sceneName == "fairy" or ctx.sceneName == "clown" or ctx.sceneName == "bargain", "Mighty Mike scene context drifted")
  assert(ctx.areaName == "area-1" or ctx.areaName == "area-2" or ctx.areaName == "area-3", "Mighty Mike area context drifted")
  assert(ctx.itemType >= 0 and ctx.itemType <= 55, "Mighty Mike map item type escaped the native range")
  assert(ctx.x == ctx.x and ctx.y == ctx.y, "Mighty Mike map item coordinates were not finite")
  assert(ctx.params ~= nil and #ctx.params == 4, "Mighty Mike map item parameters drifted")
  local sceneSpecificTypes = {
    jurassic = {[0] = true, [4] = true, [5] = true, [6] = true, [7] = true, [8] = true, [9] = true, [31] = true},
    candy = {[21] = true, [22] = true, [24] = true, [25] = true, [26] = true, [28] = true, [32] = true, [35] = true, [36] = true},
    fairy = {[37] = true, [38] = true, [39] = true, [40] = true, [41] = true, [42] = true, [44] = true, [46] = true},
    clown = {[11] = true, [12] = true, [13] = true, [14] = true, [16] = true, [17] = true, [20] = true, [23] = true},
    bargain = {[18] = true, [45] = true, [47] = true, [48] = true, [49] = true, [50] = true, [51] = true, [52] = true, [53] = true, [54] = true},
  }
  if sceneSpecificTypes[ctx.sceneName][ctx.itemType] then
    sceneSpecificObserved = true
  end
  mapItemsObserved = mapItemsObserved + 1
  return {handled = true, markInUse = false}
end
` : "";
  const capabilityProbe = capabilityExpectations ? `
    local capabilities = pangea.api.capabilities()
    assert(capabilities.objectCollision == ${capabilityExpectations.objectCollision ? "true" : "false"}, "object collision capability drifted")
    assert(capabilities.playerCommands == ${capabilityExpectations.playerCommands ? "true" : "false"}, "player command capability drifted")
    assert(capabilities.playerInvulnerability == ${capabilityExpectations.playerInvulnerability ? "true" : "false"}, "player invulnerability capability drifted")
    assert(capabilities.pickupScoreEffects == ${capabilityExpectations.pickupScoreEffects ? "true" : "false"}, "pickup score capability drifted")
    assert(capabilities.persistence == ${capabilityExpectations.persistence ? "true" : "false"}, "persistence capability drifted")` : "";
  const capabilityWeaponScoreProbe = capabilityExpectations ? `
    assert(pangea.api.capabilities().weaponScoreEffects == ${capabilityExpectations.weaponScoreEffects ? "true" : "false"}, "weapon score capability drifted")` : "";
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
${lifecycleProbe ? `  recordLifecycleCallback("levelStart")` : ""}
end
` : "";
  const levelCompleteHandler = levelCompleteProbe ? `
local levelCompleted = false

function entry.onLevelComplete(ctx)
  levelCompleted = true
${lifecycleProbe ? `  recordLifecycleCallback("levelComplete")` : ""}
end
` : "";
  const deathHandler = deathProbe ? `
local deathObserved = false
local respawnObserved = false

function entry.onDeath(ctx)
  deathObserved = true
end

function entry.onPlayerRespawn(ctx)
  respawnObserved = true
end
` : "";
  const raceCompletionHandler = raceCompletionProbe || raceProgressProbe ? `
local raceFinished = false
local raceCompleted = false

${raceProgressProbe ? `function entry.onCheckpointReached(ctx)
  assert(ctx.playerNum == 0 and ctx.eventValue > 0, "Cro-Mag checkpoint context drifted")
${lifecycleProbe ? `  recordLifecycleCallback("checkpointReached")` : ""}
end

function entry.onLapComplete(ctx)
  assert(ctx.playerNum == 0 and ctx.eventValue > 0, "Cro-Mag lap context drifted")
${lifecycleProbe ? `  recordLifecycleCallback("lapComplete")` : ""}
end
` : ""}

function entry.onRaceFinish(ctx)
  raceFinished = true
${lifecycleProbe ? `  recordLifecycleCallback("raceFinish")` : ""}
  pangea.log.info("browser race finish")
end

${raceCompletionCompleteProbe ? `function entry.onRaceComplete(ctx)
  raceCompleted = true
${lifecycleProbe ? `  recordLifecycleCallback("raceComplete")` : ""}
  pangea.log.info("browser race complete")
end` : ""}
` : "";
  const areaCompletionHandler = areaCompletionProbe ? `
local areaCompleted = false

function entry.onAreaComplete(ctx)
  areaCompleted = true
${lifecycleProbe ? `  recordLifecycleCallback("areaComplete")` : ""}
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
${lifecycleProbe ? `    recordLifecycleCallback("onObjectiveComplete")` : ""}
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
${lifecycleProbe ? `  if ctx.event == "spawn" or ctx.event == "destroy" or ctx.event == "streamIn" or ctx.event == "streamOut" or ctx.event == "checkpointReset" then recordLifecycleCallback(ctx.event) end` : ""}
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
      local diagnostics = pangea.api.diagnostics()
      assert(diagnostics.commandCount >= 6, "command trace did not record object commands")
      for index, command in ipairs(diagnostics.commandTrace) do
        assert(command.applicationPhase == "callback", "command trace phase drifted")
        assert(command.order == index - 1, "command trace order drifted")
      end
    end` : ""}
  end
end
` : "";
  const objectCommandCheck = objectCommandProbe ? `
  assert(objectCommandsChecked, "custom object command probe was not delivered")` : "";
  const lifecycleCheck = lifecycleProbe ? `
  if probed then
    lifecycleFrames = lifecycleFrames + 1
    if lifecycle.spawn then
      local diagnostics = pangea.api.diagnostics()
      assert(diagnostics.lifecycleEventCount > 0, "lifecycle trace did not record object events")
      assert(not diagnostics.lifecycleTraceOverflow, "lifecycle trace overflowed during bounded probe")
      local firstSpawn = nil
      for index, event in ipairs(diagnostics.lifecycleTrace) do
        local expectedPhase = "callback"
        if event.id == "levelLoad" or event.id == "levelUnload" then expectedPhase = "level"
        elseif event.id == "save" or event.id == "load" then expectedPhase = "persistence"
        elseif event.id == "terrainItem" or event.id == "splineItem" or event.id == "mapItem" then expectedPhase = "constructor"
        elseif event.id == "trigger" or event.id == "pickup" or event.id == "weaponHit" then expectedPhase = "interaction"
        elseif event.id == "damage" or event.id == "damageApplied" then expectedPhase = "damage"
        elseif event.id == "modeTransition" then expectedPhase = "mode"
        end
        assert(event.applicationPhase == expectedPhase, "lifecycle trace phase drifted")
        assert(event.order == index - 1, "lifecycle trace order drifted")
        if event.id == "spawn" then firstSpawn = index; break end
      end
      assert(firstSpawn ~= nil, "lifecycle trace did not preserve spawn order")
      local nativeLifecycleByCallback = {
        levelLoad = "levelLoad",
        levelStart = "levelStart",
        levelComplete = "levelComplete",
        spawn = "spawn",
        destroy = "destroy",
        streamIn = "streamIn",
        streamOut = "streamOut",
        checkpointReset = "checkpointReset",
        onCheckpointReached = "checkpointReached",
        onLapComplete = "lapComplete",
        pickup = "pickup",
        weaponHit = "weaponHit",
        damage = "damage",
        damageApplied = "damageApplied",
        onRaceFinish = "raceFinish",
        onRaceComplete = "raceComplete",
        onAreaComplete = "areaComplete",
        onObjectiveComplete = "onObjectiveComplete",
      }
      local callbackLifecycleKinds = {
        levelLoad = true,
        spawn = true,
        destroy = true,
        streamIn = true,
        streamOut = true,
        checkpointReset = true,
${levelStartProbe ? `        levelStart = true,` : ""}
${levelCompleteProbe ? `        levelComplete = true,` : ""}
${pickupProbe ? `        pickup = true,` : ""}
${weaponHitProbe ? `        weaponHit = true,` : ""}
${damageProbe ? `        damage = true,
        damageApplied = true,` : ""}
${raceCompletionProbe ? `        onRaceFinish = true,` : ""}
${raceProgressProbe ? `        onCheckpointReached = true,
        onLapComplete = true,` : ""}
${raceCompletionCompleteProbe ? `        onRaceComplete = true,` : ""}
${areaCompletionProbe ? `        onAreaComplete = true,` : ""}
${objectiveCompletionProbe ? `        onObjectiveComplete = true,` : ""}
      }
      local nativeCallbackEvents = {}
      for _, event in ipairs(diagnostics.lifecycleTrace) do
        if callbackLifecycleKinds[event.id] and nativeLifecycleByCallback[event.id] ~= nil then
          table.insert(nativeCallbackEvents, nativeLifecycleByCallback[event.id])
        end
      end
      assert(#nativeCallbackEvents == #callbackLifecycleTrace, "native and script lifecycle callback counts drifted")
      for index, eventId in ipairs(callbackLifecycleTrace) do
        assert(nativeCallbackEvents[index] == eventId, "native and script lifecycle callback order drifted")
      end
    end
  end` : "";
  const playerCaptureStateProbeScript = playerCaptureStateProbe ? `
    local playerState = pangea.player.get(0)
    assert(playerState and playerState.team ~= nil and playerState.captureScore ~= nil and playerState.carryingFlag ~= nil, "Nanosaur 2 capture snapshot fields were not published")
    assert(playerState.team == 0 or playerState.team == 1, "Nanosaur 2 capture team drifted")
    assert(playerState.captureScore >= 0, "Nanosaur 2 capture score drifted")` : "";
  const vehicleStateProbeScript = vehicleStateProbe ? `
    local playerState = pangea.player.get(0)
    assert(playerState and playerState.vehicleType ~= nil and playerState.vehicleMaxSpeed ~= nil and playerState.vehicleAcceleration ~= nil and playerState.vehicleTraction ~= nil and playerState.vehicleSuspension ~= nil, "Cro-Mag vehicle snapshot fields were not published")
    assert(playerState.vehicleType >= 0 and playerState.vehicleMaxSpeed > 0 and playerState.vehicleAcceleration > 0 and playerState.vehicleTraction > 0 and playerState.vehicleSuspension > 0, "Cro-Mag vehicle snapshot values drifted")
    assert(playerState.aim ~= nil, "Cro-Mag aim state was not published")
    local aimLength = math.sqrt(playerState.aim.x * playerState.aim.x + playerState.aim.y * playerState.aim.y + playerState.aim.z * playerState.aim.z)
    assert(math.abs(aimLength - 1) < 0.01, "Cro-Mag aim state was not normalized")
    assert(playerState.camera ~= nil, "Cro-Mag camera state was not published")
    assert(playerState.tokenCount ~= nil and playerState.tokenCount >= 0, "Cro-Mag token state was not published")
    if ctx.mode == "practice" then
      assert(playerState.lapNum ~= nil and playerState.checkpointNum ~= nil and playerState.placement ~= nil and playerState.raceComplete ~= nil, "Cro-Mag race snapshot fields were not published")
      assert(playerState.lapNum >= 0 and playerState.checkpointNum >= 0 and playerState.placement >= 0, "Cro-Mag race snapshot values drifted")
    end` : "";
  const modeStateProbeScript = modeStateProbe ? `
    assert(ctx.modePhase ~= nil and ctx.modeWave ~= nil and ctx.modeTimer ~= nil, "Billy Frontier mode state was not published")
    assert(ctx.modePhase >= 0 and ctx.modeWave >= 0 and ctx.modeTimer >= 0, "Billy Frontier mode state drifted")
    assert(ctx.modeSequenceIndex ~= nil and ctx.modeSequenceLength ~= nil and ctx.modeEnemyCount ~= nil and ctx.modeReflex ~= nil and ctx.modeCanAdvance ~= nil, "Billy Frontier mode detail state was not published")
    assert(ctx.modeSequenceIndex >= 0 and ctx.modeSequenceLength >= 0 and ctx.modeEnemyCount >= 0 and ctx.modeReflex >= 0, "Billy Frontier mode detail state drifted")
    if ctx.gameId == "BillyFrontier-Android" and ctx.mode == "duel" then
      assert(ctx.modeSequenceLength >= 3, "Billy Frontier duel sequence state drifted")
    elseif ctx.gameId == "BillyFrontier-Android" and (ctx.mode == "shootout" or ctx.mode == "stampede") then
      assert(ctx.modeWave >= 0, "Billy Frontier wave state drifted")
    elseif ctx.gameId == "BillyFrontier-Android" and ctx.mode == "targetPractice" then
      assert(ctx.modeTimer > 0, "Billy Frontier target-practice timer was not initialized")
    end` : "";
  const playerFormTransitionProbeScript = playerFormTransitionProbe ? `
    local initialPlayerState = pangea.player.get(0)
    assert(initialPlayerState and initialPlayerState.form ~= nil, "Bugdom player form was not published")
    assert(pangea.player.setForm(0, "ball"), "Bugdom ball-form transition failed")
    local ballPlayerState = pangea.player.get(0)
    assert(ballPlayerState and ballPlayerState.form == "ball", "Bugdom ball-form readback drifted")
    assert(pangea.player.setForm(0, "bug"), "Bugdom bug-form transition failed")
    local bugPlayerState = pangea.player.get(0)
    assert(bugPlayerState and bugPlayerState.form == "bug", "Bugdom bug-form readback drifted")` : "";
  const levelStartCheck = levelStartProbe ? `
  assert(levelStarted, "level start event was not delivered")` : "";
  const levelCompleteCheck = levelCompleteProbe ? `
  assert(levelCompleted, "level complete event was not delivered")` : "";
  const deathCallbackCheck = deathProbe ? `
  if probed and not deathCallbackChecked then
    deathCallbackFrames = deathCallbackFrames + 1
    if deathCallbackFrames > 30 then
      assert(deathObserved, "death event was not delivered")
      assert(respawnObserved, "respawn event was not delivered")
      deathCallbackChecked = true
    end
  end` : "";
  const raceCompletionCheck = raceCompletionProbe || raceProgressProbe ? `
  assert(raceFinished, "race finish event was not delivered")
${raceCompletionCompleteProbe ? `  assert(raceCompleted, "race complete event was not delivered")` : ""}` : "";
  const areaCompletionCheck = areaCompletionProbe ? `
  assert(areaCompleted, "area complete event was not delivered")` : "";
  return `local pangea = require("pangea")
local entry = {}
local probed = false
local lifecycleChecked = false
local lifecycleFrames = 0
local lowLivesResetPending = false
local deathCallbackChecked = false
local deathCallbackFrames = 0
${lifecycleProbe ? `local callbackLifecycleTrace = {}
function recordLifecycleCallback(eventId)
  table.insert(callbackLifecycleTrace, eventId)
end

function entry.onLevelLoad(ctx)
  recordLifecycleCallback("levelLoad")
end` : ""}

${objectFrameHandlers}
${levelStartHandler}
${levelCompleteHandler}
${raceCompletionHandler}
${areaCompletionHandler}
${deathHandler}
${objectiveCompletionHandler}
${damageProbeScript}
${weaponHitProbeScript}
${pickupProbeScript}
${splineEventProbeScript}
${mapItemProbeScript}

function entry.onFrame(ctx)
  pangea.log.info("browser runtime regression")
  if lowLivesResetPending and probed then
    local restoredPlayerState = pangea.player.get(0)
    assert(restoredPlayerState and restoredPlayerState.lives ~= nil and restoredPlayerState.lives > 0, "Nanosaur 2 low-lives checkpoint reset did not restore lives")
    lowLivesResetPending = false
  end
  if not probed then
    probed = true
${probes}
${recreation}
${playerProbe}
${playerVelocityProbeScript}
${playerStateProbeScript}
${billyCurrencyProbeScript}
${playerObjectiveStateProbeScript}
${playerEggStateProbeScript}
${playerCaptureStateProbeScript}
${vehicleStateProbeScript}
${modeStateProbeScript}
${playerFormTransitionProbeScript}
${pickupScoreProbe}
${capabilityProbe}
${capabilityWeaponScoreProbe}
${contextProbe}
${persistenceProbeScript}
${mapItemProbe ? `  assert(mapItemsObserved > 0, "Mighty Mike shipped area did not deliver map-item interactions")` : ""}
${mapItemProbe ? `  assert(sceneSpecificObserved, "Mighty Mike shipped area did not deliver a scene-specific map item")` : ""}
  end
${lifecycleCheck}
${objectCommandCheck}
${levelStartCheck}
${levelCompleteCheck}
${raceCompletionCheck}
${areaCompletionCheck}
${deathCallbackCheck}
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
  readonly playerStateProbe?: boolean;
  readonly playerObjectiveStateProbe?: boolean;
  readonly buddyLaunchProbe?: boolean;
  readonly deathProbe?: boolean;
  readonly playerEggStateProbe?: boolean;
  readonly playerCaptureStateProbe?: boolean;
  readonly vehicleStateProbe?: boolean;
  readonly modeStateProbe?: boolean;
  readonly playerFormTransitionProbe?: boolean;
  readonly playerVelocityProbe?: boolean;
  readonly damageProbe?: boolean;
  readonly damageProbeFunction?: string;
  readonly deathProbeFunction?: string;
  readonly splineEventProbe?: boolean;
  readonly splineEventProbeFunction?: string;
  readonly splineEventProbeResult?: number;
  readonly mapItemProbe?: boolean;
  readonly mapReplacementProbe?: boolean;
  readonly pickupScoreCapabilityProbe?: boolean;
  readonly pickupProbe?: boolean;
  readonly pickupProbeFunction?: string;
  readonly pickupProbeResult?: number;
  readonly crystalPickupProbe?: boolean;
  readonly crystalPickupProbeFunction?: string;
  readonly crystalPickupProbeResult?: number;
  readonly eggRecoveryProbe?: boolean;
  readonly eggRecoveryProbeFunction?: string;
  readonly eggRecoveryProbeResult?: number;
  readonly shieldPickupProbe?: boolean;
  readonly shieldPickupProbeFunction?: string;
  readonly shieldPickupProbeResult?: number;
  readonly weaponPowerPickupProbe?: boolean;
  readonly weaponPowerPickupProbeFunction?: string;
  readonly weaponPowerPickupProbeResult?: number;
  readonly nanosaur2PowerupPickupProbe?: boolean;
  readonly nanosaur2PowerupPickupProbeFunction?: string;
  readonly cromagPickupSuppressionProbe?: boolean;
  readonly cromagPickupSuppressionProbeFunction?: string;
  readonly weaponHitProbe?: boolean;
  readonly weaponHitProbeFunction?: string;
  readonly weaponHitProbeResult?: number;
  readonly projectileWeaponFamiliesProbe?: boolean;
  readonly dartWeaponProbe?: boolean;
  readonly superNovaWeaponProbe?: boolean;
  readonly punchWeaponProbe?: boolean;
  readonly lifecycleProbe?: boolean;
  readonly childCleanupProbe?: boolean;
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
  readonly levelCompleteProbeFunction?: string;
  readonly raceCompletionProbe?: boolean;
  readonly raceCompletionProbeFunction?: string;
  readonly raceCompletionProbeResult?: number;
  readonly raceCompletionCompleteProbe?: boolean;
  readonly raceProgressProbe?: boolean;
  readonly objectiveCompletionProbe?: boolean;
  readonly objectiveCompletionProbeFunction?: string;
  readonly objectiveCompletionProbeResult?: number;
  readonly persistenceProbe?: boolean;
  readonly areaCompletionProbe?: boolean;
  readonly runtimeWarmupMs?: number;
  readonly deferLevelConfig?: boolean;
  readonly scriptedObjectProbe?: boolean;
  readonly terrainPath?: string;
  readonly terrainUrl?: string;
  readonly mapPath?: string;
  readonly mapUrl?: string;
  readonly mapOverridePath?: string;
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
  readonly splineSelectionFunction?: string;
  readonly splineSelectionFieldFunction?: string;
  readonly splineSelectionPlacementFunction?: string;
  readonly splineReplacementProbeFunction?: string;
  readonly splineReplacementProbeResult?: number;
}

interface RuntimeCapabilityExpectations {
  readonly objectCollision: boolean;
  readonly playerCommands: boolean;
  readonly playerInvulnerability: boolean;
  readonly pickupScoreEffects: boolean;
  readonly weaponScoreEffects: boolean;
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
  query: `level=${scene}:${area}&deferStart=1`,
  fixture: {
    assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
    assetUrl: "../../../../data/mightymike/shapes/main.shapes",
    nativeItems: [],
    contextExpectations: { mode: "local", networked: false, sceneName: mapName, areaName: `area-${area + 1}` },
    playerStateProbe: true,
    mapItemProbe: true,
    playerCommandProbe: true,
    lifecycleProbe: true,
    manualStart: true,
    startSelector: "#play-btn",
    mapOverridePath: `:Maps:${mapName}.map-${area + 1}`,
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
    path: "billyfrontier/game/billyfrontier.html",
    requiresStartup: false,
    query: "level=0",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/billyfrontier/skeletons/Billy.bg3d",
      contextExpectations: { mode: "duel", networked: false, levelName: "level1" },
      nativeProbeIds: ["billy.peso", "billy.freeLifePow", "billy.boost"],
      nativeItems: ["billy.peso", "billy.freeLifePow", "billy.boost"],
      playerStateProbe: true,
      playerCommandProbe: true,
      playerVelocityProbe: true,
      modeStateProbe: true,
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
      playerStateProbe: true,
      playerFormTransitionProbe: true,
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
      nativeProbeIds: [
        "bugdom2.powerup",
        "bugdom2.dcell",
        "bugdom2.gliderPart",
        "bugdom2.sprinkler",
        "bugdom2.gnome",
        "bugdom2.firecracker",
        "5",
        "13",
        "14",
        "44",
      ],
      terrainPath: "Data/Terrain/Level3_DogHair.ter",
      terrainUrl: "../../../../assets/bugdom2/terrain/Level3_DogHair.ter",
      levelNum: 3,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "Bugdom2Script_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(bugdom2CallableTerrainTypes.slice(1), 1),
      nativeItems: ["bugdom2.powerup", "bugdom2.dcell", "bugdom2.gliderPart"],
      playerObjectiveStateProbe: true,
      buddyLaunchProbe: true,
      playerCommandProbe: true,
      playerVelocityProbe: true,
      damageProbe: true,
      damageProbeFunction: "Bugdom2Script_ProbeDamageJS",
      splineEventProbe: false,
      splineEventProbeFunction: "Bugdom2Script_ProbeFirstSplineJS",
      splineEventProbeResult: -1,
      lifecycleProbe: true,
      childCleanupProbe: true,
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
    path: "cromagrally/game/CroMagRally.html",
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
      vehicleStateProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      terrainReplacement: { itemIndex: 0, nativeType: 1, x: 0, z: 0 },
      terrainReplacementProbe: "CroMagScript_ProbeTerrainReplacementJS",
      terrainReplacementProbes: createTerrainReplacementProbes(cromagCallableTerrainTypes.slice(1), 1),
      contextExpectations: { mode: "practice", networked: false, trackName: "ice" },
      replacementLifecycleProbe: true,
      raceCompletionProbe: false,
      raceCompletionCompleteProbe: true,
      raceProgressProbe: true,
      terrainPath: "Data/Terrain/IronAge_Europe.ter",
      terrainUrl: "../../../../assets/croMag/terrain/IronAge_Europe.ter",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Cro-Mag Rally Pickup Probe",
    path: "cromagrally/CroMagRally.html",
    requiresStartup: true,
    query: "track=3&car=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/cromagrally/skeletons/GragStanding.bg3d",
      nativeItems: ["cromag.pow", "cromag.token"],
      pickupProbe: true,
      cromagPickupSuppressionProbe: true,
      cromagPickupSuppressionProbeFunction: "CroMagScript_ProbePickupSuppressionJS",
      contextExpectations: { mode: "practice", networked: false, trackName: "ice" },
    },
  },
  {
    id: "Mighty Mike",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=1:0&deferStart=1",
    fixture: {
    contextExpectations: { mode: "local", networked: false, sceneName: "candy", areaName: "area-1" },
    playerStateProbe: true,
    mapItemProbe: true,
    assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
    assetUrl: "../../../../data/mightymike/shapes/main.shapes",
    nativeProbeIds: ["mightymike.bunny", "mightymike.healthPow", "mightymike.key"],
    nativeItems: ["mightymike.bunny", "mightymike.healthPow", "mightymike.key"],
    playerCommandProbe: true,
      mapReplacementProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
    replacementLifecycleProbe: true,
    lifecycleProbe: true,
      saveLoadProbe: true,
      saveLoadProbeFunction: "MikeScript_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      mapPath: "Data/Maps/candy.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/candy.map-1",
      mapOverridePath: ":Maps:candy.map-1",
      tilesetPath: "Data/Maps/candy.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/candy.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Mighty Mike Jurassic Area 1",
    path: "mightymike/index.html",
    requiresStartup: false,
    query: "level=0:0&deferStart=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
      mapOverridePath: ":Maps:jurassic.map-1",
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
    query: "level=4:0&deferStart=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
      mapOverridePath: ":Maps:bargain.map-1",
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
    query: "level=2:0&deferStart=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
      mapOverridePath: ":Maps:fairy.map-1",
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
    query: "level=3:0&deferStart=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.shapes",
      assetUrl: "../../../../data/mightymike/shapes/main.shapes",
      nativeItems: [],
      playerCommandProbe: true,
      lifecycleProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
      mapOverridePath: ":Maps:clown.map-1",
      mapPath: "Data/Maps/clown.map-1",
      mapUrl: "../../../../assets/mightyMike/terrain/clown.map-1",
      tilesetPath: "Data/Maps/clown.tileset",
      tilesetUrl: "../../../../assets/mightyMike/terrain/clown.tileset",
      verifyMalformedAsset: true,
    },
  },
  {
    id: "Nanosaur",
    path: "nanosaur/game/index.html",
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
      levelStartProbe: true,
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "NanosaurScript_ProbeLevelCompleteJS",
      nativeItems: ["nanosaur.powerup", "nanosaur.egg", "nanosaur.crystal"],
      playerEggStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "NanosaurScript_ProbeDeathJS",
      playerCommandProbe: true,
      playerVelocityProbe: true,
      pickupProbe: true,
      pickupProbeFunction: "NanosaurScript_ProbePickupJS",
      pickupProbeResult: 7,
      crystalPickupProbe: true,
      crystalPickupProbeFunction: "NanosaurScript_ProbeCrystalPickupJS",
      crystalPickupProbeResult: 7,
      eggRecoveryProbe: true,
      eggRecoveryProbeFunction: "NanosaurScript_ProbeEggRecoveryJS",
      eggRecoveryProbeResult: 20007,
      shieldPickupProbe: true,
      shieldPickupProbeFunction: "NanosaurScript_ProbeShieldPickupJS",
      shieldPickupProbeResult: 7,
      weaponPowerPickupProbe: true,
      weaponPowerPickupProbeFunction: "NanosaurScript_ProbeWeaponPowerPickupJS",
      weaponPowerPickupProbeResult: 7,
      weaponHitProbe: true,
      weaponHitProbeFunction: "NanosaurScript_ProbeEnemyWeaponHitJS",
      weaponHitProbeResult: 1,
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
    query: "level=0&deferStart=1",
    fixture: {
      assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
      convertedAssetPath: "Data/Scripts/assets/models/converted-triangle.bg3d",
      assetUrl: "../../../../games/nanosaur2/models/global.bg3d",
      contextExpectations: { mode: "adventure", networked: false, levelName: "adventure1" },
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow", "nanosaur2.fuelPow", "nanosaur2.shieldPow", "nanosaur2.freeLifePow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow", "nanosaur2.fuelPow", "nanosaur2.shieldPow", "nanosaur2.freeLifePow"],
      playerEggStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "Nanosaur2Script_ProbeDeathRespawnJS",
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "Nanosaur2Script_ProbeLevelCompleteJS",
      playerCommandProbe: true,
      playerVelocityProbe: true,
      pickupProbe: true,
      nanosaur2PowerupPickupProbe: true,
      nanosaur2PowerupPickupProbeFunction: "Nanosaur2Script_ProbePowerupPickupJS",
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
      manualStart: true,
      startSelector: "#play-btn",
      deferLevelConfig: false,
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
      playerEggStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "Nanosaur2Script_ProbeDeathRespawnJS",
      nanosaur2PowerupPickupProbe: true,
      nanosaur2PowerupPickupProbeFunction: "Nanosaur2Script_ProbePowerupPickupJS",
      levelNum: 3,
      raceCompletionProbe: true,
      raceCompletionProbeFunction: "Nanosaur2Script_ProbeRaceCompletionJS",
      raceCompletionProbeResult: 1,
      splineEventProbe: true,
      splineEventProbeFunction: "Nanosaur2Script_ProbeFirstSplineJS",
      splineEventProbeResult: 1,
      splineReplacementFromFirstItem: true,
      splineSelectionFunction: "Nanosaur2Script_SelectFirstSplineItemForReplacementJS",
      splineSelectionFieldFunction: "Nanosaur2Script_GetSelectedSplineItemFieldJS",
      splineSelectionPlacementFunction: "Nanosaur2Script_GetSelectedSplinePlacementJS",
      splineReplacementProbeFunction: "Nanosaur2Script_ProbeFirstSplineReplacementJS",
      splineReplacementProbeResult: 0,
      saveLoadProbe: true,
      saveLoadProbeFunction: "Nanosaur2Script_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      lifecycleProbe: true,
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "Nanosaur2Script_ProbeLevelCompleteJS",
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
      playerEggStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "Nanosaur2Script_ProbeDeathRespawnJS",
      nanosaur2PowerupPickupProbe: true,
      nanosaur2PowerupPickupProbeFunction: "Nanosaur2Script_ProbePowerupPickupJS",
      levelNum: 5,
      objectiveCompletionProbe: true,
      objectiveCompletionProbeFunction: "Nanosaur2Script_ProbeObjectiveCompletionJS",
      objectiveCompletionProbeResult: 1,
      saveLoadProbe: true,
      saveLoadProbeFunction: "Nanosaur2Script_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      recreationProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Nanosaur2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      checkpointResetEventLogProbe: true,
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "Nanosaur2Script_ProbeLevelCompleteJS",
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
      playerEggStateProbe: true,
      playerCaptureStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "Nanosaur2Script_ProbeDeathRespawnJS",
      nanosaur2PowerupPickupProbe: true,
      nanosaur2PowerupPickupProbeFunction: "Nanosaur2Script_ProbePowerupPickupJS",
      levelNum: 7,
      objectiveCompletionProbe: true,
      objectiveCompletionProbeFunction: "Nanosaur2Script_ProbeObjectiveCompletionJS",
      objectiveCompletionProbeResult: 1,
      saveLoadProbe: true,
      saveLoadProbeFunction: "Nanosaur2Script_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      recreationProbe: true,
      checkpointResetProbe: true,
      checkpointResetProbeFunction: "Nanosaur2Script_ProbeCheckpointResetJS",
      checkpointResetProbeResult: 1,
      checkpointResetEventLogProbe: true,
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "Nanosaur2Script_ProbeLevelCompleteJS",
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
      playerStateProbe: true,
      playerCommandProbe: true,
      playerVelocityProbe: true,
      deathProbe: true,
      deathProbeFunction: "OttoScript_ProbeDeathJS",
      levelCompleteProbe: true,
      levelCompleteProbeFunction: "OttoScript_ProbeLevelCompleteJS",
    weaponHitProbe: true,
    weaponHitProbeFunction: "OttoScript_ProbeWeaponHitJS",
    weaponHitProbeResult: 7,
    projectileWeaponFamiliesProbe: true,
    dartWeaponProbe: true,
    superNovaWeaponProbe: true,
    punchWeaponProbe: true,
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
      verifyMalformedAsset: level >= 5 ? false : true,
      scriptedObjectProbe: level >= 5 ? false : true,
      nativeProbeIds: level >= 5 ? [] : target.fixture.nativeProbeIds,
      nativeItems: level >= 5 ? [] : target.fixture.nativeItems,
      playerCommandProbe: level >= 5 ? false : target.fixture.playerCommandProbe,
      playerVelocityProbe: level >= 5 ? false : target.fixture.playerVelocityProbe,
      playerFormTransitionProbe: level >= 5 ? false : target.fixture.playerFormTransitionProbe,
      lifecycleProbe: level >= 5 ? false : target.fixture.lifecycleProbe,
      recreationProbe: level >= 5 ? false : target.fixture.recreationProbe,
      replacementLifecycleProbe: level >= 5 ? false : target.fixture.replacementLifecycleProbe,
      saveLoadProbe: level >= 5 ? false : target.fixture.saveLoadProbe,
      terrainReplacement: level >= 5 ? undefined : target.fixture.terrainReplacement,
      terrainReplacementProbe: level >= 5 ? undefined : target.fixture.terrainReplacementProbe,
      terrainReplacementProbes: level >= 5 ? undefined : target.fixture.terrainReplacementProbes,
      checkpointResetProbe: level >= 5 ? false : true,
      checkpointResetProbeFunction: level >= 5 ? undefined : "BugdomScript_ProbeCheckpointResetJS",
      checkpointResetProbeResult: level >= 5 ? undefined : 1,
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
    query: `level=${level}&terrainFile=/Data/Terrain/${terrainName}.ter&deferStart=1`,
    fixture: {
      ...baseTarget.fixture,
      contextExpectations: { mode, networked: false, levelName },
      levelNum: level,
      terrainPath: `Data/Terrain/${terrainName}.ter`,
      terrainUrl: `../../../../assets/nanosaur2/terrain/${terrainName}.ter`,
      playerCaptureStateProbe: mode === "capture",
      playerEggStateProbe: true,
      deathProbe: true,
      deathProbeFunction: "Nanosaur2Script_ProbeDeathRespawnJS",
      saveLoadProbe: true,
      saveLoadProbeFunction: "Nanosaur2Script_ProbeSaveLoadJS",
      saveLoadProbeResult: 0,
      splineEventProbe: mode === "race",
      splineEventProbeFunction: mode === "race" ? "Nanosaur2Script_ProbeFirstSplineJS" : undefined,
      splineEventProbeResult: mode === "race" ? 1 : undefined,
      splineReplacementFromFirstItem: mode === "race",
      splineSelectionFunction: mode === "race"
        ? "Nanosaur2Script_SelectFirstSplineItemForReplacementJS"
        : undefined,
      splineSelectionFieldFunction: mode === "race"
        ? "Nanosaur2Script_GetSelectedSplineItemFieldJS"
        : undefined,
      splineSelectionPlacementFunction: mode === "race"
        ? "Nanosaur2Script_GetSelectedSplinePlacementJS"
        : undefined,
      splineReplacementProbeFunction: mode === "race" ? "Nanosaur2Script_ProbeFirstSplineReplacementJS" : undefined,
      splineReplacementProbeResult: mode === "race" ? 0 : undefined,
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
      splineEventProbeResult: [2, 6, 7, 9].includes(level) ? -1 : 1,
      splineReplacementFromFirstItem: true,
      splineReplacementProbeFunction: "Bugdom2Script_ProbeFirstSplineReplacementJS",
      splineReplacementProbeResult: [2, 6, 7, 9].includes(level) ? -1 : 1,
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
      raceCompletionProbe: track < 9 && track !== 0,
      raceCompletionCompleteProbe: track < 9,
      raceProgressProbe: track === 0,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      terrainPath: `Data/Terrain/${terrainName}.ter`,
      terrainUrl: `../../../../assets/croMag/terrain/${terrainName}.ter`,
      verifyMalformedAsset: false,
    },
  }));
});

const croMagBattleModeRuntimeTargets: readonly RuntimeTarget[] = (() => {
  const baseTarget = runtimeTargets.find((target) => target.id === "Cro-Mag Rally");
  if (!baseTarget?.fixture) return [];
  const modes = [
    [9, "capture", "stonehenge", "Battle_StoneHenge"],
    [10, "tag1", "aztec", "Battle_Aztec"],
    [11, "survival", "coliseum", "Battle_Coliseum"],
  ] as const;
  return modes.map(([track, mode, trackName, terrainName]) => ({
    ...baseTarget,
    id: `Cro-Mag Rally ${mode}`,
    query: `track=${track + 1}&car=1&mode=${mode}`,
    fixture: {
      ...baseTarget.fixture,
      contextExpectations: { mode, networked: false, trackName },
      levelNum: track,
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      lifecycleProbe: false,
      recreationProbe: false,
      replacementLifecycleProbe: false,
      raceCompletionProbe: false,
      raceCompletionCompleteProbe: false,
      raceProgressProbe: false,
      playerCaptureStateProbe: mode === "capture",
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      terrainPath: `Data/Terrain/${terrainName}.ter`,
      terrainUrl: `../../../../assets/croMag/terrain/${terrainName}.ter`,
      verifyMalformedAsset: false,
    },
  }));
})();

const billyModeRuntimeTargets: readonly RuntimeTarget[] = (() => {
  const baseTarget = runtimeTargets.find((target) => target.id === "Billy Frontier");
  if (!baseTarget?.fixture) return [];
  const modeTargets = [
    { id: "Billy Frontier Shootout", level: 1, mode: "shootout", terrain: "town_shootout" },
    { id: "Billy Frontier Stampede", level: 3, mode: "stampede", terrain: "town_stampede" },
    { id: "Billy Frontier Target Practice", level: 5, mode: "targetPractice", terrain: undefined },
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
    [0, "farm", "robot"],
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
    objectCollision: true,
    playerCommands: true,
    playerInvulnerability: !target.id.startsWith("Cro-Mag Rally"),
    pickupScoreEffects:
      target.id.startsWith("Billy Frontier") ||
      target.id === "Nanosaur" ||
      target.id === "Otto Matic" ||
      target.id === "Bugdom" ||
      target.id.startsWith("Bugdom ") ||
      target.id === "Mighty Mike",
    weaponScoreEffects:
      target.id === "Bugdom" ||
      target.id.startsWith("Bugdom ") ||
      target.id === "Nanosaur" ||
      target.id === "Mighty Mike" ||
      target.id === "Otto Matic",
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
  ...croMagBattleModeRuntimeTargets,
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
  page.on("console", (message) => {
    consoleMessages.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

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
    }, buildRuntimeScript(target.fixture.nativeProbeIds, target.fixture.playerStateProbe === true, target.fixture.playerObjectiveStateProbe === true, target.fixture.playerEggStateProbe === true, target.fixture.playerCaptureStateProbe === true, target.fixture.vehicleStateProbe === true, target.fixture.modeStateProbe === true, target.fixture.playerFormTransitionProbe === true, target.fixture.playerCommandProbe === true, target.fixture.playerVelocityProbe === true, target.fixture.pickupScoreCapabilityProbe === true, target.fixture.pickupProbe === true, target.fixture.weaponHitProbe === true, target.fixture.damageProbe === true, target.fixture.splineEventProbe === true, target.fixture.mapItemProbe === true, runtimeCapabilityExpectations(target), target.fixture.contextExpectations, target.fixture.lifecycleProbe === true, target.fixture.childCleanupProbe === true, target.fixture.recreationProbe === true, target.fixture.checkpointResetProbe === true, target.fixture.objectCommandProbe === true, target.fixture.replacementLifecycleProbe === true, target.fixture.levelStartProbe === true, target.fixture.levelCompleteProbe === true, target.fixture.raceCompletionProbe === true, target.fixture.raceCompletionCompleteProbe === true, target.fixture.raceProgressProbe === true, target.fixture.areaCompletionProbe === true, target.fixture.objectiveCompletionProbe === true, target.fixture.persistenceProbe === true, target.fixture.buddyLaunchProbe === true, target.fixture.deathProbe === true));
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
            terrainReplacements: fixture.deferLevelConfig === true ? [] : [
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
    if (target.fixture.nanosaur2PowerupPickupProbe === true) {
      const runtimeScript = await page.evaluate(() => {
        const bytes = window.Module?.FS?.readFile?.("Data/Scripts/dist/main.lua");
        return bytes === undefined ? "" : new TextDecoder().decode(bytes);
      });
      expect(runtimeScript).toContain("onPickupCollected");
    }
    if (target.fixture.runtimeWarmupMs !== undefined) {
      await page.waitForTimeout(target.fixture.runtimeWarmupMs);
    }
    if (target.fixture.manualStart) {
      const startControl = page.locator(target.fixture.startSelector ?? "#play-btn");
      await startControl.waitFor({ state: "visible", timeout: 30_000 });
      if (target.fixture.mapOverridePath !== undefined) {
        await page.evaluate((mapOverridePath) => {
          window.Module?.ccall?.("Boot_SetCustomMapPath", "void", ["string"], [mapOverridePath]);
        }, target.fixture.mapOverridePath);
      }
      await startControl.click();
      if (target.fixture.nanosaur2PowerupPickupProbe === true) {
        await page.waitForFunction(
          () => window.Module?.ccall?.("PangeaScript_IsEnabled", "boolean", [], []) === true,
          null,
          { timeout: 30_000 },
        );
        const startupScriptStatus = await page.evaluate(() => window.Module?.ccall?.(
          "PangeaScript_SetStartupScript",
          "number",
          ["string"],
          ["Data/Scripts/dist/main.lua"],
        ) ?? -1);
        expect(startupScriptStatus).toBe(0);
        await page.waitForFunction(
          () => window.Module?.ccall?.("PangeaScript_GetStatusBundleLoaded", "boolean", [], []) === true,
          null,
          { timeout: 30_000 },
        );
      }
    }
    if (target.fixture.buddyLaunchProbe === true) {
      const buddyLaunchResult = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return { result: 0, error: "runtime unavailable" };
        const result = runtime.ccall("Bugdom2Script_ProbeBuddyLaunchJS", "number", [], []);
        return {
          result,
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      });
      expect(buddyLaunchResult.result, buddyLaunchResult.error).toBe(1);
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
    await page.waitForFunction(
      () => window.Module?.ccall?.("PangeaScript_GetStatusBundleLoaded", "boolean", [], []) === true,
      null,
      { timeout: 30_000 },
    );
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
      if (target.fixture.checkpointResetProbe === true) {
        await expect.poll(
          () => page.evaluate(
            (probeFunction) => {
              const runtime = window.Module;
              if (!runtime?.ccall) return 0;
              const result = runtime.ccall(probeFunction ?? "Bugdom2Script_ProbeCheckpointResetJS", "number", [], []);
              if (result !== 0 || probeFunction !== "Nanosaur2Script_ProbeCheckpointResetJS") return result;
              return runtime.ccall("Nanosaur2_DebugGetGameplayState", "number", [], []);
            },
            target.fixture.checkpointResetProbeFunction,
          ),
          { timeout: 30_000 },
        ).toBe(target.fixture.checkpointResetProbeResult ?? 1);
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
        const selectionFunction = fixture.splineSelectionFunction
          ?? "Bugdom2Script_SelectSplineItemForReplacementJS";
        const selectionFieldFunction = fixture.splineSelectionFieldFunction
          ?? "Bugdom2Script_GetSelectedSplineItemFieldJS";
        const selectionPlacementFunction = fixture.splineSelectionPlacementFunction
          ?? "Bugdom2Script_GetSelectedSplinePlacementJS";
        const nanosaurSelection = selectionFunction.startsWith("Nanosaur2Script_");
        const selected = await runtime.ccall(
          selectionFunction,
          "number",
          [],
          [],
        );
        if (selected === (nanosaurSelection ? 1 : 0)) {
          const splineReplacement = {
            splineNum: await runtime.ccall(
              selectionFieldFunction,
              "number",
              ["number"],
              [0],
            ),
            itemIndex: await runtime.ccall(
              selectionFieldFunction,
              "number",
              ["number"],
              [1],
            ),
            nativeType: await runtime.ccall(
              selectionFieldFunction,
              "number",
              ["number"],
              [2],
            ),
            placement: await runtime.ccall(
              selectionPlacementFunction,
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
    if (target.fixture.projectileWeaponFamiliesProbe === true) {
      const projectileWeaponFamiliesProbe = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return null;
        return {
          result: runtime.ccall("OttoScript_ProbeProjectileWeaponFamiliesJS", "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      });
      expect(projectileWeaponFamiliesProbe?.result, projectileWeaponFamiliesProbe?.error ?? "").toBe(4);
    }
    if (target.fixture.dartWeaponProbe === true) {
      const dartWeaponProbe = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return null;
        return {
          result: runtime.ccall("OttoScript_ProbeDartWeaponJS", "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      });
      expect(dartWeaponProbe?.result, dartWeaponProbe?.error ?? "").toBe(1);
    }
    if (target.fixture.superNovaWeaponProbe === true) {
      const superNovaWeaponProbe = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return null;
        return {
          result: runtime.ccall("OttoScript_ProbeSuperNovaWeaponJS", "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      });
      expect(superNovaWeaponProbe?.result, superNovaWeaponProbe?.error ?? "").toBe(1);
    }
    if (target.fixture.punchWeaponProbe === true) {
      const punchWeaponProbe = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return null;
        return {
          result: runtime.ccall("OttoScript_ProbePunchWeaponJS", "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      });
      expect(punchWeaponProbe?.result, punchWeaponProbe?.error ?? "").toBe(1);
    }
    if (target.fixture.weaponHitProbe === true) {
      await page.waitForFunction(
        () => (window.Module?.ccall?.("PangeaScript_GetStatusHooksCalledCount", "number", [], []) ?? 0) > 0,
        null,
        { timeout: 30_000 },
      );
      const weaponHitProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.weaponHitProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.weaponHitProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(weaponHitProbe?.result, weaponHitProbe?.error ?? "").toBe(target.fixture.weaponHitProbeResult ?? 0);
    }
    if (target.fixture.deathProbe === true) {
      const deathResult = await page.evaluate((functionName) => {
        const runtime = window.Module;
        if (!runtime?.ccall) return 0;
        return runtime.ccall(functionName, "number", [], []);
      }, target.fixture.deathProbeFunction ?? "NanosaurScript_ProbeDeathJS");
      expect(deathResult).toBe(1);
    }
    if (target.fixture.pickupProbe === true && target.fixture.pickupProbeFunction !== undefined) {
      const pickupProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.pickupProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.pickupProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(pickupProbe?.result, pickupProbe?.error ?? "").toBe(target.fixture.pickupProbeResult ?? 0);
    }
    if (target.fixture.crystalPickupProbe === true) {
      const crystalPickupProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.crystalPickupProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.crystalPickupProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(crystalPickupProbe?.result, crystalPickupProbe?.error ?? "").toBe(target.fixture.crystalPickupProbeResult ?? 0);
    }
    if (target.fixture.eggRecoveryProbe === true) {
      const eggRecoveryProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.eggRecoveryProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.eggRecoveryProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(eggRecoveryProbe?.result, eggRecoveryProbe?.error ?? "").toBe(target.fixture.eggRecoveryProbeResult ?? 0);
    }
    if (target.fixture.shieldPickupProbe === true) {
      const shieldPickupProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.shieldPickupProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.shieldPickupProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(shieldPickupProbe?.result, shieldPickupProbe?.error ?? "").toBe(target.fixture.shieldPickupProbeResult ?? 0);
    }
    if (target.fixture.weaponPowerPickupProbe === true) {
      const weaponPowerPickupProbe = await page.evaluate((fixture) => {
        const runtime = window.Module;
        if (!runtime?.ccall || fixture.weaponPowerPickupProbeFunction === undefined) return null;
        return {
          result: runtime.ccall(fixture.weaponPowerPickupProbeFunction, "number", [], []),
          error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
        };
      }, target.fixture);
      expect(weaponPowerPickupProbe?.result, weaponPowerPickupProbe?.error ?? "").toBe(target.fixture.weaponPowerPickupProbeResult ?? 0);
    }
    if (target.fixture.nanosaur2PowerupPickupProbe === true) {
      for (const pickupKind of [0, 1, 2]) {
        const pickupProbe = await page.evaluate(({ functionName, kind }) => {
          const runtime = window.Module;
          if (!runtime?.ccall || functionName === undefined) return null;
          return {
            result: runtime.ccall(functionName, "number", ["number"], [kind]),
            error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
          };
        }, { functionName: target.fixture.nanosaur2PowerupPickupProbeFunction, kind: pickupKind });
        expect(pickupProbe?.result, `Nanosaur 2 pickup kind ${pickupKind}: ${pickupProbe?.error ?? ""}`).toBe(0);
      }
    }
    if (target.fixture.expectSplineReplacementLog === true) {
      expect(consoleMessages.some((message) => message.includes("spline replacement failed"))).toBe(true);
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
      const completed = await page.evaluate((probeFunction) => {
        const runtime = window.Module;
        if (!runtime?.ccall) return false;
        if (probeFunction !== undefined) {
          return runtime.ccall(probeFunction, "number", [], []) === 1;
        }
        runtime.ccall("WinLevel", "void", [], []);
        return true;
      }, target.fixture.levelCompleteProbeFunction);
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
    if (target.fixture.raceProgressProbe === true) {
      const progressResult = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return -1;
        return runtime.ccall(
          "CroMagScript_ProbeRaceProgressJS",
          "number",
          [],
          [],
        );
      });
      expect(progressResult).toBe(0);
    }
    if (target.fixture.cromagPickupSuppressionProbe === true) {
      for (const pickupKind of [0, 1]) {
        const pickupProbe = await page.evaluate(({ functionName, kind }) => {
          const runtime = window.Module;
          if (!runtime?.ccall || functionName === undefined) return null;
          return {
            result: runtime.ccall(functionName, "number", ["number"], [kind]),
            error: runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []),
          };
        }, { functionName: target.fixture.cromagPickupSuppressionProbeFunction, kind: pickupKind });
        expect(pickupProbe?.result, `Cro-Mag pickup kind ${pickupKind}: ${pickupProbe?.error ?? ""}`).toBe(0);
      }
    }
    if (target.fixture.areaCompletionProbe === true) {
      const completed = await page.evaluate(() => {
        const runtime = window.Module;
        if (!runtime?.ccall) return false;
        return runtime.ccall("BillyScript_ProbeAreaCompletionJS", "number", [], []) === 1;
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
    if (target.fixture.childCleanupProbe === true) {
      await expect.poll(
        () => consoleMessages.some((message) => message.includes("browser child destroy")),
      ).toBe(true);
    }
  }
  await page.waitForTimeout(
    target.fixture?.levelCompleteProbe === true ||
      target.fixture?.raceCompletionProbe === true ||
      target.fixture?.raceProgressProbe === true ||
      target.fixture?.areaCompletionProbe === true
      ? target.fixture?.raceCompletionProbe === true || target.fixture?.raceProgressProbe === true
        ? 7_000
        : 500
      : 8_000,
  );

  const completionProbeRequested =
    target.fixture?.levelCompleteProbe === true ||
    target.fixture?.raceCompletionProbe === true ||
    target.fixture?.raceProgressProbe === true ||
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
  if (!completionProbeRequested) {
    expect(status.lastError, consoleMessages.filter((message) => message.includes("scripting")).join("\n")).toBe("");
  }
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
  expect(pageErrors, consoleMessages.filter((message) => /error|abort|fatal|unreachable/i.test(message)).join("\n")).toEqual([]);

  if (target.fixture?.lifecycleProbe === true) {
    const rawLifecycleTrace = await page.evaluate(() => {
      const runtime = window.Module;
      if (!runtime?.ccall) return null;
      return runtime.ccall(
        "PangeaScript_GetStatusLifecycleTraceJSON",
        "string",
        [],
        [],
      );
    });
    const parsedLifecycleTrace = Result.fromThrowable(
      () => (rawLifecycleTrace === null ? null : JSON.parse(rawLifecycleTrace)),
      () => null,
    )().unwrapOr(null);
    const lifecycleTraceResult = nativeLifecycleTraceSchema.safeParse(
      parsedLifecycleTrace,
    );
    expect(lifecycleTraceResult.success).toBe(true);
    if (lifecycleTraceResult.success) {
      expect(lifecycleTraceResult.data.entryCount).toBe(
        lifecycleTraceResult.data.entries.length,
      );
      expect(lifecycleTraceResult.data.overflow).toBe(false);
      expect(
        lifecycleTraceResult.data.entries.every(
          (entry, index) => entry.order === index,
        ),
      ).toBe(true);
    }
  }

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
