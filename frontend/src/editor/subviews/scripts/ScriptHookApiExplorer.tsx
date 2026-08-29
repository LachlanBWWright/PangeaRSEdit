import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTHORITATIVE_API_SCHEMA, type ApiFunction } from "./scriptApiSchema";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiSignature } from "./scriptCompletionText";
import type { ScriptHookId } from "./scriptWorkspaceState";

interface ScriptHookApiExplorerProps {
  gameId: string;
  supportedHooks: readonly ScriptHookId[];
  onCreateHook: (hookId: ScriptHookId) => void;
}

function hookSearchText(hookId: string): string {
  const hook = AUTHORITATIVE_API_SCHEMA.hooks.find((candidate) => candidate.name === hookId);
  return `${hookId} ${hook?.description ?? ""} ${hook?.contextType ?? ""}`;
}

function apiSearchText(api: ApiFunction): string {
  return `${api.name} ${api.description ?? ""} ${api.parameters.map((parameter) => parameter.name).join(" ")}`;
}

export function ScriptHookApiExplorer({
  gameId,
  supportedHooks,
  onCreateHook,
}: ScriptHookApiExplorerProps) {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"hooks" | "api">("hooks");
  const normalizedSearch = search.trim().toLowerCase();
  const hooks = useMemo(
    () => supportedHooks
      .map((hookId) => ({
        hookId,
        hook: AUTHORITATIVE_API_SCHEMA.hooks.find((candidate) => candidate.name === hookId),
      }))
      .flatMap((entry) => entry.hook === undefined ? [] : [{ hookId: entry.hookId, hook: entry.hook }])
      .filter((entry) => hookSearchText(entry.hookId).toLowerCase().includes(normalizedSearch)),
    [normalizedSearch, supportedHooks],
  );
  const apis = useMemo(
    () => getAvailableApiFunctions(gameId, AUTHORITATIVE_API_SCHEMA.apis)
      .filter((api) => apiSearchText(api).toLowerCase().includes(normalizedSearch)),
    [gameId, normalizedSearch],
  );

  return (
    <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div>
        <h3 className="font-semibold text-white">Hooks & API Explorer</h3>
        <p className="mt-1 text-xs text-slate-400">
          Select a hook to see when it runs and what it receives. API entries show the functions available to this game.
        </p>
      </div>
      <Input
        aria-label="Search scripting hooks and APIs"
        placeholder="Search hooks, APIs, or parameters"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="flex gap-2" role="tablist" aria-label="Scripting reference sections">
        <Button variant={section === "hooks" ? "secondary" : "ghost"} onClick={() => setSection("hooks")} role="tab" aria-selected={section === "hooks"}>
          Hooks ({String(hooks.length)})
        </Button>
        <Button variant={section === "api" ? "secondary" : "ghost"} onClick={() => setSection("api")} role="tab" aria-selected={section === "api"}>
          API ({String(apis.length)})
        </Button>
      </div>
      <div className="grid gap-2">
        {section === "hooks" ? hooks.map(({ hookId, hook }) => (
          <div key={hookId} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{hookId}</p>
                <p className="text-xs text-slate-400">{hook.description ?? "No description available."}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onCreateHook(hookId)}>
                Create handler
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Context: <code>{hook.contextType}</code> · Returns: <code>{hook.returnType}</code>
            </p>
          </div>
        )) : apis.map((api) => (
          <div key={api.name} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <p className="font-medium text-white"><code>{buildApiSignature(api)}</code></p>
            <p className="mt-1 text-xs text-slate-400">{api.description ?? "No description available."}</p>
            {api.command && (
              <p className="mt-2 text-[11px] text-amber-300">
                Applies during {api.command.applicationPhase}; capability: {api.command.capability}.
              </p>
            )}
          </div>
        ))}
        {((section === "hooks" && hooks.length === 0) || (section === "api" && apis.length === 0)) && (
          <p className="py-3 text-xs text-slate-400">No matching scripting entries.</p>
        )}
      </div>
    </section>
  );
}
