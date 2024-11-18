import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
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

export function SplineMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  console.log(data.SpIt[SPLINE_KEY_BASE + (selectedSpline ?? 0)].obj);
  console.log("Selected Spline", selectedSpline);

  useEffect(() => {
    setSelectedSplineItem(undefined);
  }, [selectedSpline]);

  const splineData =
    selectedSpline !== undefined
      ? data.SpIt[SPLINE_KEY_BASE + selectedSpline].obj
      : null;

  const splineItemData =
    splineData !== null && selectedSplineItem !== undefined
      ? splineData[selectedSplineItem] ?? null
      : null;

  const splineItemValues = Object.keys(SplineItemType)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  return (
    <div className="flex flex-col gap-2">
      {splineData === null || splineData === undefined ? (
        <div className="h-20 px-2">
          <Button>Add New Spline</Button>
        </div>
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
        {splineItemData !== null && (
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
                disabled={selectedSpline === undefined || true}
                onClick={() => {
                  console.log("TODO");
                }}
              >
                Delete Spline Item
              </DeleteButton>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-6 gap-2">
        <Button disabled>Add Front Nub</Button>
        <Button disabled>Add Back Nub</Button>
        <Button disabled>Delete Front Nub</Button>
        <Button disabled>Delete Back Nub</Button>
        <Button disabled>Add Spline Item</Button>
        <DeleteButton
          disabled={selectedSpline === undefined || true}
          onClick={() => {
            console.log("TODO");
          }}
        >
          Delete Spline
        </DeleteButton>
      </div>
    </div>
  );
}
