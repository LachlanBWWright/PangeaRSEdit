import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms";
import {
  waterBodyNames,
  WaterBodyType,
} from "../../../data/water/ottoWaterBodyType";
import { Globals } from "../../../data/globals/globals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWaterBodyTypes } from "@/data/water/getWaterBodyTypes";
import { Input } from "@/components/ui/input";

export function WaterMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
  const globals = useAtomValue(Globals);

  if (data.Liqd === undefined) return;

  const waterBodyData =
    selectedWaterBody !== null // Ensure selectedWaterBody is not null
      ? data.Liqd[1000].obj[selectedWaterBody]
      : null;

  const selectedNubData =
    waterBodyData &&
    selectedWaterNub !== null &&
    selectedWaterNub < waterBodyData.numNubs
      ? waterBodyData.nubs[selectedWaterNub]
      : null;

  const waterBodyValues = getWaterBodyTypes(globals)
    .map((key) => parseInt(key))
    .filter((key) => isNaN(key) === false);

  return (
    <div className="flex flex-col gap-2 w-full">
      {waterBodyData === null || waterBodyData === undefined ? (
        <Button
          onClick={() =>
            setData((data) => {
              data.Liqd[1000].obj.push({
                type: 0,
                nubs: [
                  [100, 100],
                  [100, 200],
                  [200, 200],
                  [200, 100],
                ],
                numNubs: 4,
                hotSpotX: 150,
                hotSpotZ: 150,
                bBoxTop: 200,
                bBoxLeft: 200,
                bBoxBottom: 200,
                bBoxRight: 200,
                height: 0,
                flags: 0,
                reserved: 0,
              });

              //Push additional water nubs
              for (let i = 4; i < globals.LIQD_NUBS; i++) {
                data.Liqd[1000].obj.at(-1)?.nubs.push([0, 0]);
              }
            })
          }
        >
          Add New Water Body
        </Button>
      ) : (
        <p>
          Item {waterBodyData.type} ({waterBodyNames[waterBodyData.type]})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {waterBodyData !== null && waterBodyData !== undefined && (
          <>
            <Select
              value={waterBodyData.type.toString()}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setData((data) => {
                  if (selectedWaterBody === null) return; // Add null check
                  data.Liqd[1000].obj[selectedWaterBody].type = newItemType;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue>{waterBodyNames[waterBodyData.type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {waterBodyValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-black"
                    value={key.toString()}
                  >
                    {waterBodyNames[key as WaterBodyType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Hotspot Adjustments */}
            {waterBodyData && selectedWaterBody !== null && (
              <>
                <p>Adjust Hotspot Position</p>
                <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2  items-center">
                  <label
                    htmlFor="hotspotX"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    X
                  </label>
                  <Input
                    id="hotspotX"
                    type="number"
                    value={waterBodyData.hotSpotX}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      if (isNaN(newValue)) return;
                      setData((draft) => {
                        if (selectedWaterBody === null) return;
                        draft.Liqd[1000].obj[selectedWaterBody].hotSpotX =
                          newValue;
                      });
                    }}
                    placeholder="X"
                  />
                  <label
                    htmlFor="hotspotZ"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Z
                  </label>
                  <Input
                    id="hotspotZ"
                    type="number"
                    value={waterBodyData.hotSpotZ}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      if (isNaN(newValue)) return;
                      setData((draft) => {
                        if (selectedWaterBody === null) return;
                        draft.Liqd[1000].obj[selectedWaterBody].hotSpotZ =
                          newValue;
                      });
                    }}
                    placeholder="Z"
                  />
                </div>
              </>
            )}
            {selectedNubData &&
              selectedWaterBody !== null &&
              selectedWaterNub !== null && (
                <>
                  <p>Adjust Selected Nub Position ({selectedWaterNub})</p>
                  <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2  items-center">
                    <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      X
                    </p>
                    <Input
                      id="nubX"
                      type="number"
                      value={selectedNubData[0]}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        if (isNaN(newValue)) return;
                        setData((draft) => {
                          if (
                            selectedWaterBody === null ||
                            selectedWaterNub === null
                          )
                            return;
                          draft.Liqd[1000].obj[selectedWaterBody].nubs[
                            selectedWaterNub
                          ][0] = newValue;
                        });
                      }}
                      placeholder="X"
                    />
                    <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Z
                    </p>
                    <Input
                      id="nubZ"
                      type="number"
                      value={selectedNubData[1]}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        if (isNaN(newValue)) return;
                        setData((draft) => {
                          if (
                            selectedWaterBody === null ||
                            selectedWaterNub === null
                          )
                            return;
                          draft.Liqd[1000].obj[selectedWaterBody].nubs[
                            selectedWaterNub
                          ][1] = newValue;
                        });
                      }}
                      placeholder="Y"
                    />
                  </div>
                </>
              )}

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() =>
                  setData((data) => {
                    if (selectedWaterBody === null) return; // Add null check
                    if (
                      data.Liqd[1000].obj[selectedWaterBody].numNubs ===
                      globals.LIQD_NUBS
                    )
                      return;
                    const prevNub =
                      data.Liqd[1000].obj[selectedWaterBody].nubs[
                        data.Liqd[1000].obj[selectedWaterBody].numNubs - 1
                      ];
                    if (!prevNub) return;
                    data.Liqd[1000].obj[selectedWaterBody].nubs[
                      data.Liqd[1000].obj[selectedWaterBody].numNubs
                    ] = [prevNub[0] + 50, prevNub[1] + 50];
                    data.Liqd[1000].obj[selectedWaterBody].numNubs++;
                  })
                }
              >
                Add Nub
              </Button>
              <Button
                variant="destructive"
                disabled={
                  selectedWaterBody === null ||
                  (selectedWaterBody !== null &&
                    data.Liqd[1000].obj[selectedWaterBody].numNubs <= 3)
                }
                onClick={() => {
                  setData((data) => {
                    if (selectedWaterBody === null) return;
                    if (data.Liqd[1000].obj[selectedWaterBody].numNubs <= 3)
                      return;
                    data.Liqd[1000].obj[selectedWaterBody].numNubs--;
                  });
                }}
              >
                Delete Nub
              </Button>
              <Button
                variant="destructive"
                disabled={selectedWaterBody === null}
                onClick={() => {
                  if (selectedWaterBody === null) return;
                  setData((data) => {
                    data.Liqd[1000].obj.splice(selectedWaterBody, 1);
                  });
                  setSelectedWaterBody(null);
                  setSelectedWaterNub(null);
                }}
              >
                Delete Water Body
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
