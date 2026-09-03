import { Button } from "@/components/ui/button";
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
  const definitionLabels = new Map(
    definitions.map((definition) => [definition.id, definition.label]),
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
      <div>
        <h3 className="font-medium text-white">Instances on this level</h3>
        <p className="mt-1 text-xs text-slate-400">
          Definitions describe reusable scripted object types. Each instance is
          a placement of one definition in this level.
        </p>
      </div>
      {placements.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No scripted instances are placed on this level. Add one from the
          Items menu, then position it on the map.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {placements.map((placement) => (
            <div
              key={placement.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-2"
            >
              <div>
                <p className="text-sm text-slate-100">{placement.label}</p>
                <p className="text-xs text-slate-400">
                  {definitionLabels.get(placement.objectId) ?? placement.objectId}
                  {" · "}
                  x {String(placement.position.x)}, y {String(placement.position.y)}, z {String(placement.position.z)}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemovePlacement(placement.id)}
              >
                Remove instance
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
