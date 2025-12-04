import { Updater } from "use-immer";
import { FenceData } from "../../../python/structSpecs/ottoMaticLevelData";
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
import { Game, Globals } from "@/data/globals/globals";
import { getFenceName } from "@/data/fences/getFenceNames";
import { getFenceTypes } from "@/data/fences/getFenceTypes";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";
//import { SelectContent, SelectTrigger } from "@radix-ui/react-select";

const NUB_KEY_BASE = 1000;

export function FenceMenu({
  fenceData,
  setFenceData,
}: {
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
}) {
  const globals = useAtomValue(Globals);
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);

  if (globals.GAME_TYPE === Game.NANOSAUR) return <></>; //No fences in this level

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
      {fenceDataObj === null ? (
        <Button
          onClick={() => {
            setFenceData((fenceData) => {
              const keys = Object.keys(fenceData.Fenc[1000].obj);
              const lastStr = keys.length !== 0 ? keys[keys.length - 1] : "999"; //Minimum is 1000
              const last = parseInt(lastStr ?? "999") + 1; //Get key of new last

              //Add Fenc object
              fenceData.Fenc[1000].obj[last] = {
                fenceType: 0,
                numNubs: 2,
                junkNubListPtr: 0,
                bbTop: 0,
                bbBottom: 0,
                bbLeft: 0,
                bbRight: 0,
              };

              fenceData.FnNb[last + NUB_KEY_BASE] = {
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
                src={getFenceImagePath(globals, fenceDataObj.fenceType)}
                className="max-h-56 mx-auto"
                alt={`Fence ${fenceDataObj.fenceType}`}
              />
              <Select
                value={getFenceName(globals, fenceDataObj.fenceType)}
                onValueChange={(e) => {
                  const newFenceType = parseInt(e);
                  setFenceData((fenceData) => {
                    if (selectedFence === undefined) return;
                    const fence = fenceData.Fenc[1000].obj[selectedFence];
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
        {fenceDataObj && (
          <div className="flex flex-col gap-2">
            <Button
              disabled={selectedFence === undefined}
              onClick={() => {
                setFenceData((fenceData) => {
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
                setFenceData((fenceData) => {
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
                setFenceData((fenceData) => {
                  fenceData.Fenc[1000].obj.splice(selectedFence, 1);
                  let lastKey: string | undefined = undefined;
                  for (const nubKey of Object.keys(fenceData.FnNb)) {
                    lastKey = nubKey;
                    if (parseInt(nubKey) > selectedFence + NUB_KEY_BASE) {
                      fenceData.FnNb[parseInt(nubKey) - 1] =
                        fenceData.FnNb[parseInt(nubKey)];
                    }
                  }
                  if (lastKey === undefined) {
                    console.error("Missing Final Nubkey");
                    return;
                  }
                  delete fenceData.FnNb[parseInt(lastKey)];
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
