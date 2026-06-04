import { Button } from "@/components/ui/button";
import { statusToneClass } from "./scriptWorkspaceHelpers";

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "good" | "warning" | "danger";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusToneClass(
        tone,
      )}`}
    >
      {label}
    </span>
  );
}

export function ScriptAssignmentCard({
  title,
  subtitle,
  sourceFilePath,
  tags,
  compatibility,
  onRemove,
}: {
  title: string;
  subtitle: string;
  sourceFilePath: string;
  tags: readonly string[];
  compatibility: "preview-ready" | "extended-only";
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-xs text-slate-300">{subtitle}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {sourceFilePath}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip
            label={
              compatibility === "preview-ready"
                ? "Preview Ready"
                : "Extended Only"
            }
            tone={compatibility === "preview-ready" ? "good" : "warning"}
          />
          <Button size="sm" variant="outline" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-slate-500">No tags</span>
        ) : (
          tags.map((tag) => <StatusChip key={tag} label={tag} tone="neutral" />)
        )}
      </div>
    </div>
  );
}
