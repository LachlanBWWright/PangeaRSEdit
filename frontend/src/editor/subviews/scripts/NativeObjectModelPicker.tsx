import { useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GlobalsInterface } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { getItemName } from "@/data/items/getItemNames";
import { useItemModelCache } from "@/editor/threejs/hooks/useItemModelCache";
import { getItemModelCacheKey } from "@/editor/threejs/hooks/itemModelCacheKey";
import { DEFAULT_ITEM_MODEL_PARAMS } from "@/data/items/itemModelPreview";
import { ObjectModelPreview } from "./ObjectModelPreview";
import { objectModelSnapshotKey } from "./objectModelSnapshots";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getCollisionPreviewBounds } from "./scriptCollisionPreview";
import { isScriptGlobalModelFile } from "./scriptNativeModelGuidance";
import { createNativeDefinitionScene } from "./scriptNativeModelScene";

export function NativeObjectModelPicker({ globals, gameId, definition, onChange, previewOnly = false }: {
  globals: GlobalsInterface;
  gameId: string;
  definition: ScriptCustomObjectDefinition;
  onChange: (definition: ScriptCustomObjectDefinition) => void;
  previewOnly?: boolean;
}) {
  const mapper = getGameMapper(globals.GAME_TYPE);
  const options = (mapper?.getMappedTypes() ?? []).flatMap((type) => {
    const mapping = mapper?.getMapping(type);
    if (!mapping || mapping.requiresSkeleton || !isScriptGlobalModelFile(globals.GAME_TYPE, mapping.modelFile) || mapping.groupSize && mapping.groupSize > 1) return [];
    const firstPart = mapping.modelParts?.[0];
    if (firstPart && (firstPart.modelIndex !== mapping.modelIndex || firstPart.modelFile !== mapping.modelFile || firstPart.groupSize && firstPart.groupSize > 1)) return [];
    return [{ type, label: getItemName(globals, type), index: mapping.modelIndex }];
  });
  const { loadModel, modelCache } = useItemModelCache(globals.GAME_TYPE);
  const visual = definition.visual;
  const selected = visual.kind === "nativeDisplayGroup" && visual.group === "global" ? options.find((option) => option.index === visual.modelObject) : undefined;
  const itemType = selected?.type;
  useEffect(() => {
    if (itemType !== undefined) void loadModel(itemType);
  }, [itemType, loadModel]);
  const cached = itemType === undefined ? undefined : modelCache.get(getItemModelCacheKey(globals.GAME_TYPE, itemType, DEFAULT_ITEM_MODEL_PARAMS));
  const sourceScene = cached?.gltf;
  const scene = useMemo(() => sourceScene ? createNativeDefinitionScene(sourceScene) : null, [sourceScene]);
  if (visual.kind !== "nativeDisplayGroup") return null;
  return <div className="workbench-section">
    {!previewOnly && <div className="workbench-field"><label htmlFor={`native-model-${definition.id}`}>Game model</label>
      <Select value={selected ? String(selected.type) : "current"} onValueChange={(value) => {
        const option = options.find((entry) => String(entry.type) === value);
        if (option) onChange({ ...definition, visual: { ...visual, group: "global", modelObject: option.index } });
      }}><SelectTrigger id={`native-model-${definition.id}`}><SelectValue /></SelectTrigger><SelectContent>
        {!selected && <SelectItem value="current">Current {visual.group === "global" ? "global" : "level"} model ({visual.modelObject})</SelectItem>}
        {options.map((option) => <SelectItem key={option.type} value={String(option.type)}>{option.label}</SelectItem>)}
      </SelectContent></Select>
      <p className="workbench-muted">Named choices use the game's mapped global models. Level-specific models depend on the loaded level.</p>
    </div>}
    {selected && (!cached || cached.loading) && <p className="workbench-muted" role="status">Loading model…</p>}
    {cached?.error && <p role="alert" className="workbench-notice" data-tone="warning">Could not load this model. {cached.error}</p>}
    {previewOnly && !selected && <p className="workbench-muted">A model overlay is available for named global static models. Level models, skeletons and uploaded models can still be inspected using the dimension projections.</p>}
    {scene && <ObjectModelPreview key={objectModelSnapshotKey(gameId, definition)} scene={scene} scale={visual.scale} collision={previewOnly ? getCollisionPreviewBounds(definition, gameId) : null} snapshotKey={objectModelSnapshotKey(gameId, definition)} />}
  </div>;
}
