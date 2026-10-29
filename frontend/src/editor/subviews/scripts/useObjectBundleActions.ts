import { useEffect, useRef, useState } from "react";
import { useStore } from "jotai";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import { portableAssetImportSchema, projectAssetSchema, type ProjectAsset } from "@pangea/desktop-contracts";
import { desktopBridge, desktopRequest } from "@/platform/desktop/client";
import { buildScriptDefinitionBundleAsync, importScriptDefinitionBundle, type ScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { applyObjectImport, undoObjectImport, type ObjectImportMode, type ObjectImportUndo } from "./scriptObjectImport";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import { sameScriptAuthoringAssets } from "./scriptAuthoringAttachments";
import { ensureScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { getScriptWorkspaceRevision } from "./scriptWorkflowEvidence";

interface Input {
  workspace: ScriptWorkspaceState;
  persist: (state: ScriptWorkspaceState) => void;
  onSelect: (id: string | null) => void;
  onError: (message: string | null) => void;
}

export function useObjectBundleActions({ workspace, persist, onSelect, onError }: Input) {
  const store = useStore();
  const lifecycle = useRef({ active: true, generation: 0 });
  useEffect(() => {
    const current = lifecycle.current;
    current.active = true;
    return () => { current.active = false; current.generation++; };
  }, [workspace.context.gameId, workspace.context.levelKey]);
  const [pending, setPending] = useState<ScriptDefinitionBundle | null>(null);
  const [undo, setUndo] = useState<ObjectImportUndo | null>(null);
  const [undoReceipt, setUndoReceipt] = useState<string | null>(null);
  const [projectAssets, setProjectAssets] = useState<readonly ProjectAsset[]>([]);
  const [importing, setImporting] = useState(false);
  const [exportIds, setExportIds] = useState<readonly string[]>([]);
  const [includeAuthoringSources, setIncludeAuthoringSources] = useState(false);
  const [exporting, setExporting] = useState(false);
  const selectedIds = exportIds.filter((id) => workspace.customObjects.some((object) => object.id === id));

  const readBundle = async (file: File) => {
    onError(null);
    const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (read.isErr()) { onError(read.error); return; }
    const result = importScriptDefinitionBundle(new Uint8Array(read.value), workspace.context);
    if (result.isErr()) { onError(result.error); return; }
    if (desktopBridge() && result.value.authoringAssets?.assets.length) {
      const assets = await desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema));
      if (assets.isErr()) { onError(assets.error.message); return; }
      setProjectAssets(assets.value);
    } else setProjectAssets([]);
    setPending(result.value);
  };
  const importBundle = async (mode: ObjectImportMode) => {
    if (!pending || importing) return;
    const result = applyObjectImport(workspace, pending, mode, projectAssets);
    if (result.isErr()) { onError(result.error); return; }
    const generation = lifecycle.current.generation;
    const revision = getScriptWorkspaceRevision(workspace);
    const authoring = workspace.authoringAssets;
    setImporting(true);
    let receipt: string | null = null;
    if (desktopBridge() && result.value.attachment?.assets.length) {
      const restored = await desktopRequest({ operation: "assets.import-reversible", attachment: result.value.attachment }, portableAssetImportSchema);
      if (restored.isErr()) { setImporting(false); onError(restored.error.message); return; }
      receipt = restored.value.id;
    }
    const current = ensureScriptWorkspace(store.get(scriptWorkspaceStoreAtom), workspace.context);
    if (!lifecycle.current.active || lifecycle.current.generation !== generation
      || getScriptWorkspaceRevision(current) !== revision || !sameScriptAuthoringAssets(current.authoringAssets, authoring)) {
      const rollback = receipt ? await desktopRequest({ operation: "assets.undo-import", id: receipt }, z.array(projectAssetSchema)) : null;
      if (lifecycle.current.active) {
        setImporting(false);
        onError(rollback?.isErr() ? `Workspace changed during import; desktop rollback failed: ${rollback.error.message}` : "Workspace changed during import. No import was applied; review the current workspace and retry.");
      }
      return;
    }
    persist(result.value.state);
    onSelect(result.value.selectedId);
    setUndo(result.value.undo);
    setUndoReceipt(receipt);
    setPending(null);
    setImporting(false);
    onError(null);
  };
  const undoImport = async () => {
    if (!undo || importing) return;
    const result = undoObjectImport(workspace, undo);
    if (result.isErr()) { onError(result.error); return; }
    setImporting(true);
    if (undoReceipt) {
      const restored = await desktopRequest({ operation: "assets.undo-import", id: undoReceipt }, z.array(projectAssetSchema));
      if (restored.isErr()) { setImporting(false); onError(restored.error.message); return; }
    }
    persist(result.value);
    setUndo(null);
    setUndoReceipt(null);
    setImporting(false);
    onSelect(null);
    onError(null);
  };
  const exportBundle = async (selectionOnly: boolean) => {
    setExporting(true);
    const result = await buildScriptDefinitionBundleAsync(workspace, {
      includeAuthoringSources,
      ...(selectionOnly ? { definitionIds: selectedIds } : {}),
    });
    setExporting(false);
    if (result.isErr()) { onError(result.error); return; }
    onError(null);
    downloadBytes(result.value, `${workspace.context.gameId}-${selectionOnly ? "selected-objects" : "objects"}.zip`);
  };
  const toggleExport = (id: string, checked: boolean) => {
    setExportIds((current) => checked ? [...new Set([...current, id])] : current.filter((entry) => entry !== id));
  };
  return { pending, cancelImport: () => { if (!importing) setPending(null); }, readBundle, importBundle, undoImport, canUndo: undo !== null && !importing, importing, projectAssets,
    selectedIds, toggleExport, includeAuthoringSources, setIncludeAuthoringSources, exporting, exportBundle };
}
