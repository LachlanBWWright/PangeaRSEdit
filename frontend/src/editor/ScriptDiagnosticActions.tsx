import { Button } from "@/components/ui/button";
import type { DiagnosticNavigation, ScriptAttribution } from "./scriptDiagnosticNavigation";

export function DiagnosticSourceAction({ entry, navigation }: { entry: ScriptAttribution; navigation: DiagnosticNavigation }) {
  const resolved = navigation.source(entry);
  return <div>
    <Button size="sm" variant="ghost" className="h-auto whitespace-normal p-1 text-xs underline" disabled={!resolved.target} title={resolved.unavailable ?? (resolved.target.line ? `Open source at line ${resolved.target.line}` : "Open current source; runtime line no longer maps to this draft")} onClick={() => { if (resolved.target) navigation.openSource(resolved.target); }}>Open Lua source</Button>
    {resolved.unavailable && <p className="text-slate-400">{resolved.unavailable}</p>}
  </div>;
}

export function DiagnosticPlacementAction({ handle, navigation }: { handle: NonNullable<ScriptAttribution["object"]>; navigation: DiagnosticNavigation }) {
  const resolved = navigation.placement(handle);
  return <div>
    <Button size="sm" variant="ghost" className="h-auto p-1 text-xs underline" disabled={!resolved.target} title={resolved.unavailable} onClick={() => { if (resolved.target) navigation.selectPlacement(resolved.target); }}>Select placement on map</Button>
    {resolved.unavailable && <p className="text-slate-400">{resolved.unavailable}</p>}
  </div>;
}
