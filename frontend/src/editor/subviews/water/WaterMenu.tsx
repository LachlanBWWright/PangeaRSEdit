import { Updater } from "use-immer";
import { LiquidData } from "@/python/structSpecs/LevelTypes";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms";
import { PendingCreation } from "@/data/creation/pendingCreationAtom";
import { waterBodyNames } from "../../../data/water/ottoWaterBodyType";
import { getWaterBodyTypeName } from "@/data/water/getWaterBodyTypeName";
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
import { SnappingToggle } from "../shared/SnappingToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
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
import {
  canFinalizeCreation,
  finalizeWaterFromPoints,
  popCreationPoint,
} from "@/editor/creation/pendingCreationState";
import { LiquidPreview, LiquidThumbnail } from "./LiquidThumbnail";
import { Switch } from "@/components/ui/switch";
import {
  FIXED_LIQUID_HEIGHTS,
  supportsFixedHeightLiquid,
  WATER_FLAG_FIXED_HEIGHT,
} from "@/data/water/fixedHeightLiquid";

export const WaterMenu = memo(function WaterMenu({
  liquidData,
  setLiquidData,
}: {
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
  const [pendingCreation, setPendingCreation] = useAtom(PendingCreation);
  const globals = useAtomValue(Globals);

  const waterBodyValues = useMemo(() => getWaterBodyValues(globals), [globals]);
  const supportsFixedHeight = supportsFixedHeightLiquid(globals.GAME_TYPE);

  if (liquidData.Liqd === undefined) return null;

  const waterBodyData = getSelectedWaterBody(liquidData, selectedWaterBody);
  const waterBodyCount = liquidData.Liqd?.[1000]?.obj?.length ?? 0;

  const selectedNubData = getSelectedWaterNub(waterBodyData, selectedWaterNub);

  if (waterBodyData === null || waterBodyData === undefined) {
    const hasWaterBodies = waterBodyCount > 0;
    const isPendingWaterCreation = pendingCreation?.kind === "water";
    const pendingPoints = isPendingWaterCreation ? pendingCreation.points : [];

    if (isPendingWaterCreation) {
      return (
        <div className="flex h-full min-h-full w-full flex-col gap-3 p-4">
          <p className="text-sm text-gray-200">
            Click on the canvas to place water body nubs.
          </p>
          <p className="text-sm text-gray-300">
            Points: {pendingPoints.length}
          </p>
          <p className="text-xs text-gray-400">
            Hotspot is auto-centered from your placed nubs when finalized.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canFinalizeCreation("water", pendingPoints, globals)}
              onClick={() => {
                setLiquidData((draft) => {
                  const createdWaterBody = finalizeWaterFromPoints(
                    draft,
                    pendingPoints,
                    globals,
                  );
                  setSelectedWaterBody(createdWaterBody);
                  setSelectedWaterNub(null);
                });
                setPendingCreation(null);
              }}
            >
              Finalize New Water Body
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
        title={hasWaterBodies ? "No Water Body Selected" : "No Water Bodies"}
        description={
          hasWaterBodies
            ? "Select a water body on the canvas or add another one."
            : "This level doesn't have any water bodies yet. Add your first water body to get started."
        }
        buttonText={
          hasWaterBodies ? "Add New Water Body" : "Add First Water Body"
        }
        onInitialize={() => setPendingCreation({ kind: "water", points: [] })}
        fillHeight
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full min-h-full">
      <p>
        Water Body {waterBodyData.type} ({waterBodyNames[waterBodyData.type]})
      </p>
      <SnappingToggle />

      <div className="grid min-h-0 w-full flex-1 grid-cols-[1fr_auto] gap-2">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
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
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <LiquidThumbnail
                      globals={globals}
                      liquidType={waterBodyData.type}
                    />
                    {getWaterBodyTypeName(globals, waterBodyData.type)}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {waterBodyValues.map((key) => (
                  <SelectItem
                    key={key}
                    className="text-white"
                    value={key.toString()}
                  >
                    <span className="flex items-center gap-2">
                      <LiquidThumbnail globals={globals} liquidType={key} />
                      {getWaterBodyTypeName(globals, key)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            {supportsFixedHeight && selectedWaterBody !== null && (
              <div className="rounded border border-gray-700 p-2">
                <label className="flex items-center justify-between gap-3">
                  <span>Use fixed world height</span>
                  <Switch
                    checked={
                      (waterBodyData.flags & WATER_FLAG_FIXED_HEIGHT) !== 0
                    }
                    onCheckedChange={(checked) => {
                      setLiquidData((draft) => {
                        const body = draft.Liqd[1000].obj[selectedWaterBody];
                        if (!body) return;
                        if (checked) {
                          body.flags |= WATER_FLAG_FIXED_HEIGHT;
                          body.height = 0;
                        } else {
                          body.flags &= ~WATER_FLAG_FIXED_HEIGHT;
                        }
                      });
                    }}
                  />
                </label>
                {(waterBodyData.flags & WATER_FLAG_FIXED_HEIGHT) !== 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Fixed height: {FIXED_LIQUID_HEIGHTS[0]} world units
                  </p>
                )}
              </div>
            )}

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

            <div className="mt-auto flex w-full gap-2">
              <Button
                className="flex-1"
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
                className="flex-1"
                variant="destructive"
                disabled={!canDeleteWaterBodyNub(liquidData, selectedWaterBody)}
                onClick={() => {
                  setLiquidData((draft) => {
                    deleteWaterBodyNub(draft, selectedWaterBody);
                  });
                }}
              >
                Remove Nub
              </Button>
            </div>
          </>
        )}
        </div>

        <div className="flex w-48 self-stretch items-center justify-center rounded border border-gray-600 bg-gray-800 p-2">
          <LiquidPreview
            alt={getWaterBodyTypeName(globals, waterBodyData.type)}
            globals={globals}
            liquidType={waterBodyData.type}
          />
        </div>
      </div>
    </div>
  );
});
