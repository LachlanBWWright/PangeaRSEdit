import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAtom, useAtomValue } from "jotai";
import { Updater } from "use-immer";
import { SplineData } from "@/python/structSpecs/LevelTypes";
import {
  SelectedSpline,
  SelectedSplineItem,
  SelectedSplineNub,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE, updateSplinePointsFromNubs } from "./splineUtils";
import { getPoints } from "../../../utils/spline";
import {
  detectSplineType,
  SplineType,
} from "@/data/splines/splineTypeDetection";
import { removeSplineAtIndex } from "@/editor/subviews/splines/editSplineMenuState";

export function EditSplineMenu({
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [, setSelectedSpline] = useAtom(SelectedSpline);
  const [, setSelectedSplineItem] = useAtom(SelectedSplineItem);
  const [selectedSplineNub, setSelectedSplineNub] = useAtom(SelectedSplineNub);

  const handleRemoveSplineAtIndex = (splineIdx: number) => {
    setSplineData((draft) => {
      removeSplineAtIndex(draft, splineIdx);
    });
    if (selectedSpline === splineIdx) setSelectedSpline(undefined);
  };

  const splineNubs =
    selectedSpline !== undefined
      ? (splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj ?? [])
      : [];
  const numSplineNubs =
    selectedSpline !== undefined
      ? (splineData.Spln[1000]?.obj?.[selectedSpline]?.numNubs ??
        splineNubs.length)
      : 0;
  const selectedNubData =
    selectedSplineNub !== null ? splineNubs[selectedSplineNub] : null;

  return (
    <>
      {selectedSpline !== undefined && (
        <>
          {selectedNubData && selectedSplineNub !== null && (
            <>
              <p className="text-sm font-medium">
                Adjust Nub {selectedSplineNub} Position
              </p>
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
                <label htmlFor="splineNubX" className="text-sm font-medium">
                  X
                </label>
                <Input
                  id="splineNubX"
                  type="number"
                  value={selectedNubData.x}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    if (isNaN(newValue)) return;
                    setSplineData((draft) => {
                      if (
                        selectedSpline === undefined ||
                        selectedSplineNub === null
                      )
                        return;
                      const nub =
                        draft.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj?.[
                          selectedSplineNub
                        ];
                      if (nub) nub.x = newValue;
                    });
                    updateSplinePointsFromNubs(selectedSpline, setSplineData);
                  }}
                  placeholder="X"
                />
                <label htmlFor="splineNubZ" className="text-sm font-medium">
                  Z
                </label>
                <Input
                  id="splineNubZ"
                  type="number"
                  value={selectedNubData.z}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    if (isNaN(newValue)) return;
                    setSplineData((draft) => {
                      if (
                        selectedSpline === undefined ||
                        selectedSplineNub === null
                      )
                        return;
                      const nub =
                        draft.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj?.[
                          selectedSplineNub
                        ];
                      if (nub) nub.z = newValue;
                    });
                    updateSplinePointsFromNubs(selectedSpline, setSplineData);
                  }}
                  placeholder="Z"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setSplineData((draft) => {
                  if (selectedSpline === undefined) return;
                  const nubEntry = draft.SpNb[SPLINE_KEY_BASE + selectedSpline];
                  const spline = draft.Spln[1000]?.obj?.[selectedSpline];
                  if (!nubEntry || !spline) return;
                  const lastNub = nubEntry.obj[nubEntry.obj.length - 1];
                  if (!lastNub) return;
                  nubEntry.obj.push({ x: lastNub.x + 50, z: lastNub.z + 50 });
                  spline.numNubs = nubEntry.obj.length;
                });
                updateSplinePointsFromNubs(selectedSpline, setSplineData);
              }}
            >
              Add Nub
            </Button>
            <Button
              variant="destructive"
              disabled={selectedSplineNub === null || numSplineNubs <= 3}
              onClick={() => {
                setSplineData((draft) => {
                  if (
                    selectedSpline === undefined ||
                    selectedSplineNub === null
                  )
                    return;
                  const nubEntry = draft.SpNb[SPLINE_KEY_BASE + selectedSpline];
                  const spline = draft.Spln[1000]?.obj?.[selectedSpline];
                  if (!nubEntry || !spline || spline.numNubs <= 3) return;
                  nubEntry.obj.splice(selectedSplineNub, 1);
                  spline.numNubs = nubEntry.obj.length;
                });
                setSelectedSplineNub(null);
                updateSplinePointsFromNubs(selectedSpline, setSplineData);
              }}
            >
              Remove Nub
            </Button>
          </div>
        </>
      )}

      <div className="grid grid-cols-6 gap-2">
        <Button
          onClick={() => {
            setSplineData((splineData) => {
              if (selectedSpline === undefined) return;
              const splineNubs =
                splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (!splineNubs) return;
              const splineType = detectSplineType(splineNubs);
              const insertIndex = splineType === SplineType.CIRCULAR ? 1 : 0;
              const firstNub = splineNubs[insertIndex] ?? splineNubs[0];
              if (!firstNub) return;
              const isCircular = splineType === SplineType.CIRCULAR;

              splineNubs.splice(insertIndex, 0, {
                x: firstNub.x + 30,
                z: firstNub.z + 30,
              });
              splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
                obj: getPoints(splineNubs, isCircular),
              };
            });
          }}
        >
          Add Front Nub
        </Button>
        <Button
          onClick={() => {
            setSplineData((splineData) => {
              if (selectedSpline === undefined) return;
              const splineNubs =
                splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (!splineNubs) return;
              const splineType = detectSplineType(splineNubs);
              const insertIndex =
                splineType === SplineType.CIRCULAR
                  ? Math.max(1, splineNubs.length - 1)
                  : splineNubs.length;
              const lastNub = splineNubs[splineNubs.length - 1];
              if (!lastNub) return;
              const isCircular = splineType === SplineType.CIRCULAR;

              splineNubs.splice(insertIndex, 0, {
                x: lastNub.x + 100,
                z: lastNub.z + 100,
              });
              splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
                obj: getPoints(splineNubs, isCircular),
              };
            });
          }}
        >
          Add Back Nub
        </Button>
        <Button
          variant="destructive"
          disabled={selectedSpline === undefined}
          onClick={() => {
            if (selectedSpline === undefined) return;
            handleRemoveSplineAtIndex(selectedSpline);
          }}
        >
          Delete Spline
        </Button>
        <Button
          variant="destructive"
          disabled={selectedSpline === undefined}
          onClick={() => {
            setSplineData((splineData) => {
              if (selectedSpline === undefined) return;
              const splineNubs =
                splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (!splineNubs || splineNubs.length <= 2) return;
              const splineType = detectSplineType(splineNubs);
              const removeIndex = splineType === SplineType.CIRCULAR ? 1 : 0;
              const isCircular = splineType === SplineType.CIRCULAR;
              splineNubs.splice(removeIndex, 1);
              splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
                obj: getPoints(splineNubs, isCircular),
              };
              const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
              if (spline) {
                spline.numNubs = splineNubs.length;
                spline.numPoints =
                  splineData.SpPt[SPLINE_KEY_BASE + selectedSpline]?.obj
                    .length ?? spline.numPoints;
              }
            });
          }}
        >
          Remove Front Nub
        </Button>
        <Button
          variant="destructive"
          disabled={selectedSpline === undefined}
          onClick={() => {
            setSplineData((splineData) => {
              if (selectedSpline === undefined) return;
              const splineNubs =
                splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (!splineNubs || splineNubs.length <= 2) return;
              const splineType = detectSplineType(splineNubs);
              const removeIndex =
                splineType === SplineType.CIRCULAR
                  ? Math.max(1, splineNubs.length - 2)
                  : splineNubs.length - 1;
              const isCircular = splineType === SplineType.CIRCULAR;
              splineNubs.splice(removeIndex, 1);
              splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
                obj: getPoints(splineNubs, isCircular),
              };
              const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
              if (spline) {
                spline.numNubs = splineNubs.length;
                spline.numPoints =
                  splineData.SpPt[SPLINE_KEY_BASE + selectedSpline]?.obj
                    .length ?? spline.numPoints;
              }
            });
          }}
        >
          Remove Back Nub
        </Button>
        <Button
          disabled={selectedSpline === undefined}
          onClick={() => {
            setSplineData((splineData) => {
              if (selectedSpline === undefined) return;
              const splineItems =
                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (!splineItems) return;
              splineItems.push({
                placement: 0,
                type: 0,
                p0: 0,
                p1: 0,
                p2: 0,
                p3: 0,
                flags: 0,
              });
              setSelectedSplineItem(splineItems.length - 1);
              const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
              if (spline) spline.numItems = splineItems.length;
            });
          }}
        >
          Add Spline Item
        </Button>
      </div>
    </>
  );
}
