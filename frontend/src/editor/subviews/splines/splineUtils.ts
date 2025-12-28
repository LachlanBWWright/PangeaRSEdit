import type { Updater } from "use-immer";
import type { SplineData } from "@/python/structSpecs/LevelTypes";
import { getPoints } from "../../../utils/spline";
import { selectSplineNubs } from "../../../data/selectors";

export const SPLINE_KEY_BASE = 1000;

export function updateSplinePointsFromNubs(
  splineIdx: number,
  setSplineData: Updater<SplineData>,
) {
  // Compute points from current nubs and write them directly into the draft
  setSplineData((draft) => {
    const nubs = selectSplineNubs(draft, SPLINE_KEY_BASE + splineIdx);
    const firstNub = nubs[0];
    const newPoints =
      nubs.length === 1 && firstNub
        ? [{ x: firstNub.x, z: firstNub.z }]
        : getPoints(nubs);

    const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
    if (spPt) {
      spPt.obj = newPoints;
      const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
      if (spln) {
        spln.numPoints = newPoints.length;
      }
    }
  });
}
