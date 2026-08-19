import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip } from "./ScriptSharedComponents";
import type { ScriptHookId } from "./scriptWorkspaceState";

interface ScriptGlobalHookAssignment {
  hookId: ScriptHookId;
  behaviorId: string;
  sourceFilePath: string;
  compatibility: string;
}

interface ScriptGlobalHookBehaviorOption {
  id: string;
  label: string;
}

interface ScriptGlobalHooksPanelProps {
  supportedHooks: readonly ScriptHookId[];
  globalHooks: readonly ScriptGlobalHookAssignment[];
  getBehaviorOptionsForHook: (
    hookId: ScriptHookId,
  ) => readonly ScriptGlobalHookBehaviorOption[];
  onCreateScriptForHook: (hookId: ScriptHookId) => void;
  onClearHook: (hookId: ScriptHookId) => void;
  onAssignHook: (hookId: ScriptHookId, behaviorId: string) => void;
}

export function ScriptGlobalHooksPanel({
  supportedHooks,
  globalHooks,
  getBehaviorOptionsForHook,
  onCreateScriptForHook,
  onClearHook,
  onAssignHook,
}: ScriptGlobalHooksPanelProps) {
  return (
    <section>
      <h3 className="mb-2 font-semibold text-white">Global Hooks</h3>
      <div className="divide-y divide-slate-800 border-y border-slate-800">
        {supportedHooks.map((hookId) => {
          const existing = globalHooks.find(
            (candidate) => candidate.hookId === hookId,
          );
          const behaviorOptions = getBehaviorOptionsForHook(hookId);
          return (
            <div
              key={hookId}
              className="grid gap-2 px-1 py-3 md:grid-cols-[1fr_320px_auto] md:items-center"
            >
              <div>
                <p className="font-medium text-white">{hookId}</p>
                <p className="text-xs text-slate-400">
                  {existing ? existing.sourceFilePath : "No script assigned"}
                </p>
              </div>
              <Select
                value={existing?.behaviorId ?? "none"}
                onValueChange={(value) => {
                  if (value === "__create__") {
                    onCreateScriptForHook(hookId);
                    return;
                  }
                  if (value === "none") {
                    onClearHook(hookId);
                    return;
                  }
                  onAssignHook(hookId, value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No script</SelectItem>
                  <SelectItem value="__create__">
                    Create script for {hookId}
                  </SelectItem>
                  {behaviorOptions.map((behavior) => (
                    <SelectItem key={behavior.id} value={behavior.id}>
                      {behavior.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StatusChip
                label={existing ? existing.compatibility : "Unassigned"}
                tone={
                  existing
                    ? existing.compatibility === "preview-ready"
                      ? "good"
                      : "warning"
                    : "neutral"
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
