import { useAtomValue, useSetAtom } from "jotai";
import { FolderOpen, ChevronDown, Save, FolderPlus, Gamepad2, Settings2, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { desktopBridge } from "./client";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectActionsAtom, desktopProjectAtom, desktopProjectCommandsAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { desktopGamesOpenAtom } from "./assetAvailability";

export function DesktopProjectMenu() {
  const project = useAtomValue(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const actions = useAtomValue(desktopProjectActionsAtom);
  const commands = useAtomValue(desktopProjectCommandsAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const setDialog = useSetAtom(desktopProjectDialogAtom);
  const setGamesOpen = useSetAtom(desktopGamesOpenAtom);
  const setAssetOpen = useSetAtom(desktopAssetDialogAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const setConflictOpen = useSetAtom(desktopConflictOpenAtom);
  if (!desktopBridge()) return null;
  const modifier = desktopBridge()?.platform === "darwin" ? "⌘" : "Ctrl";
  return <DropdownMenu modal={false}><DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" className="h-7 max-w-64 shrink-0 gap-2 text-xs text-slate-200" aria-label="Project menu" title={project?.folder}>
      <FolderOpen className="h-4 w-4 shrink-0" /><span className="truncate">{project?.manifest.name ?? "Project"}</span>
      {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-label="Unsaved changes" />}<ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
    </Button>
  </DropdownMenuTrigger><DropdownMenuContent align="start" className="w-64 border-slate-700 bg-slate-800 text-slate-100">
    <DropdownMenuItem onSelect={() => setDialog("new")}><FolderPlus className="h-4 w-4" />New Project<span className="ml-auto text-xs text-slate-400">{modifier} N</span></DropdownMenuItem>
    <DropdownMenuItem onSelect={() => void actions?.open()}><FolderOpen className="h-4 w-4" />Open Project<span className="ml-auto text-xs text-slate-400">{modifier} O</span></DropdownMenuItem>
    {project && <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="truncate text-xs font-normal text-slate-400">{project.manifest.name}</DropdownMenuLabel>
      <DropdownMenuItem disabled={!document} onSelect={() => void document?.save()}><Save className="h-4 w-4" />Save All<span className="ml-auto text-xs text-slate-400">{modifier} S</span></DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setDialog("levels")}><Files className="h-4 w-4" />Project Levels…</DropdownMenuItem>
      {commands?.canSave && <DropdownMenuItem onSelect={() => void commands.test()}><Gamepad2 className="h-4 w-4" />Test Current Level</DropdownMenuItem>}
      {(document?.kind === "models" || document?.kind === "sprites") && <DropdownMenuItem onSelect={() => setAssetOpen(true)}><Files className="h-4 w-4" />Project Assets…</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => setDialog("settings")}><Settings2 className="h-4 w-4" />Project Settings…</DropdownMenuItem>
      {external && <DropdownMenuItem onSelect={() => setConflictOpen(true)}>Review Disk Changes…</DropdownMenuItem>}
      {project.recoveryAvailable && document?.recover && <DropdownMenuItem onSelect={() => void document.recover?.()}>Recover Unsaved Work…</DropdownMenuItem>}
      {dirty && document && <DropdownMenuItem onSelect={document.discard}>Discard Local Edits</DropdownMenuItem>}
    </>}
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => setGamesOpen(true)}><Gamepad2 className="h-4 w-4" />Games & Downloads…</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>;
}
