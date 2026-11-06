import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseShapesFile } from "@/parsers/mightyMikeShapesParser";
import { useModelChoiceThumbnail } from "./useModelChoiceThumbnail";
import { nativeModelObjectCount } from "./scriptNativeModelObjects";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

const PAGE_SIZE = 12;

function ModelChoice({ definition, workspace, index, selected, onSelect }: {
  definition: ScriptCustomObjectDefinition; workspace: ScriptWorkspaceState; index: number; selected: boolean; onSelect: () => void;
}) {
  const globals = useAtomValue(Globals);
  const canvas = useRef<HTMLCanvasElement>(null);
  const path = definition.visual.kind === "customDisplayGroup" ? definition.visual.modelPath : "";
  const result = useModelChoiceThumbnail(globals.GAME_TYPE, path, index, workspace.assets);
  const thumbnail = result?.isOk() ? result.value : null;
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (thumbnail && context) { context.clearRect(0, 0, 96, 96); context.drawImage(thumbnail.image, 0, 0, 96, 96); }
  }, [thumbnail]);
  return <button type="button" aria-label={`Use model ${index + 1}`} aria-pressed={selected} onClick={onSelect} className={`grid justify-items-center rounded border p-2 text-sm ${selected ? "border-blue-400 bg-blue-950" : "border-gray-700 bg-gray-800"}`}>
    <canvas ref={canvas} width={96} height={96} aria-label={`Model ${index + 1} geometry`} />
    <span>Model {index + 1}</span>{!result && <span className="text-xs text-gray-400">Loading preview…</span>}
    {result?.isErr() && <span className="text-xs text-amber-300" title={result.error}>Preview unavailable</span>}
  </button>;
}

export function UploadedModelObjectPicker({ definition, workspace, onChange }: {
  definition: ScriptCustomObjectDefinition; workspace: ScriptWorkspaceState; onChange: (definition: ScriptCustomObjectDefinition) => void;
}) {
  const [page, setPage] = useState(() => definition.visual.kind === "customDisplayGroup" ? Math.floor(definition.visual.modelObject / PAGE_SIZE) : 0);
  const visual = definition.visual;
  const path = visual.kind === "customDisplayGroup" ? visual.modelPath : "";
  const asset = workspace.assets[path];
  const parsed = useMemo(() => {
    if (!asset) return null;
    const buffer = Uint8Array.from(asset.bytes).buffer;
    if (path.toLowerCase().endsWith(".shapes")) return parseShapesFile(buffer).map((file) => file.shapes.length);
    return (path.toLowerCase().endsWith(".3dmf") ? parse3DMF(buffer) : parseBG3D(buffer)).map(nativeModelObjectCount);
  }, [asset, path]);
  if (visual.kind !== "customDisplayGroup" || !parsed) return null;
  if (parsed.isErr()) return <p role="alert">Could not read model choices: {parsed.error}</p>;
  const count = parsed.value;
  const pages = Math.ceil(count / PAGE_SIZE);
  const current = Math.min(page, Math.max(0, pages - 1));
  return <section aria-label="Uploaded model choices" className="grid gap-3">
    <h4 className="font-medium">Choose a model</h4>
    <p className="workbench-muted">{count} models in {asset?.sourceName}. Select geometry below, then adjust its scale.</p>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
      {Array.from({ length: Math.min(PAGE_SIZE, count - current * PAGE_SIZE) }, (_, offset) => {
        const index = current * PAGE_SIZE + offset;
        const choice = { ...definition, visual: { ...visual, modelObject: index } };
        return <ModelChoice key={`${path}:${index}`} definition={choice} workspace={workspace} index={index} selected={visual.modelObject === index} onSelect={() => onChange(choice)} />;
      })}
    </div>
    {pages > 1 && <nav aria-label="Model pages" className="flex items-center gap-3"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous models</button><span>Page {current + 1} of {pages}</span><button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next models</button></nav>}
  </section>;
}
