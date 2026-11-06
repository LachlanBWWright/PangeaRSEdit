import { err, type Result } from "neverthrow";
import { BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals, type GlobalsInterface } from "@/data/globals/globals";
import { createObjectDefinition } from "./scriptObjectActions";
import { addScriptAsset, compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace, updateCustomObjectDefinition, upsertScriptSourceFile, type ScriptHookId, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import common from "./samples/common.lua?raw";
import bugdom from "./samples/bugdom-alarm.lua?raw";
import bugdom2 from "./samples/bugdom2-course.lua?raw";
import nanosaur from "./samples/nanosaur-nest.lua?raw";
import nanosaur2 from "./samples/nanosaur2-interception.lua?raw";
import cromag from "./samples/cromag-gates.lua?raw";
import billy from "./samples/billy-gallery.lua?raw";
import mike from "./samples/mike-lockdown.lua?raw";

export interface GameScriptingSample {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly globals: GlobalsInterface;
  readonly level: number;
  readonly terrain: string;
  readonly browserTerrain: string;
  readonly model: string;
  readonly modelObject: number;
  readonly scale: number;
  readonly source: string;
  readonly hooks: readonly ScriptHookId[];
}

const levelHooks: readonly ScriptHookId[] = ["onFrame", "onLevelStart", "onLevelUnload", "onPlayerRespawn"];
const areaHooks: readonly ScriptHookId[] = ["onAreaFrame", "onAreaStart", "onAreaUnload"];

export const GAME_SCRIPTING_SAMPLES: readonly GameScriptingSample[] = [
  { id: "bugdom-alarm", title: "Training — Ant alarm", description: "Approach the alarm to alert patrols. Roll into it to stop reinforcements.", globals: BugdomGlobals, level: 0,
    terrain: "Training.ter", browserTerrain: "assets/bugdom/terrain/Training.ter", model: "Models/Global_Models1.3dmf", modelObject: 2, scale: 1,
    source: bugdom, hooks: [...levelHooks, "onWeaponHit"] },
  { id: "bugdom2-course", title: "Garden — Platform checkpoint course", description: "Touch the start switch, ride moving platforms and collect three checkpoints. Respawning retains your last checkpoint.", globals: Bugdom2Globals, level: 0,
    terrain: "Level1_Garden.ter", browserTerrain: "assets/bugdom2/terrain/Level1_Garden.ter", model: "Models/Global.bg3d", modelObject: 27, scale: 2,
    source: bugdom2, hooks: [...levelHooks, "onCheckpointReached"] },
  { id: "nanosaur-nest", title: "Valley — Nest defence", description: "Pick up the marked egg to start three bounded defence waves. Survive, then carry on with the native egg objective.", globals: NanosaurGlobals, level: 0,
    terrain: "Level1.ter", browserTerrain: "assets/nanosaur/terrain/Level1.ter", model: "Models/Global_Models.3dmf", modelObject: 0, scale: 1,
    source: nanosaur, hooks: levelHooks },
  { id: "nanosaur2-interception", title: "Forest — Aerial interception", description: "Enter the marked airspace, evade interceptors and fly through three timed escape checkpoints.", globals: Nanosaur2Globals, level: 0,
    terrain: "level1.ter", browserTerrain: "assets/nanosaur2/terrain/level1.ter", model: "Models/global.bg3d", modelObject: 30, scale: 2,
    source: nanosaur2, hooks: levelHooks },
  { id: "cromag-gates", title: "Desert — Branching bonus gates", description: "Choose either bonus gate at each stage. Race the script clock independently of native lap rules.", globals: CroMagGlobals, level: 0,
    terrain: "StoneAge_Desert.ter", browserTerrain: "assets/croMag/terrain/StoneAge_Desert.ter", model: "Models/global.bg3d", modelObject: 12, scale: 1,
    source: cromag, hooks: ["onRaceFrame", "onRaceStart", "onRaceUnload"] },
  { id: "billy-gallery", title: "Swamp Shootout — Reactive gallery", description: "Shoot rotating targets, spare the flashing friendly and hit moving bonus targets to extend the timer.", globals: BillyFrontierGlobals, level: 1,
    terrain: "swamp_shootout.ter", browserTerrain: "assets/billyFrontier/terrain/swamp_shootout.ter", model: "Models/global.bg3d", modelObject: 13, scale: 1,
    source: billy, hooks: [...areaHooks, "onWeaponHit"] },
  { id: "mike-lockdown", title: "Prehistoric Plaza — Factory lockdown", description: "Touch switches to clear two lockdown waves, dodge moving hazards and open the exit gate.", globals: MightyMikeGlobals, level: 0,
    terrain: "jurassic.map-1", browserTerrain: "assets/mightyMike/terrain/jurassic.map-1", model: "Shapes/main.shapes", modelObject: 1, scale: 1,
    source: mike, hooks: [...areaHooks, "onPlayerRespawn"] },
];

export function createGameSampleWorkspace(sample: GameScriptingSample, model: Uint8Array): Result<ScriptWorkspaceState, string> {
  let state = ensureScriptWorkspace({}, createScriptWorkspaceContext(sample.globals, sample.level));
  const modelPath = `Data/Scripts/assets/models/${sample.id}.${sample.model.split(".").at(-1)}`;
  state = addScriptAsset(state, modelPath, model, sample.model);
  for (const role of ["marker", "target", "platform", "gate"]) {
    const created = createObjectDefinition(state, role, "blank");
    if (created.isErr()) return err(created.error);
    const definition = created.value.state.customObjects.find((entry) => entry.id === created.value.id);
    if (!definition) return err(`Could not create sample ${role}.`);
    const preset = role === "platform" ? "platform" : role === "gate" ? "solidBox" : "enemy";
    const planar = sample.globals.GAME_TYPE === MightyMikeGlobals.GAME_TYPE;
    state = updateCustomObjectDefinition(created.value.state, { ...definition,
      description: `Reusable ${role} for ${sample.title}. Encounter rules are in the level script.`,
      visual: { kind: "customDisplayGroup", modelPath, modelObject: sample.modelObject, scale: sample.scale, slot: 200 },
      collision: role === "marker" ? { kind: "none" } : { kind: "preset", preset,
        bounds: { width: planar ? 32 : role === "platform" ? 240 : 120, height: planar ? 32 : role === "platform" ? 40 : 160, depth: planar ? 1 : 120 } },
    });
    state = upsertScriptSourceFile(state, definition.sourceFilePath,
      role === "target" ? `local p=require("pangea")\nlocal object={}\nfunction object.onSpawn(self)\n  p.object.setHealthResult(self.handle,3)\n  p.object.setDamageResult(self.handle,0)\nend\nreturn {${definition.exportName}=object}\n` : `return {${definition.exportName}={}}\n`, "generated-assignment", definition.id);
  }
  state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/sample.lua", common);
  const path = `Data/Scripts/src/levels/${sample.id}.lua`;
  state = upsertScriptSourceFile(state, path, sample.source);
  const level = state.levels[state.context.levelKey];
  if (!level) return err("Could not create sample level scope.");
  state = { ...state, levels: { ...state.levels, [state.context.levelKey]: { ...level,
    globalHooks: sample.hooks.map((hookId) => ({ id: `${sample.id}-${hookId}`, behaviorId: sample.id, label: sample.title,
      sourceFilePath: path, tags: [], paramRefs: [], compatibility: "preview-ready", hookId })),
  } } };
  return compileScriptWorkspace(state);
}
