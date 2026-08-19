import { useAtom } from "jotai";
import { useAtomValue, useSetAtom } from "jotai";
import { Updater } from "use-immer";
import { SplineData } from "@/python/structSpecs/LevelTypes";
import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import { PendingCreation } from "@/data/creation/pendingCreationAtom";
import {
  canFinalizeCreation,
  finalizeSplineFromPoints,
  popCreationPoint,
} from "@/editor/creation/pendingCreationState";
import { Globals } from "@/data/globals/globals";
import { Button } from "@/components/ui/button";

export function AddNewSplineMenu({
  setSplineData,
  hasSplines,
}: {
  setSplineData: Updater<SplineData>;
  hasSplines: boolean;
}) {
  const [, setSelectedSpline] = useAtom(SelectedSpline);
  const [, setSelectedSplineItem] = useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  const pendingCreation = useAtomValue(PendingCreation);
  const setPendingCreation = useSetAtom(PendingCreation);

  const isPendingSplineCreation = pendingCreation?.kind === "spline";
  const pendingPoints = isPendingSplineCreation ? pendingCreation.points : [];

  if (isPendingSplineCreation) {
    return (
      <div className="flex h-full min-h-full w-full flex-col gap-3 p-4">
        <p className="text-sm text-gray-200">
          Click on the canvas to place spline nubs.
        </p>
        <p className="text-sm text-gray-300">Points: {pendingPoints.length}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canFinalizeCreation("spline", pendingPoints, globals)}
            onClick={() => {
              setSplineData((splineData) => {
                const newSplineIndex = finalizeSplineFromPoints(
                  splineData,
                  pendingPoints,
                  globals,
                );
                setSelectedSpline(newSplineIndex);
                setSelectedSplineItem(undefined);
              });
              setPendingCreation(null);
            }}
          >
            Finalize New Spline
          </Button>
          <Button
            variant="secondary"
            disabled={pendingPoints.length === 0}
            onClick={() => {
              if (!pendingCreation) return;
              setPendingCreation({
                ...pendingCreation,
                points: popCreationPoint(pendingCreation.points),
              });
            }}
          >
            Undo Last Point
          </Button>
          <Button
            variant="destructive"
            onClick={() => setPendingCreation(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EmptyDataPrompt
      title={hasSplines ? "No Spline Selected" : "No Splines"}
      description={
        hasSplines
          ? "Select a spline on the canvas or add another one."
          : "This level doesn't have any splines yet. Add your first spline to get started."
      }
      buttonText={hasSplines ? "Add New Spline" : "Add First Spline"}
      onInitialize={() => setPendingCreation({ kind: "spline", points: [] })}
      fillHeight
    />
  );
}
