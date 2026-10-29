import { memo } from "react";
import { Group, Rect, Image as KonvaImage } from "react-konva";
import { useAtomValue } from "jotai";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ShowItemThumbnailPreviews } from "@/data/canvasView/canvasDisplaySettingsAtoms";
import { ShowMightyMikeItemImages } from "./MightyMikeItemMenu";
import { useCustomItemThumbnail } from "./useCustomItemThumbnail";
import type { ScriptCustomObjectDefinition, ScriptCustomObjectPlacement, ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";
import { ITEM_BOX_OFFSET, ITEM_BOX_SIZE, ItemTypeNumber, type HoverTagInfo } from "../shared/nodeVisuals";

interface Props {
  placement: ScriptCustomObjectPlacement;
  definition?: ScriptCustomObjectDefinition;
  assets: ScriptWorkspaceState["assets"];
  metadata?: Readonly<Record<string, string>>;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onHover: (tag: HoverTagInfo | null) => void;
}

export const CustomPlacementNode = memo(function CustomPlacementNode({ placement, definition, assets, metadata, selected, onSelect, onMove, onHover }: Props) {
  const globals = useAtomValue(Globals);
  const level = useAtomValue(LevelNumber);
  const showThumbnails = useAtomValue(ShowItemThumbnailPreviews);
  const showSprites = useAtomValue(ShowMightyMikeItemImages);
  const mightyMike = globals.GAME_TYPE === Game.MIGHTY_MIKE;
  const thumbnail = useCustomItemThumbnail(globals.GAME_TYPE, level ?? 0, definition, assets, mightyMike ? showSprites : showThumbnails, metadata);
  const offsetX = thumbnail?.offsetX ?? -ITEM_BOX_OFFSET;
  const offsetY = thumbnail?.offsetY ?? -ITEM_BOX_OFFSET;
  const naturalSprite = mightyMike && thumbnail?.offsetX !== undefined;
  const width = naturalSprite ? thumbnail.image.width * (thumbnail.scale ?? 1) : ITEM_BOX_SIZE;
  const height = naturalSprite ? thumbnail.image.height * (thumbnail.scale ?? 1) : ITEM_BOX_SIZE;
  return <Group
    x={placement.position.x + offsetX}
    y={placement.position.z + offsetY}
    draggable
    onMouseDown={() => onSelect(placement.id)}
    onDragStart={() => onSelect(placement.id)}
    onDragEnd={(event) => {
      onMove(placement.id, Math.round(event.target.x() - offsetX), Math.round(event.target.y() - offsetY));
    }}
    onMouseOver={() => onHover({ x: placement.position.x + offsetX + width + 4, y: placement.position.z + offsetY, text: placement.label, fill: selected ? "red" : "blue", textColor: "white" })}
    onMouseLeave={() => onHover(null)}
  >
    {!naturalSprite && <Rect width={width} height={height} fill={selected ? "red" : "blue"} stroke="black" strokeWidth={selected ? 2 : 1} perfectDrawEnabled={false} />}
    {thumbnail ? <KonvaImage image={thumbnail.image} width={width} height={height} listening={naturalSprite} perfectDrawEnabled={false} /> : <ItemTypeNumber x={0} y={0} value="C" fill="white" />}
    {thumbnail && !naturalSprite && <Rect width={width} height={height} stroke="black" strokeWidth={selected ? 2 : 1} listening={false} perfectDrawEnabled={false} />}
  </Group>;
});
