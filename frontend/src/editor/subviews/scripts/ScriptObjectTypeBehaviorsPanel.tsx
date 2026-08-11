import { Button } from "@/components/ui/button";
import type { ScriptBehaviorDefinition } from "./scriptWorkspaceState";

interface ScriptObjectTypeBehaviorsPanelProps {
  behaviors: readonly ScriptBehaviorDefinition[];
  onCreate: () => void;
}

export function ScriptObjectTypeBehaviorsPanel({
  behaviors,
  onCreate,
}: ScriptObjectTypeBehaviorsPanelProps) {
  return (
    <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Object Type Scripts</h3>
          <Button onClick={onCreate}>Create</Button>
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
              className="px-1 py-3"
            >
              <p className="font-medium text-white">{behavior.label}</p>
              <p className="text-xs text-slate-400">{behavior.objectType}</p>
              <p className="mt-1 text-xs text-slate-500">
                {behavior.sourceFilePath}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
