import { useAtomValue, useSetAtom } from "jotai";
import { Group, Layer, Rect } from "react-konva";
import { memo, useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { createScriptWorkspaceContext, ensureScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptCustomObjectPlacement } from "./scripts/scriptWorkspaceState";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";
import { ITEM_BOX_OFFSET, ITEM_BOX_SIZE, ItemTypeNumber } from "./shared/nodeVisuals";
import { customPlacementMapPoint } from "./items/mapItemCoordinates";
import { selectMapItemAtom, type MapItemTarget } from "./items/mapItemSelection";
import { useMapItemEditing } from "./items/mapItemEditingContext";
import { useMapItemVisualState } from "./items/useMapItemVisualState";

const CustomScriptPlacementNode = memo(function CustomScriptPlacementNode({ placement }: {
  readonly placement: ScriptCustomObjectPlacement;
}) {
  const globals = useAtomValue(Globals);
  const select = useSetAtom(selectMapItemAtom);
  const setHover = useSetAtom(ActiveHoverTag);
  const controller = useMapItemEditing();
  const target = useMemo<MapItemTarget>(() => ({ kind: "custom", id: placement.id }), [placement.id]);
  const visual = useMapItemVisualState(target);
  const point = customPlacementMapPoint(placement.position, globals);
  const x = point.x + visual.offset.x;
  const z = point.z + visual.offset.z;
  const selectPlacement = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    select({ target, additive: event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey, forDrag: true });
  };
  return <Group name="map-item" x={x - ITEM_BOX_OFFSET} y={z - ITEM_BOX_OFFSET} draggable
    onMouseDown={selectPlacement} onTap={selectPlacement}
    onDragStart={(event) => { event.cancelBubble = true; controller?.startDrag(target); }}
    onDragMove={(event) => controller?.previewDrag(target,
      { x: event.target.x() + ITEM_BOX_OFFSET, z: event.target.y() + ITEM_BOX_OFFSET })}
    onDragEnd={(event) => { event.cancelBubble = true; controller?.finishDrag(target,
      { x: event.target.x() + ITEM_BOX_OFFSET, z: event.target.y() + ITEM_BOX_OFFSET }); }}
    onMouseOver={() => setHover({ x: x + ITEM_BOX_OFFSET + 4, y: z - ITEM_BOX_OFFSET,
      text: placement.label, fill: "#16a34a", textColor: "white" })}
    onMouseLeave={() => setHover(null)}>
    <Rect width={ITEM_BOX_SIZE} height={ITEM_BOX_SIZE} fill="#16a34a"
      stroke={visual.selected ? "#facc15" : "black"} strokeWidth={visual.selected ? 3 : 1} perfectDrawEnabled={false} />
    <ItemTypeNumber x={0} y={0} value="S" fill="white" />
  </Group>;
});

export const CustomScriptPlacements = memo(function CustomScriptPlacements() {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const workspaceStore = useAtomValue(scriptWorkspaceStoreAtom);
  const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
  const workspace = ensureScriptWorkspace(workspaceStore, context);
  const placements = workspace.levels[context.levelKey]?.customPlacements ?? [];
  if (!ENABLE_SCRIPTS || placements.length === 0) return null;
  return <Layer>{placements.map((placement) => <CustomScriptPlacementNode key={placement.id} placement={placement} />)}</Layer>;
});
