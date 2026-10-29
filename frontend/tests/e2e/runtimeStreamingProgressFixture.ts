import { expect, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { routeRuntimeCallbacks } from "./runtimeScriptLifecycle";

const streamingSourceSchema = z.object({
  itemIndex: z.number().int().nonnegative(), nativeType: z.literal(1),
  x: z.number().nonnegative(), z: z.number().nonnegative(),
  width: z.number().positive(), depth: z.number().positive(),
});

export async function installStreamingProbe(page: Page) {
  const text = await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeStreamingSourceJS", "string", [], []));
  const parsedText = z.string().safeParse(text);
  expect(parsedText.success).toBe(true);
  if (!parsedText.success) return false;
  const json = Result.fromThrowable((): unknown => JSON.parse(parsedText.data), () => "Invalid native source JSON")();
  expect(json.isOk()).toBe(true);
  if (json.isErr()) return false;
  const source = streamingSourceSchema.safeParse(json.value);
  expect(source.success).toBe(true);
  if (!source.success) return false;
  const farX = source.data.x < source.data.width / 2 ? source.data.width - 1600 : 1600;
  const farZ = source.data.z < source.data.depth / 2 ? source.data.depth - 1600 : 1600;
  return installAcceptanceProbe(page, streamingProbeScript(source.data.x, source.data.z, farX, farZ), source.data);
}

export async function installAcceptanceProbe(page: Page, script: string, replacement?: z.infer<typeof streamingSourceSchema>) {
  const result = await page.evaluate(({ source, terrainReplacement }) => {
    const runtime = window.Module;
    if (!runtime?.FS?.readFile || !runtime.FS.writeFile || !runtime.ccall) return null;
    const modelPath = "Data/Scripts/assets/models/reload.bg3d";
    const definitions = ["acceptance-marker", "streamed-probe", "owned-child"].map((id) => ({
      id, visual: { kind: "customDisplayGroup", modelPath, modelObject: 0 },
    }));
    const level = terrainReplacement ? 0 : 2;
    runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode(source));
    runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({
      version: 1, levels: { [level]: {
        script: "Data/Scripts/dist/main.lua", customObjects: definitions,
        terrainReplacements: terrainReplacement ? [{
          itemIndex: terrainReplacement.itemIndex, nativeType: terrainReplacement.nativeType,
          x: terrainReplacement.x, z: terrainReplacement.z, customObjectId: "streamed-probe", strict: true,
        }] : [],
      } },
    })));
    return runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
  }, { source: routeRuntimeCallbacks(`${script}\n`), terrainReplacement: replacement });
  expect(result).toBe(0);
  return result === 0;
}

export function streamingProbeScript(x: number, z: number, farX: number, farZ: number) {
  return `local pangea = require("pangea")
local entry = {}
local marker, first, child, replacement
local ticks, ticksAtExit, streamIns, streamOuts, frame = 0, 0, 0, 0, 0
local taskTicks, tasksAtExit, ownerEvents, eventsAtExit = 0, 0, 0, 0
local stage, stageFrame = "initial-out", 0
local function movePlayer(x, z)
  local terrain = assert(pangea.world.sampleTerrain(x, z), "terrain unavailable")
  assert(pangea.player.setPosition(0, {x=x, y=terrain.height+300, z=z}), "player move failed")
  assert(pangea.player.setVelocity(0, {x=0,y=0,z=0}), "player stop failed")
end
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "streamed-probe" then return end
  if ctx.event == "spawn" then
    local source = assert(pangea.object.source(ctx.object), "missing native terrain source")
    assert(source.kind == "terrain" and source.x == ${x} and source.z == ${z}, "wrong source")
    if not first then
      first = ctx.object
      child = assert(pangea.spawn.scripted("owned-child", ctx.position), "owned child missing")
      pangea.time.every(0.01, function() ticks = ticks + 1 end)
      pangea.task.start(function()
        while true do taskTicks=taskTicks+1; pangea.task.wait(0.01) end
      end)
      pangea.events.on("stream-owner-probe", function() ownerEvents=ownerEvents+1 end)
    else replacement = ctx.object end
  elseif ctx.event == "streamIn" then streamIns = streamIns + 1
  elseif ctx.event == "streamOut" then
    streamOuts = streamOuts + 1
    ticksAtExit = ticks
    tasksAtExit = taskTicks; eventsAtExit = ownerEvents
  end
end
function entry.onFrame(ctx)
  frame = frame + 1
  pangea.events.emit("stream-owner-probe", {})
  if not marker then marker = assert(pangea.spawn.scripted("acceptance-marker", pangea.player.get(0).position)) end
  local elapsed = frame-stageFrame
  if stage == "initial-out" then
    movePlayer(${farX}, ${farZ})
    if elapsed > 150 then stage="first-in"; stageFrame=frame end
  elseif stage == "first-in" then
    movePlayer(${x}, ${z})
    if first and ticks > 3 and taskTicks > 3 and ownerEvents > 3 and elapsed > 90 then stage="stream-out"; stageFrame=frame end
  elseif stage == "stream-out" then
    movePlayer(${farX}, ${farZ})
    if streamOuts > 0 and elapsed > 120 then
      assert(not pangea.object.exists(first), "old terrain handle survived stream-out")
      assert(not pangea.object.exists(child), "owned child survived stream-out")
      assert(ticks == ticksAtExit, "owned timer survived stream-out")
      assert(taskTicks == tasksAtExit, "owned task survived stream-out")
      assert(ownerEvents == eventsAtExit, "owned subscription survived stream-out")
      stage="second-in"; stageFrame=frame
    end
  elseif stage == "second-in" then
    movePlayer(${x}, ${z})
    if replacement and streamIns >= 2 and elapsed > 90 then
      assert(not pangea.object.exists(first), "old handle revived on re-entry")
      assert(first.id ~= replacement.id or first.generation ~= replacement.generation, "source reused stale generation")
      stage="complete"
    end
  end
  local state = pangea.object.state(marker)
  state.stage=stage; state.frames=frame; state.streamIns=streamIns; state.streamOuts=streamOuts
  state.oldExists=first and pangea.object.exists(first) or false
  state.childExists=child and pangea.object.exists(child) or false
  state.ticks=ticks; state.ticksAtExit=ticksAtExit
  state.taskTicks=taskTicks; state.tasksAtExit=tasksAtExit
  state.ownerEvents=ownerEvents; state.eventsAtExit=eventsAtExit
  state.oldId=first and first.id; state.oldGeneration=first and first.generation
  state.replacementId=replacement and replacement.id; state.replacementGeneration=replacement and replacement.generation
end
return entry`;
}

export const raceProgressScript = `local pangea = require("pangea")
local entry = {}
local marker
local checkpoints, laps, finishes = 0, 0, 0
local lastCheckpoint, lastLap = -1, -1
function entry.onCheckpointReached(ctx)
  if ctx.playerNum ~= 0 then return end
  checkpoints=checkpoints+1; lastCheckpoint=ctx.eventValue
end
function entry.onLapComplete(ctx)
  if ctx.playerNum ~= 0 then return end
  laps=laps+1; lastLap=ctx.eventValue
end
function entry.onRaceFinish(ctx) if ctx.playerNum == 0 then finishes=finishes+1 end end
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  if not marker then marker=assert(pangea.spawn.scripted("acceptance-marker", player.position)) end
  local state=pangea.object.state(marker)
  state.checkpoints=checkpoints; state.laps=laps; state.finishes=finishes
  state.lastCheckpoint=lastCheckpoint; state.lastLap=lastLap
  state.nativeCheckpoint=player.checkpointNum; state.nativeLap=player.lapNum
  state.nativeComplete=player.raceComplete
end
return entry`;
