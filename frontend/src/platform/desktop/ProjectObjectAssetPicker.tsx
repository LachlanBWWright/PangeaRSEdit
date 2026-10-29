import { useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desktopBridge } from "./client";
import { desktopProjectAtom } from "./projectState";
import { readProjectFiles } from "./projectLoad";

export function ProjectObjectAssetPicker({ format, role, disabled, onUpload }: {
  format: "bg3d" | "3dmf" | "shapes"; role: "model" | "skeleton"; disabled: boolean;
  onUpload: (file: File, role: "model" | "skeleton") => void;
}) {
  const project = useAtomValue(desktopProjectAtom);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  if (!desktopBridge() || !project) return null;
  const candidates = project.files.filter((file) => role === "skeleton" ? file.path.endsWith(".skeleton.rsrc")
    : file.path.toLowerCase().endsWith(`.${format}`));
  async function assign() {
    if (!project || !selected || busy) return;
    setBusy(true);
    const files = await readProjectFiles(project, [selected]);
    if (files.isErr()) toast.error(files.error.message);
    else {
      const file = files.value[0];
      if (file) onUpload(new File([Uint8Array.from(file.bytes)], file.path.split("/").at(-1) ?? "asset"), role);
    }
    setBusy(false);
  }
  return <div className="grid gap-2"><label className="grid gap-1 text-sm">Project {role} asset<select className="rounded border bg-slate-900 p-2" disabled={disabled || busy} value={selected} onChange={(event) => setSelected(event.target.value)}>
    <option value="">Choose a saved {role}…</option>{candidates.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
  </select></label><Button variant="secondary" disabled={disabled || busy || !selected} onClick={() => void assign()}>Assign project {role}</Button><p className="workbench-muted">Copies the validated native asset into this object's script package. Save All, place the object, then test the level.</p></div>;
}
