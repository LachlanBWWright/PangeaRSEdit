import { Updater } from "use-immer";
import {
  SplineData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";

import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./splineUtils";
import { useEffect } from "react";
import {
  AddNewSplineMenu,
  EditSplineItemMenu,
  EditSplineMenu,
} from "./SplineSubmenus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  //SelectValue,
} from "@/components/ui/select";
import { Globals } from "@/data/globals/globals";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";

export function SplineMenu({
  splineData,
  setSplineData,
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
  }, [selectedSpline, setSelectedSplineItem]);

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
                  currentSplineData?.[selectedSplineItem]?.type ?? 0,
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
          <EditSplineItemMenu
            splineItemData={currentSplineData}
            setSplineData={setSplineData}
          />
        )}
        {currentSplineData !== null && currentSplineData !== undefined && (
          <EditSplineMenu
            splineData={splineData}
            setSplineData={setSplineData}
          />
        )}
      </div>
    </div>
  );
}
