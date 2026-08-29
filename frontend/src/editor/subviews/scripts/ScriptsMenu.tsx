import { useAtom, useAtomValue } from "jotai";
import { ResultAsync } from "neverthrow";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline, SelectedSplineItem } from "@/data/splines/splineAtoms";
import { TestGameDialog } from "@/editor/TestGameDialog";
import { MenuEmptyState } from "@/editor/subviews/MenuEmptyState";
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
import { ScriptCustomObjectsPanel } from "./ScriptCustomObjectsPanel";
import { ScriptGlobalHooksPanel } from "./ScriptGlobalHooksPanel";
import { ScriptGettingStartedPanel } from "./ScriptGettingStartedPanel";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import { ScriptNativeBindingsPanel } from "./ScriptNativeBindingsPanel";
import { ScriptObjectTypeBehaviorsPanel } from "./ScriptObjectTypeBehaviorsPanel";
import { ScriptOverviewPanel } from "./ScriptOverviewPanel";
import { ScriptParametersPanel } from "./ScriptParametersPanel";
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
import { validateUploadedScriptAssetAsync } from "./scriptAssetValidation";
import { scriptLspClient } from "./scriptLspClient";
import { convertGltfAsset } from "./scriptAssetConversion";
import {
  applyUploadedAssetPath,
  buildScriptAssetPaths,
} from "./scriptAssetPaths";
import { getNativeReplacementCompatibility } from "./scriptNativeAudit";

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

  const [activeTab, setActiveTab] = useState<ScriptsTab>("overview");
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [defineBehaviorOpen, setDefineBehaviorOpen] = useState(false);
  const [globalHookForNewBehavior, setGlobalHookForNewBehavior] =
    useState<ScriptHookId | null>(null);
  const [creatingObjectTypeBehavior, setCreatingObjectTypeBehavior] =
    useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
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
    if (workspaceStore[workspaceId]) {
      return;
    }
    setWorkspaceStore((currentStore) =>
      replaceScriptWorkspace(
        currentStore,
        ensureScriptWorkspace(currentStore, context),
      ),
    );
  }, [context, setWorkspaceStore, workspaceId, workspaceStore]);

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

    const buffer = await file.arrayBuffer();
    const importResult = await importScriptPackageZipAsync(
      new Uint8Array(buffer),
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

    persistWorkspace(importResult.value);
    toast.success(`Imported ${file.name}`);
    event.target.value = "";
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

    updateWorkspace((state) =>
      addScriptParam(state, {
        id: paramId.trim(),
        label: paramLabel.trim() || paramId.trim(),
        type: paramType,
        description: paramDescription.trim(),
        defaultValue: paramDefaultValue,
      }),
    );
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

    if (file.size > 16 * 1024 * 1024) {
      reportAssetFailure(
        "Custom item assets are limited to 16 MiB each",
        "asset.size",
      );
      return;
    }
    const bytesResult = await ResultAsync.fromPromise(
      file.arrayBuffer(),
      () => `Could not read ${file.name}`,
    );
    if (bytesResult.isErr()) {
      reportAssetFailure(bytesResult.error, "asset.read");
      return;
    }

    const paths = buildScriptAssetPaths(definition, file.name, role);
    if (!paths) {
      reportAssetFailure(
        role === "model"
          ? "Select a .bg3d, .3dmf, .shapes, .gltf, or .glb model"
          : "Select a .rsrc skeleton resource",
        "asset.path",
      );
      return;
    }
    const sourceBytes = new Uint8Array(bytesResult.value);
    const conversionResult = paths.sourcePath
      ? await convertGltfAsset(file.name, sourceBytes)
      : null;
    if (conversionResult?.isErr()) {
      reportAssetFailure(
        `Could not convert ${file.name}: ${conversionResult.error}`,
        "asset.gltf-conversion",
      );
      return;
    }
    const runtimeBytes = conversionResult?.isOk()
      ? conversionResult.value.nativeBytes
      : sourceBytes;
    const currentAssetBytes = Object.values(workspace.assets).reduce(
      (total, asset) => total + asset.bytes.byteLength,
      0,
    );
    const addedAssetBytes = runtimeBytes.byteLength +
      (paths.sourcePath ? sourceBytes.byteLength : 0);
    if (currentAssetBytes + addedAssetBytes > 64 * 1024 * 1024) {
      reportAssetFailure(
        "This script package has reached its 64 MiB asset budget",
        "asset.budget",
      );
      return;
    }
    const assetValidation = await validateUploadedScriptAssetAsync(paths.assetPath, runtimeBytes);
    if (assetValidation.isErr()) {
      reportAssetFailure(
        `Could not add ${file.name}: ${assetValidation.error}`,
        "asset.validation",
      );
      return;
    }
    const nextDefinition = applyUploadedAssetPath(
      definition,
      paths.manifestPath,
      role,
    );
    const conversionWarnings: readonly ScriptDiagnostic[] = conversionResult?.isOk()
      ? conversionResult.value.warnings.map((message, index): ScriptDiagnostic => ({
          category: "source-validation",
          severity: "warning",
          message: `${file.name}: ${message}`,
          code: `asset.gltf.compatibility.${String(index)}`,
          filePath: paths.sourcePath ?? paths.assetPath,
          line: 0,
          column: 0,
        }))
      : [];
    updateWorkspace((state) => {
      const withRuntimeAsset = addScriptAsset(
        state,
        paths.assetPath,
        runtimeBytes,
        file.name,
      );
      const withSourceAsset = paths.sourcePath
        ? addScriptAsset(withRuntimeAsset, paths.sourcePath, sourceBytes, file.name)
        : withRuntimeAsset;
      const nextState = updateCustomObjectDefinition(withSourceAsset, nextDefinition);
      return conversionWarnings.length === 0
        ? nextState
        : {
            ...nextState,
            diagnostics: [...nextState.diagnostics, ...conversionWarnings].slice(-100),
            statusLog: [
              ...nextState.statusLog,
              `Imported ${file.name} with ${String(conversionWarnings.length)} glTF compatibility warning(s)`,
            ].slice(-20),
          };
    });
    toast.success(`Added ${file.name} to the scripted item package`);
  };

  return (
    <>
      <MenuEmptyState
        title="Scripts Workspace"
        actionLabel="Open Scripts"
        onAction={() => setScriptsOpen(true)}
        fillHeight
      />

      <Dialog open={scriptsOpen} onOpenChange={setScriptsOpen}>
        <DialogContent className="h-[90vh] w-[90vw] max-w-none grid-rows-[minmax(0,1fr)] overflow-hidden p-0">
          <DialogTitle className="sr-only">Scripts</DialogTitle>
          <DialogDescription className="sr-only">
            Create, assign, edit, preview, and export Lua scripts for this level.
          </DialogDescription>

          <div className="overflow-y-auto p-6 pr-12 text-sm">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(parseScriptsTab(value))}
            >
        <TabsList className="grid grid-cols-4 gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="preview">Preview and Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-3">
          <ScriptGettingStartedPanel
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
              if (activeCodeFile !== null) setCodeEditorOpen(true);
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
              persistWorkspace(loadScriptSample(context, sampleId));
              toast.success(`Loaded ${sampleLabel}`);
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
          className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"
        >
          <div className="grid gap-4">
            <ScriptGlobalHooksPanel
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

            <ScriptObjectTypeBehaviorsPanel
              behaviors={objectTypeBehaviors}
              onCreate={() => {
                setCreatingObjectTypeBehavior(true);
                setDefineBehaviorOpen(true);
              }}
            />

            <ScriptNativeBindingsPanel
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
          </div>

          <div className="grid gap-4">
            <ScriptCustomObjectsPanel
              gameId={context.gameId}
              customObjectBehaviorId={effectiveCustomObjectBehaviorId}
              onCustomObjectBehaviorIdChange={setCustomObjectBehaviorId}
              customObjectBehaviors={customObjectBehaviors}
              customObjectLabel={customObjectLabel}
              onCustomObjectLabelChange={setCustomObjectLabel}
              generatedCustomObjectId={generatedCustomObjectId}
              customObjectOptions={customObjectOptions}
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

            <ScriptParametersPanel
              paramId={paramId}
              onParamIdChange={setParamId}
              paramLabel={paramLabel}
              onParamLabelChange={setParamLabel}
              paramType={paramType}
              onParamTypeChange={setParamType}
              paramDefaultValue={paramDefaultValue}
              onParamDefaultValueChange={setParamDefaultValue}
              paramDescription={paramDescription}
              onParamDescriptionChange={setParamDescription}
              paramOptions={paramOptions}
              onSaveParam={handleAddParam}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="code"
          className="grid gap-4 xl:grid-cols-[360px_1fr]"
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
              updateWorkspace((state) => setScriptActiveFile(state, path));
              setCodeEditorOpen(true);
            }}
            isSourceFileDirty={(path) => isSourceFileDirty(workspace, path)}
          />

          <ScriptCodeWorkspacePanel
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
        </TabsContent>

        <TabsContent value="preview" className="grid gap-4">
          <ScriptPreviewExportPanel
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
          </div>
        </DialogContent>
      </Dialog>

      <DefineBehaviorModal
        key={`${String(defineBehaviorOpen)}-${creatingObjectTypeBehavior ? "object" : "default"}-${globalHookForNewBehavior ?? "none"}`}
        open={defineBehaviorOpen}
        onOpenChange={(open) => {
          setDefineBehaviorOpen(open);
          if (!open) {
            setGlobalHookForNewBehavior(null);
            setCreatingObjectTypeBehavior(false);
          }
        }}
        initialTarget={
          creatingObjectTypeBehavior
            ? "objectType"
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
        onScriptRuntimeDiagnostic={(message) => {
          updateWorkspace((state) =>
            appendScriptDiagnostic(state, {
              category: "runtime-traceback",
              severity: "error",
              message,
              code: "runtime.traceback",
              filePath: "Data/Scripts/dist/main.lua",
              line: 0,
              column: 0,
            }),
          );
        }}
        onPreviewRuntimeError={(message) => {
          updateWorkspace((state) =>
            appendScriptDiagnostic(state, {
              category: "native-adapter",
              severity: "error",
              message,
              code: "runtime.native",
              filePath: "runtime",
              line: 0,
              column: 0,
            }),
          );
        }}
      />
    </>
  );
}
