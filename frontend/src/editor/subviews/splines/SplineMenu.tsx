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
import { memo, useEffect } from "react";
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
import { initSplineItem } from "@/editor/subviews/splines/editSplineItemMenuState";

const ADD_SPLINE_ITEM_VALUE = "AddSplineItem";
const NO_SPLINE_ITEM_SELECTED_VALUE = "NoneSelected";

export const SplineMenu = memo(function SplineMenu({
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
  headerData?: HeaderData;
  setHeaderData?: Updater<HeaderData>;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  const hasSplines = (splineData.Spln?.[1000]?.obj?.length ?? 0) > 0;

  useEffect(() => {
    setSelectedSplineItem(undefined);
  }, [selectedSpline, setSelectedSplineItem]);

  if (selectedSpline === undefined) {
    return <AddNewSplineMenu setSplineData={setSplineData} hasSplines={hasSplines} />;
  }

  const splineItemData =
    splineData.SpIt?.[SPLINE_KEY_BASE + selectedSpline]?.obj ?? null;

  if (splineItemData === null) {
    return <AddNewSplineMenu setSplineData={setSplineData} hasSplines={hasSplines} />;
  }

  const selectedSplineItemControl = (
    <Select
      onValueChange={(e) => {
        if (e === ADD_SPLINE_ITEM_VALUE) {
          setSplineData((splineData) => {
            const newItemIndex = initSplineItem(splineData, selectedSpline);
            if (newItemIndex !== null) setSelectedSplineItem(newItemIndex);
          });
        } else if (e === NO_SPLINE_ITEM_SELECTED_VALUE) {
          setSelectedSplineItem(undefined);
        } else setSelectedSplineItem(parseInt(e));
      }}
    >
      <SelectTrigger>
        {selectedSplineItem !== undefined
          ? `#${selectedSplineItem} ${getSplineItemName(
              globals,
              splineItemData?.[selectedSplineItem]?.type ?? 0,
            )}`
          : "No Item Selected"}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SPLINE_ITEM_SELECTED_VALUE}>
          No Item Selected
        </SelectItem>
        <SelectItem value={ADD_SPLINE_ITEM_VALUE}>Add New Spline Item</SelectItem>
        {splineItemData.map((item, itemIdx) => (
          <SelectItem key={itemIdx} value={itemIdx.toString()}>
            #{itemIdx} ({getSplineItemName(globals, item.type)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-2 min-h-full">
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {splineItemData && (
          <EditSplineItemMenu
            splineItemData={splineItemData}
            setSplineData={setSplineData}
            selectedSplineItemControl={selectedSplineItemControl}
          />
        )}
        {splineItemData !== null && splineItemData !== undefined && (
          <EditSplineMenu splineData={splineData} setSplineData={setSplineData} />
        )}
      </div>
    </div>
  );
});
