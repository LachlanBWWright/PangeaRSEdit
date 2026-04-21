import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import {
  SelectedFence,
  SelectedFenceNub,
} from "../../../data/fences/fenceAtoms";
import { memo, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Input } from "@/components/ui/input";
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
import { EmptyDataPrompt } from "../EmptyDataPrompts";

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
  const [selectedFenceNub, setSelectedFenceNub] = useAtom(SelectedFenceNub);

  const fenceValues = useMemo(() => {
    const result = getFenceTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  const fenceDataObj =
    selectedFence !== undefined
      ? fenceData.Fenc?.[1000]?.obj?.[selectedFence]
      : null;
  const fenceCount = fenceData.Fenc?.[1000]?.obj?.length ?? 0;

  const fencePreviewPath =
    fenceDataObj && fenceDataObj !== undefined
      ? getFenceImagePath(globals, fenceDataObj.fenceType)
      : null;
  const fencePreviewImageSrc = useFenceImageSource(fencePreviewPath);
  const numNubs = fenceDataObj?.numNubs ?? 0;

  if (fenceDataObj === null || fenceDataObj === undefined) {
    const hasFences = fenceCount > 0;
    return (
      <EmptyDataPrompt
        title={hasFences ? "No Fence Selected" : "No Fences"}
        description={
          hasFences
            ? "Select a fence on the canvas or add another one."
            : "This level doesn't have any fences yet. Add your first fence to get started."
        }
        buttonText={hasFences ? "Add New Fence" : "Add First Fence"}
        onInitialize={() => {
          setFenceData((data) => {
            const nextFenceIndex = data.Fenc[1000].obj.length;

            data.Fenc[1000].obj.push({
              fenceType: 0,
              numNubs: MIN_NUBS,
              junkNubListPtr: 0,
              bbTop: 0,
              bbBottom: 0,
              bbLeft: 0,
              bbRight: 0,
            });

            data.FnNb[nextFenceIndex + NUB_KEY_BASE] = {
              name: "Fence Nub List",
              obj: [
                [0, 0],
                [1000, 1000],
              ],
              order: 999,
            };

            setSelectedFence(nextFenceIndex);
          });
        }}
        fillHeight
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-full">
      <p>
        Fence {selectedFence} ({numNubs} points)
      </p>

      {/* Two-column layout: left = type + delete; right = preview (when available) */}
      <div
        className={
          fencePreviewPath
            ? "grid grid-cols-[1fr_auto] gap-2 w-full flex-1 min-h-0"
            : "w-full flex-1 min-h-0"
        }
      >
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
                            className="h-4 w-6 object-cover rounded-sm shrink-0"
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
                alt={
                  fenceDataObj
                    ? getFenceName(globals, fenceDataObj.fenceType)
                    : ""
                }
                className="max-h-36 max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Nub coordinate editing (nub selected by clicking in Konva view) */}
      {selectedFence !== undefined && (() => {
        const nubs = fenceData.FnNb[selectedFence + NUB_KEY_BASE]?.obj ?? [];
        const selectedNubCoords =
          selectedFenceNub !== null ? nubs[selectedFenceNub] : null;
        return (
          <>
            {selectedNubCoords && selectedFenceNub !== null && (
              <>
                <p className="text-sm font-medium">
                  Adjust Nub {selectedFenceNub} Position
                </p>
                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
                  <label htmlFor="fenceNubX" className="text-sm font-medium">
                    X
                  </label>
                  <Input
                    id="fenceNubX"
                    type="number"
                    value={selectedNubCoords[0]}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      if (isNaN(newValue)) return;
                      setFenceData((data) => {
                        if (selectedFence === undefined || selectedFenceNub === null) return;
                        const nubEntry = data.FnNb[selectedFence + NUB_KEY_BASE];
                        const nub = nubEntry?.obj?.[selectedFenceNub];
                        if (nub) nub[0] = newValue;
                      });
                    }}
                    placeholder="X"
                  />
                  <label htmlFor="fenceNubY" className="text-sm font-medium">
                    Y
                  </label>
                  <Input
                    id="fenceNubY"
                    type="number"
                    value={selectedNubCoords[1]}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      if (isNaN(newValue)) return;
                      setFenceData((data) => {
                        if (selectedFence === undefined || selectedFenceNub === null) return;
                        const nubEntry = data.FnNb[selectedFence + NUB_KEY_BASE];
                        const nub = nubEntry?.obj?.[selectedFenceNub];
                        if (nub) nub[1] = newValue;
                      });
                    }}
                    placeholder="Y"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setFenceData((data) => {
                    if (selectedFence === undefined) return;
                    const fence = data.Fenc[1000]?.obj?.[selectedFence];
                    const nubEntry = data.FnNb[selectedFence + NUB_KEY_BASE];
                    if (!fence || !nubEntry) return;
                    const lastNub = nubEntry.obj[fence.numNubs - 1];
                    if (!lastNub) return;
                    nubEntry.obj.push([lastNub[0] + 50, lastNub[1] + 50]);
                    fence.numNubs++;
                  });
                }}
              >
                Add Nub
              </Button>
              <Button
                variant="destructive"
                disabled={
                  selectedFenceNub === null || numNubs <= MIN_NUBS
                }
                onClick={() => {
                  setFenceData((data) => {
                    if (selectedFence === undefined || selectedFenceNub === null) return;
                    const fence = data.Fenc[1000]?.obj?.[selectedFence];
                    const nubEntry = data.FnNb[selectedFence + NUB_KEY_BASE];
                    if (!fence || !nubEntry || fence.numNubs <= MIN_NUBS) return;
                    nubEntry.obj.splice(selectedFenceNub, 1);
                    fence.numNubs--;
                  });
                  setSelectedFenceNub(null);
                }}
              >
                Remove Nub
              </Button>
            </div>
          </>
        );
      })()}
    </div>
  );
});
