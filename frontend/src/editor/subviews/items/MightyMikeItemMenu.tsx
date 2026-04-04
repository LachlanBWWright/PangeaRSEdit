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
import { getItemTypes } from "@/data/items/getItemTypes";
import { Image as ImageIcon, ImageOff } from "lucide-react";
import { parseU8 } from "@/utils/numberParsers";
import { atom } from "jotai";
import { getMightyMikeItemParams } from "@/data/items/mightyMikeItemParams";
import { ParamTooltip } from "./ParamTooltip";
import { getParamTooltip } from "./getParamTooltip";
import { CurrentScene, MIGHTY_MIKE_SCENES } from "@/data/game/gameAtoms";
import { loadItemImage, type ItemFrameImage } from "@/utils/mightyMikeShapeImageLoader";
import { isOk } from "@/types/result";
import { TileCanvas } from "../shared/TileCanvas";

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
  const [currentScene, setCurrentScene] = useAtom(CurrentScene);
  const [previewImage, setPreviewImage] = useState<ItemFrameImage | null>(null);

  const itemValues = useMemo(() => {
    const result = getItemTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  const selectedItemData =
    itemData.Itms !== undefined && selectedItem !== undefined
      ? itemData.Itms[1000].obj[selectedItem]
      : null;

  useEffect(() => {
    if (!selectedItemData) {
      Promise.resolve().then(() => setPreviewImage(null));
      return;
    }

    let cancelled = false;
    loadItemImage(selectedItemData.type, currentScene)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (isOk(result)) {
          setPreviewImage(result.value);
        } else {
          setPreviewImage(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewImage(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentScene, selectedItemData]);

  if (itemData.Itms === undefined) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Global Toggle for Item Images */}
      <Button
        size="sm"
        variant={showItemImages ? "default" : "outline"}
        onClick={() => setShowItemImages(!showItemImages)}
        className="gap-2 w-full"
      >
        {showItemImages ? (
          <>
            <ImageIcon className="w-4 h-4" />
            Hide Item Images
          </>
        ) : (
          <>
            <ImageOff className="w-4 h-4" />
            Show Item Images
          </>
        )}
      </Button>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <label className="text-sm font-medium">Scene</label>
        <Select
          value={currentScene ?? ""}
          onValueChange={(value) => setCurrentScene(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select scene" />
          </SelectTrigger>
          <SelectContent>
            {MIGHTY_MIKE_SCENES.map((scene) => (
              <SelectItem key={scene} value={scene}>
                {scene}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open("#/sprite-viewer", "_blank", "noopener,noreferrer")}
        >
          Sprite Viewer
        </Button>
      </div>

      {selectedItemData === null || selectedItemData === undefined ? (
        <AddItemMenu />
      ) : (
        <div className="flex items-center gap-3">
          {previewImage && <TileCanvas image={previewImage.canvas} size={48} />}
          <p className="text-xs text-gray-400">
            Item {selectedItemData.type} ({selectedItemData.x},{" "}
            {selectedItemData.z})
          </p>
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
                  if (selectedItem === undefined) return;
                  const item = itemData.Itms[1000]?.obj?.[selectedItem];
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

            <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-baseline">
              {/* X/Z position (editable for precision placement; drag in canvas for quick placement) */}
              <label className="text-sm font-medium">X</label>
              <Input
                type="number"
                value={selectedItemData.x.toString()}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) {
                    setItemData((itemData) => {
                      if (selectedItem === undefined) return;
                      const item = itemData.Itms[1000]?.obj?.[selectedItem];
                      if (item) item.x = v;
                    });
                  }
                }}
              />
              {/* 'Z' is the vertical screen coordinate in MM (stored as TerrainItem.z) */}
              <label className="text-sm font-medium">Z</label>
              <Input
                type="number"
                value={selectedItemData.z.toString()}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) {
                    setItemData((itemData) => {
                      if (selectedItem === undefined) return;
                      const item = itemData.Itms[1000]?.obj?.[selectedItem];
                      if (item) item.z = v;
                    });
                  }
                }}
              />

              {([0, 1, 2, 3] as const).map((i) => {
                const paramKey = `p${i}` as const;
                const value = selectedItemData[paramKey];
                const itemParams = getMightyMikeItemParams(selectedItemData.type);
                const param = itemParams[paramKey];
                const tooltip = getParamTooltip(param);
                const label =
                  param && typeof param !== "string" && param.type === "Integer"
                    ? param.description.split(" (")[0]
                    : `Parameter ${i}`;
                const setValue = (v: number) => {
                  setItemData((itemData) => {
                    if (selectedItem === undefined) return;
                    const item = itemData.Itms[1000]?.obj?.[selectedItem];
                    if (item) {
                      item[paramKey] = v;
                    }
                  });
                };
                return [
                  <ParamTooltip
                    key={`label-${i}`}
                    label={label}
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
                  />,
                  <Input
                    key={`input-${i}`}
                    type="number"
                    value={value.toString()}
                    onChange={(e) => setValue(parseU8(e.target.value))}
                  />,
                ];
              })}
            </div>

            <Button
              variant="destructive"
              disabled={selectedItem === undefined}
              onClick={() => {
                if (selectedItem === undefined) return;
                setItemData((itemData) => {
                  itemData.Itms[1000].obj.splice(selectedItem, 1);
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

function AddItemMenu() {
  const [clickToAddItem, setClickToAddItem] = useAtom(ClickToAddItem);
  const globals = useAtomValue(Globals);

  const itemValues = useMemo(() => {
    const result = getItemTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
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

        <p className="text-sm">Click on the Canvas to add the selected item</p>
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
