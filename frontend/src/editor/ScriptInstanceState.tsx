import { useEffect, useMemo, useState } from "react";
import type { ScriptStatePage, ScriptStateQuery } from "@pangea/desktop-contracts";
import type { QueryScriptState } from "./utils/scriptState";

interface Props { handle: ScriptStateQuery["handle"]; query: QueryScriptState; path?: ScriptStateQuery["path"] }
const rootPath: ScriptStateQuery["path"] = [];

export function ScriptStateTable({ handle, query, path = rootPath }: Props) {
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<ScriptStatePage | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const { id, generation } = handle;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPage(null); setError("");
      const result = await query({ handle: { id, generation }, path, offset });
      if (cancelled) return;
      setPage(result.isOk() ? result.value : null);
      setError(result.isErr() ? result.error : "");
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, id, generation, path, offset, revision]);
  return <div role="group" aria-label={path.length ? `State table ${path.map((key) => JSON.stringify(key)).join(".")}` : "Object state"} className="space-y-2 border-l border-slate-700 pl-2">
    <button onClick={() => setRevision(revision + 1)}>Refresh state fields</button>
    {error && <p role="alert">{error}</p>}
    {!page && !error && <p role="status">Loading state…</p>}
    {page?.entries.map((entry, index) => <ScriptStateEntry key={`${offset}:${index}:${JSON.stringify(entry.key)}`} entry={entry} handle={handle} query={query} path={path} />)}
    {page && !page.entries.length && <p>No state fields.</p>}
    {page?.truncated && <p className="text-slate-400">This page is bounded; use Next to inspect more fields. Values marked truncated are shortened.</p>}
    {page && <div className="flex gap-3"><button disabled={offset === 0} onClick={() => { setPage(null); setOffset(Math.max(0, offset - 32)); }}>Previous state fields</button><span>{page.entries.length ? page.offset + 1 : 0}–{page.offset + page.entries.length} of {page.total}</span><button disabled={page.nextOffset === null} onClick={() => { if (page.nextOffset !== null) { setPage(null); setOffset(page.nextOffset); } }}>Next state fields</button></div>}
  </div>;
}

function ScriptStateEntry({ entry, handle, query, path }: Props & { entry: ScriptStatePage["entries"][number] }) {
  const [open, setOpen] = useState(false);
  const depth = path?.length ?? 0;
  const childPath = useMemo(() => entry.key === null ? path ?? rootPath : [...(path ?? rootPath), entry.key], [path, entry.key]);
  return <div className="break-words">
    <div>{entry.expandable && entry.key !== null && !entry.cycle && depth < 16 ? <button aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "▾" : "▸"} {JSON.stringify(entry.key)}</button> : <span>{entry.key === null ? "Unsupported key" : JSON.stringify(entry.key)}</span>} <span className="text-slate-400">({entry.type})</span>: {entry.value}{entry.cycle && " · Cycle to an ancestor table"}{entry.truncated && " · Truncated"}{entry.type === "table" && !entry.cycle && depth >= 16 && " · Maximum inspection depth reached"}</div>
    {open && entry.key !== null && <ScriptStateTable handle={handle} query={query} path={childPath} />}
  </div>;
}

export function ScriptInstanceState({ handle, query, preview }: { handle: ScriptStateQuery["handle"]; query?: QueryScriptState; preview: Record<string, string> }) {
  return <section aria-label="Instance state" className="space-y-2"><h5 className="font-medium">Instance state</h5>
    {query ? <><p className="text-slate-400">Read-only. Expand tables to inspect string and numeric keys without running Lua expressions.</p><ScriptStateTable key={`${handle.id}:${handle.generation}`} handle={handle} query={query} /></> : <><p className="text-slate-400">Bounded scalar preview. Rebuild the runtime to inspect nested tables.</p><dl>{Object.entries(preview).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></>}
  </section>;
}
