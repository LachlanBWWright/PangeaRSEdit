import { Updater } from "use-immer";
<<<<<<< HEAD
import {
  ItemData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
=======
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { 
  ClickToAddItem, 
  SelectedItem, 
  SafeItemTypes, 
  FilterToSafeItems 
} from "../../../data/items/itemAtoms";
import { TerrainItemTypeParams, ItemType } from "../../../data/items/ottoItemType";
import type { ParamDescription, FlagDescription } from "../../../data/items/itemParams";
import { parseU16, parseU8 } from "../../../utils/numberParsers";
import { useEffect } from "react";
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
import { getItemTypes } from "@/data/items/getItemTypes";
import { ParamTooltip } from "./ParamTooltip";
import { Label } from "@/components/ui/label";

export function ItemMenu({
<<<<<<< HEAD
  itemData,
  setItemData,
=======
  data,
  setData,
>>>>>>> origin/main
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);
  const safeItemTypes = useAtomValue(SafeItemTypes);
  const [filterToSafe, setFilterToSafe] = useAtom(FilterToSafeItems);
  // Mark unused props as used to satisfy linter; they are intentionally passed in for consistency with parent

  const itemData =
    selectedItem !== undefined ? data.Itms[1000].obj[selectedItem] : null;

  const itemTypesResult = getItemTypes(globals);
  const allItemValues = itemTypesResult.ok
    ? itemTypesResult.value
        .map((key) => parseInt(key))
        .filter((key) => isNaN(key) === false)
    : [];

  // Filter to safe items if enabled
  const itemValues = filterToSafe && safeItemTypes.size > 0
    ? allItemValues.filter((type) => safeItemTypes.has(type))
    : allItemValues;

  return (
    <div className="flex flex-col gap-2">
      {itemData === null || itemData === undefined ? (
        <AddItemMenu />
      ) : (
        <p>
<<<<<<< HEAD
          Item {selectedItemData.type} ({selectedItemData.x},
          {selectedItemData.z})
=======
          Item {itemData.type} ({itemData.x},{itemData.z})
>>>>>>> origin/main
        </p>
      )}

      <div className="flex flex-col gap-2">
        {itemData !== null && itemData !== undefined && (
          <>
            <Select
              value={itemData.type.toString() ?? ""}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setData((data) => {
                  if (selectedItem === undefined) return;
<<<<<<< HEAD
                  const item = itemData.Itms[1000]?.obj?.[selectedItem];
                  if (item) {
                    item.type = newItemType;
                  }
=======
                  data.Itms[1000].obj[selectedItem].type = newItemType;
>>>>>>> origin/main
                });
              }}
            >
              <SelectTrigger>
<<<<<<< HEAD
                <SelectValue>
                  {getItemName(globals, selectedItemData.type)}
                </SelectValue>
=======
                <SelectValue>{getItemName(globals, itemData.type)}</SelectValue>
>>>>>>> origin/main
              </SelectTrigger>
              <SelectContent>
                {itemValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-black"
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
                  Only show item types found in original level ({safeItemTypes.size} safe types)
                </Label>
              </div>
            )}

            <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-baseline">
              <ParamTooltip
                label={
                  <span className="text-baseline align-text-bottom">Flags</span>
                }
                tooltip={
<<<<<<< HEAD
                  typeof TerrainItemTypeParams[selectedItemData.type as ItemType].flags ===
                  "string"
                    ? TerrainItemTypeParams[selectedItemData.type as ItemType].flags
=======
                  typeof ottoItemTypeParams[itemData.type].flags === "string"
                    ? ottoItemTypeParams[itemData.type].flags
>>>>>>> origin/main
                    : ""
                }
              />
              <Input
                type="number"
                className="col-span-3"
                value={itemData.flags.toString()}
                onChange={(e) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
<<<<<<< HEAD
                    const item = itemData.Itms[1000]?.obj?.[selectedItem];
                    if (item) {
                      item.flags = parseU16(e.target.value);
                    }
=======
                    data.Itms[1000].obj[selectedItem].flags = parseU16(
                      e.target.value,
                    );
>>>>>>> origin/main
                  });
                }}
              />

              {/* Param 0-3, refactored */}
              {([0, 1, 2, 3] as const).map((i) => {
                const paramKey = `p${i}` as const;
<<<<<<< HEAD
                const param =
                  TerrainItemTypeParams[selectedItemData.type as ItemType][paramKey];
                const value = selectedItemData[paramKey];
=======
                const param = ottoItemTypeParams[itemData.type][paramKey];
                const value = itemData[paramKey];
>>>>>>> origin/main
                const setValue = (v: number) => {
                  setData((data) => {
                    if (selectedItem === undefined) return;
<<<<<<< HEAD
                    const item = itemData.Itms[1000]?.obj?.[selectedItem];
                    if (item) {
                      item[paramKey] = v;
                    }
=======
                    data.Itms[1000].obj[selectedItem][paramKey] = v;
>>>>>>> origin/main
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
                                  setData((data) => {
                                    if (selectedItem === undefined) return;
<<<<<<< HEAD
                                    const item =
                                      itemData.Itms[1000]?.obj?.[selectedItem];
                                    if (item) {
                                      const mask = 1 << flag.index;
                                      if (checked) {
                                        item[paramKey] |= mask;
                                      } else {
                                        item[paramKey] &= ~mask;
                                      }
=======
                                    const mask = 1 << flag.index;
                                    if (checked) {
                                      data.Itms[1000].obj[selectedItem][paramKey] |= mask;
                                    } else {
                                      data.Itms[1000].obj[selectedItem][paramKey] &= ~mask;
>>>>>>> origin/main
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
            </div>
            <Button
              variant="destructive"
              disabled={selectedItem === undefined}
              onClick={() => {
                if (selectedItem === undefined) return;
                setData((data) => {
                  data.Itms[1000].obj.splice(selectedItem, 1);
                });
                setSelectedItem(undefined);
              }}
            >
              Delete Item
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function AddItemMenu() {
  const [clickToAddItem, setClickToAddItem] = useAtom(ClickToAddItem);
  useEffect(() => {
    return () => setClickToAddItem(undefined);
  }, [setClickToAddItem]);
  const globals = useAtomValue(Globals);

  const itemTypesResult = getItemTypes(globals);
  const itemValues = itemTypesResult.ok
    ? itemTypesResult.value
        .map((key) => parseInt(key))
        .filter((key) => isNaN(key) === false)
    : [];

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
                className="text-black"
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

  return <Button onClick={() => setClickToAddItem(0)}>Add Items</Button>;
}

function getParamTooltip(param: ParamDescription): string {
  if (param === "Unknown" || param === "Unused") return "";
  if (typeof param === "string") return param;
  if (param && param.type === "Integer") {
    let t = param.description;
    if (param.codeSample) t += `\nExample: ${param.codeSample.code}`;
    return t;
  }
  if (param && param.type === "Bit Flags" && Array.isArray(param.flags)) {
    return param.flags
      .map(
        (f) =>
          `${f.index}: ${f.description}` +
          (f.codeSample ? `\nExample: ${f.codeSample.code}` : ""),
      )
      .join("\n\n");
  }
  return "";
}
