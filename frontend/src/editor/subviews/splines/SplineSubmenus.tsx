import { Button } from "@/components/ui/button";
import { Updater } from "use-immer";
import { SplineItem } from "@/python/structSpecs/LevelTypes";
import { SplineData } from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";
import {
  TerrainItemTypeParams,
} from "../../../data/items/ottoItemType";
import { ParamTooltip } from "../items/ParamTooltip";
import { getParamTooltip } from "../items/getParamTooltip";
import type { FlagDescription } from "../../../data/items/itemParams";
import { parseU8 } from "../../../utils/numberParsers";
import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./splineUtils";
import { getPoints } from "../../../utils/spline";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getSplineItemTypes } from "@/data/splines/getSplineItemTypes";
import { Globals } from "@/data/globals/globals";
import { getGameKeyFromName } from "@/validation/gameRepositories";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SafeSplineItemTypes,
  FilterToSafeSplineItems,
} from "../../../data/items/itemAtoms";
import { Label } from "@/components/ui/label";
import { useMemo } from "react";
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";
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

export function EditSplineItemMenu({
  setSplineData,
  splineItemData,
}: {
  setSplineData: Updater<SplineData>;
  splineItemData: SplineItem[];
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  const safeSplineItemTypes = useAtomValue(SafeSplineItemTypes);
  const [filterToSafe, setFilterToSafe] = useAtom(FilterToSafeSplineItems);
  const citationGame = getGameKeyFromName(globals.GAME_NAME);

  const allSplineItemValues = useMemo(() => {
    const result = getSplineItemTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  const splineItemValues = useMemo(
    () =>
      filterToSafe && safeSplineItemTypes.size > 0
        ? allSplineItemValues.filter((type) => safeSplineItemTypes.has(type))
        : allSplineItemValues,
    [filterToSafe, safeSplineItemTypes, allSplineItemValues],
  );

  if (selectedSplineItem === undefined) {
    const hasSplineItems = splineItemData.length > 0;
    return (
      <EmptyDataPrompt
        title={hasSplineItems ? "No Spline Item Selected" : "No Spline Items"}
        description={
          hasSplineItems
            ? "Select a spline item to edit or add another one."
            : "This spline doesn't have any items yet. Add your first spline item to get started."
        }
        buttonText={hasSplineItems ? "Add New Spline Item" : "Add First Spline Item"}
        onInitialize={() => {
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
            const newItemIndex = splineItems.length - 1;
            const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
            if (spline) {
              spline.numItems = splineItems.length;
            }
            setSelectedSplineItem(newItemIndex);
          });
        }}
        fillHeight
      />
    );
  }

  const currentSplineItemData = splineItemData.at(selectedSplineItem);

  if (currentSplineItemData === undefined) {
    const hasSplineItems = splineItemData.length > 0;
    return (
      <EmptyDataPrompt
        title={hasSplineItems ? "No Spline Item Selected" : "No Spline Items"}
        description={
          hasSplineItems
            ? "Select a spline item to edit or add another one."
            : "This spline doesn't have any items yet. Add your first spline item to get started."
        }
        buttonText={hasSplineItems ? "Add New Spline Item" : "Add First Spline Item"}
        onInitialize={() => {
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
            const newItemIndex = splineItems.length - 1;
            const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
            if (spline) {
              spline.numItems = splineItems.length;
            }
            setSelectedSplineItem(newItemIndex);
          });
        }}
        fillHeight
      />
    );
  }
  const currentSplineItemParams =
    TerrainItemTypeParams[currentSplineItemData.type];

  return (
    <>
      <Select
        onValueChange={(e) => {
          const newItemType = parseInt(e);
          setSplineData((splineData) => {
            if (
              selectedSpline === undefined ||
              selectedSplineItem === undefined
            )
              return;
            const splineItems =
              splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
            const item = splineItems?.[selectedSplineItem];
            if (item) {
              item.type = newItemType;
            }
          });
        }}
      >
        <SelectTrigger>
          {getSplineItemName(globals, currentSplineItemData.type)}
        </SelectTrigger>
        <SelectContent>
          {splineItemValues.map((key) => (
            <SelectItem key={key} className="text-white" value={key.toString()}>
              {getSplineItemName(globals, key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Safe Spline Items Filter Toggle */}
      {safeSplineItemTypes.size > 0 && (
        <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-950 rounded">
          <Checkbox
            id="filter-safe-spline-items"
            checked={filterToSafe}
            onCheckedChange={(checked) => setFilterToSafe(checked === true)}
          />
          <Label
            htmlFor="filter-safe-spline-items"
            className="text-sm cursor-pointer"
          >
            Only show spline item types found in original level (
            {safeSplineItemTypes.size} safe types)
          </Label>
        </div>
      )}

      <div className="grid grid-cols-6 gap-2 items-center">
        {([0, 1, 2, 3] as const).map((i) => {
          const paramKey = `p${i}` as const;
          const param = currentSplineItemParams?.[paramKey] ?? "Unknown";
          const value = currentSplineItemData[paramKey];
          const setValue = (v: number) => {
            setSplineData((splineData) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              const splineItems =
                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
              const item = splineItems?.[selectedSplineItem];
              if (item) {
                item[paramKey] = v;
              }
            });
          };
          return [
            <ParamTooltip
              key={`tooltip-${i}`}
              label={<span>{`Parameter ${i}`}</span>}
              tooltip={getParamTooltip(param)}
              codeSample={
                typeof param === "string" || !param || param.type !== "Integer"
                  ? undefined
                  : {
                      code: param.defaultCitation.code,
                      fileName: param.defaultCitation.fileName,
                      lineNumber: param.defaultCitation.lineNumber,
                      endLineNumber: param.defaultCitation.endLineNumber,
                    }
              }
              citationGame={citationGame ?? undefined}
            />,
            param &&
            typeof param !== "string" &&
            param.type === "Bit Flags" &&
            Array.isArray(param.flags) ? (
              <div key={`flags-${i}`} className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-2">
                  {param.flags.map((flag: FlagDescription) => {
                    const checked = (value & (1 << flag.index)) !== 0;
                    return (
                      <label
                        key={flag.index}
                        className="inline-flex items-center gap-1"
                      >
                        <Checkbox
                          className="font-bold"
                          checked={checked}
                          onCheckedChange={(checked) => {
                            setSplineData((splineData) => {
                              if (
                                selectedSpline === undefined ||
                                selectedSplineItem === undefined
                              )
                                return;
                              const mask = 1 << flag.index;
                              const splineItems =
                                splineData.SpIt[
                                  SPLINE_KEY_BASE + selectedSpline
                                ]?.obj;
                              const item = splineItems?.[selectedSplineItem];
                              if (item) {
                                if (checked) {
                                  item[paramKey] |= mask;
                                } else {
                                  item[paramKey] &= ~mask;
                                }
                              }
                            });
                          }}
                        />
                        <span>{flag.description}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p>Value:</p>
                  <Input
                    type="number"
                    className="w-24"
                    value={value.toString()}
                    onChange={(e) => setValue(parseU8(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <Input
                key={`input-${i}`}
                type="number"
                value={value.toString()}
                onChange={(e) => setValue(parseU8(e.target.value))}
              />
            ),
          ];
        })}

        <span>Placement (0-1)</span>
        <Input
          type="number"
          value={currentSplineItemData.placement}
          onChange={(e) => {
            setSplineData((splineData) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;

              let placement = parseFloat(e.target.value);
              if (placement < 0) placement = 0;
              if (placement > 1) placement = 1;
              if (isNaN(placement)) placement = 0;

              const splineItems =
                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
              const item = splineItems?.[selectedSplineItem];
              if (item) {
                item.placement = placement;
              }
            });
          }}
        />
      </div>
      <div>
        <Button
          variant="destructive"
          disabled={selectedSpline === undefined}
          onClick={() => {
            setSplineData((splineData) => {
              if (
                selectedSplineItem === undefined ||
                selectedSpline === undefined
              )
                return;
              const splineItems =
                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
              if (splineItems) {
                splineItems.splice(selectedSplineItem);
              }
              setSelectedSplineItem(undefined);
            });
          }}
        >
          Delete Spline Item
        </Button>
      </div>
    </>
  );
}

export function EditSplineMenu({
  setSplineData,
}: {
  setSplineData: Updater<SplineData>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [, setSelectedSpline] = useAtom(SelectedSpline);
  const [, setSelectedSplineItem] = useAtom(SelectedSplineItem);

  const removeSplineAtIndex = (splineIdx: number) => {
    setSplineData((draft) => {
      const splines = draft.Spln?.[1000]?.obj;
      const spNb = draft.SpNb;
      const spPt = draft.SpPt;
      const spIt = draft.SpIt;
      if (!splines || splineIdx < 0 || splineIdx >= splines.length) return;

      splines.splice(splineIdx, 1);

      const reindexRecord = <T extends { obj: unknown }>(
        record: Record<number, T>,
      ): Record<number, T> => {
        const entries = Object.entries(record)
          .map(([key, value]) => [Number(key), value] as const)
          .filter(([key]) => key !== splineIdx)
          .sort(([a], [b]) => a - b);
        return Object.fromEntries(
          entries.map(([key, value]) => [key > splineIdx ? key - 1 : key, value]),
        ) as Record<number, T>;
      };

      if (spNb) draft.SpNb = reindexRecord(spNb);
      if (spPt) draft.SpPt = reindexRecord(spPt);
      if (spIt) draft.SpIt = reindexRecord(spIt);

      if (draft.Spln?.[1000]?.obj) {
        draft.Spln[1000].obj.forEach((spline, idx) => {
          spline.numNubs = draft.SpNb?.[idx]?.obj.length ?? spline.numNubs;
          spline.numPoints = draft.SpPt?.[idx]?.obj.length ?? spline.numPoints;
          spline.numItems = draft.SpIt?.[idx]?.obj.length ?? spline.numItems;
        });
      }
    });
    if (selectedSpline === splineIdx) setSelectedSpline(undefined);
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            const splineNubs =
              splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
            if (!splineNubs) return;
            const splineType = detectSplineType(splineNubs);
            const insertIndex =
              splineType === SplineType.CIRCULAR ? 1 : 0;
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
          removeSplineAtIndex(selectedSpline);
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
            const removeIndex =
              splineType === SplineType.CIRCULAR
                ? 1
                : 0;
            const isCircular = splineType === SplineType.CIRCULAR;
            splineNubs.splice(removeIndex, 1);
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineNubs, isCircular),
            };
            const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
            if (spline) {
              spline.numNubs = splineNubs.length;
              spline.numPoints = splineData.SpPt[SPLINE_KEY_BASE + selectedSpline]?.obj.length ?? spline.numPoints;
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
              spline.numPoints = splineData.SpPt[SPLINE_KEY_BASE + selectedSpline]?.obj.length ?? spline.numPoints;
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
            if (spline) {
              spline.numItems = splineItems.length;
            }
          });
        }}
      >
        Add Spline Item
      </Button>
    </div>
  );
}
