import { Updater } from "use-immer";
import {
  SplineData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
  SelectedSpline,
  SelectedSplineItem,
  SelectedSplineNub,
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
import { ItemThumbnail } from "@/components/items/ItemThumbnail";
import { LevelNumber } from "@/data/globals/levelNumber";
import { getItemLevelSupportLabel } from "@/data/items/itemLevelSupport";
import { MapSelection } from "../shared/MapSelection";

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
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
  const setSelectedSplineNub = useSetAtom(SelectedSplineNub);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  const levelNum = useAtomValue(LevelNumber);
  const splines = splineData.Spln?.[1000]?.obj ?? [];
  const hasSplines = splines.length > 0;
  const splineSelection = hasSplines && (
    <MapSelection label="Placed spline" selected={selectedSpline} onSelect={(index) => {
      setSelectedSpline(index);
      setSelectedSplineNub(null);
    }}>
      {splines.map((_, index) => <option key={index} value={index}>Spline {index + 1}</option>)}
    </MapSelection>
  );

  useEffect(() => {
    setSelectedSplineItem(undefined);
  }, [selectedSpline, setSelectedSplineItem]);

  const splineItemData = selectedSpline === undefined
    ? null
    : splineData.SpIt?.[SPLINE_KEY_BASE + selectedSpline]?.obj ?? null;

  if (selectedSpline === undefined || splineItemData === null) {
    return (
      <div className="flex min-h-full min-w-0 flex-col gap-4 p-2">
        {splineSelection}
        <AddNewSplineMenu setSplineData={setSplineData} hasSplines={hasSplines} />
      </div>
    );
  }

  const selectedItem =
    selectedSplineItem === undefined
      ? undefined
      : splineItemData[selectedSplineItem];

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
      <SelectTrigger
        className={`min-w-0 justify-start ${
          selectedSplineItem !== undefined && selectedItem
            ? "rounded-r-none"
            : ""
        }`}
      >
        {selectedSplineItem !== undefined && selectedItem ? (
          <ItemThumbnail
            game={globals.GAME_TYPE}
            kind="splineItem"
            itemType={selectedItem.type}
            label={getSplineItemName(globals, selectedItem.type)}
            levelNum={levelNum}
            params={selectedItem}
            metadata={`#${selectedSplineItem}`}
            compact
            className="min-w-0"
          />
        ) : (
          "No Item Selected"
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SPLINE_ITEM_SELECTED_VALUE}>
          No Item Selected
        </SelectItem>
        {splineItemData.map((item, itemIdx) => (
          <SelectItem key={itemIdx} value={itemIdx.toString()}>
            <ItemThumbnail
              game={globals.GAME_TYPE}
              kind="splineItem"
              itemType={item.type}
              label={`${getSplineItemName(globals, item.type)} — ${getItemLevelSupportLabel(
                globals.GAME_TYPE,
                "splineItem",
                item.type,
                levelNum,
              )}`}
              levelNum={levelNum}
              params={item}
              metadata={`#${itemIdx}`}
              compact
            />
          </SelectItem>
        ))}
        <SelectItem value={ADD_SPLINE_ITEM_VALUE}>Add New Spline Item</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-4 p-2">
      {splineSelection}
      <section className="min-w-0">
        <EditSplineMenu splineData={splineData} setSplineData={setSplineData} />
      </section>

      <section className="min-w-0 border-t border-gray-700 pt-4">
        <EditSplineItemMenu
          splineItemData={splineItemData}
          setSplineData={setSplineData}
          selectedSplineItemControl={selectedSplineItemControl}
        />
      </section>
    </div>
  );
});
