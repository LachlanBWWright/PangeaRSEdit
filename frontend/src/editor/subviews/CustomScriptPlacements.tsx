import { useAtom, useAtomValue } from "jotai";
import { Layer, Circle, Text } from "react-konva";
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
}

const CustomScriptPlacementNode = memo(function CustomScriptPlacementNode({
  placement,
  isSelected,
  onSelect,
  onDragEnd,
}: CustomScriptPlacementNodeProps) {
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
      onDragEnd(node.x(), node.y());
    },
    [onDragEnd],
  );

  return (
    <>
      <Circle
        x={placement.position.x}
        y={placement.position.z} // Note: z maps to y in 2D
        radius={8}
        fill={isSelected ? "#00ff00" : "#22c55e"}
        stroke={isSelected ? "#ffffff" : "#166534"}
        strokeWidth={isSelected ? 2 : 1}
        draggable
        onClick={handleSelect}
        onTap={handleSelect}
        onDragEnd={handleDragEnd}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.5}
        shadowOffsetX={2}
        shadowOffsetY={2}
      />
      <Text
        x={placement.position.x + 12}
        y={placement.position.z - 6}
        text={placement.label}
        fontSize={11}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth={0.5}
        listening={false}
      />
    </>
  );
});

export const CustomScriptPlacements = memo(
  function CustomScriptPlacements({}: Record<string, never>) {
    const globals = useAtomValue(Globals);
    const levelNumber = useAtomValue(LevelNumber);
    const [workspaceStore, setWorkspaceStore] = useAtom(
      scriptWorkspaceStoreAtom,
    );
    const [selectedPlacementId, setSelectedPlacementId] = useAtom(
      SelectedCustomPlacementAtom,
    );

    const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
    const workspace = ensureScriptWorkspace(workspaceStore, context);
    const currentLevel = workspace.levels[context.levelKey];
    const placements = currentLevel?.customPlacements ?? [];

    const handleSelect = useCallback(
      (placementId: string) => {
        setSelectedPlacementId(placementId);
      },
      [setSelectedPlacementId],
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
        toast.success("Placement moved");
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

    if (placements.length === 0) {
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
          />
        ))}
      </Layer>
    );
  },
);
