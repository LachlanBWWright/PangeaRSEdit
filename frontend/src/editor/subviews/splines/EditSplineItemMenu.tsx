import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Updater } from "use-immer";
import { SplineData, SplineItem } from "@/python/structSpecs/LevelTypes";
import { TerrainItemTypeParams } from "../../../data/items/ottoItemType";
import { ParamTooltip } from "../items/ParamTooltip";
import { getParamTooltip } from "../items/getParamTooltip";
import type { FlagDescription } from "../../../data/items/itemParams";
import { parseU8 } from "../../../utils/numberParsers";
import {
  SelectedSpline,
  SelectedSplineItem,
} from "../../../data/splines/splineAtoms";
import { SPLINE_KEY_BASE } from "./splineUtils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSplineItemTypes } from "@/data/splines/getSplineItemTypes";
import { Globals } from "@/data/globals/globals";
import { getGameKeyFromName } from "@/validation/gameRepositories";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SafeSplineItemTypes,
  FilterToSafeSplineItems,
} from "../../../data/items/itemAtoms";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SplineItemScriptSection } from "@/editor/subviews/scripts/ScriptBindingSection";
import { ItemStateFlags } from "@/editor/subviews/items/ItemStateFlags";
import {
  clampPlacement,
  deleteSelectedSplineItem,
  updateSplineItemParam,
  updateSplineItemPlacement,
  updateSplineItemType,
} from "@/editor/subviews/splines/editSplineItemMenuState";
import { ItemThumbnail } from "@/components/items/ItemThumbnail";
import { LevelNumber } from "@/data/globals/levelNumber";
import { getItemLevelSupportLabel } from "@/data/items/itemLevelSupport";
import { MenuEmptyState } from "../MenuEmptyState";

export function EditSplineItemMenu({
  setSplineData,
  splineItemData,
  selectedSplineItemControl,
}: {
  setSplineData: Updater<SplineData>;
  splineItemData: SplineItem[];
  selectedSplineItemControl?: ReactNode;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);
  const [selectedSplineItem, setSelectedSplineItem] =
    useAtom(SelectedSplineItem);
  const globals = useAtomValue(Globals);
  const levelNum = useAtomValue(LevelNumber);
  const safeSplineItemTypes = useAtomValue(SafeSplineItemTypes);
  const [filterToSafe, setFilterToSafe] = useAtom(FilterToSafeSplineItems);
  const citationGame = getGameKeyFromName(globals.GAME_NAME);

  const allSplineItemValues = useMemo(() => {
    const result = getSplineItemTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  const splineItemValues = useMemo(
    () =>
      filterToSafe && safeSplineItemTypes.size > 0
        ? allSplineItemValues.filter((type) => safeSplineItemTypes.has(type))
        : allSplineItemValues,
    [filterToSafe, safeSplineItemTypes, allSplineItemValues],
  );

  if (
    selectedSplineItem === undefined ||
    splineItemData.at(selectedSplineItem) === undefined
  ) {
    const hasSplineItems = splineItemData.length > 0;
    return (
      <>
        <div className="min-w-0">{selectedSplineItemControl}</div>
        <MenuEmptyState
          title={hasSplineItems ? "No Spline Item Selected" : "No Spline Items"}
          description={
            hasSplineItems
              ? "Select a spline item from the dropdown."
              : "Add a spline item from the dropdown."
          }
          compact
        />
      </>
    );
  }

  const currentSplineItemData = splineItemData[selectedSplineItem];
  if (!currentSplineItemData) return null;
  if (selectedSpline === undefined) return null;
  const currentSplineItemParams =
    TerrainItemTypeParams[currentSplineItemData.type];

  return (
    <>
      <div className="mb-2 grid min-w-0 grid-cols-2 gap-0">
        <div className="min-w-0">{selectedSplineItemControl}</div>
        <Select
          value={currentSplineItemData.type.toString()}
          onValueChange={(e) => {
            const newItemType = parseInt(e);
            setSplineData((splineData) => {
              updateSplineItemType(
                splineData,
                selectedSpline,
                selectedSplineItem,
                newItemType,
              );
            });
          }}
        >
          <SelectTrigger className="min-w-0 rounded-l-none border-l-0">
            <SelectValue placeholder="Select a spline item type" />
          </SelectTrigger>
          <SelectContent>
            {safeSplineItemTypes.size > 0 && (
              <div className="flex items-center gap-2 px-2 py-2 text-sm">
                <Checkbox
                  id="filter-safe-spline-items"
                  checked={filterToSafe}
                  onCheckedChange={(checked) =>
                    setFilterToSafe(checked === true)
                  }
                />
                <Label
                  htmlFor="filter-safe-spline-items"
                  className="cursor-pointer"
                >
                  Only show spline item types found in original level (
                  {safeSplineItemTypes.size} safe types)
                </Label>
              </div>
            )}
            {splineItemValues.map((key) => (
              <SelectItem
                key={key}
                className="text-white"
                value={key.toString()}
              >
                <ItemThumbnail
                  game={globals.GAME_TYPE}
                  kind="splineItem"
                  itemType={key}
                  label={`${getSplineItemName(globals, key)} — ${getItemLevelSupportLabel(
                    globals.GAME_TYPE,
                    "splineItem",
                    key,
                    levelNum,
                  )}`}
                  levelNum={levelNum}
                  compact
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {([0, 1, 2, 3] as const).map((i) => {
          const paramKey = `p${i}` as const;
          const param = currentSplineItemParams?.[paramKey] ?? "Unknown";
          const value = currentSplineItemData[paramKey];
          const setValue = (v: number) => {
            setSplineData((splineData) => {
              updateSplineItemParam(
                splineData,
                selectedSpline,
                selectedSplineItem,
                paramKey,
                v,
              );
            });
          };
          const flags =
            param &&
            typeof param !== "string" &&
            param.type === "Bit Flags" &&
            Array.isArray(param.flags)
              ? param.flags
              : [];
          return (
            <div
              key={paramKey}
              className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-900/30 p-2"
            >
              <ParamTooltip
                label={<span>{`Parameter ${i}`}</span>}
                tooltip={getParamTooltip(param)}
                codeSample={
                  typeof param === "string" || !param || param.type !== "Integer"
                    ? undefined
                    : {
                        code: param.defaultCitation.code,
                        fileName: param.defaultCitation.fileName,
                        lineNumber: param.defaultCitation.lineNumber,
                        endLineNumber: param.defaultCitation.endLineNumber,
                      }
                }
                citationGame={citationGame ?? undefined}
              />
              <Input
                type="number"
                value={value.toString()}
                onChange={(e) => setValue(parseU8(e.target.value))}
              />
              {flags.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-gray-700 pt-2">
                  {flags.map((flag: FlagDescription) => {
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
                            setSplineData((splineData) => {
                              if (
                                selectedSpline === undefined ||
                                selectedSplineItem === undefined
                              )
                                return;
                              const mask = 1 << flag.index;
                              const splineItems =
                                splineData.SpIt[
                                  SPLINE_KEY_BASE + selectedSpline
                                ]?.obj;
                              const item = splineItems?.[selectedSplineItem];
                              if (!item) return;
                              if (checked) item[paramKey] |= mask;
                              else item[paramKey] &= ~mask;
                            });
                          }}
                        />
                        <span>{flag.description}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <span>Placement (0-1)</span>
        <Input
          type="number"
          value={currentSplineItemData.placement}
          onChange={(e) => {
            setSplineData((splineData) => {
              const placement = clampPlacement(e.target.value);
              updateSplineItemPlacement(
                splineData,
                selectedSpline,
                selectedSplineItem,
                placement,
              );
            });
          }}
        />
      </div>
      <ItemStateFlags
        description={currentSplineItemParams?.flags ?? "Unknown"}
        value={currentSplineItemData.flags}
        onChange={(value) => {
          setSplineData((draft) => {
            const item = draft.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj[
              selectedSplineItem
            ];
            if (item) item.flags = value;
          });
        }}
      />
      <div>
        <SplineItemScriptSection
          selectionLabel={getSplineItemName(globals, currentSplineItemData.type)}
          signature={{
            itemType: currentSplineItemData.type,
            splineNum: selectedSpline,
            placement: currentSplineItemData.placement,
            params: [
              currentSplineItemData.p0,
              currentSplineItemData.p1,
              currentSplineItemData.p2,
              currentSplineItemData.p3,
            ],
          }}
        />
      </div>
      <div>
        <Button
          variant="destructive"
          disabled={selectedSpline === undefined}
          onClick={() => {
            setSplineData((splineData) => {
              deleteSelectedSplineItem(
                splineData,
                selectedSpline,
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
