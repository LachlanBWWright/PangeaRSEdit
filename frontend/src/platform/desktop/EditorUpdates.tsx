import { useState } from "react";
import { z } from "zod";
import { editorUpdateSchema } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desktopRequest } from "./client";

export function EditorUpdates() {
  const [status, setStatus] = useState("");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    const result = await desktopRequest({ operation: "editor.updates" }, editorUpdateSchema);
    if (result.isErr()) { setStatus(result.error.message); setAvailable(false); }
    else {
      setAvailable(result.value.available);
      setStatus(result.value.available ? `Editor ${result.value.latest} is available. Installed: ${result.value.current}.`
        : result.value.latest ? `Installed editor ${result.value.current} is up to date.` : `Installed: ${result.value.current}. No compatible editor release has been published.`);
    }
    setBusy(false);
  }
  async function open() {
    const result = await desktopRequest({ operation: "editor.release" }, z.void());
    if (result.isErr()) toast.error(result.error.message);
  }
  return <div className="grid gap-2 text-sm"><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => void check()}>Check editor updates</Button>
    {available && <Button onClick={() => void open()}>Open editor release</Button>}</div>{status && <p role="status">{status}</p>}
    <p className="text-xs text-muted-foreground">Downloads open in your browser. Save your work before installing an update.</p></div>;
}
