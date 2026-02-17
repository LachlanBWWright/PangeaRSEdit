import type { Updater } from "use-immer";
import type { SplineData } from "@/python/structSpecs/LevelTypes";
import { getPoints } from "../../../utils/spline";
import { selectSplineNubs } from "../../../data/selectors";
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";

export const SPLINE_KEY_BASE = 1000;

export function updateSplinePointsFromNubs(
  splineIdx: number,
  setSplineData: Updater<SplineData>,
) {
  // Compute points from current nubs and write them directly into the draft
  setSplineData((draft) => {
    const nubs = selectSplineNubs(draft, SPLINE_KEY_BASE + splineIdx);
    
    // Detect if this spline is circular or open
    const splineType = detectSplineType(nubs);
    const isCircular = splineType === SplineType.CIRCULAR;
    const workingNubs =
      isCircular && nubs.length > 1 ? nubs.slice(0, -1) : nubs;
    const workingFirstNub = workingNubs[0];

    const newPoints =
      workingNubs.length === 1 && workingFirstNub
        ? [{ x: workingFirstNub.x, z: workingFirstNub.z }]
        : getPoints(workingNubs, isCircular);

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
