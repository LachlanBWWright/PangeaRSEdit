import { Button } from "@/components/ui/button";
import { Updater } from "use-immer";
import { SplineItem } from "@/python/structSpecs/LevelTypes";
import { SplineData } from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";
import {
  TerrainItemTypeParams,
  ItemType,
} from "../../../data/items/ottoItemType";
import { ParamTooltip } from "../items/ParamTooltip";
import { getParamTooltip } from "../items/getParamTooltip";
import type { FlagDescription } from "../../../data/items/itemParams";
import { parseU16, parseU8 } from "../../../utils/numberParsers";
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
import { Globals, Game } from "@/data/globals/globals";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SafeSplineItemTypes,
  FilterToSafeSplineItems,
} from "../../../data/items/itemAtoms";
import { Label } from "@/components/ui/label";
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";
import { selectSplineNubs } from "../../../data/selectors";

export function AddNewSplineMenu({
  setSplineData,
}: {
  setSplineData: Updater<SplineData>;
}) {
  return (
    <>
      <Button
        onClick={() => {
          setSplineData((splineData) => {
            splineData.Spln[1000].obj.push({
              bbBottom: 200,
              bbLeft: 100,
              bbRight: 200,
              bbTop: 100,
              numItems: 0,
              numNubs: 3,
              numPoints: 200,
            });
            const splinePos =
              SPLINE_KEY_BASE + splineData.Spln[1000].obj.length - 1;

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
          });
        }}
      >
        Add New Spline
      </Button>
    </>
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

  if (selectedSpline === undefined) return <p>No Selected Spline</p>;
  if (selectedSplineItem === undefined) return <></>;

  const currentSplineItemData = splineItemData.at(selectedSplineItem);

  const splineItemTypesResult = getSplineItemTypes(globals);
  const allSplineItemValues = splineItemTypesResult.ok
    ? splineItemTypesResult.value
        .map((key) => parseInt(key))
        .filter((key) => isNaN(key) === false)
    : [];

  // Filter to safe spline items if enabled
  const splineItemValues =
    filterToSafe && safeSplineItemTypes.size > 0
      ? allSplineItemValues.filter((type) => safeSplineItemTypes.has(type))
      : allSplineItemValues;

  if (currentSplineItemData === undefined) return <></>;

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
            <SelectItem key={key} className="text-black" value={key.toString()}>
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

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
        <ParamTooltip
          label={<span>Flags</span>}
          tooltip={getParamTooltip(
            TerrainItemTypeParams[currentSplineItemData.type as ItemType].flags,
          )}
        />
        <Input
          type="number"
          value={currentSplineItemData.flags}
          onChange={(e) => {
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
                item.flags = parseU16(e.target.value);
              }
            });
          }}
        />

        {([0, 1, 2, 3] as const).map((i) => {
          const paramKey = `p${i}` as const;
          const param =
            TerrainItemTypeParams[currentSplineItemData.type as ItemType][
              paramKey
            ];
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
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const globals = useAtomValue(Globals);

  const nubs = selectedSpline !== undefined
    ? selectSplineNubs(splineData, SPLINE_KEY_BASE + selectedSpline)
    : [];
  const splineType = detectSplineType(nubs);

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            const splineNubs =
              splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
            if (!splineNubs) return;
            const firstNub = splineNubs[0];
            if (!firstNub) return;

            splineNubs.splice(1, 0, {
              x: firstNub.x + 30,
              z: firstNub.z + 30,
            });
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineNubs),
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
            const lastNub = splineNubs[splineNubs.length - 1];
            if (!lastNub) return;

            splineNubs.splice(splineNubs.length - 1, 0, {
              x: lastNub.x + 100,
              z: lastNub.z + 100,
            });
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineNubs),
            };
          });
        }}
      >
        Add Back Nub
      </Button>

      {globals.GAME_TYPE === Game.BILLY_FRONTIER && (
        <div className="col-span-6 flex items-center gap-2 mt-2">
           <Label>Spline Type:</Label>
           <Select
             value={splineType}
             onValueChange={(val) => {
               setSplineData((draft) => {
                 if (selectedSpline === undefined) return;
                 const nubs = draft.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj;
                 if (!nubs) return;

                 const targetType = val as SplineType;
                 const currentType = detectSplineType(nubs);

                 if (currentType === targetType) return;

                 if (targetType === SplineType.CIRCULAR) {
                    // Make circular: Append duplicate of first nub
                    nubs.push({ x: nubs[0].x, z: nubs[0].z });
                 } else {
                    // Make open: Remove last nub if it duplicates first
                    const first = nubs[0];
                    const last = nubs[nubs.length - 1];
                    if (nubs.length > 1 && Math.abs(first.x - last.x) < 5 && Math.abs(first.z - last.z) < 5) {
                       nubs.pop();
                    }
                 }

                 // Update points
                 draft.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
                   obj: getPoints(nubs, targetType),
                 };
                 // Update numNubs/numPoints in Spln
                 const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + selectedSpline];
                 if (spln) {
                   spln.numNubs = nubs.length;
                   if (draft.SpPt[SPLINE_KEY_BASE + selectedSpline]) {
                     spln.numPoints = draft.SpPt[SPLINE_KEY_BASE + selectedSpline]!.obj.length;
                   }
                 }
               });
             }}
           >
             <SelectTrigger className="w-[180px]">
               {splineType === SplineType.CIRCULAR ? "Circular (Loop)" : "Open (Linear)"}
             </SelectTrigger>
             <SelectContent>
               <SelectItem value={SplineType.CIRCULAR}>Circular (Loop)</SelectItem>
               <SelectItem value={SplineType.OPEN}>Open (Linear)</SelectItem>
             </SelectContent>
           </Select>
        </div>
      )}
    </div>
  );
}
