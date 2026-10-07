import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUTHORITATIVE_API_SCHEMA, type ApiFunction } from "./scriptApiSchema";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiSignature } from "./scriptCompletionText";
import type { ScriptHookId } from "./scriptWorkspaceState";
import { ScriptReferenceGuidance } from "./ScriptReferenceGuidance";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { getObjectCallbackReferences } from "./scriptObjectCallbackReference";
import { ScriptObjectCallbackReference } from "./ScriptObjectCallbackReference";

interface ScriptHookApiExplorerProps {
  gameId: string;
  supportedHooks: readonly ScriptHookId[];
  onCreateHook?: (hookId: ScriptHookId) => void;
  compact?: boolean;
}

function hookSearchText(hookId: string): string {
  const hook = AUTHORITATIVE_API_SCHEMA.hooks.find((candidate) => candidate.name === hookId);
  const event = SCRIPTING_CONTRACT.events.find((candidate) => candidate.id === hookId);
  return `${hookId} ${hook?.description ?? ""} ${hook?.contextType ?? ""} ${hook?.returnType ?? ""} ${Object.keys(event?.payload ?? {}).join(" ")}`;
}

function apiSearchText(api: ApiFunction): string {
  return `${api.name} ${api.description ?? ""} ${api.returnType} ${api.parameters.map((parameter) => `${parameter.name} ${parameter.type} ${parameter.description ?? ""}`).join(" ")}`;
}

export function ScriptHookApiExplorer({
  gameId,
  supportedHooks,
  onCreateHook,
  compact = false,
}: ScriptHookApiExplorerProps) {
  const [search, setSearch] = useState("");
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
  const itemCallbacks = useMemo(() => getObjectCallbackReferences(supportedHooks, search), [supportedHooks, search]);

  return (
    <section className="grid min-w-0 gap-4">
      {!compact ? <div>
        <h3 className="font-semibold text-white">Hooks & API Explorer</h3>
        <p className="mt-1 text-xs text-slate-400">
          Hooks and functions available to this game.
        </p>
      </div> : null}
      {!compact ? <ScriptReferenceGuidance gameId={gameId} /> : null}
      <Input
        aria-label="Search scripting hooks and APIs"
        placeholder="Search callbacks, APIs, or parameters"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Tabs defaultValue="items" className="min-w-0">
        <TabsList aria-label="Scripting reference sections" className="h-auto rounded-none border-0 border-b border-slate-800 bg-transparent p-0">
          <TabsTrigger value="items" className="px-2 text-xs">Items ({itemCallbacks.length})</TabsTrigger>
          <TabsTrigger value="hooks" className="px-2 text-xs">Level ({hooks.length})</TabsTrigger>
          <TabsTrigger value="api" className="px-2 text-xs">API ({apis.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="min-w-0">
          <p className="py-2 text-xs leading-5 text-slate-400">Add callbacks to your item’s exported behavior table. <code>self.handle</code> is its object handle; <code>self.parameters</code> contains resolved parameters. Lifecycle delivery depends on the game adapter.</p>
          <div className="divide-y divide-slate-800">{itemCallbacks.map((entry) => <ScriptObjectCallbackReference key={entry.name} entry={entry} />)}</div>
          {itemCallbacks.length === 0 ? <p className="py-3 text-xs text-slate-400">No matching item callbacks.</p> : null}
        </TabsContent>
        <TabsContent value="hooks" className="min-w-0 divide-y divide-slate-800">
          <p className="py-2 text-xs leading-5 text-slate-400">Level and game-wide hooks use <code>module.hook(ctx)</code>. Item callbacks receive <code>(self, ctx)</code> separately.</p>
        {hooks.map(({ hookId, hook }) => (
          <div key={hookId} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{hookId}</p>
                <p className="text-xs text-slate-400">{hook.description ?? "No description available."}</p>
              </div>
              {onCreateHook && <Button size="sm" variant="ghost" onClick={() => onCreateHook(hookId)}>
                Create handler
              </Button>}
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Context: <code>{hook.contextType}</code> · Returns: <code>{hook.returnType}</code>
            </p>
            {SCRIPTING_CONTRACT.events.filter((event) => event.id === hookId).map((event) => (
              <dl key={event.id} className="mt-2 grid gap-1 text-xs text-slate-400">
                {Object.entries(event.payload).map(([name, type]) => <div key={name}><dt className="inline"><code>ctx.{name}</code></dt><dd className="ml-2 inline"><code>{type}</code></dd></div>)}
              </dl>
            ))}
          </div>
        ))}
          {hooks.length === 0 ? <p className="py-3 text-xs text-slate-400">No matching level hooks.</p> : null}
        </TabsContent>
        <TabsContent value="api" className="min-w-0 divide-y divide-slate-800">
          {apis.map((api) => (
          <div key={api.name} className="py-4">
            <p className="break-words font-medium text-white"><code>{buildApiSignature(api)}</code></p>
            <p className="mt-1 text-xs text-slate-400">{api.description ?? "No description available."}</p>
            {api.parameters.length > 0 && <dl className="mt-2 grid gap-1 text-xs text-slate-400">{api.parameters.map((parameter) => (
              <div key={parameter.name}><dt className="inline"><code>{parameter.name}</code>{parameter.optional ? " (optional)" : ""}</dt><dd className="ml-2 inline">{parameter.description ?? parameter.type}{parameter.unionValues ? `: ${parameter.unionValues.join(", ")}` : ""}</dd></div>
            ))}</dl>}
            {api.command && (
              <p className="mt-2 text-xs text-slate-500">
                Applies during {api.command.applicationPhase}; capability: {api.command.capability}.
                {" "}Authority: {api.command.authority}. Requires {api.command.validation.join("; ")}.
              </p>
            )}
          </div>
        ))}
          {apis.length === 0 ? <p className="py-3 text-xs text-slate-400">No matching API functions.</p> : null}
        </TabsContent>
      </Tabs>
    </section>
  );
}
