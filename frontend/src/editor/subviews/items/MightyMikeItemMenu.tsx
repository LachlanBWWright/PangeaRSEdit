import { mapErr } from "@/utils/mapErr";
/**
 * MightyMikeItemMenu.tsx
 *
 * Item menu specifically for Mighty Mike levels.
 * Includes a toggle to show/hide item images for ALL items in the canvas.
 */

import { Updater } from "use-immer";
import { ItemData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { ClickToAddItem, SelectedItem } from "../../../data/items/itemAtoms";
import { memo, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectValue,
  SelectContent,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";
import { getItemName } from "@/data/items/getItemNames";
import { Globals } from "@/data/globals/globals";
import { Image as ImageIcon, ImageOff } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { parseU8 } from "@/utils/numberParsers";
import { atom } from "jotai";
import { getMightyMikeItemParams } from "@/data/items/mightyMikeItemParams";
import { ParamTooltip } from "./ParamTooltip";
import { getParamTooltip } from "./getParamTooltip";
import { CurrentScene } from "@/data/game/gameAtoms";
import {
  loadItemImage,
  type ItemFrameImage,
} from "@/utils/mightyMikeShapeImageLoader";
import { ResultAsync } from "neverthrow";
import { TileCanvas } from "../shared/TileCanvas";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import {
  deleteSelectedMightyMikeItem,
  getMightyMikeItemValues,
  getSelectedMightyMikeItem,
  updateSelectedMightyMikeItemParam,
  updateSelectedMightyMikeItemPosition,
  updateSelectedMightyMikeItemType,
} from "@/editor/subviews/items/mightyMikeItemMenuState";
import { MapItemScriptSection } from "@/editor/subviews/scripts/ScriptBindingSection";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { CustomObjectItemPicker } from "./CustomObjectItemPicker";

// Atom to track if item images should be shown globally for all items
export const ShowMightyMikeItemImages = atom(true);

export const MightyMikeItemMenu = memo(function MightyMikeItemMenu({
  itemData,
  setItemData,
}: {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);
  const [showItemImages, setShowItemImages] = useAtom(ShowMightyMikeItemImages);
  const currentScene = useAtomValue(CurrentScene);

  const itemValues = useMemo(() => getMightyMikeItemValues(globals), [globals]);

  const selectedItemData = getSelectedMightyMikeItem(itemData, selectedItem);
  const itemCount = itemData.Itms?.[1000]?.obj?.length ?? 0;

  if (itemData.Itms === undefined) return null;

  return (
    <div className="flex min-h-full flex-col gap-2">
      {selectedItemData === null || selectedItemData === undefined ? (
        <>
          <Toggle
            pressed={showItemImages}
            onClick={() => setShowItemImages(!showItemImages)}
            className="w-full"
          >
            {showItemImages ? (
              <>
                <ImageIcon className="h-4 w-4" />
                Item Images On
              </>
            ) : (
              <>
                <ImageOff className="h-4 w-4" />
                Item Images Off
              </>
            )}
          </Toggle>
          <AddItemMenu hasItems={itemCount > 0} />
          {ENABLE_SCRIPTS && <CustomObjectItemPicker />}
        </>
      ) : (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-gray-400">X</span>
          <Input type="number" className="h-7 text-xs" value={selectedItemData.x} onChange={(e) => {
            const value = parseInt(e.target.value);
            if (Number.isNaN(value)) return;
            setItemData((draft) => updateSelectedMightyMikeItemPosition(draft, selectedItem, "x", value));
          }} />
          <span className="text-gray-400">Z</span>
          <Input type="number" className="h-7 text-xs" value={selectedItemData.z} onChange={(e) => {
            const value = parseInt(e.target.value);
            if (Number.isNaN(value)) return;
            setItemData((draft) => updateSelectedMightyMikeItemPosition(draft, selectedItem, "z", value));
          }} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {selectedItemData !== null && selectedItemData !== undefined && (
          <>
            <Select
              value={selectedItemData.type.toString() ?? ""}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setItemData((itemData) => {
                  updateSelectedMightyMikeItemType(
                    itemData,
                    selectedItem,
                    newItemType,
                  );
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {itemValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-white"
                    value={key.toString()}
                  >
                    <MightyMikeItemSelectLabel
                      itemType={key}
                      scene={currentScene}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              {([0, 1, 2, 3] as const).map((i) => {
                const paramKey = `p${i}` as const;
                const value = selectedItemData[paramKey];
                const itemParams = getMightyMikeItemParams(
                  selectedItemData.type,
                );
                const param = itemParams[paramKey];
                const tooltip = getParamTooltip(param);
                const setValue = (v: number) => {
                  setItemData((itemData) => {
                    updateSelectedMightyMikeItemParam(
                      itemData,
                      selectedItem,
                      paramKey,
                      v,
                    );
                  });
                };
                return (
                  <div
                    key={paramKey}
                    className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-900/30 p-2"
                  >
                  <ParamTooltip
                    label={<span>{`Parameter ${i}`}</span>}
                    tooltip={tooltip}
                    defaultCitation={
                      param && typeof param !== "string"
                        ? param.defaultCitation
                        : undefined
                    }
                    additionalCitations={
                      param && typeof param !== "string"
                        ? param.additionalCitations
                        : undefined
                    }
                  />
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={value.toString()}
                    onChange={(e) => setValue(parseU8(e.target.value))}
                  />
                  </div>
                );
              })}
            </div>

            <MapItemScriptSection
              selectionLabel={getItemName(globals, selectedItemData.type)}
              signature={{
                itemType: selectedItemData.type,
                position: { x: selectedItemData.x, y: selectedItemData.z },
                params: [selectedItemData.p0, selectedItemData.p1, selectedItemData.p2, selectedItemData.p3],
                sceneName: currentScene,
              }}
            />

            <Button
              size="sm"
              variant="destructive"
              disabled={selectedItem === undefined}
              onClick={() => {
                if (selectedItem === undefined) return;
                setItemData((itemData) => {
                  deleteSelectedMightyMikeItem(itemData, selectedItem);
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
});

function AddItemMenu({ hasItems }: { hasItems: boolean }) {
  const [clickToAddItem, setClickToAddItem] = useAtom(ClickToAddItem);
  const globals = useAtomValue(Globals);
  const currentScene = useAtomValue(CurrentScene);

  const itemValues = useMemo(() => {
    return getMightyMikeItemValues(globals);
  }, [globals]);

  if (clickToAddItem !== undefined)
    return (
      <>
        <Select
          value={clickToAddItem.toString()}
          onValueChange={(e) => {
            const newItemType = parseInt(e);
            setClickToAddItem(newItemType);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an item" />
          </SelectTrigger>
          <SelectContent>
            {itemValues.map((key) => (
              <SelectItem
                key={key}
                className="text-white"
                value={key.toString()}
              >
                <MightyMikeItemSelectLabel
                  itemType={key}
                  scene={currentScene}
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm">Click on the Canvas to add the selected item</p>
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
      fillHeight
    />
  );
}

const MightyMikeItemSelectLabel = memo(function MightyMikeItemSelectLabel({
  itemType,
  scene,
}: {
  itemType: number;
  scene: string | null | undefined;
}) {
  const globals = useAtomValue(Globals);
  const [previewImage, setPreviewImage] = useState<ItemFrameImage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreviewImage = async () => {
      const loadResult = await ResultAsync.fromPromise(
        loadItemImage(itemType, scene ?? undefined),
        mapErr,
      );
      if (cancelled) {
        return;
      }
      if (loadResult.isErr()) {
        setPreviewImage(null);
        return;
      }

      const result = loadResult.value;
      if (result.isOk()) {
        setPreviewImage(result.value);
        return;
      }

      setPreviewImage(null);
    };

    void loadPreviewImage();
    return () => {
      cancelled = true;
    };
  }, [itemType, scene]);

  return (
    <div className="flex items-center gap-2">
      {previewImage ? (
        <span className="flex h-6 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border/60 bg-muted">
          <TileCanvas image={previewImage.canvas} size={24} />
        </span>
      ) : null}
      <span>{getItemName(globals, itemType)}</span>
    </div>
  );
});
