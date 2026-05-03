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
import { Input } from "@/components/ui/input";
import { memo, useMemo } from "react";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  addDefaultWaterBody,
  addWaterBodyNub,
  canDeleteWaterBodyNub,
  deleteWaterBody,
  deleteWaterBodyNub,
  getSelectedWaterBody,
  getSelectedWaterNub,
  getWaterBodyValues,
  updateWaterBodyHotspot,
  updateWaterBodyNub,
  updateWaterBodyType,
} from "@/editor/subviews/water/waterMenuState";

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

  const waterBodyValues = useMemo(() => getWaterBodyValues(globals), [globals]);

  if (liquidData.Liqd === undefined) return null;

  const waterBodyData = getSelectedWaterBody(liquidData, selectedWaterBody);
  const waterBodyCount = liquidData.Liqd?.[1000]?.obj?.length ?? 0;

  const selectedNubData = getSelectedWaterNub(waterBodyData, selectedWaterNub);

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
        buttonText={
          hasWaterBodies ? "Add New Water Body" : "Add First Water Body"
        }
        onInitialize={() =>
          setLiquidData((draft) => {
            const nextWaterBodyIndex = addDefaultWaterBody(draft, globals);

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
                  updateWaterBodyType(
                    liquidData,
                    selectedWaterBody,
                    newItemType,
                  );
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
                      The liquid&apos;s height is determined by sampling the
                      terrain height at this hotspot position and adding the
                      liquid&apos;s Y offset to it.
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
                        updateWaterBodyHotspot(
                          draft,
                          selectedWaterBody,
                          "x",
                          newValue,
                        );
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
                        updateWaterBodyHotspot(
                          draft,
                          selectedWaterBody,
                          "z",
                          newValue,
                        );
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
                          updateWaterBodyNub(
                            draft,
                            selectedWaterBody,
                            selectedWaterNub,
                            0,
                            newValue,
                          );
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
                          updateWaterBodyNub(
                            draft,
                            selectedWaterBody,
                            selectedWaterNub,
                            1,
                            newValue,
                          );
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
                    addWaterBodyNub(
                      liquidData,
                      selectedWaterBody,
                      globals.LIQD_NUBS,
                    );
                  })
                }
              >
                Add Nub
              </Button>
              <Button
                variant="destructive"
                disabled={!canDeleteWaterBodyNub(liquidData, selectedWaterBody)}
                onClick={() => {
                  setLiquidData((draft) => {
                    deleteWaterBodyNub(draft, selectedWaterBody);
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
                    deleteWaterBody(draft, selectedWaterBody);
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
