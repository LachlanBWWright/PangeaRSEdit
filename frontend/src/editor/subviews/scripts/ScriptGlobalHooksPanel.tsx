import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScriptHookId } from "./scriptWorkspaceState";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  onEditSource?: (path: string) => void;
}

export function ScriptGlobalHooksPanel({
  supportedHooks,
  globalHooks,
  getBehaviorOptionsForHook,
  onCreateScriptForHook,
  onClearHook,
  onAssignHook,
  onEditSource,
}: ScriptGlobalHooksPanelProps) {
  const [query, setQuery] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const visibleHooks = supportedHooks.filter((hookId) => {
    const hook = AUTHORITATIVE_API_SCHEMA.hooks.find((candidate) => candidate.name === hookId);
    return (!assignedOnly || globalHooks.some((assignment) => assignment.hookId === hookId)) && `${hookId} ${hook?.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <section>
      <h3 className="mb-2 font-semibold text-white">Level and game events</h3>
      <div className="mb-3 flex flex-wrap items-center gap-3"><Input aria-label="Find an event" placeholder="Find an event…" value={query} onChange={(event) => setQuery(event.target.value)} className="max-w-xs" /><Label htmlFor="assigned-hooks-only" className="flex shrink-0 items-center gap-2"><Checkbox id="assigned-hooks-only" checked={assignedOnly} onCheckedChange={(checked) => setAssignedOnly(checked === true)} />Assigned only</Label></div>
      <div className="divide-y divide-slate-800 border-y border-slate-800">
        {visibleHooks.map((hookId) => {
          const hook = AUTHORITATIVE_API_SCHEMA.hooks.find(
            (candidate) => candidate.name === hookId,
          );
          const existing = globalHooks.find(
            (candidate) => candidate.hookId === hookId,
          );
          const behaviorOptions = getBehaviorOptionsForHook(hookId);
          return (
            <div
              key={hookId}
              className="flex min-w-0 flex-wrap items-start gap-3 py-3"
            >
              <div className="min-w-0 flex-[1_1_240px]">
                <p className="font-medium text-white">{hookId.replace(/^on/, "").replace(/([a-z])([A-Z])/g, "$1 $2")}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {hook?.description?.split(". ")[0] ?? "Runs when the game reports this event."}
                </p>
                <details className="mt-1 text-xs text-slate-400">
                  <summary className="cursor-pointer">Details</summary>
                  {hook?.description?.includes(". ") && <p className="mt-2">{hook.description.split(". ").slice(1).join(". ")}</p>}
                  <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                    <dt>Lua event</dt><dd className="break-all font-mono">{hookId}</dd>
                    {hook && <><dt>Context</dt><dd className="break-all font-mono">{hook.contextType}</dd><dt>Returns</dt><dd className="break-all font-mono">{hook.returnType}</dd></>}
                    {existing && <><dt>Source</dt><dd className="break-all font-mono">{existing.sourceFilePath}</dd>{existing.compatibility !== "preview-ready" && <><dt>Availability</dt><dd>{existing.compatibility === "extended-only" ? "Requires extended scripting" : existing.compatibility.replaceAll("-", " ")}</dd></>}</>}
                  </dl>
                </details>
              </div>
              <div className="flex min-w-0 flex-[0_1_340px] items-center gap-2">
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
                <SelectTrigger className="w-full min-w-0" aria-label={`Script for ${hookId}`}>
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
              <div className="w-12 shrink-0">{existing && onEditSource && <Button size="sm" variant="ghost" onClick={() => onEditSource(existing.sourceFilePath)} aria-label={`Edit ${hookId} behavior`}>Edit</Button>}</div>
              </div>
            </div>
          );
        })}
        {visibleHooks.length === 0 && <p className="py-3 text-slate-400">No matching events.</p>}
      </div>
    </section>
  );
}
