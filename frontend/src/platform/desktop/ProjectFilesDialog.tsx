import { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopRequest } from "./client";
import { desktopProjectAtom, desktopProjectDialogAtom } from "./projectState";

export async function openExternalProjectFile(action: "open" | "reveal" | "vscode" | "edit", path?: string, line?: number) {
  const result = await desktopRequest({ operation: "project.external", action, path, line }, z.void());
  if (result.isErr()) toast.error(result.error.message);
}

export function ProjectFilesDialog() {
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const project = useAtomValue(desktopProjectAtom);
  const [filter, setFilter] = useState("");
  return <Dialog open={dialog === "files"} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent className="max-w-3xl">
    <DialogHeader><DialogTitle>Project files</DialogTitle><DialogDescription>Open source and assets in external applications. Saved disk changes reload automatically; unsaved editor changes require review.</DialogDescription></DialogHeader>
    <div className="flex gap-2"><Button onClick={() => void openExternalProjectFile("open")}>Open folder</Button><Button onClick={() => void openExternalProjectFile("edit")}>Open project in editor</Button></div>
    <label className="grid gap-1 text-sm">Filter files<input className="rounded border bg-slate-900 p-2" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
    <div className="grid gap-2 max-h-[55vh] overflow-auto">{project?.files.filter((file) => file.path.toLowerCase().includes(filter.toLowerCase())).map((file) => <div key={file.path} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-all">{file.path}</span>
      <Button size="sm" variant="outline" onClick={() => void openExternalProjectFile("reveal", file.path)}>Reveal</Button>
      {/\.(lua|json|txt|md|tga|png|jpg|jpeg|glb|gltf|shapes|tileset)$/i.test(file.path) && <Button size="sm" onClick={() => void openExternalProjectFile("open", file.path)}>Open externally</Button>}
    </div>)}</div>
  </DialogContent></Dialog>;
}
