import { useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Play, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ClickToAddItem } from "@/data/items/itemAtoms";
import { View } from "@/editor/viewEnum";
import { TestGameDialog } from "@/editor/TestGameDialog";
import { DefineBehaviorModal } from "./DefineBehaviorModal";
import { CustomObjectWorkspace } from "./CustomObjectWorkspace";
import { ScriptLevelEvents } from "./ScriptLevelEvents";
import { ScriptNativeSelection } from "./ScriptNativeSelection";
import { ScriptSourceWorkspace } from "./ScriptSourceWorkspace";
import { ScriptObjectTypeBehaviorsPanel } from "./ScriptObjectTypeBehaviorsPanel";
import { ScriptPreviewExportPanel } from "./ScriptPreviewExportPanel";
import { ScriptSampleLibrary } from "./ScriptSampleLibrary";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import { ScriptLibraryTools } from "./ScriptLibraryTools";
import { CustomObjectToPlaceAtom, SelectedCustomPlacementAtom } from "./scriptPlacementSelectionState";
import { useScriptWorkspace } from "./useScriptWorkspace";
import { useScriptRuntimeActions, type ScriptLevelInput } from "./useScriptRuntimeActions";
import {
  addBehaviorDefinition, applyGlobalBehavior, createScriptWorkspaceContext,
  getWorkspaceWarnings, setScriptActiveFile, type ScriptHookId,
} from "./scriptWorkspaceState";
import { getScriptAllowedTags, summarizeScriptWorkspace } from "./scriptWorkspaceSelectors";
import "./scriptWorkbench.css";

type ScriptsTab = "events" | "objects" | "source" | "reference" | "test";
const tabs: readonly { id: ScriptsTab; label: string }[] = [
  { id: "events", label: "Level events" }, { id: "objects", label: "Objects" },
  { id: "source", label: "Lua source" }, { id: "test", label: "Test & export" },
  { id: "reference", label: "API reference" },
];

export function ScriptsMenu(input: ScriptLevelInput) {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber) ?? null;
  const context = useMemo(() => createScriptWorkspaceContext(globals, levelNumber), [globals, levelNumber]);
  const { workspace, update, persist } = useScriptWorkspace(context);
  const actions = useScriptRuntimeActions({ ...input, globals, levelNumber, workspace, update, persist });
  const [tab, setTab] = useState<ScriptsTab>("events");
  const [creating, setCreating] = useState<{ target: "global" | "objectType"; hook: ScriptHookId } | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const setActiveView = useSetAtom(ActiveView);
  const setObjectToPlace = useSetAtom(CustomObjectToPlaceAtom);
  const setNativeItem = useSetAtom(ClickToAddItem);
  const setSelectedPlacement = useSetAtom(SelectedCustomPlacementAtom);
  const summary = summarizeScriptWorkspace(workspace);
  const openSource = (path: string) => {
    update((state) => setScriptActiveFile(state, path));
    setTab("source");
  };
  return <div className="script-workbench scripting-workspace h-full overflow-y-auto">
    <header className="scripting-command-bar" aria-label="Level scripting">
      <div className="workbench-tabs" aria-label="Level scripting sections">{tabs.map((entry) => <button type="button" key={entry.id} aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</div>
      <p className="workbench-muted scripting-context">{context.gameLabel} / {levelNumber === null ? "Current level" : `Level ${levelNumber}`}</p>
      <div className="workbench-toolbar-actions">
        <Button variant="secondary" disabled={actions.busy} onClick={actions.build}><Package size={15} className="mr-2" />Build bundle</Button>
        <Button disabled={actions.busy} onClick={() => void actions.test(true)}><Play size={15} className="mr-2" />{actions.busy ? "Preparing…" : "Test level"}</Button>
      </div>
    </header>
    {tab === "events" && <div className="workbench-events">
      <ScriptLevelEvents workspace={workspace} update={update} onCreate={(hook) => setCreating({ target: "global", hook })} onOpenSource={openSource} />
      <div className="grid content-start gap-6 min-w-0">
        <ScriptNativeSelection workspace={workspace} update={update} headerData={input.headerData} itemData={input.itemData} splineData={input.splineData} />
        <ScriptObjectTypeBehaviorsPanel behaviors={workspace.behaviorCatalog.filter((entry) => entry.targetKinds.includes("objectType"))} onCreate={() => setCreating({ target: "objectType", hook: "onObjectFrame" })} />
        <ScriptSampleLibrary workspace={workspace} update={update} />
      </div>
    </div>}
    {tab === "objects" && <CustomObjectWorkspace key={context.gameId} context={context} onPlace={(id) => {
      setNativeItem(undefined); setSelectedPlacement(null); setObjectToPlace(id); setActiveView(View.items);
      toast.info("Click the map to place this object.");
    }} onSelectPlacement={(id) => { setSelectedPlacement(id); setObjectToPlace(null); setActiveView(View.items); }} />}
    {tab === "source" && <ScriptSourceWorkspace workspace={workspace} update={update} onError={toast.error} />}
    {tab === "reference" && <div className="p-4"><ScriptHookApiExplorer workspace={workspace} gameId={context.gameId} supportedHooks={context.supportedHooks} onCreateHook={(hook) => setCreating({ target: "global", hook })} /></div>}
    {tab === "test" && <div className="p-4 md:p-6">
      <div className="mb-6"><ScriptLibraryTools workspace={workspace} update={update} /></div>
      <ScriptPreviewExportPanel isPreparingPreview={actions.busy} onPreview={(withScripts) => void actions.test(withScripts)} onCompile={actions.build}
        onDownloadExtendedPackage={() => void actions.exportPackage("extended")} onDownloadOriginalCompatible={() => void actions.exportPackage("original")}
        onDownloadScriptPackage={() => void actions.exportPackage("scripts")} onUploadScriptPackage={() => upload.current?.click()}
        statusLog={workspace.statusLog} levelKey={context.levelKey} sourcePathOptions={Object.keys(workspace.sourceFiles)} warnings={getWorkspaceWarnings(workspace)} hasScripts={summary.hasScripts} diagnostics={workspace.diagnostics} />
      <input ref={upload} type="file" className="hidden" accept=".zip" aria-label="Upload Script Package" onChange={(event) => { const file = event.target.files?.[0]; if (file) void actions.importPackage(file); event.target.value = ""; }} />
    </div>}
    <DefineBehaviorModal key={creating ? `${creating.target}-${creating.hook}` : "closed"} open={creating !== null} onOpenChange={(open) => { if (!open) setCreating(null); }}
      initialTarget={creating?.target ?? "global"} initialHooks={creating ? [creating.hook] : undefined} hookOptions={context.supportedHooks} tagOptions={getScriptAllowedTags(workspace)} existingSourcePaths={Object.keys(workspace.sourceFiles)}
      onDefine={(definition) => {
        update((state) => {
          let next = addBehaviorDefinition(state, definition);
          if (definition.target === "global") {
            for (const hook of definition.hooks) next = applyGlobalBehavior(next, hook, definition.id);
          }
          return setScriptActiveFile(next, definition.sourceFilePath);
        });
        setTab("source");
      }} />
    <TestGameDialog open={actions.previewOpen} onOpenChange={actions.setPreviewOpen} gameType={globals.GAME_TYPE} levelNumber={levelNumber ?? 0} onLevelNumberChange={() => undefined}
      terrainDataBytes={actions.preview?.dataBytes ?? null} terrainRsrcBytes={actions.preview?.rsrcBytes ?? null} terrainTextureBytes={actions.preview?.textureBytes ?? null} customFiles={actions.preview?.customFiles ?? []}
      onScriptRuntimeFailure={actions.reportFailure} onPreviewRuntimeFailure={actions.reportFailure} />
  </div>;
}
