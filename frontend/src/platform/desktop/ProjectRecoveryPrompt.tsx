import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { z } from "zod";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";

export function ProjectRecoveryPrompt() {
  const project = useAtomValue(desktopProjectAtom);
  return project ? <RecoveryPrompt key={project.folder} project={project} /> : null;
}

function RecoveryPrompt({ project }: { project: ProjectSnapshot }) {
  const document = useAtomValue(desktopActiveDocumentAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const setProject = useSetAtom(desktopProjectAtom);
  const setAssetsOpen = useSetAtom(desktopAssetDialogAtom);
  const [available, setAvailable] = useState(project.recoveryAvailable);
  const [busy, setBusy] = useState(false);
  const folder = project.folder;
  function dismiss() { setAvailable(false); }
  async function restore() {
    if (!document || dirty) return;
    dismiss();
    if (document.recover) await document.recover();
    else setAssetsOpen(true);
  }
  async function remove() {
    setBusy(true);
    const result = await desktopRequest({ operation: "project.recover", action: "discard" }, z.void());
    if (result.isErr()) toast.error(result.error.message);
    else {
      setProject((current) => current?.folder === folder ? { ...current, recoveryAvailable: false, recoveryUpdatedAt: undefined } : current);
      dismiss();
    }
    setBusy(false);
  }
  return <Dialog open={Boolean(available) && !dirty} onOpenChange={(open) => { if (!open && !busy) dismiss(); }}>
    <DialogContent><DialogHeader><DialogTitle>Unsaved work is available</DialogTitle>
      <DialogDescription>{project?.manifest.name} has a recovery snapshot{project?.recoveryUpdatedAt ? ` from ${new Date(project.recoveryUpdatedAt).toLocaleString()}` : ""}. Saved project files stay unchanged until you save recovered edits.</DialogDescription></DialogHeader>
      <p className="text-sm">Restore the current document type, or keep the snapshot and use Recover Unsaved Work in the appropriate level, scripts, model or sprite workspace.</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} variant="outline" onClick={dismiss}>Keep for later</Button>
        <Button disabled={busy} variant="outline" onClick={() => void remove()}>Delete snapshot</Button>
        <Button disabled={busy || !document || document.kind === "engine"} onClick={() => void restore()}>Restore {document?.kind ?? "document"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
