import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom } from "jotai";
import { Button, DeleteButton } from "../../../components/Button";
import { ottoItemTypeParams } from "../../../data/items/ottoItemType";
import { parseU16, parseU8 } from "../../../utils/numberParsers";
import {
  SplineItemType,
  splineItemTypeNames,
} from "../../../data/splines/splineItemType";
import { SelectedSpline } from "../../../data/splines/splineAtoms";

export function SplineMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
  const splineData =
    selectedSpline !== undefined ? data.SpIt[1000].obj[selectedSpline] : null;

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
        <p>
          Spline {splineData.type} ({splineItemTypeNames[splineData.type]})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {splineData !== null && splineData !== undefined && (
          <>
            <select
              value={splineData.type}
              className="text-black"
              onChange={(e) => {
                const newItemType = parseInt(e.target.value);
                setData((data) => {
                  if (selectedSpline === undefined) return;
                  data.Itms[1000].obj[selectedSpline].type = newItemType;
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
              <p>Flags ({ottoItemTypeParams[splineData.type].flags})</p>
              <input
                className="text-black"
                type="text"
                value={splineData.flags}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedSpline === undefined) return;
                    data.Itms[1000].obj[selectedSpline].flags = parseU16(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 0 ({ottoItemTypeParams[splineData.type].p0})</p>
              <input
                className="text-black"
                type="text"
                value={splineData.p0}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedSpline === undefined) return;
                    data.Itms[1000].obj[selectedSpline].p0 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 1 ({ottoItemTypeParams[splineData.type].p1})</p>
              <input
                className="text-black"
                type="text"
                value={splineData.p1}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedSpline === undefined) return;
                    data.Itms[1000].obj[selectedSpline].p1 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 2 ({ottoItemTypeParams[splineData.type].p2})</p>
              <input
                className="text-black"
                type="text"
                value={splineData.p2}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedSpline === undefined) return;
                    data.Itms[1000].obj[selectedSpline].p2 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
              <p>Parameter 3 ({ottoItemTypeParams[splineData.type].p3})</p>
              <input
                className="text-black"
                type="text"
                value={splineData.p3}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedSpline === undefined) return;
                    data.Itms[1000].obj[selectedSpline].p3 = parseU8(
                      e.target.value,
                    );
                  });
                }}
              />
            </div>
            <DeleteButton
              disabled={selectedSpline === undefined}
              onClick={() => {
                if (selectedSpline === undefined) return;
                setData((data) => {
                  delete data.Itms[1000].obj[selectedSpline];
                });
                setSelectedSpline(undefined);
              }}
            >
              Delete Spline
            </DeleteButton>
          </>
        )}
      </div>
    </div>
  );
}
