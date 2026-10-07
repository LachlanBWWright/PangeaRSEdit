import type { ObjectCallbackReference } from "./scriptObjectCallbackReference";

export function ScriptObjectCallbackReference({ entry }: { readonly entry: ObjectCallbackReference }) {
  return <article className="min-w-0 py-3">
    <p className="break-words text-sm font-medium text-white"><code>item.{entry.name}(self, ctx)</code></p>
    <p className="mt-1 text-xs leading-5 text-slate-400">{entry.description}</p>
    <p className="mt-2 break-words text-xs text-slate-300"><code>{entry.contextType}</code> → <code>{entry.returnType}</code></p>
    <details className="mt-2 text-xs text-slate-400">
      <summary className="cursor-pointer">Context and return values</summary>
      <dl className="mt-2 grid gap-1">{Object.entries(entry.fields).map(([name, type]) => <div key={name}><dt className="inline"><code>ctx.{name}</code></dt><dd className="ml-2 inline"><code>{type}</code></dd></div>)}</dl>
      <p className="mt-2 leading-5">{entry.returnDescription}</p>
    </details>
  </article>;
}
