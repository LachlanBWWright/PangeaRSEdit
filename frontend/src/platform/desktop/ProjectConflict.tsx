import { useAtom, useAtomValue } from "jotai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { desktopActiveDocumentAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom } from "./projectState";

export function ProjectConflict() {
  const [external, setExternal] = useAtom(desktopExternalProjectAtom);
  const [open, setOpen] = useAtom(desktopConflictOpenAtom);
  const [project, setProject] = useAtom(desktopProjectAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const paths = new Set([...(project?.files.map((file) => file.path) ?? []), ...(external?.files.map((file) => file.path) ?? [])]);
  const changed = [...paths].filter((path) => project?.files.find((file) => file.path === path)?.hash
    !== external?.files.find((file) => file.path === path)?.hash);
  return <Dialog open={external !== null && open} onOpenChange={setOpen}>
    <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Project changed outside the editor</DialogTitle>
      <DialogDescription>Your unsaved work is still in the editor. Choose which version to keep before saving.</DialogDescription></DialogHeader>
      <ul className="max-h-60 overflow-auto text-sm font-mono">{changed.map((path) => <li key={path} className="py-1 break-all">
        {!external?.files.some((file) => file.path === path) ? "Deleted: " : !project?.files.some((file) => file.path === path) ? "Added: " : "Changed: "}{path}
      </li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>Keep reviewing</Button>
        <Button variant="outline" onClick={() => { if (external) { document?.discard(); setProject(external); setExternal(null); } }}>Reload disk version and discard edits</Button>
        <Button onClick={() => { if (external) { setProject(external); setExternal(null); } }}>Keep editor edits for next save</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
