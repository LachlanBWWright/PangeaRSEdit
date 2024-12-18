import { Updater } from "use-immer";
import {
  ottoMaticLevel,
  ottoSplineItem,
} from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom, useAtomValue } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { ottoItemTypeParams } from "../../../data/items/ottoItemType";
import { parseU16, parseU8 } from "../../../utils/numberParsers";
import {
  SplineItemType,
  splineItemTypeNames,
} from "../../../data/splines/ottoSplineItemType";
import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./Spline";
import { useEffect } from "react";
import { getPoints } from "../../../utils/spline";

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
        <select
          value={selectedSplineItem ?? "No Item Selected"}
          className="text-black"
          onChange={(e) => {
            if (typeof e.target.value === "undefined") {
              setSelectedSplineItem(undefined);
            } else setSelectedSplineItem(parseInt(e.target.value));
          }}
        >
          <option value={undefined}>No Item Selected</option>
          {splineData.map((item, itemIdx) => (
            <option key={itemIdx} value={itemIdx}>
              #{itemIdx} {splineItemTypeNames[item.type]}
            </option>
          ))}
        </select>
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
            let splinePos = SPLINE_KEY_BASE + data.Spln[1000].obj.length - 1;

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
  if (selectedSpline === undefined) return <p>No Selected Spline</p>;
  if (selectedSplineItem === undefined) return <></>;

  const splineItemData = splineData.at(selectedSplineItem);

  const splineItemValues = Object.keys(SplineItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  if (splineItemData === undefined) return <></>;

  return (
    <>
      <select
        value={splineItemData.type}
        className="text-black"
        onChange={(e) => {
          const newItemType = parseInt(e.target.value);
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
        {splineItemValues.map((key) => (
          <option key={key} className="text-black" value={key}>
            {splineItemTypeNames[key as SplineItemType]}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2">
        <p>Flags ({ottoItemTypeParams[splineItemData.type].flags})</p>
        <input
          className="text-black"
          type="text"
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
        <p>Parameter 0 ({ottoItemTypeParams[splineItemData.type].p0})</p>
        <input
          className="text-black"
          type="text"
          value={splineItemData.p0}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].p0 = parseU8(e.target.value);
            });
          }}
        />
        <p>Parameter 1 ({ottoItemTypeParams[splineItemData.type].p1})</p>
        <input
          className="text-black"
          type="text"
          value={splineItemData.p1}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].p1 = parseU8(e.target.value);
            });
          }}
        />
        <p>Parameter 2 ({ottoItemTypeParams[splineItemData.type].p2})</p>
        <input
          className="text-black"
          type="text"
          value={splineItemData.p2}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].p2 = parseU8(e.target.value);
            });
          }}
        />
        <p>Parameter 3 ({ottoItemTypeParams[splineItemData.type].p3})</p>
        <input
          className="text-black"
          type="text"
          value={splineItemData.p3}
          onChange={(e) => {
            setData((data) => {
              if (
                selectedSpline === undefined ||
                selectedSplineItem === undefined
              )
                return;
              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].p3 = parseU8(e.target.value);
            });
          }}
        />
        <p>Placement (0-1)</p>
        <input
          className="text-black"
          type="text"
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

              data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj[
                selectedSplineItem
              ].placement = placement;
            });
          }}
        />
      </div>
      <div>
        <DeleteButton
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
        </DeleteButton>
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
  const selectedSpline = useAtomValue(SelectedSpline);
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
            console.log("ADDING SPLINE ITEM");
            if (selectedSpline === undefined) return;
            console.log(data.SpIt[SPLINE_KEY_BASE + selectedSpline]);
            data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj.push({
              placement: 0.5,
              type: SplineItemType.Human,
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
      <DeleteButton
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
        }}
      >
        Delete Spline
      </DeleteButton>
    </div>
  );
}
