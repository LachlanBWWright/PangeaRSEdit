import { ResultAsync } from "neverthrow";
import { useMemo, useState } from "react";
import { useAtom, useAtomValue, useStore } from "jotai";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  Globals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { ScriptCustomObjectsPanel } from "@/editor/subviews/scripts/ScriptCustomObjectsPanel";
import { DefineBehaviorModal } from "@/editor/subviews/scripts/DefineBehaviorModal";
import { ScriptLibraryCodeWorkspace } from "@/editor/subviews/scripts/ScriptLibraryCodeWorkspace";
import { ScriptHookApiExplorer } from "@/editor/subviews/scripts/ScriptHookApiExplorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createCustomObjectFromStarter } from "@/editor/subviews/scripts/scriptObjectStarters";
import { deleteCustomObjectDefinition, duplicateCustomObjectDefinition, getCustomObjectUsageCounts } from "@/editor/subviews/scripts/scriptObjectLifecycle";
import { buildIncomingObjectBundle } from "@/editor/subviews/scripts/scriptObjectBundleWorkspace";
import { ScriptWorkspaceImportDialog } from "@/editor/subviews/scripts/ScriptWorkspaceImportDialog";
import { mergeScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceImport";
import { scriptRecoveryStatusAtom } from "@/editor/subviews/scripts/scriptWorkspaceRecovery";
import { prepareObjectAssetUpload, commitPreparedObjectAsset } from "@/editor/subviews/scripts/scriptObjectAssetUpload";
import {
  addBehaviorDefinition,
  createCustomObjectFromBehavior,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  updateCustomObjectDefinition,
  type ScriptCustomObjectDefinition,
  type ScriptWorkspaceState,
} from "@/editor/subviews/scripts/scriptWorkspaceState";
import {
  buildGeneratedCustomObjectId,
  downloadBytes,
} from "@/editor/subviews/scripts/scriptWorkspaceHelpers";
import {
  getScriptBehaviorOptions,
  getScriptCustomObjectOptions,
} from "@/editor/subviews/scripts/scriptWorkspaceSelectors";
import {
  buildScriptDefinitionBundle,
  importScriptDefinitionBundle,
} from "@/editor/subviews/scripts/scriptDefinitionBundle";

const GAME_OPTIONS: readonly GlobalsInterface[] = [
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  NanosaurGlobals,
  Nanosaur2Globals,
  CroMagGlobals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
];

export function CustomObjectsPage() {
  const atomStore = useStore();
  const globals = useAtomValue(Globals);
  const [, setGlobals] = useAtom(Globals);
  const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
  const context = useMemo(() => createScriptWorkspaceContext(globals, null), [globals]);
  const workspace = useMemo(() => ensureScriptWorkspace(store, context), [context, store]);
  const [behaviorId, setBehaviorId] = useState("");
  const [label, setLabel] = useState("");
  const [createScriptOpen, setCreateScriptOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [section, setSection] = useState("objects");
  const [pendingImport, setPendingImport] = useState<{ workspace: ScriptWorkspaceState; name: string } | null>(null);
  const recovery = useAtomValue(scriptRecoveryStatusAtom);
  const behaviors = useMemo(() => getScriptBehaviorOptions(workspace, "customObject"), [workspace]);
  const definitions = useMemo(() => getScriptCustomObjectOptions(workspace), [workspace]);
  const selectedBehaviorId = behaviors.some((behavior) => behavior.id === behaviorId)
    ? behaviorId
    : (behaviors[0]?.id ?? "");

  const updateWorkspace = (updater: (current: typeof workspace) => typeof workspace) => {
    setStore((currentStore) => replaceScriptWorkspace(
      currentStore,
      updater(ensureScriptWorkspace(currentStore, context)),
    ));
  };

  const exportDefinitions = () => {
    const result = buildScriptDefinitionBundle(workspace);
    if (result.isErr()) {
      toast.error(result.error);
      return;
    }
    downloadBytes(result.value, `${context.gameId}-definitions.zip`);
    toast.success("Exported game custom-object definitions");
  };

  const importDefinitions = async (file: File) => {
    const bytesResult = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (bytesResult.isErr()) {
      toast.error(bytesResult.error);
      return;
    }
    const result = importScriptDefinitionBundle(new Uint8Array(bytesResult.value), context);
    if (result.isErr()) {
      toast.error(result.error);
      return;
    }
    setPendingImport({ workspace: buildIncomingObjectBundle(workspace, result.value), name: file.name });
  };

  const createObject = () => {
    if (selectedBehaviorId.length === 0 || label.trim().length === 0) return;
    const objectId = buildGeneratedCustomObjectId(label, definitions.map((definition) => definition.id));
    updateWorkspace((current) => createCustomObjectFromBehavior(current, selectedBehaviorId, objectId, label.trim()));
    toast.success("Created scripted object definition");
  };

  const uploadAsset = async (definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton") => {
    const result = await prepareObjectAssetUpload(definition, file, role);
    if (result.isErr()) { toast.error(result.error); return; }
    const current = ensureScriptWorkspace(atomStore.get(scriptWorkspaceStoreAtom), context);
    const committed = commitPreparedObjectAsset(current, result.value);
    if (committed.isErr()) { toast.error(committed.error); return; }
    setStore((store) => replaceScriptWorkspace(store, committed.value));
    toast.success(`Added ${file.name} to the scripted item package`);
  };

  const defineCustomObjectScript = (definition: Parameters<typeof addBehaviorDefinition>[1]) => {
    updateWorkspace((current) => addBehaviorDefinition(current, definition));
    setBehaviorId(definition.id);
    toast.success("Created custom-object script");
  };

  return (
    <main className="min-h-full bg-slate-900 text-slate-100">
      <Tabs value={section} onValueChange={setSection} className="editor-script-tabs">
        <TabsList aria-label="Custom item workspace" className="editor-subnavbar script-workspace-tabs grid grid-cols-3 gap-0">
          <TabsTrigger value="objects">Custom items</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="reference">API reference</TabsTrigger>
        </TabsList>
      <div className="mx-auto max-w-[90rem] px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-3">
          <Select value={String(globals.GAME_TYPE)} onValueChange={(value) => {
            const nextGlobals = GAME_OPTIONS.find((candidate) => String(candidate.GAME_TYPE) === value);
                if (nextGlobals) { setGlobals(nextGlobals); setPendingImport(null); setEditingPath(null); }
          }}>
            <SelectTrigger aria-label="Game" className="h-8 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GAME_OPTIONS.map((option) => <SelectItem key={option.GAME_NAME} value={String(option.GAME_TYPE)}>{option.GAME_NAME}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">Shared item library</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" onClick={exportDefinitions} className="h-8">Export definitions</Button>
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
              Import bundle
              <input type="file" accept=".zip" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importDefinitions(file);
                event.target.value = "";
              }} />
            </label>
          </div>
        </div>
        <TabsContent value="objects" className="!px-0 !py-4">
        <ScriptCustomObjectsPanel
          gameId={context.gameId}
          customObjectBehaviorId={selectedBehaviorId}
          onCustomObjectBehaviorIdChange={setBehaviorId}
          customObjectBehaviors={behaviors}
          customObjectLabel={label}
          onCustomObjectLabelChange={setLabel}
          generatedCustomObjectId={buildGeneratedCustomObjectId(label, definitions.map((definition) => definition.id))}
          customObjectOptions={definitions}
          customObjectPlacements={[]}
          onRemoveCustomObjectPlacement={() => undefined}
          onExportDefinitions={exportDefinitions}
          onImportDefinitions={(file) => void importDefinitions(file)}
          onCreateObjectScript={() => setCreateScriptOpen(true)}
          showCreateObjectScript
          showLevelInstances={false}
          showHeaderActions={false}
          compact
          onCreateObject={createObject}
          onCreateFromTemplate={(starter, itemLabel) => updateWorkspace((current) => {
            const result = createCustomObjectFromStarter(current, starter, itemLabel);
            if (result.isErr()) { toast.error(result.error); return current; }
            toast.success("Created item and editable script");
            return result.value;
          })}
          objectUsageCounts={getCustomObjectUsageCounts(workspace)}
          assetFiles={workspace.assets}
          parameters={workspace.params}
          onDuplicateObject={(id) => updateWorkspace((current) => {
            const result = duplicateCustomObjectDefinition(current, id);
            if (result.isErr()) { toast.error(result.error); return current; }
            toast.success("Duplicated item definition");
            return result.value;
          })}
          onDeleteObject={(id) => updateWorkspace((current) => {
            const result = deleteCustomObjectDefinition(current, id);
            if (result.isErr()) { toast.error(result.error); return current; }
            return result.value;
          })}
          onEditObjectScript={(definition) => { setEditingPath(definition.sourceFilePath); setSection("code"); }}
          onUpdateObject={(definition) => updateWorkspace((current) => updateCustomObjectDefinition(current, definition))}
          onUploadAsset={(definition, file, role) => void uploadAsset(definition, file, role)}
          selectedTerrainItem={null}
          terrainReplacementCompatibility={null}
          replacementObjectId={null}
          onReplaceSelectedItem={() => undefined}
          onRestoreSelectedItem={() => undefined}
          selectedMapItem={null}
          mapReplacementCompatibility={null}
          mapReplacementObjectId={null}
          onReplaceSelectedMapItem={() => undefined}
          onRestoreSelectedMapItem={() => undefined}
          selectedSplineItem={null}
          splineReplacementCompatibility={null}
          splineReplacementObjectId={null}
          onReplaceSelectedSplineItem={() => undefined}
          onRestoreSelectedSplineItem={() => undefined}
        />
        </TabsContent>
        <TabsContent value="code" className="!px-0 !py-4">
          <ScriptLibraryCodeWorkspace workspace={workspace} filePath={editingPath ?? definitions[0]?.sourceFilePath ?? workspace.activeFilePath} onSelectFile={setEditingPath} onOpenAssignments={() => setSection("objects")} />
        </TabsContent>
        <TabsContent value="reference" className="!px-0 !py-4">
          <ScriptHookApiExplorer gameId={context.gameId} supportedHooks={context.supportedHooks} />
        </TabsContent>
        <footer role="status" className="border-t border-slate-800 py-3 text-xs text-slate-500">{recovery.message}</footer>
      </div>
      </Tabs>
      <DefineBehaviorModal
        open={createScriptOpen}
        onOpenChange={setCreateScriptOpen}
        initialTarget="customObject"
        hookOptions={context.supportedHooks}
        tagOptions={context.allowedTags}
        existingSourcePaths={Object.keys(workspace.sourceFiles)}
        onDefine={defineCustomObjectScript}
      />
      {pendingImport ? <ScriptWorkspaceImportDialog current={workspace} incoming={pendingImport.workspace} label={pendingImport.name} allowReplace={false} onCancel={() => setPendingImport(null)} onApply={(_mode, overwrite) => {
        updateWorkspace((current) => {
          const result = mergeScriptWorkspace(current, pendingImport.workspace, overwrite);
          if (result.isErr()) { toast.error(result.error); return current; }
          return result.value;
        });
        setPendingImport(null);
      }} /> : null}
    </main>
  );
}
