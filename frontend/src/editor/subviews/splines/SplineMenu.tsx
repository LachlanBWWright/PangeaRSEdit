import { Updater } from "use-immer";
import {
  ottoSplineItem,
} from "../../../python/structSpecs/ottoMaticInterface";
import { SplineData, HeaderData } from "../../../python/structSpecs/ottoMaticLevelData";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { ottoItemTypeParams } from "../../../data/items/ottoItemType";
import { ParamTooltip } from "../items/ParamTooltip";
import { getParamTooltip } from "../items/getParamTooltip";
import { parseU16, parseU8 } from "../../../utils/numberParsers";

import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./Spline";
import { useEffect } from "react";
import { getPoints } from "../../../utils/spline";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  //SelectValue,
} from "@/components/ui/select";
import { getSplineItemTypes } from "@/data/splines/getSplineItemTypes";
import { Globals } from "@/data/globals/globals";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Checkbox } from "@/components/ui/checkbox";

export function SplineMenu({
  splineData,
  setSplineData,
  headerData,
  setHeaderData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  useEffect(() => {
    setSelectedSplineItem(undefined);
  }, [selectedSpline]);

  if (splineData.Spln === undefined) return null;

  const currentSplineData =
    selectedSpline !== undefined
      ? splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj
      : null;

  return (
    <div className="flex flex-col gap-2">
      {currentSplineData === null || currentSplineData === undefined ? (
        <AddNewSplineMenu setSplineData={setSplineData} />
      ) : (
        <Select
          /*           value={
            selectedSplineItem !== undefined
              ? splineItemTypeNames[currentSplineData[selectedSplineItem].type]
              : "No Item Selected"
          } */
          onValueChange={(e) => {
            if (e === "NoneSelected") {
              setSelectedSplineItem(undefined);
            } else setSelectedSplineItem(parseInt(e));
          }}
        >
          <SelectTrigger>
            {selectedSplineItem !== undefined
              ? `#${selectedSplineItem} ${getSplineItemName(
                  globals,
                  currentSplineData[selectedSplineItem].type,
                )}`
              : "No Item Selected"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NoneSelected">No Item Selected</SelectItem>
            {currentSplineData.map((item, itemIdx) => (
              <SelectItem key={itemIdx} value={itemIdx.toString()}>
                #{itemIdx} ({getSplineItemName(globals, item.type)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex flex-col gap-2">
        {currentSplineData && (
          <EditSplineItemMenu splineItemData={currentSplineData} setSplineData={setSplineData} />
        )}
        {currentSplineData !== null && currentSplineData !== undefined && (
          <EditSplineMenu splineData={splineData} setSplineData={setSplineData} />
        )}
      </div>
    </div>
  );
}

function AddNewSplineMenu({ setSplineData }: { setSplineData: Updater<SplineData> }) {
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
              numPoints: 200, //IDK
            });
            const splinePos = SPLINE_KEY_BASE + splineData.Spln[1000].obj.length - 1;

            splineData.SpIt[splinePos] = { obj: [] };
            //[x1, z1, y2, z2, y3, z3, y4, z4] and so on
            splineData.SpNb[splinePos] = {
              obj: [
                {
                  x: 100,
                  z: 200,
                },
                {
                  x: 150,
                  z: 100,
                },

                {
                  x: 200,
                  z: 200,
                },

                {
                  x: 100,
                  z: 200,
                },
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

function EditSplineItemMenu({
  setSplineData,
  splineItemData,
}: {
  setSplineData: Updater<SplineData>;
  splineItemData: ottoSplineItem[];
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  if (selectedSpline === undefined) return <p>No Selected Spline</p>;
  if (selectedSplineItem === undefined) return <></>;

  const currentSplineItemData = splineItemData.at(selectedSplineItem);

  const splineItemValues = getSplineItemTypes(globals) //Object.keys(SplineItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

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
            splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
              selectedSplineItem
            ].type = newItemType;
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

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
        {/* Flags field */}
        <ParamTooltip
          label={<span>Flags</span>}
          tooltip={getParamTooltip(ottoItemTypeParams[currentSplineItemData.type].flags)}
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
              splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].flags = parseU16(e.target.value);
            });
          }}
        />

        {/* Param 0-3, with bit flag support */}
        {([0, 1, 2, 3] as const).map((i) => {
          const paramKey = `p${i}` as const;
          const param = ottoItemTypeParams[currentSplineItemData.type][paramKey];
          const value = currentSplineItemData[paramKey];
          const setValue = (v: number) => {
            setSplineData((splineData) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ][paramKey] = v;
            });
          };
          return [
            <ParamTooltip
              key={`tooltip-${i}`}
              label={<span>{`Parameter ${i}`}</span>}
              tooltip={getParamTooltip(param)}
            />,
            param && typeof param !== "string" && param.type === "Bit Flags" && Array.isArray(param.flags) ? (
              <div key={`flags-${i}`} className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-2">
                  {param.flags.map((flag) => {
                    const checked = (value & (1 << flag.index)) !== 0;
                    return (
                      <label key={flag.index} className="inline-flex items-center gap-1">
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
                              if (checked) {
                                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                                  selectedSplineItem
                                ][paramKey] |= mask;
                              } else {
                                splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                                  selectedSplineItem
                                ][paramKey] &= ~mask;
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
            )
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

              splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].placement = placement;
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
              if (selectedSplineItem === undefined) return;
              splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj.splice(
                selectedSplineItem,
              );
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

function EditSplineMenu({
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}) {
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            const splineNubs = splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;

            splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(1, 0, {
              x: splineNubs[0].x + 30,
              z: splineNubs[0].z + 30,
            });
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
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
            const splineNubs = splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;

            splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(
              splineNubs.length - 1,
              0,
              {
                x: splineNubs[splineNubs.length - 1].x + 100,
                z: splineNubs[splineNubs.length - 1].z + 100,
              },
            );
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Add Back Nub
      </Button>
      <Button
        disabled={
          selectedSpline === undefined ||
          splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj.length <= 4
        }
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(1, 1);
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Delete Front Nub
      </Button>
      <Button
        disabled={
          selectedSpline === undefined ||
          splineData.SpNb[SPLINE_KEY_BASE + selectedSpline]?.obj.length <= 4
        }
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            const splineNubs = splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;
            //Remove 2nd to last
            splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(
              splineNubs.length - 2,
              1,
            );
            splineData.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(splineData.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Delete Back Nub
      </Button>
      <Button
        disabled={selectedSpline === undefined}
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            splineData.SpIt[SPLINE_KEY_BASE + selectedSpline].obj.push({
              placement: 0.5,
              type: 0 as any, //eslint-disable-line
              flags: 0,
              p0: 0,
              p1: 0,
              p2: 0,
              p3: 0,
            });
          });
        }}
      >
        Add Spline Item
      </Button>
      <Button
        variant="destructive"
        disabled={selectedSpline === undefined}
        onClick={() => {
          setSplineData((splineData) => {
            if (selectedSpline === undefined) return;
            splineData.Spln[1000].obj.splice(selectedSpline, 1);
            let pos = SPLINE_KEY_BASE + selectedSpline;
            while (splineData.SpNb[pos + 1] !== undefined) {
              splineData.SpNb[pos] = splineData.SpNb[pos + 1];
              splineData.SpPt[pos] = splineData.SpPt[pos + 1];
              splineData.SpIt[pos] = splineData.SpIt[pos + 1];
              pos++;
            }
            delete splineData.SpNb[pos];
            delete splineData.SpPt[pos];
            delete splineData.SpIt[pos];
          });
          setSelectedSpline(undefined);
        }}
      >
        Delete Spline
      </Button>
    </div>
  );
}
