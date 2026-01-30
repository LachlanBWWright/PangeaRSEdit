import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
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
//import { SelectContent, SelectTrigger } from "@radix-ui/react-select";

const NUB_KEY_BASE = 1000;

export function FenceMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);

  const fenceDataObj =
    selectedFence !== undefined
      ? fenceData.Fenc[1000].obj[selectedFence]
      : null;

  const fenceTypesResult = getFenceTypes(globals);
  const fenceValues = fenceTypesResult.ok
    ? fenceTypesResult.value
        .map((key) => parseInt(key))
        .filter((key) => isNaN(key) === false)
    : [];

  return (
    <div className="flex flex-col gap-2">
      {fenceData === null ? (
        <Button
          onClick={() => {
            setData((data) => {
              const keys = Object.keys(data.Fenc[1000].obj);
              const lastStr = keys.length !== 0 ? keys[keys.length - 1] : "999"; //Minimum is 1000
              const last = parseInt(lastStr ?? "999") + 1; //Get key of new last

              //Add Fenc object
              data.Fenc[1000].obj[last] = {
                fenceType: 0,
                numNubs: 2,
                junkNubListPtr: 0,
                bbTop: 0,
                bbBottom: 0,
                bbLeft: 0,
                bbRight: 0,
              };

              data.FnNb[last + NUB_KEY_BASE] = {
                name: "Fence Nub List", //Is this needed?
                obj: [
                  [0, 0],
                  [1000, 1000],
                ],
                order: 999, //Doesn't matter
              };

              //Add fence nubs
              const nubList = fenceData.FnNb[last + NUB_KEY_BASE];
              if (nubList) {
                nubList.obj[0] = [0, 0];
                nubList.obj[1] = [1000, 1000];
              }
            });
          }}
        >
          Add New Fence
        </Button>
      ) : (
        <p>
          Fence {selectedFence} ({fenceDataObj?.numNubs ?? 0} points)
        </p>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-2 w-full">
        <div className="flex flex-col">
          {fenceDataObj !== null && fenceDataObj !== undefined && (
            <>
              <img
                src={
                  /* TODO: Previews for other games */
                  globals.GAME_TYPE === Game.OTTO_MATIC
                    ? `assets/ottoMatic/fences/fence${String(
                        fenceData.fenceType,
                      ).padStart(3, "0")}.png`
                    : ""
                }
                className="max-h-56 mx-auto"
              />
              <Select
                value={getFenceName(globals, fenceData.fenceType)}
                onValueChange={(e) => {
                  const newFenceType = parseInt(e);
                  setData((data) => {
                    if (selectedFence === undefined) return;
                    const fence = fenceData.Fenc[1000].obj[selectedFence];
                    if (fence) fence.fenceType = newFenceType;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {getFenceName(globals, fenceData.fenceType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fenceValues.map((key) => (
                    <SelectItem
                      key={key}
                      className="text-black"
                      value={key.toString()}
                    >
                      {getFenceName(globals, key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {fenceData && (
          <div className="flex flex-col gap-2">
            <Button
              disabled={selectedFence === undefined}
              onClick={() => {
                setData((data) => {
                  if (selectedFence === undefined) return;

                  const fence = fenceData.Fenc[1000].obj[selectedFence];
                  if (!fence) return;
                  fence.numNubs++;

                  const nubList = fenceData.FnNb[selectedFence + NUB_KEY_BASE];
                  if (!nubList?.obj) return;
                  const firstNub = nubList.obj[0];
                  if (!firstNub) return;
                  
                  nubList.obj.unshift([
                    firstNub[0] - 25,
                    firstNub[1] - 25,
                  ]);
                });
              }}
            >
              Add Front Nub
            </Button>
            <Button
              disabled={selectedFence === undefined}
              onClick={() => {
                setData((data) => {
                  if (selectedFence === undefined) return;
                  const nubList = fenceData.FnNb[selectedFence + NUB_KEY_BASE];
                  if (!nubList?.obj) return;
                  const lastIdx = nubList.obj.length - 1;
                  const fence = fenceData.Fenc[1000].obj[selectedFence];
                  if (!fence) return;
                  fence.numNubs++;

                  //Adds new nub close to the last
                  const lastNub = nubList.obj[lastIdx];
                  if (!lastNub) return;
                  nubList.obj.push([
                    lastNub[0] + 25,
                    lastNub[1] + 25,
                  ]);
                });
              }}
            >
              Add Back Nub
            </Button>
            <Button
              variant="destructive"
              disabled={
                selectedFence === undefined ||
                (fenceData.Fenc[1000].obj[selectedFence]?.numNubs ?? 0) <= 1
              }
              onClick={() => {
                setFenceData((fenceData) => {
                  if (selectedFence === undefined) return;
                  const fence = fenceData.Fenc[1000].obj[selectedFence];
                  if (!fence || fence.numNubs <= 1) return;
                  fence.numNubs--;
                  const nubList = fenceData.FnNb[selectedFence + NUB_KEY_BASE];
                  nubList?.obj.shift();
                });
              }}
            >
              Remove Front Nub
            </Button>
            <Button
              variant="destructive"
              disabled={
                selectedFence === undefined ||
                (fenceData.Fenc[1000].obj[selectedFence]?.numNubs ?? 0) <= 1
              }
              onClick={() => {
                setFenceData((fenceData) => {
                  if (selectedFence === undefined) return;
                  const fence = fenceData.Fenc[1000].obj[selectedFence];
                  if (!fence || fence.numNubs <= 1) return;
                  fence.numNubs--;
                  fenceData.FnNb[selectedFence + NUB_KEY_BASE]?.obj.pop();
                });
              }}
            >
              Remove Back Nub
            </Button>
            <Button
              variant="destructive"
              disabled={selectedFence === undefined}
              onClick={() => {
                if (selectedFence === undefined) return;
                setData((data) => {
                  data.Fenc[1000].obj.splice(selectedFence, 1);
                  let lastKey: string | undefined = undefined;
                  for (const nubKey of Object.keys(data.FnNb)) {
                    lastKey = nubKey;
                    if (parseInt(nubKey) > selectedFence + NUB_KEY_BASE) {
                      const currentNub = fenceData.FnNb[parseInt(nubKey)];
                      if (currentNub) {
                        fenceData.FnNb[parseInt(nubKey) - 1] = currentNub;
                      }
                    }
                  }
                  if (lastKey === undefined) {
                    console.error("Missing Final Nubkey");
                    return;
                  }
                  Reflect.deleteProperty(fenceData.FnNb, parseInt(lastKey));
                });
                setSelectedFence(undefined);
              }}
            >
              Delete Fence
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
