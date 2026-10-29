import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { z } from "zod";
import { gameIdSchema, hostCommandSchema, projectSnapshotSchema, type GameId } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopBridge, desktopRequest } from "./client";
import { DESKTOP_GAMES } from "./games";
import { desktopActiveDocumentAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectActionsAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { receiveProjectChange } from "./projectEvents";
import { ProjectConflict } from "./ProjectConflict";
import { GamesPage } from "./GamesPage";
import { desktopGamesOpenAtom, installedEditorAssetsAtom, installedNativeGameDataAtom } from "./assetAvailability";
import { editorAssetGames, nativeDataGames } from "./editorAssetGames";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { ProjectFilesDialog } from "./ProjectFilesDialog";
import { RecentProjectsDialog } from "./RecentProjectsDialog";
import { GameConsole } from "./GameConsole";
import { AssetAssignmentsDialog } from "./AssetAssignmentsDialog";
import { PlayablePacksDialog } from "./PlayablePacksDialog";
import { loadAssetSources, syncAssetSources } from "./assetSourceState";

export function DesktopProjectController() {
  const store = useStore();
  const setProject = useSetAtom(desktopProjectAtom);
  const setLevelId = useSetAtom(desktopLevelIdAtom);
  const levelId = useAtomValue(desktopLevelIdAtom);
  const project = useAtomValue(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const commands = useAtomValue(desktopProjectCommandsAtom);
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const setActions = useSetAtom(desktopProjectActionsAtom);
  const [gamesOpen, setGamesOpen] = useAtom(desktopGamesOpenAtom);
  const setInstalledAssets = useSetAtom(installedEditorAssetsAtom);
  const setNativeData = useSetAtom(installedNativeGameDataAtom);
  const setExternal = useSetAtom(desktopExternalProjectAtom);
  const [name, setName] = useState("My project");
  const [game, setGame] = useState<GameId>("OttoMatic");
  const open = useRef<() => Promise<void>>(async () => undefined);
  const bridge = desktopBridge();
  useEffect(() => {
    if (!bridge) return;
    let current = true;
    void desktopRequest({ operation: "project.restore" }, z.object({ project: projectSnapshotSchema, levelId: z.string().nullable() }).nullable()).then((result) => {
      if (!current) return;
      if (result.isErr()) { toast.error("Could not restore the last project", { description: result.error.message }); return; }
      if (result.value && !store.get(desktopProjectAtom)) { setLevelId(result.value.levelId); setProject(result.value.project); }
    });
    return () => { current = false; };
  }, [bridge, store, setLevelId, setProject]);
  useEffect(() => {
    if (!bridge || !project || (levelId && !project.manifest.levels.some((level) => level.id === levelId))) return;
    void desktopRequest({ operation: "project.session", levelId }, z.void());
  }, [bridge, project, levelId]);
  useEffect(() => bridge?.onProjectChange((value) => receiveProjectChange(store, value)), [bridge, store]);
  useEffect(() => { open.current = () => openProject(false); });
  useEffect(() => {
    if (!bridge) return;
    setActions({ open: () => open.current() });
    return () => setActions(null);
  }, [bridge, setActions]);
  useEffect(() => bridge?.onCommand?.((value) => {
    const parsed = hostCommandSchema.safeParse(value);
    if (!parsed.success) return;
    if (parsed.data === "save") void store.get(desktopActiveDocumentAtom)?.save();
    else if (parsed.data === "open") void open.current();
    else setDialog("new");
  }), [bridge, store, setDialog]);
  useEffect(() => {
    if (!bridge) return;
    void loadAssetSources().then((result) => {
      if (result.isErr()) { toast.error("Could not load game asset sources", { description: result.error.message }); return; }
      setInstalledAssets(editorAssetGames(result.value.assets));
      setNativeData(nativeDataGames(result.value.assets, result.value.games));
      syncAssetSources(result.value.assets, result.value.games);
    });
  }, [bridge, setInstalledAssets, setNativeData]);
  if (!bridge) return null;

  async function openProject(create: boolean) {
    if (dirty) { toast.error("Save or discard edits before opening another project"); return; }
    const result = await desktopRequest(create ? { operation: "project.create", name, game } : { operation: "project.open" }, projectSnapshotSchema);
    if (result.isErr()) { if (result.error.code !== "cancelled") toast.error(result.error.message); return; }
    commands?.discard();
    setExternal(null);
    setLevelId(result.value.manifest.levels[0]?.id ?? null);
    setProject(result.value);
    setDialog(null);
  }

  return <>
    <ProjectConflict />
    <ProjectDetailsDialog />
    <ProjectFilesDialog />
    <RecentProjectsDialog />
    <GameConsole />
    <AssetAssignmentsDialog />
    <PlayablePacksDialog />
    <Dialog open={gamesOpen} onOpenChange={setGamesOpen}><DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Game installations</DialogTitle>
      <DialogDescription>Manage optional games and stock editor assets.</DialogDescription></DialogHeader><GamesPage /></DialogContent></Dialog>
    <Dialog open={dialog === "new"} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>Create folder project</DialogTitle>
      <DialogDescription>Choose one game for this project. Levels and custom assets stay in your selected folder.</DialogDescription></DialogHeader>
      <label className="grid gap-2">Name<input className="rounded border p-2 bg-slate-900" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="grid gap-2">Game<select className="rounded border p-2 bg-slate-900" value={game} onChange={(event) => { const parsed = gameIdSchema.safeParse(event.target.value); if (parsed.success) setGame(parsed.data); }}>
        {DESKTOP_GAMES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select></label>
      <Button disabled={!name.trim()} onClick={() => void openProject(true)}>Choose folder and create</Button>
    </DialogContent></Dialog>
  </>;
}
