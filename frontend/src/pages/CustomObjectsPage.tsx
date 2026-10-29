import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BillyFrontierGlobals, Bugdom2Globals, BugdomGlobals, CroMagGlobals, Globals,
  MightyMikeGlobals, Nanosaur2Globals, NanosaurGlobals, OttoGlobals, type GlobalsInterface,
} from "@/data/globals/globals";
import { CustomObjectWorkspace } from "@/editor/subviews/scripts/CustomObjectWorkspace";
import { createScriptWorkspaceContext } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopLevelIdAtom, desktopProjectAtom } from "@/platform/desktop/projectState";
import { desktopBridge } from "@/platform/desktop/client";
import { DESKTOP_GAMES } from "@/platform/desktop/games";
import { useDesktopProjectScripts } from "@/platform/desktop/useDesktopProjectScripts";
import { inspectCustomObjectPlacementAtom, startCustomObjectPlacementAtom } from "@/editor/subviews/scripts/scriptPlacementNavigation";
import "@/editor/subviews/scripts/scriptWorkbench.css";

const games: readonly GlobalsInterface[] = [OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals];

export function CustomObjectsPage() {
  const [globals, setGlobals] = useAtom(Globals);
  const project = useAtomValue(desktopProjectAtom);
  const levelId = useAtomValue(desktopLevelIdAtom);
  const level = project?.manifest.levels.find((entry) => entry.id === levelId);
  const navigate = useNavigate();
  const startPlacement = useSetAtom(startCustomObjectPlacementAtom);
  const inspectPlacement = useSetAtom(inspectCustomObjectPlacementAtom);
  const boundGame = desktopBridge() && project ? DESKTOP_GAMES.find((game) => game.id === project.manifest.game) : undefined;
  const activeGlobals = boundGame?.globals ?? globals;
  const availableGames = boundGame ? [boundGame.globals] : games;
  const context = createScriptWorkspaceContext(activeGlobals, level?.baseLevel ?? null);
  useDesktopProjectScripts(context);
  return <main className="script-workbench scripting-workspace min-h-full">
    <header className="workbench-toolbar">
      <Boxes size={24} strokeWidth={1.5} className="text-blue-300" />
      <div><h2>Custom objects</h2><p className="workbench-muted">Build an object once. Use it throughout your game.</p></div>
      <div className="ml-auto"><Select value={String(activeGlobals.GAME_TYPE)} onValueChange={(value) => {
        const next = availableGames.find((game) => String(game.GAME_TYPE) === value);
        if (next) setGlobals(next);
      }}><SelectTrigger className="w-48" aria-label="Game"><SelectValue /></SelectTrigger><SelectContent>{availableGames.map((game) => <SelectItem key={game.GAME_NAME} value={String(game.GAME_TYPE)}>{game.GAME_NAME}</SelectItem>)}</SelectContent></Select></div>
    </header>
    <CustomObjectWorkspace key={context.gameId} context={context}
      onPlace={level ? (id) => { startPlacement(id); navigate("/"); } : undefined}
      onSelectPlacement={level ? (id) => { inspectPlacement(id); navigate("/"); } : undefined} />
  </main>;
}
