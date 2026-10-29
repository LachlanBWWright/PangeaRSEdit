import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { z } from "zod";
import { projectSnapshotSchema } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";

export function RecentProjectsDialog() {
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const [, setProject] = useAtom(desktopProjectAtom);
  const [, setExternal] = useAtom(desktopExternalProjectAtom);
  const [, setLevelId] = useAtom(desktopLevelIdAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const [recent, setRecent] = useState<{ folder: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (dialog !== "recent") return;
    void desktopRequest({ operation: "project.recent" }, z.array(z.object({ folder: z.string(), name: z.string() }))).then((result) => {
      if (result.isOk()) setRecent(result.value); else toast.error(result.error.message);
    });
  }, [dialog]);
  async function reopen(folder: string) {
    if (busy || dirty) return;
    setBusy(true);
    const result = await desktopRequest({ operation: "project.reopen", folder }, projectSnapshotSchema);
    if (result.isErr()) toast.error(result.error.message);
    else { document?.discard(); setExternal(null); setLevelId(result.value.manifest.levels[0]?.id ?? null); setProject(result.value); setDialog(null); }
    setBusy(false);
  }
  return <Dialog open={dialog === "recent"} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>Recent projects</DialogTitle><DialogDescription>Reopen a saved project folder. The most recent project appears first.</DialogDescription></DialogHeader>
    {dirty && <p role="status">Save or discard current edits before opening another project.</p>}
    {!recent.length && <p>No recent projects yet.</p>}
    {recent.map((entry) => <Button key={entry.folder} variant="outline" className="h-auto flex-col items-start whitespace-normal text-left" disabled={dirty || busy} onClick={() => void reopen(entry.folder)}><span>{entry.name}</span><span className="text-xs break-all text-muted-foreground">{entry.folder}</span></Button>)}
  </DialogContent></Dialog>;
}
