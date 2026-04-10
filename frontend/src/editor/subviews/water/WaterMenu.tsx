import { Updater } from "use-immer";
import { LiquidData } from "@/python/structSpecs/LevelTypes";
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
import { memo, useMemo } from "react";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export const WaterMenu = memo(function WaterMenu({
  liquidData,
  setLiquidData,
}: {
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
  const globals = useAtomValue(Globals);

  const waterBodyValues = useMemo(() => {
    const result = getWaterBodyTypes(globals);
    return result.isOk()
      ? result.value.map((key) => parseInt(key)).filter((key) => !isNaN(key))
      : [];
  }, [globals]);

  if (liquidData.Liqd === undefined) return null;

  const waterBodyData =
    selectedWaterBody !== null
      ? liquidData.Liqd?.[1000]?.obj?.[selectedWaterBody]
      : null;
  const waterBodyCount = liquidData.Liqd?.[1000]?.obj?.length ?? 0;

  const selectedNubData =
    waterBodyData &&
    selectedWaterNub !== null &&
    selectedWaterNub < waterBodyData.numNubs
      ? waterBodyData.nubs[selectedWaterNub]
      : null;

  if (waterBodyData === null || waterBodyData === undefined) {
    const hasWaterBodies = waterBodyCount > 0;
    return (
      <EmptyDataPrompt
        title={hasWaterBodies ? "No Water Body Selected" : "No Water Bodies"}
        description={
          hasWaterBodies
            ? "Select a water body on the canvas or add another one."
            : "This level doesn't have any water bodies yet. Add your first water body to get started."
        }
        buttonText={hasWaterBodies ? "Add New Water Body" : "Add First Water Body"}
        onInitialize={() =>
          setLiquidData((draft) => {
            const nextWaterBodyIndex = draft.Liqd[1000].obj.length;

            draft.Liqd[1000].obj.push({
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

            for (let i = 4; i < globals.LIQD_NUBS; i++) {
              draft.Liqd[1000].obj.at(-1)?.nubs.push([0, 0]);
            }

            setSelectedWaterBody(nextWaterBodyIndex);
            setSelectedWaterNub(null);
          })
        }
        fillHeight
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full min-h-full">
      <p>
        Water Body {waterBodyData.type} ({waterBodyNames[waterBodyData.type]})
      </p>

      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {waterBodyData !== null && waterBodyData !== undefined && (
          <>
            <Select
              value={waterBodyData.type.toString()}
              onValueChange={(e) => {
                const newItemType = parseInt(e);
                setLiquidData((liquidData) => {
                  if (selectedWaterBody === null) return;
                  const waterObj = liquidData.Liqd[1000]?.obj?.[selectedWaterBody];
                  if (waterObj) {
                    waterObj.type = newItemType;
                  }
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
                    className="text-white"
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
                <div className="flex items-center gap-1">
                  <p>Adjust Hotspot Position</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      The liquid&apos;s height is determined by sampling the terrain height at this
                      hotspot position and adding the liquid&apos;s Y offset to it.
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                      setLiquidData((draft) => {
                        if (selectedWaterBody === null) return;
                        const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
                        if (waterObj) {
                          waterObj.hotSpotX = newValue;
                        }
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
                      setLiquidData((draft) => {
                        if (selectedWaterBody === null) return;
                        const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
                        if (waterObj) {
                          waterObj.hotSpotZ = newValue;
                        }
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
                        setLiquidData((draft) => {
                          if (
                            selectedWaterBody === null ||
                            selectedWaterNub === null
                          )
                            return;
                          const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
                          const nub = waterObj?.nubs?.[selectedWaterNub];
                          if (nub) {
                            nub[0] = newValue;
                          }
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
                        setLiquidData((draft) => {
                          if (
                            selectedWaterBody === null ||
                            selectedWaterNub === null
                          )
                            return;
                          const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
                          const nub = waterObj?.nubs?.[selectedWaterNub];
                          if (nub) {
                            nub[1] = newValue;
                          }
                        });
                      }}
                      placeholder="Y"
                    />
                  </div>
                </>
              )}

            <div className="grid grid-cols-3 gap-2 mt-auto">
              <Button
                onClick={() =>
                  setLiquidData((liquidData) => {
                    if (selectedWaterBody === null) return;
                    const waterObj = liquidData.Liqd[1000]?.obj?.[selectedWaterBody];
                    if (!waterObj) return;
                    if (waterObj.numNubs === globals.LIQD_NUBS) return;
                    const prevNub = waterObj.nubs?.[waterObj.numNubs - 1];
                    if (!prevNub) return;
                    waterObj.nubs[waterObj.numNubs] = [prevNub[0] + 50, prevNub[1] + 50];
                    waterObj.numNubs++;
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
                    (liquidData.Liqd[1000]?.obj?.[selectedWaterBody]?.numNubs ?? 0) <= 3)
                }
                onClick={() => {
                  setLiquidData((draft) => {
                    if (selectedWaterBody === null) return;
                    const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
                    if (!waterObj || waterObj.numNubs <= 3) return;
                    waterObj.numNubs--;
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
                  setLiquidData((draft) => {
                    draft.Liqd[1000].obj.splice(selectedWaterBody, 1);
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
});
