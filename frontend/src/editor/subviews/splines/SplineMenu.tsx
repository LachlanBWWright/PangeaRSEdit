import { Updater } from "use-immer";
import {
  ottoMaticLevel,
  ottoSplineItem,
} from "../../../python/structSpecs/ottoMaticInterface";
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
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  useEffect(() => {
    setSelectedSplineItem(undefined);
  }, [selectedSpline]);

  const splineData =
    selectedSpline !== undefined
      ? data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj
      : null;

  return (
    <div className="flex flex-col gap-2">
      {splineData === null || splineData === undefined ? (
        <AddNewSplineMenu setData={setData} />
      ) : (
        <Select
          /*           value={
            selectedSplineItem !== undefined
              ? splineItemTypeNames[splineData[selectedSplineItem].type]
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
                  splineData[selectedSplineItem].type,
                )}`
              : "No Item Selected"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NoneSelected">No Item Selected</SelectItem>
            {splineData.map((item, itemIdx) => (
              <SelectItem key={itemIdx} value={itemIdx.toString()}>
                #{itemIdx} ({getSplineItemName(globals, item.type)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex flex-col gap-2">
        {splineData && (
          <EditSplineItemMenu splineData={splineData} setData={setData} />
        )}
        {splineData !== null && splineData !== undefined && (
          <EditSplineMenu data={data} setData={setData} />
        )}
      </div>
    </div>
  );
}

function AddNewSplineMenu({ setData }: { setData: Updater<ottoMaticLevel> }) {
  return (
    <>
      <Button
        onClick={() => {
          setData((data) => {
            data.Spln[1000].obj.push({
              bbBottom: 200,
              bbLeft: 100,
              bbRight: 200,
              bbTop: 100,
              numItems: 0,
              numNubs: 3,
              numPoints: 200, //IDK
            });
            const splinePos = SPLINE_KEY_BASE + data.Spln[1000].obj.length - 1;

            data.SpIt[splinePos] = { obj: [] };
            //[x1, z1, y2, z2, y3, z3, y4, z4] and so on
            data.SpNb[splinePos] = {
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

            data.SpPt[splinePos] = {
              obj: getPoints(data.SpNb[splinePos].obj),
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
  setData,
  splineData,
}: {
  setData: Updater<ottoMaticLevel>;
  splineData: ottoSplineItem[];
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  if (selectedSpline === undefined) return <p>No Selected Spline</p>;
  if (selectedSplineItem === undefined) return <></>;

  const splineItemData = splineData.at(selectedSplineItem);

  const splineItemValues = getSplineItemTypes(globals) //Object.keys(SplineItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  if (splineItemData === undefined) return <></>;

  return (
    <>
      <Select
        onValueChange={(e) => {
          const newItemType = parseInt(e);
          setData((data) => {
            if (
              selectedSpline === undefined ||
              selectedSplineItem === undefined
            )
              return;
            data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
              selectedSplineItem
            ].type = newItemType;
          });
        }}
      >
        <SelectTrigger>
          {getSplineItemName(globals, splineItemData.type)}
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
          tooltip={getParamTooltip(ottoItemTypeParams[splineItemData.type].flags)}
        />
        <Input
          type="number"
          value={splineItemData.flags}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].flags = parseU16(e.target.value);
            });
          }}
        />

        {/* Param 0-3, with bit flag support */}
        {([0, 1, 2, 3] as const).map((i) => {
          const paramKey = `p${i}` as const;
          const param = ottoItemTypeParams[splineItemData.type][paramKey];
          const value = splineItemData[paramKey];
          const setValue = (v: number) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
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
                            setData((data) => {
                              if (
                                selectedSpline === undefined ||
                                selectedSplineItem === undefined
                              )
                                return;
                              const mask = 1 << flag.index;
                              if (checked) {
                                data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                                  selectedSplineItem
                                ][paramKey] |= mask;
                              } else {
                                data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
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
          value={splineItemData.placement}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;

              let placement = parseFloat(e.target.value);
              if (placement < 0) placement = 0;
              if (placement > 1) placement = 1;

              if (isNaN(placement)) placement = 0;

              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
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
            setData((data) => {
              if (selectedSplineItem === undefined) return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj.splice(
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
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);

  return (
    <div className="grid grid-cols-6 gap-2">
      <Button
        onClick={() => {
          setData((data) => {
            if (selectedSpline === undefined) return;
            const splineNubs = data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;

            data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(1, 0, {
              x: splineNubs[0].x + 30,
              z: splineNubs[0].z + 30,
            });
            data.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Add Front Nub
      </Button>
      <Button
        onClick={() => {
          setData((data) => {
            if (selectedSpline === undefined) return;
            const splineNubs = data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;

            data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(
              splineNubs.length - 1,
              0,
              {
                x: splineNubs[splineNubs.length - 1].x + 100,
                z: splineNubs[splineNubs.length - 1].z + 100,
              },
            );
            data.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Add Back Nub
      </Button>
      <Button
        disabled={
          selectedSpline === undefined ||
          data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.length <= 4
        }
        onClick={() => {
          setData((data) => {
            if (selectedSpline === undefined) return;
            data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(1, 1);
            data.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Delete Front Nub
      </Button>
      <Button
        disabled={
          selectedSpline === undefined ||
          data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.length <= 4
        }
        onClick={() => {
          setData((data) => {
            if (selectedSpline === undefined) return;
            const splineNubs = data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj;
            //Remove 2nd to last
            data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj.splice(
              splineNubs.length - 2,
              1,
            );
            data.SpPt[SPLINE_KEY_BASE + selectedSpline] = {
              obj: getPoints(data.SpNb[SPLINE_KEY_BASE + selectedSpline].obj),
            };
          });
        }}
      >
        Delete Back Nub
      </Button>
      <Button
        disabled={selectedSpline === undefined}
        onClick={() => {
          setData((data) => {
            if (selectedSpline === undefined) return;
            data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj.push({
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
          setData((data) => {
            if (selectedSpline === undefined) return;
            data.Spln[1000].obj.splice(selectedSpline, 1);
            let pos = SPLINE_KEY_BASE + selectedSpline;
            while (data.SpNb[pos + 1] !== undefined) {
              data.SpNb[pos] = data.SpNb[pos + 1];
              data.SpPt[pos] = data.SpPt[pos + 1];
              data.SpIt[pos] = data.SpIt[pos + 1];
              pos++;
            }
            delete data.SpNb[pos];
            delete data.SpPt[pos];
            delete data.SpIt[pos];
          });
          setSelectedSpline(undefined);
        }}
      >
        Delete Spline
      </Button>
    </div>
  );
}
