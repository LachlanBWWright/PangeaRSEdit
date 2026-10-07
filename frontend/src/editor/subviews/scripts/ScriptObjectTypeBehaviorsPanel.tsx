import { Button } from "@/components/ui/button";
import type { ScriptBehaviorDefinition } from "./scriptWorkspaceState";

interface ScriptObjectTypeBehaviorsPanelProps {
  behaviors: readonly ScriptBehaviorDefinition[];
  onCreate: () => void;
  onEditSource?: (path: string) => void;
}

export function ScriptObjectTypeBehaviorsPanel({
  behaviors,
  onCreate,
  onEditSource,
}: ScriptObjectTypeBehaviorsPanelProps) {
  return (
    <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Object type behaviors</h3>
          <Button size="sm" variant="outline" onClick={onCreate}>Create</Button>
        </div>
      <div className="divide-y divide-slate-800 border-y border-slate-800">
        {behaviors.length === 0 ? (
          <p className="text-xs text-slate-400">
            No object type scripts have been created.
          </p>
        ) : (
          behaviors.map((behavior) => (
            <div
              key={behavior.id}
              className="flex min-w-0 items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1"><p className="break-words font-medium text-white">{behavior.label}</p>
              <p className="text-xs text-slate-400">{behavior.objectType}</p>
              <details className="mt-1 text-xs text-slate-400"><summary className="cursor-pointer">Behavior details</summary><p className="mt-1 break-all font-mono">{behavior.sourceFilePath}</p></details></div>
              {onEditSource && <Button size="sm" variant="ghost" onClick={() => onEditSource(behavior.sourceFilePath)} aria-label={`Edit ${behavior.label} behavior`}>Edit</Button>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
