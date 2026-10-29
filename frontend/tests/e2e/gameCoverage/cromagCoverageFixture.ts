export const raceCompletionScript = `local pangea = require("pangea")
local entry = {}
local marker, frame, finishes = nil, 0, 0
function entry.onRaceFinish(ctx)
  assert(ctx.playerNum == 0, "completion leaked to another racer")
  finishes = finishes + 1
end
function entry.onFrame(ctx)
  frame = frame + 1
  local player = pangea.player.get(0)
  if not marker then marker = assert(pangea.spawn.scripted("reload-probe", player.position)) end
  if frame >= 2 and frame <= 12 then
    assert(pangea.level.complete(0, true).ok, "native race completion rejected")
  end
  local state = pangea.object.state(marker)
  state.frames = frame
  state.finishes = finishes
  state.complete = pangea.player.get(0).raceComplete
  state.otherComplete = pangea.player.get(1).raceComplete
end
return entry
`;

export const ruleOwnershipScript = `local pangea = require("pangea")
local entry = {}
local marker, frame = nil, 0
function entry.onFrame(ctx)
  frame = frame + 1
  if not marker then marker = assert(pangea.spawn.scripted("reload-probe", pangea.player.get(0).position)) end
  local state = pangea.object.state(marker)
  if frame == 1 then
    assert(not pangea.level.rulesControlled(), "rules should initially belong to native game")
    local initial = pangea.player.getState(0, "lap")
    local other = pangea.player.getState(1, "lap")
    local rejected = pangea.player.setState(0, "lap", initial + 1)
    assert(not rejected.ok and rejected.reason == "incompatible-item", "native lap ownership not protected")
    assert(pangea.player.getState(0, "lap") == initial, "rejected write mutated lap")
    assert(pangea.level.setRulesControlled(true).ok and pangea.level.rulesControlled())
    local invalid = pangea.player.setState(0, "lap", 1.5)
    assert(not invalid.ok and invalid.reason == "bad-argument", "fractional lap accepted")
    assert(pangea.player.getState(0, "lap") == initial, "invalid write mutated lap")
    assert(pangea.player.setState(0, "lap", initial + 1).ok, "owned lap write rejected")
    assert(pangea.player.getState(0, "lap") == initial + 1, "native lap did not change")
    assert(pangea.player.getState(1, "lap") == other, "lap write leaked to second player")
    assert(pangea.player.setState(0, "lap", initial).ok, "native lap restore rejected")
    assert(pangea.player.getState(0, "lap") == initial, "native lap restore did not restore value")
    assert(pangea.level.setRulesControlled(false).ok and not pangea.level.rulesControlled())
    local restored = pangea.player.setState(0, "lap", initial + 1)
    assert(not restored.ok and restored.reason == "incompatible-item", "restored native rules no longer protect lap")
    assert(pangea.player.getState(0, "lap") == initial, "rejected write after rule restoration mutated lap")
    assert(pangea.player.getState(1, "lap") == other, "rule restoration mutated second player lap")
    state.nativeProtected = true
    state.invalidRejected = true
    state.playerIsolated = true
    state.rulesRestored = true
  end
  state.frames = frame
end
return entry
`;

export const captureCompletionScript = `local pangea = require("pangea")
local entry = {}
local marker, frame, completions, raceFinishes = nil, 0, 0, 0
function entry.onLevelComplete(ctx)
  completions = completions + 1
  assert(completions == 1 and raceFinishes == 0, "capture emitted duplicate or racing completion")
  pangea.log.info("coverage capture completed")
end
function entry.onRaceFinish(ctx) raceFinishes = raceFinishes + 1 end
function entry.onFrame(ctx)
  frame = frame + 1
  if not marker then marker = assert(pangea.spawn.scripted("reload-probe", pangea.player.get(0).position)) end
  local state = pangea.object.state(marker)
  if frame == 1 then
    local rejected = pangea.level.complete(0, true)
    assert(not rejected.ok and rejected.reason == "incompatible-item", "native capture rules accepted scripted win")
    state.nativeProtected = true
    assert(pangea.level.setRulesControlled(true).ok, "capture rule claim failed")
  elseif frame <= 12 then
    assert(pangea.level.complete(0, true).ok, "owned capture completion failed")
  end
  state.frames = frame
  state.completions = completions
  state.raceFinishes = raceFinishes
end
return entry
`;
