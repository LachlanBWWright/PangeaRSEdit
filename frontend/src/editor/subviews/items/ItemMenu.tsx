import { Updater } from "use-immer";
import {
  ItemData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
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
import { getGameKeyFromName } from "@/validation/gameRepositories";

export function ItemMenu({
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
  const citationGame = getGameKeyFromName(globals.GAME_NAME);

  const selectedItemData =
    selectedItem !== undefined ? itemData.Itms[1000].obj[selectedItem] : null;

  const itemTypesResult = getItemTypes(globals);
  const allItemValues = itemTypesResult.isOk()
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
      {selectedItemData === null || selectedItemData === undefined ? (
        <AddItemMenu />
      ) : (
        <p>
          Item {selectedItemData.type} ({selectedItemData.x},
          {selectedItemData.z})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {selectedItemData !== null && selectedItemData !== undefined && (
          <>
            <Select
              value={selectedItemData.type.toString() ?? ""}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setItemData((draft) => {
                  if (selectedItem === undefined) return;
                  const item = draft.Itms[1000]?.obj?.[selectedItem];
                  if (item) {
                    item.type = newItemType;
                  }
                });
              }}
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
                  TerrainItemTypeParams[selectedItemData.type as ItemType].flags
                }
                codeSample={undefined}
                citationGame={citationGame ?? undefined}
              />
              <Input
                type="number"
                className="col-span-3"
                value={selectedItemData.flags.toString()}
                onChange={(e) => {
                  setItemData((draft) => {
                    if (selectedItem === undefined) return;
                    const item = draft.Itms[1000]?.obj?.[selectedItem];
                    if (item) {
                      item.flags = parseU16(e.target.value);
                    }
                  });
                }}
              />

              {/* Param 0-3, refactored */}
              {([0, 1, 2, 3] as const).map((i) => {
                const paramKey = `p${i}` as const;
                const param =
                  TerrainItemTypeParams[selectedItemData.type as ItemType][paramKey];
                const value = selectedItemData[paramKey];
                const setValue = (v: number) => {
                  setItemData((draft) => {
                    if (selectedItem === undefined) return;
                    const item = draft.Itms[1000]?.obj?.[selectedItem];
                    if (item) {
                      item[paramKey] = v;
                    }
                  });
                };
                return [
                  <ParamTooltip
                    key={`tooltip-${i}`}
                    label={<span>{`Parameter ${i}`}</span>}
                    tooltip={getParamTooltip(param)}
                    codeSample={
                      typeof param === "string" || !param || param.type !== "Integer"
                        ? undefined
                        : param.codeSample
                    }
                    citationGame={citationGame ?? undefined}
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
                                    if (selectedItem === undefined) return;
                                    const item =
                                      draft.Itms[1000]?.obj?.[selectedItem];
                                    if (item) {
                                      const mask = 1 << flag.index;
                                      if (checked) {
                                        item[paramKey] |= mask;
                                      } else {
                                        item[paramKey] &= ~mask;
                                      }
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
                setItemData((draft) => {
                  draft.Itms[1000].obj.splice(selectedItem, 1);
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
  const itemValues = itemTypesResult.isOk()
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
