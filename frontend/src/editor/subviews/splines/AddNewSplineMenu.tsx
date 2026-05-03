import { useAtom } from "jotai";
import { Updater } from "use-immer";
import { SplineData } from "@/python/structSpecs/LevelTypes";
import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./splineUtils";
import { getPoints } from "../../../utils/spline";
import { EmptyDataPrompt } from "../EmptyDataPrompts";

export function AddNewSplineMenu({
  setSplineData,
  hasSplines,
}: {
  setSplineData: Updater<SplineData>;
  hasSplines: boolean;
}) {
  const [, setSelectedSpline] = useAtom(SelectedSpline);
  const [, setSelectedSplineItem] = useAtom(SelectedSplineItem);

  return (
    <EmptyDataPrompt
      title={hasSplines ? "No Spline Selected" : "No Splines"}
      description={
        hasSplines
          ? "Select a spline on the canvas or add another one."
          : "This level doesn't have any splines yet. Add your first spline to get started."
      }
      buttonText={hasSplines ? "Add New Spline" : "Add First Spline"}
      onInitialize={() => {
        setSplineData((splineData) => {
          const nextSplineIndex = splineData.Spln[1000].obj.length;

          splineData.Spln[1000].obj.push({
            bbBottom: 200,
            bbLeft: 100,
            bbRight: 200,
            bbTop: 100,
            numItems: 0,
            numNubs: 3,
            numPoints: 200,
          });
          const splinePos = SPLINE_KEY_BASE + nextSplineIndex;

          splineData.SpIt[splinePos] = { obj: [] };
          splineData.SpNb[splinePos] = {
            obj: [
              { x: 100, z: 200 },
              { x: 150, z: 100 },
              { x: 200, z: 200 },
              { x: 100, z: 200 },
            ],
          };

          splineData.SpPt[splinePos] = {
            obj: getPoints(splineData.SpNb[splinePos].obj),
          };

          setSelectedSpline(nextSplineIndex);
          setSelectedSplineItem(undefined);
        });
      }}
      fillHeight
    />
  );
}
