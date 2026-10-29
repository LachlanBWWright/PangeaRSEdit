import type { ReactNode } from "react";
import { Box, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

export interface ObjectLibraryEntry {
  readonly definition: ScriptCustomObjectDefinition;
  readonly snapshot?: string;
  readonly readiness?: ReactNode;
}

interface Props {
  entries: readonly ObjectLibraryEntry[];
  selectedId: string | undefined;
  exportIds: readonly string[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onToggleExport: (id: string, checked: boolean) => void;
}

export function ObjectLibraryList(props: Props) {
  return <aside className="object-library" aria-label="Object library">
    <div className="relative">
      <Search size={15} className="absolute left-3 top-3 text-slate-400" />
      <Input aria-label="Search objects" placeholder="Find an object" className="pl-9" value={props.search} onChange={(event) => props.onSearch(event.target.value)} />
    </div>
    <p className="workbench-muted mt-2 text-xs">Check objects to export a selection.</p>
    <div className="object-library-list">{props.entries.map(({ definition, snapshot, readiness }) =>
      <div key={definition.id} className="flex items-start gap-1">
        <input type="checkbox" className="mt-4 shrink-0" aria-label={`Select ${definition.label} for export`} checked={props.exportIds.includes(definition.id)} onChange={(event) => props.onToggleExport(definition.id, event.target.checked)} />
        <button type="button" className="object-library-item min-w-0" aria-pressed={props.selectedId === definition.id} onClick={() => props.onSelect(definition.id)}>
          {snapshot ? <img src={snapshot} alt="" className="object-model-thumbnail" /> : <Box size={18} />}
          <span className="min-w-0">
            <span className="font-medium">{definition.label}</span>
            <span className="workbench-muted">{definition.visual.kind === "none" ? "Logic only" : definition.visual.kind.includes("Skeleton") ? "Skeletal object" : "Model object"}</span>
            {readiness}
          </span>
        </button>
      </div>,
    )}</div>
    {props.entries.length === 0 && <p className="workbench-muted px-3 py-5">{props.search ? "No objects match your search." : "Your objects will appear here."}</p>}
  </aside>;
}
