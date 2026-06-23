import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-white">Object Type Scripts</CardTitle>
            <CardDescription>
              Run focused Lua modules only for objects with a matching native
              runtime type.
            </CardDescription>
          </div>
          <Button onClick={onCreate}>Create</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {behaviors.length === 0 ? (
          <p className="text-xs text-slate-400">
            No object type scripts have been created.
          </p>
        ) : (
          behaviors.map((behavior) => (
            <div
              key={behavior.id}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
            >
              <p className="font-medium text-white">{behavior.label}</p>
              <p className="text-xs text-slate-400">{behavior.objectType}</p>
              <p className="mt-1 text-xs text-slate-500">
                {behavior.sourceFilePath}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
