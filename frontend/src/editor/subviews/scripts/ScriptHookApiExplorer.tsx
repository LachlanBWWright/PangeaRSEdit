import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTHORITATIVE_API_SCHEMA, type ApiFunction } from "./scriptApiSchema";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiSignature, getApiParameterType } from "./scriptCompletionText";
import type { ScriptHookId, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { buildScriptReferenceTypes, type ScriptReferenceType } from "./scriptReferenceTypes";
import { ScriptReferenceTypeDetails } from "./ScriptReferenceTypeDetails";
import { ScriptLearningGuides } from "./ScriptLearningGuides";
import { scriptHookIdSchema } from "./scriptWorkspaceStateTypes";
import { objectEventContextType } from "./scriptTypeDeclarations";

interface ScriptHookApiExplorerProps {
  gameId: string;
  supportedHooks: readonly ScriptHookId[];
  onCreateHook?: (hookId: ScriptHookId) => void;
  workspace?: ScriptWorkspaceState;
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
  workspace,
}: ScriptHookApiExplorerProps) {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"hooks" | "api" | "objects" | "types" | "learn">("api");
  const [showOtherGames, setShowOtherGames] = useState(false);
  const [namespace, setNamespace] = useState("");
  const context = workspace?.context;
  const customObjects = workspace?.customObjects;
  const behaviorCatalog = workspace?.behaviorCatalog;
  const types = useMemo(() => context && customObjects && behaviorCatalog
    ? buildScriptReferenceTypes({ context, customObjects, behaviorCatalog })
    : new Map<string, ScriptReferenceType>(), [context, customObjects, behaviorCatalog]);
  const availableApis = useMemo(() => getAvailableApiFunctions(gameId, AUTHORITATIVE_API_SCHEMA.apis), [gameId]);
  const catalogApis = showOtherGames ? AUTHORITATIVE_API_SCHEMA.apis : availableApis;
  const catalogHooks = showOtherGames ? scriptHookIdSchema.options : supportedHooks;
  const namespaces = [...new Set(catalogApis.map((api) => api.name.split(".").slice(0, 2).join(".")))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  const hooks = useMemo(
    () => catalogHooks
      .map((hookId) => ({
        hookId,
        hook: AUTHORITATIVE_API_SCHEMA.hooks.find((candidate) => candidate.name === hookId),
      }))
      .flatMap((entry) => entry.hook === undefined ? [] : [{ hookId: entry.hookId, hook: entry.hook }])
      .filter((entry) => hookSearchText(entry.hookId).toLowerCase().includes(normalizedSearch)),
    [normalizedSearch, catalogHooks],
  );
  const apis = useMemo(
    () => catalogApis.filter((api) => (!namespace || api.name.startsWith(`${namespace}.`)) && apiSearchText(api).toLowerCase().includes(normalizedSearch)),
    [catalogApis, namespace, normalizedSearch],
  );

  return (
    <section className="script-reference grid content-start gap-3 rounded-lg border border-slate-700 p-4" aria-label="Lua API reference">
      <div>
        <h3 className="font-semibold text-white">Lua API reference</h3>
        <p className="mt-1 text-xs text-slate-400">
          Browse signatures and types, or open Learn for runtime explanations and working examples.
        </p>
      </div>
      {section !== "learn" && <Input
        aria-label="Search scripting hooks and APIs"
        placeholder="Search hooks, APIs, or parameters"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Scripting reference sections">
        <Button variant={section === "hooks" ? "secondary" : "ghost"} onClick={() => setSection("hooks")} role="tab" aria-selected={section === "hooks"}>
          Hooks ({String(hooks.length)})
        </Button>
        <Button variant={section === "api" ? "secondary" : "ghost"} onClick={() => setSection("api")} role="tab" aria-selected={section === "api"}>
          Functions ({String(apis.length)})
        </Button>
        <Button variant={section === "objects" ? "secondary" : "ghost"} onClick={() => setSection("objects")} role="tab" aria-selected={section === "objects"}>Object events</Button>
        {workspace && <Button variant={section === "types" ? "secondary" : "ghost"} onClick={() => setSection("types")} role="tab" aria-selected={section === "types"}>Types</Button>}
        <Button variant={section === "learn" ? "secondary" : "ghost"} onClick={() => setSection("learn")} role="tab" aria-selected={section === "learn"}>Learn</Button>
      </div>
      {(section === "api" || section === "hooks") && <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={showOtherGames} onChange={(event) => { setShowOtherGames(event.target.checked); setNamespace(""); }} />Include other games</label>}
      {section === "api" && <label className="grid gap-1 text-xs">Function group<select aria-label="Function group" className="h-9 rounded border border-slate-600 bg-slate-900 px-2" value={namespace} onChange={(event) => setNamespace(event.target.value)}><option value="">All functions</option>{namespaces.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
      <p className="text-xs text-slate-400">Type <code>pangea.</code> in Lua and press Ctrl+Space for completions. Contexts are read-only; mutate through API calls.</p>
      <div className="script-reference-entries grid content-start gap-2">
        {section === "learn" ? <ScriptLearningGuides workspace={workspace} /> : section === "hooks" ? hooks.map(({ hookId, hook }) => (
          <div key={hookId} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{hookId}</p>
                <p className="text-xs text-slate-400">{hook.description ?? "No description available."}</p>
              </div>
              {onCreateHook && <Button size="sm" variant="outline" disabled={!supportedHooks.includes(hookId)} onClick={() => onCreateHook(hookId)}>
                Create handler
              </Button>}
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Context: <code>{hook.contextType}</code> · Returns: <code>{hook.returnType}</code>
            </p>
            {!supportedHooks.includes(hookId) && <p className="mt-2 text-xs text-amber-300">Not advertised by the selected game.</p>}
            <ScriptReferenceTypeDetails name={`${hook.contextType}|${hook.returnType}`} types={types} />
            <details className="mt-2 text-xs"><summary className="cursor-pointer">Module example</summary><pre className="mt-2 whitespace-pre-wrap break-words">{`local pangea = require("pangea")\nlocal module = {}\n\n---@param ctx ${hook.contextType}\nfunction module.${hookId}(ctx)\n  -- Respond to this event here.\nend\n\nreturn module`}</pre></details>
          </div>
        )) : section === "api" ? apis.map((api) => (
          <details key={api.name} className="min-w-0 rounded-lg border border-slate-700 p-3">
            <summary className="cursor-pointer break-words font-medium text-white"><code>{buildApiSignature(api)}</code>{!availableApis.some((entry) => entry.name === api.name) && <span className="mt-1 block text-xs font-normal text-amber-300">Other games</span>}</summary>
            <p className="mt-1 text-xs text-slate-400">{api.description ?? "No description available."}</p>
            {!availableApis.some((entry) => entry.name === api.name) && <p className="mt-2 text-xs text-amber-300">Not advertised by the selected game.</p>}
            <dl className="mt-3 grid gap-2 text-xs">{api.parameters.map((parameter) => <div key={parameter.name}><dt><code>{parameter.name}{parameter.optional ? "?" : ""}: {getApiParameterType(api, parameter)}</code></dt><dd className="text-slate-400">{parameter.description}</dd></div>)}</dl>
            <p className="mt-3 text-xs">Returns: <code>{api.returnType}</code></p>
            <ScriptReferenceTypeDetails name={buildApiSignature(api)} types={types} />
            {api.command && (
              <p className="mt-2 text-[11px] text-amber-300">
                Applies during {api.command.applicationPhase}; capability: {api.command.capability}.
              </p>
            )}
            {api.command && <p className="mt-2 text-xs text-slate-400">Authority: {api.command.authority}. {api.command.validation.join("; ")}</p>}
          </details>
        )) : section === "objects" ? <>
          <p className="text-xs text-slate-400">Methods belong to the definition’s exported behavior table. self.handle identifies the instance; use pangea.object.state(self.handle) for its state.</p>
          {SCRIPTING_CONTRACT.objectEvents.filter((event) => `${event.handler} ${event.id}`.toLowerCase().includes(normalizedSearch)).map((event) => <details key={event.id} className="rounded border border-slate-700 p-3"><summary className="cursor-pointer text-sm"><code>{event.handler}(self, ctx)</code></summary><p className="mt-2 text-xs">Context: {objectEventContextType(event.id)}. Returns: nil. Event: {event.id}. Instance state: {event.statePolicy}. Cleanup: {event.cleanup}.</p><ScriptReferenceTypeDetails name={`ObjectBehaviorSelf|${objectEventContextType(event.id)}`} types={types} /></details>)}
        </> : <>{[...types.keys()].filter((name) => `${name} ${types.get(name)?.fields.join(" ")}`.toLowerCase().includes(normalizedSearch)).sort().map((name) => <ScriptReferenceTypeDetails key={name} name={name} types={types} />)}</>}
        {((section === "hooks" && hooks.length === 0) || (section === "api" && apis.length === 0)) && (
          <p className="py-3 text-xs text-slate-400">No matching scripting entries.</p>
        )}
      </div>
    </section>
  );
}
