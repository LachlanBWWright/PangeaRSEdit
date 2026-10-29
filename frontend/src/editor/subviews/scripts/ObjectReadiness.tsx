import type { ObjectReadinessIssue } from "./scriptObjectReadiness";

export function ObjectReadiness({ issues, compact = false }: {
  issues: readonly ObjectReadinessIssue[];
  compact?: boolean;
}) {
  if (issues.length === 0) return <span className="workbench-muted">Draft validated and launched; verify behavior in game.</span>;
  if (compact) return <span className="workbench-muted" title={issues.map((issue) => `${issue.label}: ${issue.detail}`).join("\n")}>{issues[0]?.label}{issues.length > 1 ? ` · ${issues.length - 1} more` : ""}</span>;
  return <ul aria-label="Object readiness" className="grid gap-2 text-sm">
    {issues.map((issue) => <li key={`${issue.label}:${issue.detail}`} className={issue.tone === "warning" ? "workbench-notice" : "workbench-muted"}>
      <strong>{issue.label}</strong><span className="block break-all">{issue.detail}</span>
    </li>)}
  </ul>;
}
