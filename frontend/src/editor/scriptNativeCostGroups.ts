import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";

type Window = NonNullable<NonNullable<ScriptInspectorSnapshot["nativeCosts"]>["window"]>;
type Entry = Window["entries"][number];

export type NativeCostGroup = Omit<Entry, "source" | "object"> & { label: string };

export function groupNativeCosts(entries: Window["entries"], scope: "script" | "object"): NativeCostGroup[] {
  const groups = new Map<string, NativeCostGroup>();
  for (const entry of entries) {
    const label = scope === "script" ? entry.source || "Source unavailable"
      : entry.object ? `Object ${entry.object.id}:${entry.object.generation}` : "No object (level/global callbacks)";
    const previous = groups.get(label);
    groups.set(label, {
      label, calls: entry.calls + (previous?.calls ?? 0),
      milliseconds: entry.milliseconds + (previous?.milliseconds ?? 0),
      maxMilliseconds: Math.max(entry.maxMilliseconds, previous?.maxMilliseconds ?? 0),
      slowCalls: entry.slowCalls + (previous?.slowCalls ?? 0),
    });
  }
  return [...groups.values()].sort((a, b) => b.milliseconds - a.milliseconds || a.label.localeCompare(b.label));
}
