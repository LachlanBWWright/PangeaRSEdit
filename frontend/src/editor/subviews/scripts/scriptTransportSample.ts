import { err, type Result } from "neverthrow";
import { OttoGlobals } from "@/data/globals/globals";
import { createObjectDefinition } from "./scriptObjectActions";
import { createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile, updateCustomObjectDefinition, compileScriptWorkspace, type ScriptWorkspaceState, type ScriptHookId } from "./scriptWorkspaceState";
import arrival from "./scriptActorArrival.lua?raw";
import landing from "./scriptLandingSearch.lua?raw";
import deployment from "./scriptSaucerDeployment.lua?raw";

const sourcePath = "Data/Scripts/src/levels/earth-farm-transports.lua";
const hooks: readonly ScriptHookId[] = ["onLevelStart", "onFrame", "onLevelUnload", "onPlayerRespawn"];

export function createEarthFarmTransportWorkspace(): Result<ScriptWorkspaceState, string> {
  let state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  // Global model enum indices from Otto's mobjtypes.h; no native saucer controller is used.
  for (const visual of [
    { label: "Transport top", modelObject: 23, scale: 1.1 },
    { label: "Transport bottom", modelObject: 24, scale: 1.1 },
    { label: "Transport beam", modelObject: 25, scale: 1.1 },
  ]) {
    const created = createObjectDefinition(state, visual.label, "blank");
    if (created.isErr()) return err(created.error);
    const definition = created.value.state.customObjects.find((entry) => entry.id === created.value.id);
    if (!definition) return err("Could not create transport visual.");
    state = updateCustomObjectDefinition(created.value.state, { ...definition,
      visual: { kind: "nativeDisplayGroup", group: "global", modelObject: visual.modelObject, scale: visual.scale, slot: 450 },
    });
  }
  state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/actor-arrival.lua", `local pangea = require("pangea")\n${arrival}\nreturn arrivals`);
  state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/landing-search.lua", landing);
  state = upsertScriptSourceFile(state, sourcePath, deployment);
  const level = state.levels[state.context.levelKey];
  if (!level) return err("Could not create Earth Farm script scope.");
  state = { ...state, levels: { ...state.levels, [state.context.levelKey]: { ...level,
    globalHooks: hooks.map((hookId) => ({ id: `transport-${hookId}`, behaviorId: "sample.transport",
      label: "Scripted saucer deployment", sourceFilePath: sourcePath, tags: [], paramRefs: [],
      compatibility: "preview-ready", hookId })),
  } } };
  return compileScriptWorkspace(state);
}
