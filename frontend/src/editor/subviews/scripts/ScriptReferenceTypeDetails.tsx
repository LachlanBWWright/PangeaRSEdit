import { referenceTypeFields, type ScriptReferenceType } from "./scriptReferenceTypes";

export function ScriptReferenceTypeDetails({ name, types }: { name: string; types: ReadonlyMap<string, ScriptReferenceType> }) {
  const names = [...new Set(name.match(/[A-Za-z_]\w*/g) ?? [])].filter((part) => types.has(part));
  return <>{names.map((part) => {
    const entry = types.get(part);
    const fields = referenceTypeFields(types, part);
    return <details key={part} className="mt-2 border-t border-slate-700 pt-2"><summary className="cursor-pointer break-all text-xs">{part}{entry?.parent ? ` extends ${entry.parent}` : ""}</summary>
      {entry?.alias && <code className="mt-2 block whitespace-pre-wrap break-words text-xs">{entry.alias}</code>}
      <ul className="mt-2 grid gap-2">{fields.map((field) => <li key={field}><code className="block whitespace-pre-wrap break-words text-xs text-slate-300">{field}</code></li>)}</ul>
    </details>;
  })}</>;
}
