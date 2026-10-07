import { useState } from "react";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptAssetFile, ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { ScriptNativeModelGroupSelect } from "./ScriptNativeModelGroupSelect";
import { ScriptObjectNumberField } from "./ScriptObjectNumberField";
import { ScriptObjectAssetAttachment } from "./ScriptObjectAssetAttachment";
import { ScriptObjectAssetPreview } from "./ScriptObjectAssetPreview";
import { ScriptObjectNativeModelPicker } from "./ScriptObjectNativeModelPicker";
import { createObjectVisual, type ObjectVisual } from "./scriptObjectVisualDefaults";

interface Props {
  readonly definition: ScriptCustomObjectDefinition;
  readonly gameId: string;
  readonly assetFiles?: Readonly<Record<string, ScriptAssetFile>>;
  readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void;
  readonly onUpload: (definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton") => void;
}
const kindSchema = z.enum(["none", "nativeDisplayGroup", "customDisplayGroup", "nativeSkeleton", "customSkeleton"]);

export function ScriptObjectAppearanceEditor({ definition, gameId, assetFiles, onUpdate, onUpload }: Props) {
  const [remembered, setRemembered] = useState<Partial<Record<ObjectVisual["kind"], ObjectVisual>>>({});
  const visual = definition.visual;
  const modelAsset = visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton" ? assetFiles?.[visual.modelPath] : undefined;
  const shapes = gameId === "MightyMike-Android";
  const update = (next: ObjectVisual) => onUpdate({ ...definition, visual: next });
  return <section className="grid min-w-0 gap-3 border-t border-slate-800 py-5">
    <h3 className="text-sm font-semibold text-white">Appearance</h3>
    <div className="grid gap-1"><Label>Visual source</Label>
      <Select value={visual.kind} onValueChange={(value) => {
        const result = kindSchema.safeParse(value);
        if (!result.success) return;
        setRemembered({ ...remembered, [visual.kind]: visual });
        update(remembered[result.data] ?? createObjectVisual(result.data, gameId));
      }}><SelectTrigger aria-label="Visual source"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="none">No visual</SelectItem><SelectItem value="nativeDisplayGroup">Game model</SelectItem>
        <SelectItem value="customDisplayGroup">{shapes ? "Uploaded shapes" : "Uploaded model"}</SelectItem>
        {!shapes ? <><SelectItem value="nativeSkeleton">Game skeleton</SelectItem><SelectItem value="customSkeleton">Uploaded skeleton</SelectItem></> : null}
      </SelectContent></Select>
    </div>
    {visual.kind === "none" ? <p className="text-xs text-slate-400">Runs its script without a visible model.</p> : <>
      {visual.kind === "nativeDisplayGroup" ? <ScriptObjectNativeModelPicker definition={definition} gameId={gameId} onUpdate={onUpdate} /> : null}
      {visual.kind === "nativeDisplayGroup" || visual.kind === "nativeSkeleton" ? <>
        <details className="text-sm"><summary className="cursor-pointer text-slate-300">Advanced asset selection</summary><div className="mt-3 grid gap-3">
          {visual.kind === "nativeDisplayGroup" ? <div className="grid gap-1"><Label>Model bank</Label><ScriptNativeModelGroupSelect definition={definition} gameId={gameId} onUpdate={onUpdate} /></div> : null}
          <ScriptObjectNumberField label={visual.kind === "nativeSkeleton" ? "Skeleton index" : "Model index in bank"} value={visual.kind === "nativeSkeleton" ? visual.skeletonType : visual.modelObject} integer onCommit={(value) => update(visual.kind === "nativeSkeleton" ? { ...visual, skeletonType: value } : { ...visual, modelObject: value })} />
          <Link to="/item-models" className="text-xs text-blue-300 underline">Open game model browser</Link>
        </div></details>
      </> : null}
      {visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton" ? <>
        <ScriptObjectAssetAttachment definition={definition} path={visual.modelPath} role="model" assetFiles={assetFiles} onUpload={onUpload} shapes={shapes} />
        {modelAsset ? <ScriptObjectAssetPreview asset={modelAsset} gameId={gameId} definition={definition} onUpdate={onUpdate} /> : null}
        {visual.kind === "customDisplayGroup" ? <ScriptObjectNumberField label="Model index in uploaded asset" value={visual.modelObject} integer onCommit={(modelObject) => update({ ...visual, modelObject })} /> : <ScriptObjectAssetAttachment definition={definition} path={visual.skeletonPath} role="skeleton" assetFiles={assetFiles} onUpload={onUpload} />}
        <Link to="/model-viewer" className="text-xs text-blue-300 underline">Open Model Viewer</Link>
      </> : null}
      <ScriptObjectNumberField label="Visual scale" value={visual.scale} min={0.01} max={100} onCommit={(scale) => update({ ...visual, scale })} />
      <details className="text-sm"><summary className="cursor-pointer text-slate-300">Advanced rendering</summary><div className="mt-3"><ScriptObjectNumberField label="Draw order slot" value={visual.slot} integer onCommit={(slot) => update({ ...visual, slot })} /></div></details>
    </>}
  </section>;
}
