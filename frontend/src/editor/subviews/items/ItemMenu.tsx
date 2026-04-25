import { Updater } from "use-immer";
import { ItemData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  ClickToAddItem,
  SelectedItem,
  SafeItemTypes,
  FilterToSafeItems,
} from "../../../data/items/itemAtoms";
import type { FlagDescription } from "../../../data/items/itemParams";
import { parseU8 } from "../../../utils/numberParsers";
import { memo, useCallback, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectValue,
  SelectContent,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";
import { getItemName } from "@/data/items/getItemNames";
import { Globals } from "@/data/globals/globals";
import { ParamTooltip } from "./ParamTooltip";
import { Label } from "@/components/ui/label";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import {
  deleteSelectedItem,
  filterSafeItemValues,
  getAllItemValues,
  getParamTooltip,
  getSelectedItem,
  getSelectedItemParams,
  updateSelectedItemBitFlag,
  updateSelectedItemParam,
  updateSelectedItemPosition,
  updateSelectedItemType,
} from "@/editor/subviews/items/itemMenuState";

export const ItemMenu = memo(function ItemMenu({
  itemData,
  setItemData,
}: {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  headerData?: HeaderData;
  setHeaderData?: Updater<HeaderData>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);
  const safeItemTypes = useAtomValue(SafeItemTypes);
  const [filterToSafe, setFilterToSafe] = useAtom(FilterToSafeItems);

  const selectedItemData = getSelectedItem(itemData, selectedItem);
  const itemCount = itemData.Itms?.[1000]?.obj?.length ?? 0;
  const selectedItemParams = getSelectedItemParams(selectedItemData?.type);

  const allItemValues = useMemo(() => getAllItemValues(globals), [globals]);

  const itemValues = useMemo(
    () => filterSafeItemValues(allItemValues, filterToSafe, safeItemTypes),
    [filterToSafe, safeItemTypes, allItemValues],
  );

  const handleTypeChange = useCallback(
    (e: string) => {
      const newItemType = parseInt(e);
      setItemData((draft) => {
        updateSelectedItemType(draft, selectedItem, newItemType);
      });
    },
    [selectedItem, setItemData],
  );

  const handleDeleteItem = useCallback(() => {
    if (selectedItem === undefined) return;
    setItemData((draft) => {
      deleteSelectedItem(draft, selectedItem);
    });
    setSelectedItem(undefined);
  }, [selectedItem, setItemData, setSelectedItem]);

  return (
    <div className="flex h-full flex-col gap-2">
      {selectedItemData === null || selectedItemData === undefined ? (
        <AddItemMenu hasItems={itemCount > 0} />
      ) : (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-1 items-center text-sm flex-1 min-h-0">
          <span className="text-gray-400">X</span>
          <Input
            type="number"
            className="h-7 text-xs"
            value={selectedItemData.x}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val)) return;
              setItemData((draft) => {
                updateSelectedItemPosition(draft, selectedItem, "x", val);
              });
            }}
          />
          <span className="text-gray-400">Z</span>
          <Input
            type="number"
            className="h-7 text-xs"
            value={selectedItemData.z}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val)) return;
              setItemData((draft) => {
                updateSelectedItemPosition(draft, selectedItem, "z", val);
              });
            }}
          />
        </div>
      )}

      {selectedItemData !== null && selectedItemData !== undefined && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <Select
            value={selectedItemData.type.toString() ?? ""}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue>
                {getItemName(globals, selectedItemData.type)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {itemValues.map((key) => (
                <SelectItem
                  key={key}
                  className="text-white"
                  value={key.toString()}
                >
                  {getItemName(globals, key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Safe Items Filter Toggle */}
          {safeItemTypes.size > 0 && (
            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
              <Checkbox
                id="filter-safe-items"
                checked={filterToSafe}
                onCheckedChange={(checked) => setFilterToSafe(checked === true)}
              />
              <Label
                htmlFor="filter-safe-items"
                className="text-sm cursor-pointer"
              >
                Only show item types found in original level (
                {safeItemTypes.size} safe types)
              </Label>
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-baseline">
            {/* Param 0-3, refactored */}
            {([0, 1, 2, 3] as const).map((i) => {
              const paramKey = `p${i}` as const;
              const param = selectedItemParams?.[paramKey] ?? "Unknown";
              const value = selectedItemData[paramKey];
              const setValue = (v: number) => {
                setItemData((draft) => {
                  updateSelectedItemParam(draft, selectedItem, paramKey, v);
                });
              };
              return [
                <ParamTooltip
                  key={`tooltip-${i}`}
                  label={<span>{`Parameter ${i}`}</span>}
                  tooltip={getParamTooltip(param)}
                  defaultCitation={
                    typeof param === "string" || !param
                      ? undefined
                      : param.defaultCitation
                  }
                  additionalCitations={
                    typeof param === "string" || !param
                      ? undefined
                      : param.additionalCitations
                  }
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
                                setItemData((draft) => {
                                  updateSelectedItemBitFlag(
                                    draft,
                                    selectedItem,
                                    paramKey,
                                    flag,
                                    checked === true,
                                  );
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
          </div>
          <Button
            variant="destructive"
            disabled={selectedItem === undefined}
            onClick={handleDeleteItem}
          >
            Delete Item
          </Button>
        </div>
      )}
    </div>
  );
});

function AddItemMenu({ hasItems }: { hasItems: boolean }) {
  const [clickToAddItem, setClickToAddItem] = useAtom(ClickToAddItem);
  const globals = useAtomValue(Globals);

  useEffect(() => {
    return () => setClickToAddItem(undefined);
  }, [setClickToAddItem]);

  const itemValues = useMemo(() => {
    return getAllItemValues(globals);
  }, [globals]);

  if (clickToAddItem !== undefined)
    return (
      <>
        <Select
          value={getItemName(globals, clickToAddItem)}
          onValueChange={(e) => {
            const newItemType = parseInt(e);
            setClickToAddItem(newItemType);
          }}
        >
          <SelectTrigger>
            <SelectValue>{getItemName(globals, clickToAddItem)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {itemValues.map((key) => (
              <SelectItem
                key={key}
                className="text-white"
                value={key.toString()}
              >
                {getItemName(globals, key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p>Click on the Canvas to add the selected item</p>
        <Button
          variant="destructive"
          onClick={() => setClickToAddItem(undefined)}
        >
          Stop Adding Items
        </Button>
      </>
    );

  return (
    <EmptyDataPrompt
      title={hasItems ? "No Item Selected" : "No Items"}
      description={
        hasItems
          ? "Select an item on the canvas or add another one."
          : "This level doesn't have any items yet. Add your first item to get started."
      }
      buttonText={hasItems ? "Add More Items" : "Add First Item"}
      onInitialize={() => setClickToAddItem(0)}
      fillHeight={true}
    />
  );
}
