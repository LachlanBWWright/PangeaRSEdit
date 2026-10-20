import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { z } from "zod";
import { assetInstallationSchema, gameIdSchema, hostCommandSchema, projectSnapshotSchema, type GameId } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopBridge, desktopRequest } from "./client";
import { DESKTOP_GAMES } from "./games";
import { desktopActiveDocumentAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectActionsAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { receiveProjectChange } from "./projectEvents";
import { ProjectConflict } from "./ProjectConflict";
import { GamesPage } from "./GamesPage";
import { desktopGamesOpenAtom, installedEditorAssetsAtom } from "./assetAvailability";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";

export function DesktopProjectController() {
  const store = useStore();
  const setProject = useSetAtom(desktopProjectAtom);
  const setLevelId = useSetAtom(desktopLevelIdAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const commands = useAtomValue(desktopProjectCommandsAtom);
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const setActions = useSetAtom(desktopProjectActionsAtom);
  const [gamesOpen, setGamesOpen] = useAtom(desktopGamesOpenAtom);
  const setInstalledAssets = useSetAtom(installedEditorAssetsAtom);
  const setExternal = useSetAtom(desktopExternalProjectAtom);
  const [name, setName] = useState("My project");
  const [game, setGame] = useState<GameId>("OttoMatic");
  const open = useRef<() => Promise<void>>(async () => undefined);
  const bridge = desktopBridge();
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
    void desktopRequest({ operation: "games.assets" }, z.array(assetInstallationSchema)).then((result) => {
      if (result.isOk()) setInstalledAssets(result.value.map((entry) => entry.game));
    });
  }, [bridge, setInstalledAssets]);
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
