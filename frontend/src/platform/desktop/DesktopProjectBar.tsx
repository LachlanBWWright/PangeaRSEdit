import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";

export function DesktopProjectBar() {
  const project = useAtomValue(desktopProjectAtom);
  const levelId = useAtomValue(desktopLevelIdAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const commands = useAtomValue(desktopProjectCommandsAtom);
  const setDialog = useSetAtom(desktopProjectDialogAtom);
  const setAssetsOpen = useSetAtom(desktopAssetDialogAtom);
  if (!project) return null;
  const level = project.manifest.levels.find((entry) => entry.id === levelId);
  const name = document?.kind === "level" ? level?.name ?? "New level" : document?.kind ?? "Project";
  return <nav aria-label="Project workspace" className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-700 bg-slate-900 px-3 py-1 text-xs">
    <span className="mr-2 max-w-48 truncate text-slate-300" title={project.folder}>{name}</span>
    <Button size="sm" variant="ghost" onClick={() => setDialog("levels")}>Levels</Button>
    <Button size="sm" variant="ghost" onClick={() => setDialog("files")}>Files</Button>
    {(document?.kind === "models" || document?.kind === "sprites") && <Button size="sm" variant="ghost" onClick={() => setAssetsOpen(true)}>Assets</Button>}
    <Button size="sm" variant="ghost" onClick={() => setDialog("assignments")}>Assignments</Button>
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <span role="status" className={dirty ? "text-amber-300" : "text-slate-400"}>{external ? "Disk changes need review" : dirty ? "Unsaved changes" : "Saved"}</span>
      {project.recoveryUpdatedAt && <span className="text-slate-400" title={new Date(project.recoveryUpdatedAt).toLocaleString()}>Recovery: {new Date(project.recoveryUpdatedAt).toLocaleTimeString()}</span>}
      <Button size="sm" variant="secondary" disabled={!document} onClick={() => void document?.save()}>Save</Button>
      {commands?.canSave && <Button size="sm" onClick={() => void commands.test()}>Test level</Button>}
    </div>
  </nav>;
}
