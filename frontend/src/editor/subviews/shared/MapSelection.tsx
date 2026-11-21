import type { ReactNode } from "react";

interface MapSelectionProps {
  readonly label: string;
  readonly selected: number | undefined;
  readonly onSelect: (index: number | undefined) => void;
  readonly children: ReactNode;
}

export function MapSelection({ label, selected, onSelect, children }: MapSelectionProps) {
  return (
    <label className="flex max-w-sm items-center gap-2 px-1 text-sm">
      <span className="shrink-0">{label}</span>
      <select
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring"
        value={selected ?? ""}
        onChange={(event) => onSelect(event.target.value === "" ? undefined : Number(event.target.value))}
      >
        <option value="">None selected</option>
        {children}
      </select>
    </label>
  );
}
