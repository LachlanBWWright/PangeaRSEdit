import { err, ok, ResultAsync } from "neverthrow";
import { OttoGlobals } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { openFile } from "@/editor/loadLogic/openFile";
import { createObjectDefinition } from "@/editor/subviews/scripts/scriptObjectActions";
import { addScriptAsset, createScriptWorkspaceContext, ensureScriptWorkspace, placeCustomObject, saveScriptSourceFile, updateCustomObjectDefinition, upsertScriptSourceFile } from "@/editor/subviews/scripts/scriptWorkspaceState";
import spawnerSource from "../editor/subviews/scripts/scriptOttoSpawner.lua?raw";

const source = spawnerSource.replace("__PANGEA_CUSTOM_OBJECT_EXPORT__", "custom_brain_port");

export async function loadBrainPortWorkflow() {
  const loaded: { level: AtomicLevelData | null; images: HTMLCanvasElement[] } = { level: null, images: [] };
  await openFile({ url: "/assets/ottoMatic/terrain/EarthFarm.ter", gameType: OttoGlobals,
    setGlobals: () => undefined, setMapFile: () => undefined, setMapImagesFile: () => undefined,
    setData: (level) => { loaded.level = level; }, setMapImages: (images) => { loaded.images = images; },
  });
  const level = loaded.level;
  if (!level?.headerData || !level.terrainData || !level.itemData || loaded.images.length === 0) return err("Could not load bundled Earth Farm terrain and textures.");
  const response = await ResultAsync.fromPromise(fetch("/games/ottomatic/models/level10_brainboss.bg3d"), () => "Could not fetch the bundled Brain Port model.");
  if (response.isErr()) return err(response.error);
  if (!response.value.ok) return err(`Brain Port model returned HTTP ${response.value.status}.`);
  const bytes = await ResultAsync.fromPromise(response.value.arrayBuffer(), () => "Could not read the Brain Port model.");
  if (bytes.isErr()) return err(bytes.error);
  const context = createScriptWorkspaceContext(OttoGlobals, 0);
  const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Brain Port", "blank");
  if (created.isErr()) return err(created.error);
  const definition = created.value.state.customObjects[0];
  if (!definition) return err("Brain Port definition missing.");
  const modelPath = "Data/Scripts/assets/models/brain-port.bg3d";
  let workspace = updateCustomObjectDefinition(created.value.state, { ...definition,
    description: "Spawns three Brain Aliens using independent Lua; reuses only the port model.",
    visual: { kind: "customDisplayGroup", modelPath, modelObject: 5, scale: 3.5, slot: 450 },
  });
  workspace = addScriptAsset(workspace, modelPath, new Uint8Array(bytes.value), "level10_brainboss.bg3d");
  workspace = upsertScriptSourceFile(workspace, definition.sourceFilePath, source);
  workspace = saveScriptSourceFile(workspace, definition.sourceFilePath);
  workspace = placeCustomObject(workspace, definition.id, "Brain Port near player start", { x: 340, y: 0, z: 2150 });
  return ok({ level: { ...level, headerData: level.headerData, terrainData: level.terrainData }, images: loaded.images, workspace });
}

export type BrainPortWorkflowFixture = Awaited<ReturnType<typeof loadBrainPortWorkflow>>;
