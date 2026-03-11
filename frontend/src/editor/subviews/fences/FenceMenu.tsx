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

  const numNubs = fenceDataObj?.numNubs ?? 0;
  const canRemoveNub = selectedFence !== undefined && numNubs > MIN_NUBS;

  return (
    <div className="flex flex-col gap-2">
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

      {/* Two-column layout: left = type + nub controls + delete; right = preview */}
      <div className="grid grid-cols-[1fr_auto] gap-2 w-full">
        {/* Left column */}
        <div className="flex flex-col gap-2">
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
                          <img
                            src={imgPath}
                            alt=""
                            className="h-4 w-6 object-cover rounded-sm flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
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

          {/* Add/Remove nub buttons condensed into two rows */}
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              disabled={selectedFence === undefined}
              onClick={() => {
                setFenceData((data) => {
                  if (selectedFence === undefined) return;
                  const fence = data.Fenc[1000].obj[selectedFence];
                  if (!fence) return;
                  fence.numNubs++;
                  const nubList = data.FnNb[selectedFence + NUB_KEY_BASE];
                  if (!nubList?.obj) return;
                  const firstNub = nubList.obj[0];
                  if (!firstNub) return;
                  nubList.obj.unshift([firstNub[0] - 25, firstNub[1] - 25]);
                });
              }}
            >
              + Front
            </Button>
            <Button
              size="sm"
              disabled={selectedFence === undefined}
              onClick={() => {
                setFenceData((data) => {
                  if (selectedFence === undefined) return;
                  const nubList = data.FnNb[selectedFence + NUB_KEY_BASE];
                  if (!nubList?.obj) return;
                  const lastIdx = nubList.obj.length - 1;
                  const fence = data.Fenc[1000].obj[selectedFence];
                  if (!fence) return;
                  fence.numNubs++;
                  const lastNub = nubList.obj[lastIdx];
                  if (!lastNub) return;
                  nubList.obj.push([lastNub[0] + 25, lastNub[1] + 25]);
                });
              }}
            >
              + Back
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!canRemoveNub}
              onClick={() => {
                setFenceData((data) => {
                  if (selectedFence === undefined) return;
                  const fence = data.Fenc[1000].obj[selectedFence];
                  if (!fence || fence.numNubs <= MIN_NUBS) return;
                  fence.numNubs--;
                  const nubList = data.FnNb[selectedFence + NUB_KEY_BASE];
                  nubList?.obj.shift();
                });
              }}
            >
              − Front
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!canRemoveNub}
              onClick={() => {
                setFenceData((data) => {
                  if (selectedFence === undefined) return;
                  const fence = data.Fenc[1000].obj[selectedFence];
                  if (!fence || fence.numNubs <= MIN_NUBS) return;
                  fence.numNubs--;
                  data.FnNb[selectedFence + NUB_KEY_BASE]?.obj.pop();
                });
              }}
            >
              − Back
            </Button>
          </div>
          <Button
            variant="destructive"
            disabled={selectedFence === undefined}
            onClick={() => {
              if (selectedFence === undefined) return;
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
        </div>

        {/* Right column: fence type preview image */}
        {fencePreviewPath && (
          <div className="border border-gray-600 rounded bg-gray-800 p-2 flex items-center justify-center w-40 self-start">
            <img
              src={fencePreviewPath}
              alt={fenceDataObj ? getFenceName(globals, fenceDataObj.fenceType) : ""}
              className="max-h-36 max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
