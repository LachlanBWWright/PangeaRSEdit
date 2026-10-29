import { useLayoutEffect, useRef, useState } from "react";
import { ResultAsync } from "neverthrow";
import { toast } from "sonner";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { FenceData, HeaderData, ItemData, LiquidData, SplineData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { PreviewRuntimeFailure } from "@/editor/utils/gamePreviewRuntime";
import { buildExtendedLevelArchive, buildOriginalCompatibleArchive, prepareScriptPreviewBundle, type ScriptPreviewBundle } from "./scriptPreviewExportActions";
import { appendScriptDiagnostic, buildScriptPackageZipAsync, compileScriptWorkspaceAsync, importScriptPackageZipAsync, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { summarizeScriptWorkspace } from "./scriptWorkspaceSelectors";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { useAtom, useAtomValue } from "jotai";
import { EMPTY_SCRIPT_EVIDENCE, getScriptWorkspaceRevision, scriptWorkflowEvidenceAtom, scriptWorkflowEvidenceKey } from "./scriptWorkflowEvidence";
import { desktopProjectCommandsAtom } from "@/platform/desktop/projectState";
import { desktopBridge } from "@/platform/desktop/client";

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

const STALE_BUILD_MESSAGE = "Your scripts changed during validation. Build again to validate the current draft.";

export function useScriptRuntimeActions(input: Input) {
  const { workspace, update, persist } = input;
  const [evidenceByLevel, setEvidence] = useAtom(scriptWorkflowEvidenceAtom);
  const evidenceKey = scriptWorkflowEvidenceKey(workspace);
  const evidence = evidenceByLevel[evidenceKey] ?? EMPTY_SCRIPT_EVIDENCE;
  const recordRevision = (kind: "validatedRevision" | "launchedRevision", state: ScriptWorkspaceState) => {
    const revision = getScriptWorkspaceRevision(state);
    setEvidence((previous) => ({ ...previous, [evidenceKey]: { ...(previous[evidenceKey] ?? EMPTY_SCRIPT_EVIDENCE), [kind]: revision } }));
  };
  const currentWorkspace = useRef<ScriptWorkspaceState | null>(workspace);
  useLayoutEffect(() => {
    currentWorkspace.current = workspace;
    return () => { currentWorkspace.current = null; };
  }, [workspace]);
  const isCurrent = (compiled: ScriptWorkspaceState | null = null) =>
    currentWorkspace.current !== null && getScriptWorkspaceRevision(currentWorkspace.current) === getScriptWorkspaceRevision(compiled ?? workspace);
  const desktopCommands = useAtomValue(desktopProjectCommandsAtom);
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
  const build = async () => {
    setBusy(true);
    const result = await compileScriptWorkspaceAsync(workspace);
    setBusy(false);
    if (!isCurrent()) {
      toast.info(STALE_BUILD_MESSAGE);
      return null;
    }
    if (result.isErr()) {
      update((state) => ({ ...state, diagnostics: [
        ...state.diagnostics.filter((entry) => entry.category !== "source-validation"),
        ...result.error.diagnostics,
      ] }));
      if (result.error.diagnostics.length === 0) report(result.error.message);
      toast.error(result.error.message);
      return null;
    }
    persist(result.value);
    if (summarizeScriptWorkspace(result.value).buildErrorCount > 0) {
      toast.error("Resolve source and package errors before testing.");
      return null;
    }
    toast.success("Lua bundle validated. Test in game to verify behavior.");
    recordRevision("validatedRevision", result.value);
    return result.value;
  };
  const test = async (withScripts: boolean) => {
    const compiled = withScripts ? await build() : null;
    if (withScripts && !compiled) return;
    if (desktopBridge()) {
      if (!desktopCommands?.canSave) {
        report("Open a project level before testing in the desktop game.");
        return;
      }
      setBusy(true);
      await desktopCommands.test(withScripts);
      setBusy(false);
      return;
    }
    setBusy(true);
    const result = await prepareScriptPreviewBundle({ ...input, compiledState: compiled });
    setBusy(false);
    if (!isCurrent(compiled)) { toast.info(STALE_BUILD_MESSAGE); return; }
    if (result.isErr()) { report(result.error); return; }
    setPreview(result.value);
    setPreviewOpen(true);
    if (compiled) recordRevision("launchedRevision", compiled);
  };
  const exportPackage = async (kind: "extended" | "original" | "scripts") => {
    setBusy(true);
    const compiled = kind !== "original" ? await build() : null;
    if (kind !== "original" && !compiled) { setBusy(false); return; }
    if (kind === "scripts") {
      const result = await buildScriptPackageZipAsync(compiled ?? workspace);
      setBusy(false);
      if (!isCurrent(compiled)) { toast.info(STALE_BUILD_MESSAGE); return; }
      if (result.isErr()) report(result.error); else downloadBytes(result.value, `${workspace.context.gameId}-scripts.zip`);
      return;
    }
    const result = kind === "extended" && compiled
      ? await buildExtendedLevelArchive({ ...input, compiledState: compiled })
      : await buildOriginalCompatibleArchive(input);
    setBusy(false);
    if (!isCurrent(compiled)) { toast.info(STALE_BUILD_MESSAGE); return; }
    if (result.isErr()) report(result.error); else downloadBytes(result.value, `${kind}-level-${workspace.context.levelKey}.zip`);
  };
  const importPackage = async (file: File) => {
    setBusy(true);
    const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (read.isErr()) { report(read.error); setBusy(false); return; }
    const result = await importScriptPackageZipAsync(new Uint8Array(read.value), workspace.context);
    setBusy(false);
    if (!isCurrent()) { toast.info(STALE_BUILD_MESSAGE); return; }
    if (result.isErr()) report(result.error); else { persist(result.value); toast.success(`Imported ${file.name}`); }
  };
  return { build, test, exportPackage, importPackage, busy, preview, previewOpen, setPreviewOpen, reportFailure, evidence };
}
