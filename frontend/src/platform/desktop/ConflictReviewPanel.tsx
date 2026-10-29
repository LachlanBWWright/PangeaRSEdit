import { useState } from "react";
import { conflictReviewSchema, projectSnapshotSchema, type ConflictReview, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";
import type { DesktopDocument } from "./projectState";
import { desktopRequest } from "./client";
import { ConflictFileReview, type FileChoice } from "./ConflictFileReview";

export function ConflictReviewPanel({ project, document, onApplied }: { project: ProjectSnapshot; document: DesktopDocument; onApplied: (snapshot: ProjectSnapshot) => void }) {
  const [review, setReview] = useState<ConflictReview | null>(null);
  const [choices, setChoices] = useState<Record<string, FileChoice>>({});
  const [capture, setCapture] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function build() {
    if (!document.prepare || busy) return;
    setBusy(true); setError("");
    const before = document.capture?.() ?? "";
    const prepared = await document.prepare();
    if (prepared.isErr()) { setError(prepared.error); setBusy(false); return; }
    if (before !== (document.capture?.() ?? "")) { setError("The editor changed during preparation. Build the review again."); setBusy(false); return; }
    const result = await desktopRequest({ operation: "project.review", base: project, edits: prepared.value }, conflictReviewSchema);
    if (result.isErr()) setError(result.error.message);
    else { setReview(result.value); setChoices({}); setCapture(before); }
    setBusy(false);
  }
  async function apply() {
    if (!review || busy) return;
    if ((document.capture?.() ?? "") !== capture) { setError("Your editor contents changed. Rebuild the review before applying it."); return; }
    setBusy(true); setError("");
    const result = await desktopRequest({ operation: "project.apply-review", id: review.id, choices: Object.values(choices) }, projectSnapshotSchema);
    if (result.isErr()) setError(result.error.message); else onApplied(result.value);
    setBusy(false);
  }
  const unresolved = review?.files.filter((file) => (choices[file.path]?.choice ?? file.decision) === "unresolved").length ?? 0;
  return <div className="grid gap-3"><Button variant="secondary" disabled={busy} onClick={() => void build()}>{review ? "Rebuild file review" : "Review and merge files"}</Button>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {review && <><p role="status" className="text-sm">{review.files.length} changed files · {unresolved} unresolved. Independent text changes merge automatically. Applying writes the chosen files and reloads the document.</p>
      <div className="grid gap-3 max-h-[50vh] overflow-auto">{review.files.map((file) => <ConflictFileReview key={file.path} file={file} choice={choices[file.path]} onChange={(choice) => setChoices({ ...choices, [file.path]: choice })} />)}</div>
      <Button disabled={busy || unresolved > 0} onClick={() => void apply()}>Apply merged files and reload</Button></>}
  </div>;
}
