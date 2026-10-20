import { useState } from "react";
import { ResultAsync } from "neverthrow";
import { toast } from "sonner";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { FenceData, HeaderData, ItemData, LiquidData, SplineData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { PreviewRuntimeFailure } from "@/editor/utils/gamePreviewRuntime";
import { buildExtendedLevelArchive, buildOriginalCompatibleArchive, prepareScriptPreviewBundle, type ScriptPreviewBundle } from "./scriptPreviewExportActions";
import { appendScriptDiagnostic, buildScriptPackageZipAsync, compileScriptWorkspace, importScriptPackageZipAsync, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { summarizeScriptWorkspace } from "./scriptWorkspaceSelectors";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export interface ScriptLevelInput {
  headerData: HeaderData;
  itemData: ItemData | null;
  liquidData: LiquidData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  terrainData: TerrainData;
  mapImages: readonly HTMLCanvasElement[];
}

interface Input extends ScriptLevelInput {
  globals: GlobalsInterface;
  levelNumber: number | null;
  workspace: ScriptWorkspaceState;
  update: UpdateScriptWorkspace;
  persist: (state: ScriptWorkspaceState) => void;
}

export function useScriptRuntimeActions(input: Input) {
  const { workspace, update, persist } = input;
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ScriptPreviewBundle | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const reportFailure = (failure: PreviewRuntimeFailure) => {
    update((state) => appendScriptDiagnostic(state, {
      category: failure.category, severity: "error", code: failure.code, message: failure.message,
      filePath: failure.category === "packaging" ? "Data/Scripts/config" : "Data/Scripts/dist/main.lua", line: 0, column: 0,
    }));
  };
  const report = (message: string) => {
    reportFailure({ category: "packaging", code: "package.action", message });
    toast.error(message);
  };
  const build = () => {
    const result = compileScriptWorkspace(workspace);
    if (result.isErr()) { report(result.error); return null; }
    persist(result.value);
    if (summarizeScriptWorkspace(result.value).buildErrorCount > 0) {
      toast.error("Resolve source and package errors before testing.");
      return null;
    }
    toast.success("Bundle generated. Test in game to verify behavior.");
    return result.value;
  };
  const test = async (withScripts: boolean) => {
    const compiled = withScripts ? build() : null;
    if (withScripts && !compiled) return;
    setBusy(true);
    const result = await prepareScriptPreviewBundle({ ...input, compiledState: compiled });
    setBusy(false);
    if (result.isErr()) { report(result.error); return; }
    setPreview(result.value);
    setPreviewOpen(true);
  };
  const exportPackage = async (kind: "extended" | "original" | "scripts") => {
    setBusy(true);
    if (kind === "scripts") {
      const result = await buildScriptPackageZipAsync(workspace);
      setBusy(false);
      if (result.isErr()) report(result.error); else downloadBytes(result.value, `${workspace.context.gameId}-scripts.zip`);
      return;
    }
    const compiled = kind === "extended" ? build() : null;
    if (kind === "extended" && !compiled) { setBusy(false); return; }
    const result = kind === "extended" && compiled
      ? await buildExtendedLevelArchive({ ...input, compiledState: compiled })
      : await buildOriginalCompatibleArchive(input);
    setBusy(false);
    if (result.isErr()) report(result.error); else downloadBytes(result.value, `${kind}-level-${workspace.context.levelKey}.zip`);
  };
  const importPackage = async (file: File) => {
    setBusy(true);
    const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (read.isErr()) { report(read.error); setBusy(false); return; }
    const result = await importScriptPackageZipAsync(new Uint8Array(read.value), workspace.context);
    setBusy(false);
    if (result.isErr()) report(result.error); else { persist(result.value); toast.success(`Imported ${file.name}`); }
  };
  return { build, test, exportPackage, importPackage, busy, preview, previewOpen, setPreviewOpen, reportFailure };
}
