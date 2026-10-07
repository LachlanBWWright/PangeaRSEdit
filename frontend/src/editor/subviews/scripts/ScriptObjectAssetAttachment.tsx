import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScriptAssetFile, ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

interface Props {
  readonly definition: ScriptCustomObjectDefinition;
  readonly path: string;
  readonly role: "model" | "skeleton";
  readonly assetFiles?: Readonly<Record<string, ScriptAssetFile>>;
  readonly onUpload: (definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton") => void;
  readonly shapes?: boolean;
}

export function ScriptObjectAssetAttachment({ definition, path, role, assetFiles, onUpload, shapes = false }: Props) {
  const id = useId();
  const asset = assetFiles?.[role === "skeleton" ? `${path}.rsrc` : path];
  const accept = role === "skeleton" ? ".rsrc" : shapes ? ".shapes" : definition.visual.kind === "customSkeleton" ? ".bg3d,.3dmf" : ".bg3d,.3dmf,.gltf,.glb";
  return <div className="min-w-0 py-1">
    <Label htmlFor={id}>{role === "model" ? "Model asset" : "Skeleton resource"}</Label>
    <p className="mt-1 break-all text-xs text-slate-300">{asset?.sourceName ?? path.split("/").at(-1)}</p>
    <p className="mt-1 text-xs text-slate-400">{asset ? `Attached · ${(asset.bytes.byteLength / 1024).toFixed(1)} KiB` : "Upload an asset to attach it to the package"} · 16 MiB maximum</p>
    <Input id={id} type="file" accept={accept} className="mt-2" onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) onUpload(definition, file, role);
      event.target.value = "";
    }} />
    <details className="mt-2 text-xs text-slate-400"><summary>Runtime path</summary><p className="break-all">{path}</p></details>
  </div>;
}
