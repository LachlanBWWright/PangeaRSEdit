import { ResultAsync } from "neverthrow";
import { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  addScriptAsset,
  addBehaviorDefinition,
  createCustomObjectFromBehavior,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  upsertScriptSourceFile,
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
import { buildScriptAssetPaths, applyUploadedAssetPath } from "@/editor/subviews/scripts/scriptAssetPaths";
import { convertGltfAsset } from "@/editor/subviews/scripts/scriptAssetConversion";
import { validateUploadedScriptAssetAsync } from "@/editor/subviews/scripts/scriptAssetValidation";

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
  const globals = useAtomValue(Globals);
  const [, setGlobals] = useAtom(Globals);
  const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
  const context = useMemo(() => createScriptWorkspaceContext(globals, null), [globals]);
  const workspace = useMemo(() => ensureScriptWorkspace(store, context), [context, store]);
  const [behaviorId, setBehaviorId] = useState("");
  const [label, setLabel] = useState("Hover Beacon");
  const [createScriptOpen, setCreateScriptOpen] = useState(false);
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
    updateWorkspace((current) => {
      const importedIds = new Set(result.value.definitions.map((definition) => definition.id));
      let next: ScriptWorkspaceState = {
        ...current,
        customObjects: current.customObjects.filter((definition) => !importedIds.has(definition.id)).concat(result.value.definitions),
      };
      for (const [path, source] of Object.entries(result.value.sources)) {
        next = upsertScriptSourceFile(next, path, source, "user");
      }
      for (const [path, bytes] of Object.entries(result.value.assets)) {
        next = addScriptAsset(next, path, bytes, path.split("/").at(-1) ?? path);
      }
      return next;
    });
    toast.success(`Imported ${file.name} for ${context.gameLabel}`);
  };

  const createObject = () => {
    if (selectedBehaviorId.length === 0 || label.trim().length === 0) return;
    const objectId = buildGeneratedCustomObjectId(label, definitions.map((definition) => definition.id));
    updateWorkspace((current) => createCustomObjectFromBehavior(current, selectedBehaviorId, objectId, label.trim()));
    toast.success("Created scripted object definition");
  };

  const uploadAsset = async (definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton") => {
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Custom item assets are limited to 16 MiB each");
      return;
    }
    const bytesResult = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (bytesResult.isErr()) {
      toast.error(bytesResult.error);
      return;
    }
    const paths = buildScriptAssetPaths(definition, file.name, role);
    if (!paths) {
      toast.error("The selected asset type is not valid for this object");
      return;
    }
    const sourceBytes = new Uint8Array(bytesResult.value);
    const conversion = paths.sourcePath ? await convertGltfAsset(file.name, sourceBytes) : null;
    if (conversion?.isErr()) {
      toast.error(`Could not convert ${file.name}: ${conversion.error}`);
      return;
    }
    const runtimeBytes = conversion?.isOk() ? conversion.value.nativeBytes : sourceBytes;
    const validation = await validateUploadedScriptAssetAsync(paths.assetPath, runtimeBytes);
    if (validation.isErr()) {
      toast.error(`Could not add ${file.name}: ${validation.error}`);
      return;
    }
    const nextDefinition = applyUploadedAssetPath(definition, paths.manifestPath, role);
    updateWorkspace((current) => {
      let next = addScriptAsset(current, paths.assetPath, runtimeBytes, file.name);
      if (paths.sourcePath) next = addScriptAsset(next, paths.sourcePath, sourceBytes, file.name);
      return updateCustomObjectDefinition(next, nextDefinition);
    });
    toast.success(`Added ${file.name} to the scripted item package`);
  };

  const defineCustomObjectScript = (definition: Parameters<typeof addBehaviorDefinition>[1]) => {
    updateWorkspace((current) => addBehaviorDefinition(current, definition));
    setBehaviorId(definition.id);
    toast.success("Created custom-object script");
  };

  return (
    <main className="min-h-full bg-gray-900 px-4 py-3 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <Boxes className="h-4 w-4 text-slate-300" />
          <span className="text-sm font-medium text-white">Custom objects</span>
          <Select value={String(globals.GAME_TYPE)} onValueChange={(value) => {
            const nextGlobals = GAME_OPTIONS.find((candidate) => String(candidate.GAME_TYPE) === value);
            if (nextGlobals) setGlobals(nextGlobals);
          }}>
            <SelectTrigger aria-label="Game" className="h-8 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GAME_OPTIONS.map((option) => <SelectItem key={option.GAME_NAME} value={String(option.GAME_TYPE)}>{option.GAME_NAME}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">Game-wide definitions · instances are placed per level</span>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => setCreateScriptOpen(true)} className="h-8">Create Custom Object Script</Button>
            <Button variant="secondary" onClick={exportDefinitions} className="h-8">Export definitions</Button>
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
              Import bundle
              <Input type="file" accept=".zip" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importDefinitions(file);
                event.target.value = "";
              }} />
            </label>
          </div>
        </div>
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
      </div>
      <DefineBehaviorModal
        open={createScriptOpen}
        onOpenChange={setCreateScriptOpen}
        initialTarget="customObject"
        hookOptions={context.supportedHooks}
        tagOptions={context.allowedTags}
        existingSourcePaths={Object.keys(workspace.sourceFiles)}
        onDefine={defineCustomObjectScript}
      />
    </main>
  );
}
