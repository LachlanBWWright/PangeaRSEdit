import { errAsync, ResultAsync } from "neverthrow";
import { Game, type GlobalsInterface } from "@/data/globals/globals";
import {
  addScriptAsset,
  createScriptWorkspaceContext,
  createCustomObjectFromBehavior,
  loadScriptSample,
  moveCustomPlacement,
  placeCustomObject,
  updateCustomObjectDefinition,
  type ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";

interface ScriptItemDemoAsset {
  readonly sourcePath: string;
  readonly runtimePath: string;
  readonly modelObject: number;
}

const SCRIPT_ITEM_DEMO_ASSETS: Readonly<Record<Game, ScriptItemDemoAsset>> = {
  [Game.OTTO_MATIC]: {
    sourcePath: "games/ottomatic/models/global.bg3d",
    runtimePath: "Data/Scripts/assets/models/demo-ottomatic.bg3d",
    modelObject: 0,
  },
  [Game.BUGDOM]: {
    sourcePath: "games/bugdom1/models/Global_Models2.3dmf",
    runtimePath: "Data/Scripts/assets/models/demo-bugdom.3dmf",
    modelObject: 0,
  },
  [Game.BUGDOM_2]: {
    sourcePath: "games/bugdom2/models/Global.bg3d",
    runtimePath: "Data/Scripts/assets/models/demo-bugdom2.bg3d",
    modelObject: 0,
  },
  [Game.NANOSAUR]: {
    sourcePath: "games/nanosaur1/models/Global_Models.3dmf",
    runtimePath: "Data/Scripts/assets/models/demo-nanosaur.3dmf",
    modelObject: 0,
  },
  [Game.NANOSAUR_2]: {
    sourcePath: "games/nanosaur2/models/global.bg3d",
    runtimePath: "Data/Scripts/assets/models/demo-nanosaur2.bg3d",
    modelObject: 0,
  },
  [Game.CRO_MAG]: {
    sourcePath: "games/cromagrally/models/global.bg3d",
    runtimePath: "Data/Scripts/assets/models/demo-cromag.bg3d",
    modelObject: 0,
  },
  [Game.BILLY_FRONTIER]: {
    sourcePath: "games/billyfrontier/models/global.bg3d",
    runtimePath: "Data/Scripts/assets/models/demo-billy-frontier.bg3d",
    modelObject: 0,
  },
  [Game.MIGHTY_MIKE]: {
    sourcePath: "data/mightymike/shapes/main.shapes",
    runtimePath: "Data/Scripts/assets/models/demo-mighty-mike.shapes",
    modelObject: 0,
  },
};

function buildDemoWorkspace(
  globals: GlobalsInterface,
  levelNumber: number,
  asset: ScriptItemDemoAsset,
  bytes: ArrayBuffer,
): ScriptWorkspaceState {
  const context = createScriptWorkspaceContext(globals, levelNumber);
  let state = loadScriptSample(context, "hover-beacon");
  const hoverBeaconPlacement = state.levels[context.levelKey]?.customPlacements.find(
    (placement) => placement.objectId === "sample.hoverBeacon",
  );
  if (hoverBeaconPlacement) {
    state = moveCustomPlacement(state, hoverBeaconPlacement.id, {
      x: -160,
      y: 160,
      z: 0,
    });
  }
  const objectId = "demo.script-item";
  state = createCustomObjectFromBehavior(
    state,
    "sample.hover-beacon",
    objectId,
    "Script Item Demo",
  );
  const definition = state.customObjects.find(
    (candidate) => candidate.id === objectId,
  );
  if (!definition) return state;

  state = updateCustomObjectDefinition(state, {
    ...definition,
    visual: {
      kind: "customDisplayGroup",
      modelPath: asset.runtimePath,
      modelObject: asset.modelObject,
      scale: 1,
      slot: 450,
    },
    collision: {
      kind: "preset",
      preset: "solidBox",
      bounds: { width: 80, height: 80, depth: 80 },
    },
  });
  state = addScriptAsset(
    state,
    asset.runtimePath,
    new Uint8Array(bytes),
    asset.sourcePath,
  );
  return placeCustomObject(state, objectId, "Script Item Demo", {
    x: 160,
    y: 80,
    z: 0,
  });
}

export function createScriptItemDemoWorkspace(
  globals: GlobalsInterface,
): ResultAsync<ScriptWorkspaceState, string> {
  const asset = SCRIPT_ITEM_DEMO_ASSETS[globals.GAME_TYPE];
  const levelNumber = GAME_PORT_CONFIGS[globals.GAME_TYPE]?.defaultLevel ?? 0;
  if (!asset) return errAsync("No script item demo asset is configured for this game.");

  const url = `${import.meta.env.BASE_URL}${asset.sourcePath}`;
  return ResultAsync.fromPromise(
    fetch(url),
    () => `Could not load script item demo asset: ${asset.sourcePath}`,
  ).andThen((response) => {
    if (!response.ok) {
      return errAsync(
        `Could not load script item demo asset: ${asset.sourcePath} (${String(response.status)})`,
      );
    }
    return ResultAsync.fromPromise(
      response.arrayBuffer(),
      () => `Could not read script item demo asset: ${asset.sourcePath}`,
    );
  }).map((bytes) => buildDemoWorkspace(globals, levelNumber, asset, bytes));
}
