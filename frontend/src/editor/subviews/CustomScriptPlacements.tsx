import { useAtom, useAtomValue } from "jotai";
import { Circle, Group, Layer, Line, Rect } from "react-konva";
import { memo, useCallback, useEffect } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import {
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  moveCustomPlacement,
  removeCustomPlacement,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
  type ScriptCustomObjectPlacement,
} from "./scripts/scriptWorkspaceState";
import { SelectedCustomPlacementAtom } from "./scripts/scriptPlacementSelectionState";
import { toast } from "sonner";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { SelectedItem } from "@/data/items/itemAtoms";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";
import type { HoverTagInfo } from "./shared/nodeVisuals";
import {
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ItemTypeNumber,
} from "./shared/nodeVisuals";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

interface CustomScriptPlacementNodeProps {
  placement: ScriptCustomObjectPlacement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, z: number) => void;
  onHoverChange: (tag: HoverTagInfo | null) => void;
}

const EMPTY_CUSTOM_PLACEMENTS: readonly ScriptCustomObjectPlacement[] = [];

const CustomScriptPlacementNode = memo(function CustomScriptPlacementNode({
  placement,
  isSelected,
  onSelect,
  onDragEnd,
  onHoverChange,
}: CustomScriptPlacementNodeProps) {
  const isHoverBeacon = placement.objectId === "sample.hoverBeacon";
  const handleSelect = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    [onSelect],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const node = e.target;
      onDragEnd(node.x() + ITEM_BOX_OFFSET, node.y() + ITEM_BOX_OFFSET);
    },
    [onDragEnd],
  );

  return (
    <Group
      x={placement.position.x - ITEM_BOX_OFFSET}
      y={placement.position.z - ITEM_BOX_OFFSET}
      draggable
      onMouseDown={handleSelect}
      onTap={handleSelect}
      onDragStart={handleSelect}
      onDragEnd={handleDragEnd}
      onMouseOver={() =>
        onHoverChange({
          x: placement.position.x + ITEM_BOX_OFFSET + 4,
          y: placement.position.z - ITEM_BOX_OFFSET,
          text: placement.label,
          fill: isSelected ? "#16a34a" : "#22c55e",
          textColor: "white",
        })
      }
      onMouseLeave={() => onHoverChange(null)}
    >
      {isHoverBeacon ? (
        <>
          <Circle
            x={ITEM_BOX_OFFSET}
            y={ITEM_BOX_OFFSET}
            radius={ITEM_BOX_OFFSET}
            fill={isSelected ? "#0891b2" : "#06b6d4"}
            stroke="#ecfeff"
            strokeWidth={isSelected ? 2 : 1}
            shadowColor="#22d3ee"
            shadowBlur={6}
            shadowOpacity={0.9}
            perfectDrawEnabled={false}
          />
          <Line
            points={[ITEM_BOX_OFFSET, 1, ITEM_BOX_OFFSET, 11]}
            stroke="white"
            strokeWidth={2}
            listening={false}
            perfectDrawEnabled={false}
          />
          <Circle
            x={ITEM_BOX_OFFSET}
            y={ITEM_BOX_OFFSET}
            radius={2}
            fill="white"
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      ) : (
        <>
          <Rect
            width={ITEM_BOX_SIZE}
            height={ITEM_BOX_SIZE}
            fill={isSelected ? "#16a34a" : "#22c55e"}
            stroke="black"
            strokeWidth={isSelected ? 2 : 1}
            perfectDrawEnabled={false}
          />
          <ItemTypeNumber x={0} y={0} value="S" fill="white" />
        </>
      )}
    </Group>
  );
});

export const CustomScriptPlacements = memo(
  function CustomScriptPlacements() {
    const globals = useAtomValue(Globals);
    const levelNumber = useAtomValue(LevelNumber);
    const [workspaceStore, setWorkspaceStore] = useAtom(
      scriptWorkspaceStoreAtom,
    );
    const [selectedPlacementId, setSelectedPlacementId] = useAtom(
      SelectedCustomPlacementAtom,
    );
    const [selectedItem, setSelectedItem] = useAtom(SelectedItem);
    const [, setActiveHoverTag] = useAtom(ActiveHoverTag);

    const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
    const workspace = ensureScriptWorkspace(workspaceStore, context);
    const currentLevel = workspace.levels[context.levelKey];
    const placements =
      currentLevel?.customPlacements ?? EMPTY_CUSTOM_PLACEMENTS;

    const handleSelect = useCallback(
      (placementId: string) => {
        setSelectedItem(undefined);
        setSelectedPlacementId(placementId);
      },
      [setSelectedItem, setSelectedPlacementId],
    );

    const handleDragEnd = useCallback(
      (placementId: string, x: number, z: number) => {
        setWorkspaceStore((store) => {
          const updatedWorkspace = moveCustomPlacement(workspace, placementId, {
            x,
            y:
              currentLevel?.customPlacements.find(
                (placement) => placement.id === placementId,
              )?.position.y ?? 0,
            z,
          });
          return replaceScriptWorkspace(store, updatedWorkspace);
        });
      },
      [workspace, currentLevel, setWorkspaceStore],
    );

    const handleDeletePlacement = useCallback(
      (placementId: string) => {
        setWorkspaceStore((store) => {
          const currentWorkspace = ensureScriptWorkspace(store, context);
          return replaceScriptWorkspace(
            store,
            removeCustomPlacement(currentWorkspace, placementId),
          );
        });
        setSelectedPlacementId((current) =>
          current === placementId ? null : current,
        );
        toast.success("Placement removed");
      },
      [context, setSelectedPlacementId, setWorkspaceStore],
    );

    useEffect(() => {
      if (
        selectedPlacementId !== null &&
        !placements.some((placement) => placement.id === selectedPlacementId)
      ) {
        setSelectedPlacementId(null);
      }
    }, [placements, selectedPlacementId, setSelectedPlacementId]);

    useEffect(() => {
      if (selectedItem !== undefined && selectedPlacementId !== null) {
        setSelectedPlacementId(null);
      }
    }, [selectedItem, selectedPlacementId, setSelectedPlacementId]);

    useEffect(() => () => setActiveHoverTag(null), [setActiveHoverTag]);

    useWindowKeyDown(
      useCallback(
        (event) => {
          if (
            (event.key !== "Delete" && event.key !== "Backspace") ||
            selectedPlacementId === null ||
            isEditableTarget(event.target)
          ) {
            return;
          }

          event.preventDefault();
          handleDeletePlacement(selectedPlacementId);
        },
        [handleDeletePlacement, selectedPlacementId],
      ),
    );

    if (!ENABLE_SCRIPTS || placements.length === 0) {
      return null;
    }

    return (
      <Layer>
        {placements.map((placement) => (
          <CustomScriptPlacementNode
            key={placement.id}
            placement={placement}
            isSelected={selectedPlacementId === placement.id}
            onSelect={() => handleSelect(placement.id)}
            onDragEnd={(x, z) => handleDragEnd(placement.id, x, z)}
            onHoverChange={setActiveHoverTag}
          />
        ))}
      </Layer>
    );
  },
);
