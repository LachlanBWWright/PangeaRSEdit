import { useBlocker } from "react-router-dom";
import { useAtom, useAtomValue, useStore } from "jotai";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { desktopBridge, desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom } from "./projectState";

export function DesktopNavigationGuard() {
  const [dirty, setDirty] = useAtom(desktopProjectDirtyAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const store = useStore();
  const blocker = useBlocker(Boolean(desktopBridge()) && dirty);
  async function saveAndContinue() {
    await document?.save();
    if (!store.get(desktopProjectDirtyAtom)) blocker.proceed?.();
  }
  return <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
    <DialogContent><DialogHeader><DialogTitle>Save project edits before leaving?</DialogTitle>
      <DialogDescription>Save writes the current document and its related files. Recovery snapshots stay separate.</DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => blocker.reset?.()}>Keep editing</Button>
        <Button variant="outline" onClick={() => { setDirty(false); void desktopRequest({ operation: "host.dirty", dirty: false }, z.void()); blocker.proceed?.(); }}>Discard and continue</Button>
        <Button disabled={!document} onClick={() => void saveAndContinue()}>Save and continue</Button></div>
    </DialogContent>
  </Dialog>;
}
