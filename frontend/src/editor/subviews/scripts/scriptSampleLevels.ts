import { err, ok, type Result } from "neverthrow";
import { OttoGlobals, Game, type GlobalsInterface } from "@/data/globals/globals";
import { createObjectDefinition } from "./scriptObjectActions";
import { addScriptAsset, createScriptWorkspaceContext, ensureScriptWorkspace, placeCustomObject, updateCustomObjectDefinition, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { setCustomPlacementActivation } from "./scriptPlacementActivation";
import { loadCustomThumbnailBytes } from "../items/customItemThumbnailSource";
import { openFile } from "@/editor/loadLogic/openFile";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { gameAssetUrl } from "@/assets/gameAssetUrls";
import { validateScriptWorkspaceAssetsAsync } from "./scriptAssetValidation";
import { createEarthFarmTransportWorkspace } from "./scriptTransportSample";
import { GAME_SCRIPTING_SAMPLES, createGameSampleWorkspace, type GameScriptingSample } from "./scriptGameSamples";
import { previewLevelNumber, rememberBaseLevel } from "@/editor/utils/previewLevelNumbers";

interface OttoScriptingSample {
  readonly id: "otto-earth-farm-brain-port" | "otto-earth-farm-transports";
  readonly title: string;
  readonly description: string;
  readonly globals: GlobalsInterface;
  readonly level: number;
  readonly terrain: string;
  readonly browserTerrain: string;
}

export type ScriptingSampleLevel = OttoScriptingSample | GameScriptingSample;

export const EARTH_FARM_BRAIN_PORT: ScriptingSampleLevel = {
  id: "otto-earth-farm-brain-port", title: "Earth Farm — Brain Alien spawner",
  description: "Level 1 with a persistent Brain Port near the start. Replenishes up to three living Brain Aliens while you are nearby.",
  globals: OttoGlobals, level: 0, terrain: "EarthFarm.ter", browserTerrain: "assets/ottoMatic/terrain/EarthFarm.ter",
};

export const EARTH_FARM_TRANSPORTS: ScriptingSampleLevel = {
  id: "otto-earth-farm-transports", title: "Earth Farm — Scripted saucer deployments",
  description: "A level-scoped Lua encounter: transports select clear landing routes and beam Brain Aliens down. Edit the entire sequence in Scripts.",
  globals: OttoGlobals, level: 0, terrain: "EarthFarm.ter", browserTerrain: "assets/ottoMatic/terrain/EarthFarm.ter",
};

export const SCRIPTING_SAMPLE_LEVELS: readonly ScriptingSampleLevel[] = [EARTH_FARM_BRAIN_PORT, EARTH_FARM_TRANSPORTS, ...GAME_SCRIPTING_SAMPLES];

export function createEarthFarmSpawnerWorkspace(modelBytes: Uint8Array): Result<ScriptWorkspaceState, string> {
  const context = createScriptWorkspaceContext(OttoGlobals, 0);
  const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Brain Port", "otto.custom.spawner");
  if (created.isErr()) return err(created.error);
  const definition = created.value.state.customObjects.find((object) => object.id === created.value.id);
  if (!definition) return err("Could not create the Brain Port definition.");
  const modelPath = "Data/Scripts/assets/models/brain-port.bg3d";
  let workspace = updateCustomObjectDefinition(created.value.state, { ...definition,
    description: "An independent Brain Alien spawner near Earth Farm's player start. Edit its shared settings or Lua to change the encounter.",
    visual: { kind: "customDisplayGroup", modelPath, modelObject: 5, scale: 3.5, slot: 209 },
  });
  workspace = addScriptAsset(workspace, modelPath, modelBytes, "level10_brainboss.bg3d");
  workspace = placeCustomObject(workspace, definition.id, "Brain Port near player start", { x: 340, y: 0, z: 2150 });
  const placement = workspace.levels[context.levelKey]?.customPlacements.at(-1);
  return placement ? setCustomPlacementActivation(workspace, placement.id, { kind: "always" })
    : err("Could not place the Brain Port in Earth Farm.");
}

export interface LoadedScriptingSample {
  readonly data: AtomicLevelData;
  readonly images: HTMLCanvasElement[];
  readonly mapFile: File;
  readonly mapImagesFile: File;
  readonly workspace: ScriptWorkspaceState;
}

export async function loadScriptingSampleLevel(sample: ScriptingSampleLevel): Promise<Result<LoadedScriptingSample, string>> {
  const workspace = await loadSampleWorkspace(sample);
  if (workspace.isErr()) return err(workspace.error);
  const valid = await validateScriptWorkspaceAssetsAsync(workspace.value);
  if (valid.isErr()) return err(valid.error);
  const loaded: { data: AtomicLevelData | null; images: HTMLCanvasElement[]; mapFile: File | null; mapImagesFile: File | null } = { data: null, images: [], mapFile: null, mapImagesFile: null };
  const folder = sample.globals.GAME_TYPE === Game.MIGHTY_MIKE ? "Maps" : "Terrain";
  const versioned = gameAssetUrl(sample.globals.GAME_TYPE, `${folder}/${sample.terrain}`, `${import.meta.env.BASE_URL}${sample.browserTerrain}`);
  // openFile adds companion extensions; fetchAsset versions the completed paths.
  const url = versioned.split("?")[0] ?? versioned;
  await openFile({ url, gameType: sample.globals, setGlobals: () => undefined,
    setData: (data) => { loaded.data = data; }, setMapImages: (images) => { loaded.images = images; },
    setMapFile: (file) => { loaded.mapFile = file; }, setMapImagesFile: (file) => { loaded.mapImagesFile = file; },
  });
  if (!loaded.data?.headerData || !loaded.data.terrainData || !loaded.mapFile || !loaded.mapImagesFile || !loaded.images.length) return err(`Could not load ${sample.title} and its textures. Check that ${sample.globals.GAME_NAME}'s game assets are installed.`);
  return ok({ data: loaded.data, images: loaded.images, mapImagesFile: loaded.mapImagesFile,
    mapFile: rememberBaseLevel(new File([loaded.mapFile], sampleFilename(sample)), previewLevelNumber(sample.globals.GAME_TYPE, sample.level)), workspace: workspace.value });
}

export function sampleFilename(sample: ScriptingSampleLevel): string {
  if (sample.id === EARTH_FARM_TRANSPORTS.id) return "EarthFarm-Transports.ter.rsrc";
  if (sample.id === EARTH_FARM_BRAIN_PORT.id) return "EarthFarm-BrainPort.ter.rsrc";
  const suffix = sample.globals.GAME_TYPE === Game.MIGHTY_MIKE ? ".map-1" : sample.globals.GAME_TYPE === Game.NANOSAUR ? ".ter" : ".ter.rsrc";
  return `${sample.id}${suffix}`;
}

async function loadSampleWorkspace(sample: ScriptingSampleLevel): Promise<Result<ScriptWorkspaceState, string>> {
  if ("model" in sample) {
    const bytes = await loadCustomThumbnailBytes(sample.globals.GAME_TYPE, sample.model, {});
    return bytes.isErr() ? err(bytes.error) : createGameSampleWorkspace(sample, new Uint8Array(bytes.value));
  }
  return sample.id === EARTH_FARM_TRANSPORTS.id ? createEarthFarmTransportWorkspace() : loadSpawnerWorkspace();
}

async function loadSpawnerWorkspace(): Promise<Result<ScriptWorkspaceState, string>> {
  const model = await loadCustomThumbnailBytes(OttoGlobals.GAME_TYPE, "Models/level10_brainboss.bg3d", {});
  return model.isErr() ? err(model.error) : createEarthFarmSpawnerWorkspace(new Uint8Array(model.value));
}
