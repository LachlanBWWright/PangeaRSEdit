import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { memo, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Globals } from "@/data/globals/globals";
import { getFenceName } from "@/data/fences/getFenceNames";
import { getFenceTypes } from "@/data/fences/getFenceTypes";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";
import { useFenceImageSource } from "@/data/fences/useFenceImageSource";

function FenceThumbnail({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const resolvedSrc = useFenceImageSource(src);

  if (!resolvedSrc) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

const NUB_KEY_BASE = 1000;
/** Fences must keep at least this many nubs so they remain valid line segments. */
const MIN_NUBS = 2;

export const FenceMenu = memo(function FenceMenu({
  fenceData,
  setFenceData,
}: {
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);

  const fenceValues = useMemo(() => {
    const result = getFenceTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  const fenceDataObj =
    selectedFence !== undefined
      ? fenceData.Fenc[1000].obj[selectedFence]
      : null;

  const fencePreviewPath =
    fenceDataObj && fenceDataObj !== undefined
      ? getFenceImagePath(globals, fenceDataObj.fenceType)
      : null;
  const fencePreviewImageSrc = useFenceImageSource(fencePreviewPath);
  const numNubs = fenceDataObj?.numNubs ?? 0;

  return (
    <div className="flex flex-col gap-2 min-h-full">
      {fenceDataObj === null ? (
        <Button
          onClick={() => {
            setFenceData((data) => {
              const keys = Object.keys(data.Fenc[1000].obj);
              const lastStr = keys.length !== 0 ? keys[keys.length - 1] : "999";
              const last = parseInt(lastStr ?? "999") + 1;

              data.Fenc[1000].obj.push({
                fenceType: 0,
                numNubs: MIN_NUBS,
                junkNubListPtr: 0,
                bbTop: 0,
                bbBottom: 0,
                bbLeft: 0,
                bbRight: 0,
              });

              data.FnNb[last + NUB_KEY_BASE] = {
                name: "Fence Nub List",
                obj: [
                  [0, 0],
                  [1000, 1000],
                ],
                order: 999,
              };
            });
          }}
        >
          Add New Fence
        </Button>
      ) : (
        <p>
          Fence {selectedFence} ({numNubs} points)
        </p>
      )}

      {/* Two-column layout: left = type + delete; right = preview (when available) */}
      <div className={fencePreviewPath ? "grid grid-cols-[1fr_auto] gap-2 w-full flex-1 min-h-0" : "w-full flex-1 min-h-0"}>
        {/* Left column */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {fenceDataObj !== null && fenceDataObj !== undefined && (
            <Select
              value={fenceDataObj.fenceType.toString()}
              onValueChange={(e) => {
                const newFenceType = parseInt(e);
                setFenceData((data) => {
                  if (selectedFence === undefined) return;
                  const fence = data.Fenc[1000].obj[selectedFence];
                  if (fence) fence.fenceType = newFenceType;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {getFenceName(globals, fenceDataObj.fenceType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fenceValues.map((key) => {
                  const imgPath = getFenceImagePath(globals, key);
                  return (
                    <SelectItem
                      key={key}
                      className="text-white"
                      value={key.toString()}
                    >
                      <span className="flex items-center gap-2">
                        {imgPath && (
                          <FenceThumbnail
                            src={imgPath}
                            alt=""
                            className="h-4 w-6 object-cover rounded-sm flex-shrink-0"
                          />
                        )}
                        {getFenceName(globals, key)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {selectedFence !== undefined && (
            <Button
              variant="destructive"
              onClick={() => {
                setFenceData((data) => {
                  data.Fenc[1000].obj.splice(selectedFence, 1);
                  let lastKey: string | undefined = undefined;
                  for (const nubKey of Object.keys(data.FnNb)) {
                    lastKey = nubKey;
                    if (parseInt(nubKey) > selectedFence + NUB_KEY_BASE) {
                      const currentNub = data.FnNb[parseInt(nubKey)];
                      if (currentNub) {
                        data.FnNb[parseInt(nubKey) - 1] = currentNub;
                      }
                    }
                  }
                  if (lastKey === undefined) {
                    console.error("Missing Final Nubkey");
                    return;
                  }
                  Reflect.deleteProperty(data.FnNb, parseInt(lastKey));
                });
                setSelectedFence(undefined);
              }}
            >
              Delete Fence
            </Button>
          )}
        </div>

        {/* Right column: fence type preview image */}
        {fencePreviewPath && (
          <div className="border border-gray-600 rounded bg-gray-800 p-2 flex items-center justify-center w-40 self-stretch">
            {fencePreviewImageSrc ? (
              <img
                src={fencePreviewImageSrc}
                alt={fenceDataObj ? getFenceName(globals, fenceDataObj.fenceType) : ""}
                className="max-h-36 max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});
