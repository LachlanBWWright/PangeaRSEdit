import { useBlocker } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { desktopBridge } from "./client";
import { desktopActiveDocumentAtom, desktopProjectDirtyAtom, desktopTransitionAtom } from "./projectState";
import { finishDocumentTransition, requestDocumentTransition } from "./documentTransitions";

export function DesktopNavigationGuard() {
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const pending = useAtomValue(desktopTransitionAtom);
  const [busy, setBusy] = useState(false);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const store = useStore();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty || (!desktopBridge() && document?.kind !== "engine")) return false;
    const enginePaths = ["/engine", "/engine/levels"];
    return !(document?.kind === "engine" && enginePaths.includes(currentLocation.pathname) && enginePaths.includes(nextLocation.pathname));
  });
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void requestDocumentTransition(store).then((proceed) => {
      if (proceed) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, store]);
  async function choose(action: "save" | "discard" | "cancel") {
    if (busy) return;
    setBusy(true);
    await finishDocumentTransition(store, action);
    setBusy(false);
  }
  return <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) void choose("cancel"); }}>
    <DialogContent><DialogHeader><DialogTitle>{document?.kind === "engine" ? "Download package before continuing?" : "Save edits before continuing?"}</DialogTitle>
      <DialogDescription>{document?.kind === "engine" ? "Download your game package with its Lua sources, scene files, schemas and types." : "Save writes the current document and its related files. Recovery snapshots stay separate."}</DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => void choose("cancel")}>Keep editing</Button>
        <Button disabled={busy || !document} variant="outline" onClick={() => void choose("discard")}>Discard and continue</Button>
        <Button disabled={busy || !document} onClick={() => void choose("save")}>{busy ? "Working…" : document?.kind === "engine" ? "Download and continue" : "Save and continue"}</Button></div>
    </DialogContent>
  </Dialog>;
}
