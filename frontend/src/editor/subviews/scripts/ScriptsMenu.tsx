import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { err, ok, ResultAsync } from "neverthrow";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline, SelectedSplineItem } from "@/data/splines/splineAtoms";
import { TestGameDialog } from "@/editor/TestGameDialog";
import type { PreviewRuntimeFailure } from "@/editor/utils/gamePreviewRuntime";
import { getSelectedItem } from "@/editor/subviews/items/itemMenuState";
import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { DefineBehaviorModal } from "./DefineBehaviorModal";
import { ScriptCodeModal } from "./ScriptCodeModal";
import { ScriptCodeWorkspacePanel } from "./ScriptCodeWorkspacePanel";
import { ScriptEditorReferenceLayout } from "./ScriptEditorReferenceLayout";
import { ScriptFileUsage } from "./ScriptFileUsage";
import type { ScriptSourceEditorProps, ScriptEditorReveal } from "./ScriptSourceEditor";
import { applyScriptWorkspaceFileEdits } from "./scriptWorkspaceFileActions";
import { scriptEditorNavigationAtom } from "./scriptEditorNavigation";
import { scriptRecoveryStatusAtom } from "./scriptWorkspaceRecovery";
import { ScriptWorkspaceImportDialog } from "./ScriptWorkspaceImportDialog";
import { mergeScriptWorkspace } from "./scriptWorkspaceImport";
import { getScriptRuntimeDiagnosticLocation } from "./scriptRuntimeDiagnosticLocation";
import { getCustomObjectUsageCounts, duplicateCustomObjectDefinition, deleteCustomObjectDefinition } from "./scriptObjectLifecycle";
import { createCustomObjectFromStarter } from "./scriptObjectStarters";
import { CustomObjectToPlaceAtom } from "./scriptPlacementSelectionState";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { ScriptCustomObjectsPanel } from "./ScriptCustomObjectsPanel";
import { ScriptGlobalHooksPanel } from "./ScriptGlobalHooksPanel";
import { ScriptGettingStartedPanel } from "./ScriptGettingStartedPanel";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import { ScriptNativeBindingsPanel } from "./ScriptNativeBindingsPanel";
import { ScriptObjectTypeBehaviorsPanel } from "./ScriptObjectTypeBehaviorsPanel";
import { ScriptOverviewPanel } from "./ScriptOverviewPanel";
import { ScriptParametersPanel } from "./ScriptParametersPanel";
import type { ScriptParameterEditingDetails } from "./ScriptParameterConstraintsFields";
import { buildScriptParameterDefinition, removeScriptParameter } from "./scriptParameters";
import {
  buildExtendedLevelArchive,
  buildOriginalCompatibleArchive,
  prepareScriptPreviewBundle,
} from "./scriptPreviewExportActions";
import { ScriptProjectFilesPanel } from "./ScriptProjectFilesPanel";
import { ScriptPreviewExportPanel } from "./ScriptPreviewExportPanel";
import {
  getScriptAllowedTags,
  getScriptBehaviorOptions,
  getScriptCustomObjectOptions,
  getScriptParamOptions,
  getScriptSourcePathOptions,
  isSourceFileDirty,
  summarizeScriptWorkspace,
} from "./scriptWorkspaceSelectors";
import {
  buildDefaultScriptSourceContent,
  buildGeneratedCustomObjectId,
  buildGeneratedScriptSourcePath,
  buildSelectionLabel,
  downloadBytes,
  getLevelState,
  getSelectedSplineItem,
  type ScriptSourceDirectory,
} from "./scriptWorkspaceHelpers";
import {
  addBehaviorDefinition,
  addScriptAsset,
  addScriptParam,
  appendScriptDiagnostic,
  applyGlobalBehavior,
  buildScriptPackageZipAsync,
  compileScriptWorkspace,
  createCustomObjectFromBehavior,
  updateCustomObjectDefinition,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  getWorkspaceWarnings,
  getScriptSamples,
  getScriptWorkspaceId,
  importScriptPackageZipAsync,
  loadScriptSample,
  removeBindingById,
  removeCustomPlacement,
  removeMapItemReplacement,
  removeTerrainItemReplacement,
  removeSplineItemReplacement,
  removeGlobalBehavior,
  removeScriptSourceFile,
  replaceLuaLSDiagnostics,
  replaceScriptWorkspace,
  replaceTerrainItemWithCustomObject,
  replaceMapItemWithCustomObject,
  replaceSplineItemWithCustomObject,
  saveScriptSourceFile,
  scriptWorkspaceStoreAtom,
  setScriptActiveFile,
  updateScriptSourceContent,
  upsertScriptSourceFile,
  type ScriptHookId,
  type ScriptDiagnostic,
  type ScriptCustomObjectDefinition,
  type ScriptTargetKind,
  type ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { commitPreparedObjectAsset, prepareObjectAssetUpload } from "./scriptObjectAssetUpload";
import { scriptLspClient } from "./scriptLspClient";
import { getNativeReplacementCompatibility } from "./scriptNativeAudit";
import {
  buildScriptDefinitionBundle,
  importScriptDefinitionBundle,
} from "./scriptDefinitionBundle";

type ScriptsTab = "overview" | "assignments" | "code" | "preview";

interface ScriptsMenuProps {
  headerData: HeaderData;
  itemData: ItemData | null;
  liquidData: LiquidData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  terrainData: TerrainData;
  mapImages: readonly HTMLCanvasElement[];
}

function parseScriptsTab(value: string): ScriptsTab {
  if (value === "assignments") {
    return "assignments";
  }
  if (value === "code") {
    return "code";
  }
  if (value === "preview") {
    return "preview";
  }
  return "overview";
}

function hasScriptSourceFile(
  workspace: ScriptWorkspaceState,
  behaviorId: string,
): boolean {
  const behavior = workspace.behaviorCatalog.find(
    (candidate) => candidate.id === behaviorId,
  );
  if (!behavior) {
    return false;
  }
  return Boolean(workspace.sourceFiles[behavior.sourceFilePath]);
}

function createScriptDiagnostic(
  category: ScriptDiagnostic["category"],
  message: string,
  code: string,
  filePath: string,
): ScriptDiagnostic {
  return {
    category,
    severity: "error",
    message,
    code,
    filePath,
    line: 0,
    column: 0,
  };
}

export function ScriptsMenu({
  headerData,
  itemData,
  liquidData,
  fenceData,
  splineData,
  terrainData,
  mapImages,
}: ScriptsMenuProps) {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const selectedItem = useAtomValue(SelectedItem);
  const selectedSpline = useAtomValue(SelectedSpline);
  const selectedSplineItem = useAtomValue(SelectedSplineItem);
  const [workspaceStore, setWorkspaceStore] = useAtom(scriptWorkspaceStoreAtom);
  const atomStore = useStore();
  const editorNavigation = useAtomValue(scriptEditorNavigationAtom);
  const recoveryStatus = useAtomValue(scriptRecoveryStatusAtom);
  const setObjectToPlace = useSetAtom(CustomObjectToPlaceAtom);
  const setActiveView = useSetAtom(ActiveView);

  const context = useMemo(
    () => createScriptWorkspaceContext(globals, levelNumber ?? null),
    [globals, levelNumber],
  );
  const workspaceId = useMemo(() => getScriptWorkspaceId(context), [context]);
  const workspace = useMemo(
    () => ensureScriptWorkspace(workspaceStore, context),
    [context, workspaceStore],
  );

  const levelState = getLevelState(workspace);
  const summary = summarizeScriptWorkspace(workspace);
  const selectedItemData = itemData
    ? getSelectedItem(itemData, selectedItem)
    : null;
  const selectedSplineItemData = getSelectedSplineItem(
    splineData,
    selectedSpline,
    selectedSplineItem,
  );
  const selectionLabel = buildSelectionLabel(
    globals,
    selectedItemData,
    selectedSplineItemData,
  );

  const [activeTab, setActiveTabState] = useState<ScriptsTab>("overview");
  const [seenNavigation, setSeenNavigation] = useState(0);
  const navigationPending = editorNavigation?.gameId === context.gameId && editorNavigation.sequence !== seenNavigation;
  const setActiveTab = (tab: ScriptsTab) => {
    setSeenNavigation(editorNavigation?.sequence ?? 0);
    setActiveTabState(tab);
  };
  const [defineBehaviorOpen, setDefineBehaviorOpen] = useState(false);
  const [globalHookForNewBehavior, setGlobalHookForNewBehavior] =
    useState<ScriptHookId | null>(null);
  const [creatingObjectTypeBehavior, setCreatingObjectTypeBehavior] =
    useState(false);
  const [creatingCustomObjectBehavior, setCreatingCustomObjectBehavior] =
    useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [codeReferenceOpen, setCodeReferenceOpen] = useState(false);
  const [assignmentSection, setAssignmentSection] = useState("objects");
  const [editorReveal, setEditorReveal] = useState<ScriptEditorReveal | undefined>();
  const [pendingImport, setPendingImport] = useState<{ label: string; workspace: ScriptWorkspaceState; allowReplace: boolean } | null>(null);
  const [importBackup, setImportBackup] = useState<ScriptWorkspaceState | null>(null);
  const [customObjectBehaviorId, setCustomObjectBehaviorId] = useState("");
  const [newFileName, setNewFileName] = useState("helpers");
  const [newFileDirectory, setNewFileDirectory] =
    useState<ScriptSourceDirectory>("root");
  const [customObjectLabel, setCustomObjectLabel] = useState("Hover Beacon");
  const [paramId, setParamId] = useState("editor.speed");
  const [paramLabel, setParamLabel] = useState("Speed");
  const [paramType, setParamType] = useState<"number" | "boolean" | "string">(
    "number",
  );
  const [paramDefaultValue, setParamDefaultValue] = useState("1");
  const [paramDetails, setParamDetails] = useState<ScriptParameterEditingDetails>({ minimum: "", maximum: "", unit: "", choices: [] });
  const [paramDescription, setParamDescription] = useState(
    "Script parameter exposed in the Scripts workspace.",
  );
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataBytes, setPreviewDataBytes] = useState<Uint8Array | null>(
    null,
  );
  const [previewRsrcBytes, setPreviewRsrcBytes] = useState<Uint8Array | null>(
    null,
  );
  const [previewTextureBytes, setPreviewTextureBytes] =
    useState<Uint8Array | null>(null);
  const [previewCustomFiles, setPreviewCustomFiles] = useState<
    readonly { readonly path: string; readonly data: Uint8Array }[]
  >([]);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const selectionTargetKind: ScriptTargetKind | null = useMemo(() => {
    if (selectedSplineItemData) {
      return "splineItem";
    }
    if (selectedItemData) {
      return globals.GAME_TYPE === Game.MIGHTY_MIKE ? "mapItem" : "terrainItem";
    }
    return null;
  }, [globals.GAME_TYPE, selectedItemData, selectedSplineItemData]);

  const customObjectBehaviors = useMemo(
    () => getScriptBehaviorOptions(workspace, "customObject"),
    [workspace],
  );
  const effectiveCustomObjectBehaviorId =
    customObjectBehaviors.some(
      (behavior) => behavior.id === customObjectBehaviorId,
    )
      ? customObjectBehaviorId
      : (customObjectBehaviors[0]?.id ?? "");
  const customObjectOptions = useMemo(
    () => getScriptCustomObjectOptions(workspace),
    [workspace],
  );
  const selectedTerrainReplacement = useMemo(
    () =>
      selectedItem === undefined
        ? null
        : (workspace.levels[workspace.context.levelKey]?.terrainReplacements.find(
            (replacement) => replacement.itemIndex === selectedItem,
          ) ?? null),
    [selectedItem, workspace],
  );
  const selectedMapReplacement = useMemo(
    () =>
      selectedItem === undefined
        ? null
        : (workspace.levels[workspace.context.levelKey]?.mapReplacements.find(
            (replacement) => replacement.itemIndex === selectedItem,
          ) ?? null),
    [selectedItem, workspace],
  );
  const selectedSplineReplacement = useMemo(
    () =>
      selectedSpline === undefined || selectedSplineItem === undefined
        ? null
        : (workspace.levels[workspace.context.levelKey]?.splineReplacements.find(
            (replacement) =>
              replacement.splineNum === selectedSpline &&
              replacement.itemIndex === selectedSplineItem,
          ) ?? null),
    [selectedSpline, selectedSplineItem, workspace],
  );
  const terrainReplacementCompatibility = useMemo(
    () =>
      selectedItemData
        ? getNativeReplacementCompatibility(context.gameId, selectedItemData.type, "terrain")
        : null,
    [context.gameId, selectedItemData],
  );
  const mapReplacementCompatibility = useMemo(
    () =>
      selectionTargetKind === "mapItem" && selectedItemData
        ? getNativeReplacementCompatibility(context.gameId, selectedItemData.type, "map")
        : null,
    [context.gameId, selectedItemData, selectionTargetKind],
  );
  const splineReplacementCompatibility = useMemo(
    () =>
      selectedSplineItemData
        ? getNativeReplacementCompatibility(
          context.gameId,
          selectedSplineItemData.type,
          "spline",
        )
        : null,
    [context.gameId, selectedSplineItemData],
  );
  const sourcePathOptions = useMemo(
    () => getScriptSourcePathOptions(workspace),
    [workspace],
  );
  const paramOptions = useMemo(
    () => getScriptParamOptions(workspace),
    [workspace],
  );
  const allowedTags = useMemo(
    () => getScriptAllowedTags(workspace),
    [workspace],
  );
  const objectTypeBehaviors = useMemo(
    () => getScriptBehaviorOptions(workspace, "objectType", "onObjectFrame"),
    [workspace],
  );

  const generatedCustomObjectId = useMemo(
    () =>
      buildGeneratedCustomObjectId(
        customObjectLabel,
        customObjectOptions.map((objectDefinition) => objectDefinition.id),
      ),
    [customObjectLabel, customObjectOptions],
  );
  const generatedNewFilePath = useMemo(
    () =>
      buildGeneratedScriptSourcePath(
        newFileName,
        newFileDirectory,
        "lua",
        sourcePathOptions,
      ),
    [newFileDirectory, newFileName, sourcePathOptions],
  );

  const activeSourceFile = workspace.sourceFiles[workspace.activeFilePath];
  const activeCompiledFile = workspace.compiledFiles[workspace.activeFilePath];
  const activeCodeFile = activeSourceFile ?? activeCompiledFile ?? null;

  const orderedSourcePaths = sourcePathOptions;

  const diagnostics = workspace.diagnostics;
  const sampleDefinitions = useMemo(() => getScriptSamples(context), [context]);
  useEffect(() => {
    if (recoveryStatus.phase === "loading") return;
    if (workspaceStore[workspaceId]) {
      return;
    }
    setWorkspaceStore((currentStore) =>
      replaceScriptWorkspace(
        currentStore,
        ensureScriptWorkspace(currentStore, context),
      ),
    );
  }, [context, setWorkspaceStore, workspaceId, workspaceStore, recoveryStatus.phase]);

  useEffect(() => scriptLspClient.subscribeDiagnostics((event) => {
    setWorkspaceStore((currentStore) => {
      const currentWorkspace = currentStore[workspaceId];
      if (currentWorkspace === undefined) return currentStore;
      return replaceScriptWorkspace(
        currentStore,
        replaceLuaLSDiagnostics(currentWorkspace, event.filePath, event.diagnostics),
      );
    });
  }), [setWorkspaceStore, workspaceId]);

  const persistWorkspace = (nextState: ScriptWorkspaceState) => {
    setWorkspaceStore((currentStore) =>
      replaceScriptWorkspace(currentStore, nextState),
    );
  };

  const updateWorkspace = (
    updater: (state: ScriptWorkspaceState) => ScriptWorkspaceState,
  ) => {
    setWorkspaceStore((currentStore) => {
      const current = ensureScriptWorkspace(currentStore, context);
      return replaceScriptWorkspace(currentStore, updater(current));
    });
  };

  const handleCompile = (): ScriptWorkspaceState | null => {
    const compileResult = compileScriptWorkspace(workspace);
    if (compileResult.isErr()) {
      toast.error(compileResult.error);
      return null;
    }

    persistWorkspace(compileResult.value);
    const compileSummary = summarizeScriptWorkspace(compileResult.value);
    if (compileSummary.buildErrorCount > 0) {
      toast.error(
        `Build completed with ${String(compileSummary.buildErrorCount)} errors`,
      );
    } else {
      toast.success("Script bundle compiled");
    }
    return compileResult.value;
  };

  const getCompiledRuntimeState = (): ScriptWorkspaceState | null => {
    const compiledState = handleCompile();
    if (!compiledState) {
      return null;
    }
    if (summarizeScriptWorkspace(compiledState).buildErrorCount > 0) {
      toast.error(
        "Fix build errors before previewing or exporting runtime files",
      );
      return null;
    }
    return compiledState;
  };

  const handlePreview = async (withScripts = true) => {
    let compiledState: ScriptWorkspaceState | null = null;
    if (withScripts) {
      compiledState = getCompiledRuntimeState();
      if (!compiledState) {
        return;
      }
    }

    setIsPreparingPreview(true);
    const previewResult = await prepareScriptPreviewBundle({
      compiledState,
      globals,
      levelNumber: levelNumber ?? null,
      headerData,
      itemData,
      liquidData,
      fenceData,
      splineData,
      terrainData,
      mapImages,
    });
    setIsPreparingPreview(false);

    if (previewResult.isErr()) {
      updateWorkspace((state) =>
        appendScriptDiagnostic(state, {
          category: "packaging",
          severity: "error",
          message: previewResult.error,
          code: "package.preview",
          filePath: "Data/Scripts/config",
          line: 0,
          column: 0,
        }),
      );
      toast.error(previewResult.error);
      return;
    }

    setPreviewDataBytes(previewResult.value.dataBytes);
    setPreviewRsrcBytes(previewResult.value.rsrcBytes);
    setPreviewTextureBytes(previewResult.value.textureBytes);
    setPreviewCustomFiles(previewResult.value.customFiles);
    setPreviewOpen(true);
    if (previewResult.value.nextState) {
      persistWorkspace(previewResult.value.nextState);
    }
  };

  const handleDownloadScriptPackage = async () => {
    const zipResult = await buildScriptPackageZipAsync(workspace);
    if (zipResult.isErr()) {
      updateWorkspace((state) =>
        appendScriptDiagnostic(state, {
          category: "packaging",
          severity: "error",
          message: zipResult.error,
          code: "package.export",
          filePath: "Data/Scripts/config",
          line: 0,
          column: 0,
        }),
      );
      toast.error(zipResult.error);
      return;
    }

    downloadBytes(zipResult.value, `scripts-${context.levelKey}.zip`);
    toast.success("Downloaded script package");
  };

  const handleExportDefinitions = () => {
    const bundleResult = buildScriptDefinitionBundle(workspace);
    if (bundleResult.isErr()) {
      toast.error(bundleResult.error);
      return;
    }
    downloadBytes(bundleResult.value, `${context.gameId}-definitions.zip`);
    toast.success("Exported game custom-object definitions");
  };

  const handleImportDefinitions = async (file: File) => {
    const buffer = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (buffer.isErr()) { toast.error(buffer.error); return; }
    const bundleResult = importScriptDefinitionBundle(
      new Uint8Array(buffer.value),
      context,
    );
    if (bundleResult.isErr()) {
      toast.error(bundleResult.error);
      return;
    }
    let incoming: ScriptWorkspaceState = { ...workspace, customObjects: bundleResult.value.definitions, sourceFiles: {}, assets: {}, behaviorCatalog: [], params: [], levels: {}, compiledFiles: {}, moduleOrder: [] };
      for (const [path, content] of Object.entries(bundleResult.value.sources)) {
        incoming = upsertScriptSourceFile(incoming, path, content, "user");
      }
      for (const [path, bytes] of Object.entries(bundleResult.value.assets)) {
        incoming = addScriptAsset(incoming, path, bytes, path.split("/").at(-1) ?? path);
      }
    setPendingImport({ label: file.name, workspace: incoming, allowReplace: false });
  };

  const handleDownloadOriginalCompatible = async () => {
    const archiveResult = await buildOriginalCompatibleArchive({
      globals,
      levelNumber: levelNumber ?? null,
      headerData,
      itemData,
      liquidData,
      fenceData,
      splineData,
      terrainData,
      mapImages,
    });
    if (archiveResult.isErr()) {
      updateWorkspace((state) =>
        appendScriptDiagnostic(
          state,
          createScriptDiagnostic(
            "packaging",
            archiveResult.error,
            "package.original-export",
            "Data/Scripts/config",
          ),
        ),
      );
      toast.error(archiveResult.error);
      return;
    }

    downloadBytes(
      archiveResult.value,
      `original-compatible-${context.levelKey}.zip`,
    );
    toast.success("Downloaded original-compatible level package");
  };

  const handleDownloadExtendedPackage = async () => {
    const compiledState = getCompiledRuntimeState();
    if (!compiledState) {
      return;
    }

    const archiveResult = await buildExtendedLevelArchive({
      compiledState,
      globals,
      levelNumber: levelNumber ?? null,
      headerData,
      itemData,
      liquidData,
      fenceData,
      splineData,
      terrainData,
      mapImages,
    });
    if (archiveResult.isErr()) {
      updateWorkspace((state) =>
        appendScriptDiagnostic(
          state,
          createScriptDiagnostic(
            "packaging",
            archiveResult.error,
            "package.extended-export",
            "Data/Scripts/config",
          ),
        ),
      );
      toast.error(archiveResult.error);
      return;
    }

    downloadBytes(
      archiveResult.value,
      `extended-level-${context.levelKey}.zip`,
    );
    toast.success("Downloaded extended level package");
  };

  const handleUploadPackage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    const buffer = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (buffer.isErr()) { toast.error(buffer.error); return; }
    const importResult = await importScriptPackageZipAsync(
      new Uint8Array(buffer.value),
      context,
    );
    if (importResult.isErr()) {
      updateWorkspace((state) =>
        appendScriptDiagnostic(state, {
          category: "packaging",
          severity: "error",
          message: importResult.error,
          code: "package.import",
          filePath: file.name,
          line: 0,
          column: 0,
        }),
      );
      toast.error(importResult.error);
      return;
    }

    setPendingImport({ label: file.name, workspace: importResult.value, allowReplace: true });
  };

  const handleCreateSourceFile = () => {
    if (newFileName.trim().length === 0) {
      return;
    }

    updateWorkspace((state) =>
      upsertScriptSourceFile(
        state,
        generatedNewFilePath,
        buildDefaultScriptSourceContent("lua"),
      ),
    );
    setNewFileName("helpers");
    setNewFileDirectory("root");
    toast.success("Added source file to script project");
  };

  const handleAddParam = () => {
    if (paramId.trim().length === 0) {
      return;
    }

    const result = buildScriptParameterDefinition({
        id: paramId.trim(),
        label: paramLabel.trim() || paramId.trim(),
        type: paramType,
        description: paramDescription.trim(),
        defaultValue: paramDefaultValue,
    }, paramDetails);
    if (result.isErr()) { toast.error(result.error); return; }
    updateWorkspace((state) => addScriptParam(state, result.value));
    toast.success("Saved parameter definition");
  };

  const handleCreateCustomObject = () => {
    if (
      effectiveCustomObjectBehaviorId.length === 0 ||
      customObjectLabel.trim().length === 0
    ) {
      return;
    }

    updateWorkspace((state) =>
      createCustomObjectFromBehavior(
        state,
        effectiveCustomObjectBehaviorId,
        generatedCustomObjectId,
        customObjectLabel.trim(),
      ),
    );
    toast.success("Created scripted object definition");
  };

  const handleUploadCustomObjectAsset = async (
    definition: ScriptCustomObjectDefinition,
    file: File,
    role: "model" | "skeleton",
  ) => {
    const reportAssetFailure = (message: string, code: string) => {
      updateWorkspace((state) =>
        appendScriptDiagnostic(
          state,
          createScriptDiagnostic("source-validation", message, code, file.name),
        ),
      );
      toast.error(message);
    };

    const prepared = await prepareObjectAssetUpload(definition, file, role);
    if (prepared.isErr()) { reportAssetFailure(prepared.error, "asset.upload"); return; }
    const current = ensureScriptWorkspace(atomStore.get(scriptWorkspaceStoreAtom), context);
    const committed = commitPreparedObjectAsset(current, prepared.value);
    if (committed.isErr()) { reportAssetFailure(committed.error, "asset.commit"); return; }
    persistWorkspace(committed.value);
    toast.success(`Added ${file.name} to the scripted item package`);
  };

  const openSource = (filePath: string, line = 1, column = 1) => {
    updateWorkspace((state) => setScriptActiveFile(state, filePath));
    setActiveTab("code");
    setEditorReveal((previous) => ({ filePath, line, column, sequence: (previous?.sequence ?? 0) + 1 }));
  };
  const editor: ScriptSourceEditorProps | undefined = activeCodeFile ? {
    workspace, filePath: activeCodeFile.path, content: activeCodeFile.content,
    readOnly: !activeSourceFile || activeSourceFile.readOnly,
    onChange: (path, content) => updateWorkspace((state) => updateScriptSourceContent(state, path, content)),
    onSave: (path, content) => updateWorkspace((state) => saveScriptSourceFile(updateScriptSourceContent(state, path, content), path)),
    onSelectFile: (path) => openSource(path),
    onValidate: () => { handleCompile(); },
    onOpenReference: () => setCodeReferenceOpen(true),
    onApplyEdits: (edits) => {
      const current = ensureScriptWorkspace(atomStore.get(scriptWorkspaceStoreAtom), context);
      const result = applyScriptWorkspaceFileEdits(current, edits);
      if (result.isErr()) return err(result.error);
      persistWorkspace(result.value);
      return ok(undefined);
    },
    reveal: navigationPending && editorNavigation ? editorNavigation : editorReveal,
    onExpand: () => setCodeEditorOpen(true),
  } : undefined;

  return (
    <>
      <div className="h-full overflow-y-auto text-sm">
            <Tabs
              className="editor-script-tabs"
              value={navigationPending ? "code" : activeTab}
              onValueChange={(value) => setActiveTab(parseScriptsTab(value))}
            >
        <TabsList aria-label="Scripting workspace" className="editor-subnavbar script-workspace-tabs grid grid-cols-4 gap-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="preview">Preview and Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-3">
          <ScriptGettingStartedPanel
            onCreateItem={() => setActiveTab("assignments")}
            hasScripts={summary.hasScripts}
            onCreateHook={() => {
              const hookId = context.supportedHooks.includes("onLevelStart")
                ? "onLevelStart"
                : context.supportedHooks[0];
              if (hookId === undefined) return;
              setGlobalHookForNewBehavior(hookId);
              setDefineBehaviorOpen(true);
            }}
            onOpenCode={() => {
              setActiveTab("code");
            }}
            onCompile={() => {
              handleCompile();
            }}
            onOpenPreview={() => setActiveTab("preview")}
          />
          <ScriptOverviewPanel
            globalHooksCount={levelState.globalHooks.length}
            itemBindingsCount={
              levelState.terrainBindings.length +
              levelState.splineBindings.length +
              levelState.mapItemBindings.length
            }
            sourceFilesCount={Object.keys(workspace.sourceFiles).length - 1}
            customObjectsCount={workspace.customObjects.length}
            samples={sampleDefinitions}
            onLoadSample={(sampleId, sampleLabel) => {
              setPendingImport({ label: sampleLabel, workspace: loadScriptSample(context, sampleId), allowReplace: true });
            }}
          />
          <ScriptHookApiExplorer
            gameId={context.gameId}
            supportedHooks={context.supportedHooks}
            onCreateHook={(hookId) => {
              setGlobalHookForNewBehavior(hookId);
              setDefineBehaviorOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent
          value="assignments"
          className="script-assignments-content"
        >
          <Tabs value={assignmentSection} onValueChange={setAssignmentSection} className="script-assignment-workspace">
            <TabsList aria-label="Assignment categories" className="script-assignment-navigation">
              <TabsTrigger value="objects">Custom items</TabsTrigger>
              <TabsTrigger value="events">Level events</TabsTrigger>
              <TabsTrigger value="native">Native bindings</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
            </TabsList>
          <div className="min-w-0">
          <TabsContent value="events" className="m-0">
            <ScriptGlobalHooksPanel
              onEditSource={openSource}
              supportedHooks={context.supportedHooks}
              globalHooks={levelState.globalHooks}
              getBehaviorOptionsForHook={(hookId) =>
                getScriptBehaviorOptions(workspace, "global", hookId)
              }
              onCreateScriptForHook={(hookId) => {
                setGlobalHookForNewBehavior(hookId);
                setDefineBehaviorOpen(true);
              }}
              onClearHook={(hookId) => {
                updateWorkspace((state) => removeGlobalBehavior(state, hookId));
              }}
              onAssignHook={(hookId, behaviorId) => {
                if (!hasScriptSourceFile(workspace, behaviorId)) {
                  toast.error("That script file is missing");
                  return;
                }
                updateWorkspace((state) =>
                  applyGlobalBehavior(state, hookId, behaviorId),
                );
              }}
            />
          </TabsContent>
          <TabsContent value="native" className="m-0 grid gap-6">
            <ScriptObjectTypeBehaviorsPanel
              behaviors={objectTypeBehaviors}
              onEditSource={openSource}
              onCreate={() => {
                setCreatingObjectTypeBehavior(true);
                setDefineBehaviorOpen(true);
              }}
            />

            <ScriptNativeBindingsPanel
              onEditSource={openSource}
              selectionTargetKind={selectionTargetKind}
              selectionLabel={selectionLabel}
              terrainSelectionSignature={
                selectionTargetKind === "terrainItem" && selectedItemData
                  ? {
                      itemType: selectedItemData.type,
                      position: {
                        x: selectedItemData.x,
                        y: headerData.Hedr[1000].obj.minY ?? 0,
                        z: selectedItemData.z,
                      },
                      flags: 0,
                      params: [
                        selectedItemData.p0,
                        selectedItemData.p1,
                        selectedItemData.p2,
                        selectedItemData.p3,
                      ],
                    }
                  : null
              }
              splineSelectionSignature={
                selectionTargetKind === "splineItem" &&
                selectedSplineItemData &&
                selectedSpline !== undefined
                  ? {
                      itemType: selectedSplineItemData.type,
                      splineNum: selectedSpline,
                      placement: selectedSplineItemData.placement,
                      params: [
                        selectedSplineItemData.p0,
                        selectedSplineItemData.p1,
                        selectedSplineItemData.p2,
                        selectedSplineItemData.p3,
                      ],
                    }
                  : null
              }
              mapItemSelectionSignature={
                selectionTargetKind === "mapItem" && selectedItemData
                  ? {
                      itemType: selectedItemData.type,
                      position: {
                        x: selectedItemData.x,
                        y: selectedItemData.z,
                      },
                      params: [
                        selectedItemData.p0,
                        selectedItemData.p1,
                        selectedItemData.p2,
                        selectedItemData.p3,
                      ],
                    }
                  : null
              }
              terrainBindings={levelState.terrainBindings}
              splineBindings={levelState.splineBindings}
              mapItemBindings={levelState.mapItemBindings}
              onRemoveBinding={(bindingId) => {
                updateWorkspace((state) => removeBindingById(state, bindingId));
              }}
            />
          </TabsContent>
          <TabsContent value="objects" className="m-0">
            <ScriptCustomObjectsPanel
              gameId={context.gameId}
              customObjectBehaviorId={effectiveCustomObjectBehaviorId}
              onCustomObjectBehaviorIdChange={setCustomObjectBehaviorId}
              customObjectBehaviors={customObjectBehaviors}
              customObjectLabel={customObjectLabel}
              onCustomObjectLabelChange={setCustomObjectLabel}
              generatedCustomObjectId={generatedCustomObjectId}
              customObjectOptions={customObjectOptions}
              customObjectPlacements={levelState.customPlacements}
              assetFiles={workspace.assets}
              parameters={workspace.params}
              objectUsageCounts={getCustomObjectUsageCounts(workspace)}
              onDuplicateObject={(id) => {
                const result = duplicateCustomObjectDefinition(workspace, id);
                if (result.isErr()) { toast.error(result.error); return; }
                persistWorkspace(result.value);
              }}
              onDeleteObject={(id) => {
                const result = deleteCustomObjectDefinition(workspace, id);
                if (result.isErr()) { toast.error(result.error); return; }
                persistWorkspace(result.value);
              }}
              onEditObjectScript={(definition) => openSource(definition.sourceFilePath)}
              onPlaceObject={(id) => { setObjectToPlace(id); setActiveView(View.items); }}
              onCreateFromTemplate={(template, label) => {
                const result = createCustomObjectFromStarter(workspace, template, label);
                if (result.isErr()) { toast.error(result.error); return; }
                persistWorkspace(result.value);
              }}
              onExportDefinitions={handleExportDefinitions}
              onImportDefinitions={(file) => {
                void handleImportDefinitions(file);
              }}
              onRemoveCustomObjectPlacement={(placementId) => {
                updateWorkspace((state) => removeCustomPlacement(state, placementId));
              }}
              onCreateObjectScript={() => {
                setCreatingCustomObjectBehavior(true);
                setDefineBehaviorOpen(true);
              }}
              onCreateObject={handleCreateCustomObject}
              onUpdateObject={(definition) => {
                updateWorkspace((state) =>
                  updateCustomObjectDefinition(state, definition),
                );
              }}
              onUploadAsset={(definition, file, role) => {
                void handleUploadCustomObjectAsset(definition, file, role);
              }}
              selectedTerrainItem={
                selectionTargetKind === "terrainItem" &&
                selectedItem !== undefined &&
                selectedItemData
                  ? {
                      index: selectedItem,
                      type: selectedItemData.type,
                      x: selectedItemData.x,
                      z: selectedItemData.z,
                    }
                  : null
              }
              terrainReplacementCompatibility={terrainReplacementCompatibility}
              replacementObjectId={
                selectedTerrainReplacement?.customObjectId ?? null
              }
              onReplaceSelectedItem={(customObjectId) => {
                if (
                  selectedItem === undefined ||
                  !selectedItemData ||
                  !terrainReplacementCompatibility?.allowed
                ) {
                  return;
                }
                updateWorkspace((state) =>
                  replaceTerrainItemWithCustomObject(state, {
                    id: `terrain-${String(selectedItem)}`,
                    itemIndex: selectedItem,
                    nativeType: selectedItemData.type,
                    x: selectedItemData.x,
                    z: selectedItemData.z,
                    customObjectId,
                    strict: false,
                  }),
                );
              }}
              onRestoreSelectedItem={() => {
                if (selectedItem === undefined) return;
                updateWorkspace((state) =>
                  removeTerrainItemReplacement(state, selectedItem),
                );
              }}
              selectedMapItem={
                selectionTargetKind === "mapItem" &&
                selectedItem !== undefined &&
                selectedItemData
                  ? {
                      index: selectedItem,
                      type: selectedItemData.type,
                      x: selectedItemData.x,
                      y: selectedItemData.z,
                    }
                  : null
              }
              mapReplacementCompatibility={mapReplacementCompatibility}
              mapReplacementObjectId={selectedMapReplacement?.customObjectId ?? null}
              onReplaceSelectedMapItem={(customObjectId) => {
                if (
                  selectedItem === undefined ||
                  !selectedItemData ||
                  !mapReplacementCompatibility?.allowed
                ) {
                  return;
                }
                updateWorkspace((state) =>
                  replaceMapItemWithCustomObject(state, {
                    id: `map-${String(selectedItem)}`,
                    itemIndex: selectedItem,
                    nativeType: selectedItemData.type,
                    x: selectedItemData.x,
                    y: selectedItemData.z,
                    customObjectId,
                    strict: false,
                  }),
                );
              }}
              onRestoreSelectedMapItem={() => {
                if (selectedItem === undefined) return;
                updateWorkspace((state) =>
                  removeMapItemReplacement(state, selectedItem),
                );
              }}
              selectedSplineItem={
                selectedSpline !== undefined && selectedSplineItem !== undefined
                  ? {
                      splineNum: selectedSpline,
                      itemIndex: selectedSplineItem,
                      nativeType: selectedSplineItemData?.type ?? -1,
                    }
                  : null
              }
              splineReplacementCompatibility={splineReplacementCompatibility}
              splineReplacementObjectId={
                selectedSplineReplacement?.customObjectId ?? null
              }
              onReplaceSelectedSplineItem={(customObjectId) => {
                if (
                  selectedSpline === undefined ||
                  selectedSplineItem === undefined ||
                  !selectedSplineItemData ||
                  !splineReplacementCompatibility?.allowed
                ) return;
                updateWorkspace((state) =>
                  replaceSplineItemWithCustomObject(state, {
                    id: `spline-${String(selectedSpline)}-${String(selectedSplineItem)}`,
                    splineNum: selectedSpline,
                    itemIndex: selectedSplineItem,
                    nativeType: selectedSplineItemData.type,
                    placement: selectedSplineItemData.placement,
                    customObjectId,
                    strict: false,
                  }),
                );
              }}
              onRestoreSelectedSplineItem={() => {
                if (selectedSpline === undefined || selectedSplineItem === undefined) return;
                updateWorkspace((state) =>
                  removeSplineItemReplacement(
                    state,
                    selectedSpline,
                    selectedSplineItem,
                  ),
                );
              }}
            />
          </TabsContent>
          <TabsContent value="parameters" className="m-0">
            <ScriptParametersPanel
              details={paramDetails}
              onDetailsChange={setParamDetails}
              onEditParam={(parameter) => {
                setParamId(parameter.id); setParamLabel(parameter.label); setParamType(parameter.type); setParamDefaultValue(parameter.defaultValue); setParamDescription(parameter.description);
                setParamDetails({ minimum: parameter.minimum === undefined ? "" : String(parameter.minimum), maximum: parameter.maximum === undefined ? "" : String(parameter.maximum), unit: parameter.unit ?? "", choices: parameter.choices ?? [] });
              }}
              onDeleteParam={(id) => {
                const result = removeScriptParameter(workspace, id);
                if (result.isErr()) { toast.error(result.error); return; }
                persistWorkspace(result.value);
              }}
              paramId={paramId}
              onParamIdChange={setParamId}
              paramLabel={paramLabel}
              onParamLabelChange={setParamLabel}
              paramType={paramType}
              onParamTypeChange={(type) => { setParamType(type); setParamDefaultValue(type === "boolean" ? "false" : type === "number" ? "1" : ""); }}
              paramDefaultValue={paramDefaultValue}
              onParamDefaultValueChange={setParamDefaultValue}
              paramDescription={paramDescription}
              onParamDescriptionChange={setParamDescription}
              paramOptions={paramOptions}
              onSaveParam={handleAddParam}
            />
          </TabsContent>
          </div>
          </Tabs>
        </TabsContent>

        <TabsContent
          value="code"
          className="script-code-layout grid items-start gap-0 lg:grid-cols-[15rem_minmax(0,1fr)]"
        >
          <ScriptProjectFilesPanel
            newFileName={newFileName}
            onNewFileNameChange={setNewFileName}
            newFileDirectory={newFileDirectory}
            onNewFileDirectoryChange={setNewFileDirectory}
            generatedNewFilePath={generatedNewFilePath}
            onCreateSourceFile={handleCreateSourceFile}
            orderedSourcePaths={orderedSourcePaths}
            compiledFilePaths={Object.keys(workspace.compiledFiles)}
            activeFilePath={workspace.activeFilePath}
            sourceFiles={workspace.sourceFiles}
            onOpenFile={(path) => {
              openSource(path);
            }}
            isSourceFileDirty={(path) => isSourceFileDirty(workspace, path)}
          />

          <ScriptEditorReferenceLayout context={context} open={codeReferenceOpen} onClose={() => setCodeReferenceOpen(false)}>
          {activeCodeFile && <ScriptFileUsage workspace={workspace} filePath={activeCodeFile.path} onOpenAssignments={() => setActiveTab("assignments")} />}
          <ScriptCodeWorkspacePanel
            editor={editor ? { ...editor, showFileNavigation: false } : undefined}
            onNavigateDiagnostic={(diagnostic) => {
              if (workspace.sourceFiles[diagnostic.filePath] || workspace.compiledFiles[diagnostic.filePath]) openSource(diagnostic.filePath, diagnostic.line, diagnostic.column);
              else { setActiveTab("assignments"); toast.info(diagnostic.message); }
            }}
            activeCodePath={activeCodeFile?.path ?? null}
            activeCodeDescription={
              activeSourceFile
                ? activeSourceFile.readOnly
                  ? "Generated source"
                  : "Editable source"
                : activeCompiledFile
                  ? "Compiled output"
                  : "Choose a file from the project list"
            }
            hasActiveCodeFile={Boolean(activeCodeFile)}
            onOpenEditor={() => {
              if (activeCodeFile) {
                setCodeEditorOpen(true);
              }
            }}
            onCompile={() => {
              handleCompile();
            }}
            buildErrorCount={summary.buildErrorCount}
            diagnostics={diagnostics}
          />
          </ScriptEditorReferenceLayout>
        </TabsContent>

        <TabsContent value="preview" className="grid gap-4">
          <ScriptPreviewExportPanel
            workspace={workspace}
            isPreparingPreview={isPreparingPreview}
            onPreview={(withScripts) => {
              void handlePreview(withScripts);
            }}
            onCompile={() => {
              handleCompile();
            }}
            onDownloadExtendedPackage={() => {
              void handleDownloadExtendedPackage();
            }}
            onDownloadOriginalCompatible={() => {
              void handleDownloadOriginalCompatible();
            }}
            onDownloadScriptPackage={handleDownloadScriptPackage}
            onUploadScriptPackage={() => uploadInputRef.current?.click()}
            statusLog={workspace.statusLog}
            levelKey={context.levelKey}
            sourcePathOptions={sourcePathOptions}
            warnings={getWorkspaceWarnings(workspace)}
            hasScripts={summarizeScriptWorkspace(workspace).hasScripts}
          />

          <input
            ref={uploadInputRef}
            type="file"
            accept=".zip,application/zip"
            aria-label="Upload Script Package"
            className="hidden"
            onChange={(event) => void handleUploadPackage(event)}
          />
        </TabsContent>
            </Tabs>
        <footer role="status" className="script-workspace-footer flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-800 px-5 py-2 text-xs text-slate-500">
          <span>{context.gameLabel} · Level {context.levelKey}</span>
          <span>{recoveryStatus.message}</span>
          {importBackup && <button className="text-slate-300 underline underline-offset-4" onClick={() => { persistWorkspace(importBackup); setImportBackup(null); toast.success("Restored workspace before import"); }}>Undo last import</button>}
        </footer>
      </div>

      <DefineBehaviorModal
        key={`${String(defineBehaviorOpen)}-${creatingObjectTypeBehavior ? "object" : creatingCustomObjectBehavior ? "custom-object" : "default"}-${globalHookForNewBehavior ?? "none"}`}
        open={defineBehaviorOpen}
        onOpenChange={(open) => {
          setDefineBehaviorOpen(open);
          if (!open) {
            setGlobalHookForNewBehavior(null);
            setCreatingObjectTypeBehavior(false);
            setCreatingCustomObjectBehavior(false);
          }
        }}
        initialTarget={
          creatingObjectTypeBehavior
            ? "objectType"
            : creatingCustomObjectBehavior
              ? "customObject"
            : globalHookForNewBehavior === null
              ? undefined
              : "global"
        }
        initialHooks={
          globalHookForNewBehavior === null
            ? undefined
            : [globalHookForNewBehavior]
        }
        hookOptions={context.supportedHooks}
        tagOptions={allowedTags}
        existingSourcePaths={sourcePathOptions}
        onDefine={(definition) => {
          updateWorkspace((state) => {
            const withDefinition = addBehaviorDefinition(state, definition);
            if (globalHookForNewBehavior === null) {
              return withDefinition;
            }
            if (!hasScriptSourceFile(withDefinition, definition.id)) {
              toast.error("Created script file could not be found");
              return withDefinition;
            }
            return applyGlobalBehavior(
              withDefinition,
              globalHookForNewBehavior,
              definition.id,
            );
          });
          toast.success("Created script");
        }}
      />

      {activeCodeFile && (
        <ScriptCodeModal
          editor={editor}
          open={codeEditorOpen}
          onOpenChange={setCodeEditorOpen}
          workspace={workspace}
          filePath={activeCodeFile.path}
          fileName={activeCodeFile.path.replace("Data/Scripts/", "")}
          language="lua"
          content={activeCodeFile.content}
          isReadOnly={!activeSourceFile || activeSourceFile.readOnly}
          onSave={
            activeSourceFile && !activeSourceFile.readOnly
              ? (newContent) => {
                  updateWorkspace((state) =>
                    saveScriptSourceFile(
                      updateScriptSourceContent(
                        state,
                        activeSourceFile.path,
                        newContent,
                      ),
                      activeSourceFile.path,
                    ),
                  );
                  toast.success("Saved source file");
                }
              : undefined
          }
          onDelete={
            activeSourceFile &&
            !activeSourceFile.readOnly &&
            activeSourceFile.path !== "Data/Scripts/src/user.lua"
              ? () => {
                  updateWorkspace((state) =>
                    removeScriptSourceFile(state, activeSourceFile.path),
                  );
                  toast.success("Deleted source file");
                }
              : undefined
          }
        />
      )}

      {pendingImport && <ScriptWorkspaceImportDialog
        current={workspace}
        incoming={pendingImport.workspace}
        label={pendingImport.label}
        allowReplace={pendingImport.allowReplace}
        onCancel={() => setPendingImport(null)}
        onApply={(mode, overwrite) => {
          const current = ensureScriptWorkspace(atomStore.get(scriptWorkspaceStoreAtom), context);
          const result = mode === "replace" ? ok(pendingImport.workspace) : mergeScriptWorkspace(current, pendingImport.workspace, overwrite);
          if (result.isErr()) { toast.error(result.error); return; }
          setImportBackup(current);
          persistWorkspace(result.value);
          setPendingImport(null);
          toast.success("Imported project changes; validate before preview or export");
        }}
      />}

      <TestGameDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        gameType={globals.GAME_TYPE}
        levelNumber={levelNumber ?? 0}
        onLevelNumberChange={() => {
          // The Scripts workspace follows the active editor level; changing levels happens in the editor shell.
        }}
        terrainDataBytes={previewDataBytes}
        terrainRsrcBytes={previewRsrcBytes}
        terrainTextureBytes={previewTextureBytes}
        customFiles={previewCustomFiles}
        onScriptRuntimeFailure={(failure: PreviewRuntimeFailure) => {
          updateWorkspace((state) =>
            appendScriptDiagnostic(state, {
              category: failure.category,
              severity: "error",
              message: failure.message,
              code: failure.code,
              ...getScriptRuntimeDiagnosticLocation(state, failure.message),
            }),
          );
        }}
        onPreviewRuntimeFailure={(failure: PreviewRuntimeFailure) => {
          updateWorkspace((state) =>
            appendScriptDiagnostic(state, {
              category: failure.category,
              severity: "error",
              message: failure.message,
              code: failure.code,
              filePath: failure.category === "packaging" ? "Data/Scripts/config" : "runtime",
              line: 0,
              column: 0,
            }),
          );
        }}
      />
    </>
  );
}
