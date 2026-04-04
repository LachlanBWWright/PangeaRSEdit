/**
 * Individual Tiles Menu
 *
 * For games that use individual 32x32 tiles (Bugdom 1, Nanosaur 1)
 * Only has topology editing - no tile attribute flags
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CurrentTopologyDualEditMode,
  CurrentTopologyHeightmapDisplayMode,
  CurrentTopologyLayerEditMode,
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushMode,
  TopologyDualEditMode,
  TopologyHeightmapDisplayMode,
  TopologyLayerEditMode,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TopologyValueMode,
  ShowAccessibilityOverlay,
  ShowRoofInTopology,
} from "../../data/tiles/tileAtoms";
import { useAtom, useAtomValue } from "jotai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CanvasView,
  CanvasViewMode,
  Export3DScene,
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
  Show3DItemModels,
} from "@/data/canvasView/canvasViewAtoms";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { Game, Globals } from "@/data/globals/globals";
import {
  getAccessibilityOverlayLabel,
  hasAccessibleOverlayData,
  supportsAccessibilityOverlay,
} from "../utils/terrainAccessibility";

export function IndividualTilesMenu({
  headerData,
  setHeaderData,
  terrainData,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
}) {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);
  const [, setExport3DScene] = useAtom(Export3DScene);
  const [show3DSplines, setShow3DSplines] = useAtom(Show3DSplines);
  const [show3DItems, setShow3DItems] = useAtom(Show3DItems);
  const [show3DFences, setShow3DFences] = useAtom(Show3DFences);
  const [show3DLiquid, setShow3DLiquid] = useAtom(Show3DLiquid);
  const [show3DItemModels, setShow3DItemModels] = useAtom(Show3DItemModels);
  const [layerEditMode, setLayerEditMode] = useAtom(CurrentTopologyLayerEditMode);
  const [dualEditMode, setDualEditMode] = useAtom(CurrentTopologyDualEditMode);
  const [heightmapDisplayMode, setHeightmapDisplayMode] = useAtom(
    CurrentTopologyHeightmapDisplayMode,
  );
  const [showRoof, setShowRoof] = useAtom(ShowRoofInTopology);
  const [showAccessibilityOverlay, setShowAccessibilityOverlay] = useAtom(
    ShowAccessibilityOverlay,
  );
  const globals = useAtomValue(Globals);

  const header = headerData?.Hedr?.[1000]?.obj;
  const minY = header?.minY || 0;
  const maxY = header?.maxY || 0;
  const hasRoofLayer = globals.GAME_TYPE === Game.BUGDOM;
  const canShowAccessibilityOverlay = hasAccessibleOverlayData(
    globals.GAME_TYPE,
    header,
    terrainData.YCrd?.[1000]?.obj,
    terrainData.YCrd?.[1001]?.obj,
  );

  useEffect(() => {
    if (tileView !== TileViews.Topology) {
      // Reset shared TileViewMode to avoid stale state in topology-only editors.
      setTileView(TileViews.Topology);
      return;
    }
    setCanvasViewMode(CanvasView.TWO_D);
  }, [tileView, setCanvasViewMode, setTileView]);

  useEffect(() => {
    if (!hasRoofLayer) {
      setShowRoof(false);
      setLayerEditMode(TopologyLayerEditMode.FLOOR);
    }
  }, [hasRoofLayer, setLayerEditMode, setShowRoof]);

  useEffect(() => {
    if (
      hasRoofLayer &&
      heightmapDisplayMode === TopologyHeightmapDisplayMode.AUTO &&
      layerEditMode === TopologyLayerEditMode.ROOF
    ) {
      setShowRoof(true);
    }
  }, [hasRoofLayer, heightmapDisplayMode, layerEditMode, setShowRoof]);

  useEffect(() => {
    if (!canShowAccessibilityOverlay && showAccessibilityOverlay) {
      setShowAccessibilityOverlay(false);
    }
  }, [
    canShowAccessibilityOverlay,
    setShowAccessibilityOverlay,
    showAccessibilityOverlay,
  ]);

  const handleMinYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setHeaderData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.minY = newValue;
      }
    });
  };

  const handleMaxYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setHeaderData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.maxY = newValue;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-gray-500 p-2 bg-gray-800 rounded">
        <p>This game uses individual 32x32 tiles.</p>
        <p>Tile attributes are edited through the Supertiles menu.</p>
      </div>

      {tileView === TileViews.Topology && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <p>Brush Mode</p>
          <Select
            value={brushMode.toString()}
            onValueChange={(e) => setBrushMode(parseInt(e))}
          >
            <SelectTrigger>
              {brushMode === TopologyBrushMode.CIRCLE_BRUSH
                ? "Circle Brush"
                : "Square Brush"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TopologyBrushMode.CIRCLE_BRUSH.toString()}>
                Circle Brush
              </SelectItem>
              <SelectItem value={TopologyBrushMode.SQUARE_BRUSH.toString()}>
                Square Brush
              </SelectItem>
            </SelectContent>
          </Select>

          <p>Adjustment Mode</p>
          <Select
            value={valueMode.toString()}
            onValueChange={(e) => setValueMode(parseInt(e))}
          >
            <SelectTrigger>
              {valueMode === TopologyValueMode.SET_VALUE && "Set To Value"}
              {valueMode === TopologyValueMode.DELTA_VALUE && "Adjust By Value"}
              {valueMode === TopologyValueMode.DELTA_WITH_DROPOFF &&
                "Adjust By Value (With Dropoff)"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TopologyValueMode.SET_VALUE.toString()}>
                Set To Value
              </SelectItem>
              <SelectItem value={TopologyValueMode.DELTA_VALUE.toString()}>
                Adjust By Value
              </SelectItem>
              <SelectItem
                value={TopologyValueMode.DELTA_WITH_DROPOFF.toString()}
              >
                Adjust By Value (With Dropoff)
              </SelectItem>
            </SelectContent>
          </Select>

          <p>Brush Radius</p>
          <Input
            type="number"
            defaultValue={brushRadius}
            onChange={(e) => setBrushRadius(parseInt(e.target.value) || 0)}
          />
          <p>
            {layerEditMode === TopologyLayerEditMode.BOTH &&
            dualEditMode === TopologyDualEditMode.DIFFERENCE
              ? "Difference Value"
              : layerEditMode === TopologyLayerEditMode.BOTH
              ? "Midpoint Value"
              : "Height Value"}
          </p>
          <Input
            type="number"
            defaultValue={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          />

          {hasRoofLayer && (
            <>
              <p>Edit Target</p>
              <Select
                value={layerEditMode}
                onValueChange={(value) => {
                  if (
                    value === TopologyLayerEditMode.FLOOR ||
                    value === TopologyLayerEditMode.ROOF ||
                    value === TopologyLayerEditMode.BOTH
                  ) {
                    setLayerEditMode(value);
                    if (value === TopologyLayerEditMode.ROOF) {
                      setShowRoof(true);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  {layerEditMode === TopologyLayerEditMode.FLOOR && "Floor Only"}
                  {layerEditMode === TopologyLayerEditMode.ROOF && "Ceiling Only"}
                  {layerEditMode === TopologyLayerEditMode.BOTH &&
                    "Both (Midpoint ± Difference)"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TopologyLayerEditMode.FLOOR}>
                    Floor Only
                  </SelectItem>
                  <SelectItem value={TopologyLayerEditMode.ROOF}>
                    Ceiling Only
                  </SelectItem>
                  <SelectItem value={TopologyLayerEditMode.BOTH}>
                    Both (Midpoint ± Difference)
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {hasRoofLayer && (
            <>
              <p>Heightmap Display</p>
              <Select
                value={heightmapDisplayMode}
                onValueChange={(value) => {
                  if (
                    value === TopologyHeightmapDisplayMode.AUTO ||
                    value === TopologyHeightmapDisplayMode.FLOOR ||
                    value === TopologyHeightmapDisplayMode.ROOF
                  ) {
                    setHeightmapDisplayMode(value);
                  }
                }}
              >
                <SelectTrigger>
                  {heightmapDisplayMode === TopologyHeightmapDisplayMode.AUTO &&
                    "Auto"}
                  {heightmapDisplayMode === TopologyHeightmapDisplayMode.FLOOR &&
                    "Floor"}
                  {heightmapDisplayMode === TopologyHeightmapDisplayMode.ROOF &&
                    "Ceiling"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TopologyHeightmapDisplayMode.AUTO}>
                    Auto
                  </SelectItem>
                  <SelectItem value={TopologyHeightmapDisplayMode.FLOOR}>
                    Floor
                  </SelectItem>
                  <SelectItem value={TopologyHeightmapDisplayMode.ROOF}>
                    Ceiling
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <p>Min Height</p>
          <Input type="number" value={minY} onChange={handleMinYChange} />
          <p>Max Height</p>
          <Input type="number" value={maxY} onChange={handleMaxYChange} />
          <p>Topology View Opacity</p>
          <Input
            type="number"
            defaultValue={toplogyOpacity}
            onChange={(e) =>
              setTopologyOpacity(parseFloat(e.target.value) || 1)
            }
          />
          {supportsAccessibilityOverlay(globals.GAME_TYPE) &&
            canShowAccessibilityOverlay && (
              <div className="flex items-center justify-between col-span-4 rounded border border-gray-700 px-3 py-2">
                <p>{getAccessibilityOverlayLabel()}</p>
                <Switch
                  checked={showAccessibilityOverlay}
                  onCheckedChange={setShowAccessibilityOverlay}
                />
              </div>
            )}
          {hasRoofLayer && (
            <>
              {layerEditMode === TopologyLayerEditMode.BOTH && (
                <>
                  <p>Both-Mode Brush</p>
                  <Select
                    value={dualEditMode}
                    onValueChange={(value) => {
                      if (
                        value === TopologyDualEditMode.MIDPOINT ||
                        value === TopologyDualEditMode.DIFFERENCE
                      ) {
                        setDualEditMode(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      {dualEditMode === TopologyDualEditMode.MIDPOINT &&
                        "Edit Midpoint"}
                      {dualEditMode === TopologyDualEditMode.DIFFERENCE &&
                        "Edit Difference"}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TopologyDualEditMode.MIDPOINT}>
                        Edit Midpoint
                      </SelectItem>
                      <SelectItem value={TopologyDualEditMode.DIFFERENCE}>
                        Edit Difference
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="col-span-2 text-sm text-gray-400">
                    Both mode keeps floor and ceiling paired. Switch the brush
                    between midpoint and clearance editing without leaving the mode.
                  </p>
                </>
              )}
            </>
          )}
          <div className="flex flex-row justify-between gap-2 items-center col-span-2">
            <div className="flex items-center gap-2">
              <p>Show 3D View (Experimental)</p>
              <Switch
                checked={canvasViewMode === CanvasView.THREE_D}
                onCheckedChange={(e) =>
                  setCanvasViewMode(e ? CanvasView.THREE_D : CanvasView.TWO_D)
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setExport3DScene((c) => c + 1)}>
                Download 3D (GLB)
              </Button>
            </div>
          </div>
          {canvasViewMode === CanvasView.THREE_D && (
            <>
              {hasRoofLayer && (
                <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                  <p>Show Ceiling Layer</p>
                  <Switch checked={showRoof} onCheckedChange={setShowRoof} />
                </div>
              )}
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Splines</p>
                <Switch
                  checked={show3DSplines}
                  onCheckedChange={setShow3DSplines}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Items</p>
                <Switch
                  checked={show3DItems}
                  onCheckedChange={setShow3DItems}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Fences</p>
                <Switch
                  checked={show3DFences}
                  onCheckedChange={setShow3DFences}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Liquid</p>
                <Switch
                  checked={show3DLiquid}
                  onCheckedChange={setShow3DLiquid}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show 3D Models</p>
                <Switch
                  checked={show3DItemModels}
                  onCheckedChange={setShow3DItemModels}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
