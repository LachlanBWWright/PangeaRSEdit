import { useAtom, useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Globals } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS, getLevelIndex } from "@/editor/utils/gamePortConfig";
import { desktopLevelIdAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";

export function ProjectDetailsDialog() {
  const navigate = useNavigate();
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const [levelId, setLevelId] = useAtom(desktopLevelIdAtom);
  const project = useAtomValue(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const commands = useAtomValue(desktopProjectCommandsAtom);
  const globals = useAtomValue(Globals);
  return <Dialog open={dialog === "settings" || dialog === "levels"} onOpenChange={(open) => { if (!open) setDialog(null); }}>
    <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{dialog === "levels" ? "Project levels" : "Project settings"}</DialogTitle>
      <DialogDescription>{project?.manifest.name}</DialogDescription></DialogHeader>
      {dialog === "settings" ? <div className="space-y-5">
        <div><p className="text-xs text-muted-foreground mb-1">Project folder</p><p className="text-sm break-all">{project?.folder}</p></div>
        <div><p className="text-xs text-muted-foreground mb-1">Game</p><p className="text-sm">{project?.manifest.game}</p></div>
        {commands?.canSave && <label className="grid gap-2 text-sm">Base level for the current custom level
          <select aria-label="Native base level" className="rounded border border-slate-700 bg-slate-900 p-2" value={commands.baseLevel} onChange={(event) => {
            const parsed = z.coerce.number().int().safeParse(event.target.value); if (parsed.success) commands.setBaseLevel(parsed.data);
          }}>{GAME_PORT_CONFIGS[globals.GAME_TYPE].levels.map((level) => <option key={getLevelIndex(level)} value={getLevelIndex(level)}>{level.name}</option>)}</select>
          <span className="text-muted-foreground text-xs">Controls the native scene and assets used when testing. Saved with the level.</span>
        </label>}
      </div> : <div className="space-y-2 max-h-80 overflow-auto">
        {!project?.manifest.levels.length && <p className="text-sm text-muted-foreground">Create or upload a level, then use Save All to add it to this project.</p>}
        {project?.manifest.levels.map((level) => <Button key={level.id} variant={level.id === levelId ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => {
          if (dirty) { toast.error("Save or discard before switching levels"); return; }
          setLevelId(level.id); setDialog(null); navigate("/");
        }}>{level.name}</Button>)}
      </div>}
      <Button variant="outline" className="justify-self-end" onClick={() => setDialog(null)}>Done</Button>
    </DialogContent>
  </Dialog>;
}
