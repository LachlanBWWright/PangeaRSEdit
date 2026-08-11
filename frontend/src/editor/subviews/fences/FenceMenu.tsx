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
import { PendingCreation } from "@/data/creation/pendingCreationAtom";
import { getFenceName } from "@/data/fences/getFenceNames";
import { getFenceTypes } from "@/data/fences/getFenceTypes";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";
import { useFenceImageSource } from "@/data/fences/useFenceImageSource";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import { SnappingToggle } from "../shared/SnappingToggle";
import {
  canFinalizeCreation,
  finalizeFenceFromPoints,
  popCreationPoint,
} from "@/editor/creation/pendingCreationState";

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
  const [pendingCreation, setPendingCreation] = useAtom(PendingCreation);

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
    const isPendingFenceCreation = pendingCreation?.kind === "fence";
    const pendingPoints = isPendingFenceCreation ? pendingCreation.points : [];

    if (isPendingFenceCreation) {
      return (
        <div className="flex h-full min-h-full w-full flex-col gap-3 p-4">
          <p className="text-sm text-gray-200">
            Click on the canvas to place fence nubs.
          </p>
          <p className="text-sm text-gray-300">
            Points: {pendingPoints.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canFinalizeCreation("fence", pendingPoints, globals)}
              onClick={() => {
                setFenceData((draft) => {
                  const createdFenceIndex = finalizeFenceFromPoints(
                    draft,
                    pendingPoints,
                  );
                  setSelectedFence(createdFenceIndex);
                  setSelectedFenceNub(null);
                });
                setPendingCreation(null);
              }}
            >
              Finalize New Fence
            </Button>
            <Button
              variant="secondary"
              disabled={pendingPoints.length === 0}
              onClick={() => {
                if (!pendingCreation) return;
                setPendingCreation({
                  ...pendingCreation,
                  points: popCreationPoint(pendingCreation.points),
                });
              }}
            >
              Undo Last Point
            </Button>
            <Button
              variant="destructive"
              onClick={() => setPendingCreation(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <EmptyDataPrompt
        title={hasFences ? "No Fence Selected" : "No Fences"}
        description={
          hasFences
            ? "Select a fence on the canvas or add another one."
            : "This level doesn't have any fences yet. Add your first fence to get started."
        }
        buttonText={hasFences ? "Add New Fence" : "Add First Fence"}
        onInitialize={() => setPendingCreation({ kind: "fence", points: [] })}
        fillHeight
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-full">
      <p>
        Fence {selectedFence} ({numNubs} points)
      </p>
      <SnappingToggle />

      {/* Two-column layout: left = type + delete + nub controls; right = preview */}
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
                  <span className="flex items-center gap-2">
                    {fencePreviewPath && (
                      <FenceThumbnail
                        src={fencePreviewPath}
                        alt=""
                        className="h-4 w-6 shrink-0 rounded-sm object-cover"
                      />
                    )}
                    {getFenceName(globals, fenceDataObj.fenceType)}
                  </span>
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

          {/* Nub coordinate editing and add/remove nubs */}
          {selectedFence !== undefined &&
            (() => {
              const nubs =
                fenceData.FnNb[selectedFence + NUB_KEY_BASE]?.obj ?? [];
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
                        <label
                          htmlFor="fenceNubX"
                          className="text-sm font-medium"
                        >
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
                              if (
                                selectedFence === undefined ||
                                selectedFenceNub === null
                              )
                                return;
                              const nubEntry =
                                data.FnNb[selectedFence + NUB_KEY_BASE];
                              const nub = nubEntry?.obj?.[selectedFenceNub];
                              if (nub) nub[0] = newValue;
                            });
                          }}
                          placeholder="X"
                        />
                        <label
                          htmlFor="fenceNubY"
                          className="text-sm font-medium"
                        >
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
                              if (
                                selectedFence === undefined ||
                                selectedFenceNub === null
                              )
                                return;
                              const nubEntry =
                                data.FnNb[selectedFence + NUB_KEY_BASE];
                              const nub = nubEntry?.obj?.[selectedFenceNub];
                              if (nub) nub[1] = newValue;
                            });
                          }}
                          placeholder="Y"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex w-full gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setFenceData((data) => {
                          if (selectedFence === undefined) return;
                          const fence = data.Fenc[1000]?.obj?.[selectedFence];
                          const nubEntry =
                            data.FnNb[selectedFence + NUB_KEY_BASE];
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
                      className="flex-1"
                      variant="destructive"
                      disabled={
                        selectedFenceNub === null || numNubs <= MIN_NUBS
                      }
                      onClick={() => {
                        setFenceData((data) => {
                          if (
                            selectedFence === undefined ||
                            selectedFenceNub === null
                          )
                            return;
                          const fence = data.Fenc[1000]?.obj?.[selectedFence];
                          const nubEntry =
                            data.FnNb[selectedFence + NUB_KEY_BASE];
                          if (!fence || !nubEntry || fence.numNubs <= MIN_NUBS)
                            return;
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

        {/* Right column: fence type preview image */}
        {fencePreviewPath && (
          <div className="flex w-48 self-stretch items-center justify-center rounded border border-gray-600 bg-gray-800 p-2">
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
    </div>
  );
});
