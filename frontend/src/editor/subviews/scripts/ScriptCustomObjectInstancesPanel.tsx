import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { mapItemFocusRequestAtom, setMapItemSelectionAtom } from "../items/mapItemSelection";
import type {
  ScriptCustomObjectDefinition,
  ScriptCustomObjectPlacement,
} from "./scriptWorkspaceState";

interface ScriptCustomObjectInstancesPanelProps {
  readonly placements: readonly ScriptCustomObjectPlacement[];
  readonly definitions: readonly ScriptCustomObjectDefinition[];
  readonly onRemovePlacement: (placementId: string) => void;
}

export function ScriptCustomObjectInstancesPanel({
  placements,
  definitions,
  onRemovePlacement,
}: ScriptCustomObjectInstancesPanelProps) {
  const setFocus = useSetAtom(mapItemFocusRequestAtom);
  const setSelection = useSetAtom(setMapItemSelectionAtom);
  const setView = useSetAtom(ActiveView);
  const definitionLabels = new Map(
    definitions.map((definition) => [definition.id, definition.label]),
  );

  return (
    <section className="min-w-0">
      <div>
        <h3 className="font-medium text-white">Instances on this level</h3>
        <p className="mt-1 text-xs text-slate-400">
          Manage placements of your Lua item definitions.
        </p>
      </div>
      {placements.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No scripted instances are placed on this level. Add one from the
          Items menu, then position it on the map.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-slate-800 border-y border-slate-800">
          {placements.map((placement) => (
            <div
              key={placement.id}
              className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-slate-100">{placement.label}</p>
                <p className="break-words text-xs text-slate-400">
                  {definitionLabels.get(placement.objectId) ?? placement.objectId}
                </p>
                <details className="mt-1 text-xs text-slate-400"><summary className="cursor-pointer">Position</summary><p className="mt-1">World X {String(placement.position.x)}, Y {String(placement.position.y)}, Z {String(placement.position.z)}</p></details>
              </div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => {
                const target = { kind: "custom", id: placement.id } satisfies import("../items/mapItemSelection").MapItemTarget;
                setSelection([target]);
                setFocus((previous) => ({ target, sequence: (previous?.sequence ?? 0) + 1 }));
                setView(View.items);
              }}>Show on map</Button><Button
                size="sm"
                variant="ghost"
                onClick={() => onRemovePlacement(placement.id)}
              >
                Remove
              </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
