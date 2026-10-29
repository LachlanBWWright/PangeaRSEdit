import { lazy, Suspense, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { Globals, type Game } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { desktopBridge } from "@/platform/desktop/client";
import { desktopProjectAtom } from "@/platform/desktop/projectState";
import { openExternalProjectFile } from "@/platform/desktop/ProjectFilesDialog";
import { createScriptWorkspaceContext, setScriptActiveFile } from "./subviews/scripts/scriptWorkspaceState";
import { inspectCustomObjectPlacementAtom } from "./subviews/scripts/scriptPlacementNavigation";
import { useScriptWorkspace } from "./subviews/scripts/useScriptWorkspace";
import { diagnosticPlacement, diagnosticSourceLocation, type DiagnosticNavigation, type ScriptSourceLocation } from "./scriptDiagnosticNavigation";

const SourceEditor = lazy(() => import("./subviews/scripts/ScriptSourceEditor").then((module) => ({ default: module.ScriptSourceEditor })));

export interface ScriptNavigationContext { game?: Game; unavailable?: string; placementUnavailable?: string; onSelectPlacement?: () => void }

export function useScriptDiagnosticNavigation(snapshot: ScriptInspectorSnapshot | null, context: ScriptNavigationContext) {
  const globals = useAtomValue(Globals);
  const level = useAtomValue(LevelNumber) ?? null;
  const workspaceContext = useMemo(() => createScriptWorkspaceContext(globals, level), [globals, level]);
  const { workspace, update } = useScriptWorkspace(workspaceContext);
  const project = useAtomValue(desktopProjectAtom);
  const inspect = useSetAtom(inspectCustomObjectPlacementAtom);
  const [location, setLocation] = useState<ScriptSourceLocation | null>(null);
  const unavailable = context.unavailable ?? (context.game !== undefined && context.game !== globals.GAME_TYPE ? "Open the originating game's workspace to follow this diagnostic." : undefined);
  const navigation: DiagnosticNavigation = {
    source: (entry) => {
      if (unavailable) return { unavailable };
      const resolved = diagnosticSourceLocation(workspace, entry.source, entry.line);
      if (resolved.target && desktopBridge() && !project?.files.some((file) => file.path === resolved.target.path)) return { unavailable: "Save this source in the project before opening it externally." };
      return resolved;
    },
    placement: (handle) => unavailable || context.placementUnavailable ? { unavailable: unavailable ?? context.placementUnavailable ?? "Placement unavailable." } : diagnosticPlacement(workspace, snapshot, handle),
    openSource: (target) => {
      update((state) => setScriptActiveFile(state, target.path));
      if (desktopBridge()) void openExternalProjectFile("edit", target.path, target.line || undefined);
      else setLocation(target);
    },
    selectPlacement: (id) => { inspect(id); context.onSelectPlacement?.(); toast.info("Placement selected in Items."); },
  };
  const editor = <Dialog open={location !== null} onOpenChange={(open) => { if (!open) setLocation(null); }}>
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
      <DialogHeader><DialogTitle>Lua diagnostic source</DialogTitle><DialogDescription>Current workspace source. Rebuild and test again after editing; runtime locations refer to the launched bundle.</DialogDescription></DialogHeader>
      {location && <Suspense fallback={<p>Loading Lua editor…</p>}><SourceEditor key={`${location.path}:${location.line}`} workspace={workspace} path={location.path} update={update} initialLine={location.line} /></Suspense>}
    </DialogContent>
  </Dialog>;
  return { navigation, editor, workspace };
}
