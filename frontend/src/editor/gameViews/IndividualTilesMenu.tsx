/**
 * Individual Tiles Menu
 *
 * For games that use individual 32x32 tiles (Bugdom 1, Nanosaur 1)
 * Only has topology editing - no tile attribute flags
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushMode,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TopologyValueMode,
  ShowRoofInTopology,
  TopologyEditTargetAtom,
  TopologyConstraintModeAtom,
  TopologyMaintainSymmetryAtom,
  TopologyEditTarget,
  ConstraintMode,
  RoofFloorElevation,
} from "../../data/tiles/tileAtoms";
import { useAtom } from "jotai";
import { copyFloorToRoof } from "../utils/roofDataUtils";
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
} from "@/data/canvasView/canvasViewAtoms";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

export function IndividualTilesMenu({
  headerData,
  setHeaderData,
  terrainData,
  setTerrainData,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
}) {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);
  const [, setExport3DScene] = useAtom(Export3DScene);

  // Roof editing atoms
  const [showRoof, setShowRoof] = useAtom(ShowRoofInTopology);
  const [editTarget, setEditTarget] = useAtom(TopologyEditTargetAtom);
  const [constraintMode, setConstraintMode] = useAtom(TopologyConstraintModeAtom);
  const [maintainSymmetry, setMaintainSymmetry] = useAtom(TopologyMaintainSymmetryAtom);
  const [centerElevation, setCenterElevation] = useAtom(RoofFloorElevation);

  const hasRoofData = terrainData.YCrd?.[1001] !== undefined;

  const header = headerData?.Hedr?.[1000]?.obj;
  const minY = header?.minY || 0;
  const maxY = header?.maxY || 0;

  useEffect(() => {
    if (tileView !== TileViews.Topology) {
      setCanvasViewMode(CanvasView.TWO_D);
    }
  }, [tileView, setCanvasViewMode]);

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
      <div className="grid grid-cols-1 gap-2">
        <Button
          selected={tileView === TileViews.Topology}
          onClick={() => setTileView(TileViews.Topology)}
        >
          Topology
        </Button>
      </div>

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
          <p>Height Value</p>
          <Input
            type="number"
            defaultValue={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          />

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

          {/* Roof Editing Controls */}
          <div className="col-span-2 mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold mb-3 text-blue-400">Roof Editing (YCrd 1001)</h4>

            {!hasRoofData ? (
               <Button
                 className="w-full"
                 onClick={() => {
                   setTerrainData(current => copyFloorToRoof(current, 100));
                 }}
               >
                 Create Roof Layer
               </Button>
             ) : (
                <div className="flex flex-col gap-3">
                  {/* Visibility Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Roof in 3D View</span>
                    <Switch checked={showRoof} onCheckedChange={setShowRoof} />
                  </div>

                  {/* Edit Target Selection */}
                  <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                    <label className="text-sm">Edit Target</label>
                    <Select value={editTarget} onValueChange={(v) => setEditTarget(v as TopologyEditTarget)}>
                      <SelectTrigger>
                        {editTarget === TopologyEditTarget.FLOOR && "Floor Only"}
                        {editTarget === TopologyEditTarget.ROOF && "Roof Only"}
                        {editTarget === TopologyEditTarget.BOTH && "Both (Symmetric)"}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TopologyEditTarget.FLOOR}>Floor Only</SelectItem>
                        <SelectItem value={TopologyEditTarget.ROOF}>Roof Only</SelectItem>
                        <SelectItem value={TopologyEditTarget.BOTH}>Both (Symmetric)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Symmetric Editing Options */}
                  {editTarget === TopologyEditTarget.BOTH && (
                    <div className="flex flex-col gap-2 p-2 bg-gray-900 rounded">
                      <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                        <label className="text-sm">Center Elevation</label>
                        <Input
                          type="number"
                          value={centerElevation}
                          onChange={(e) => setCenterElevation(Number(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Maintain Current Distances</span>
                        <Switch checked={maintainSymmetry} onCheckedChange={setMaintainSymmetry} />
                      </div>
                    </div>
                  )}

                  {/* Constraint Mode */}
                  {editTarget !== TopologyEditTarget.BOTH && (
                    <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                      <label className="text-sm">When Constraint Violated</label>
                      <Select value={constraintMode} onValueChange={(v) => setConstraintMode(v as ConstraintMode)}>
                        <SelectTrigger className="text-xs">
                          {constraintMode === ConstraintMode.PUSH_ROOF && "Push Roof Up"}
                          {constraintMode === ConstraintMode.PUSH_FLOOR && "Push Floor Down"}
                          {constraintMode === ConstraintMode.BLOCK && "Block Edit"}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ConstraintMode.PUSH_ROOF}>Push Roof Up</SelectItem>
                          <SelectItem value={ConstraintMode.PUSH_FLOOR}>Push Floor Down</SelectItem>
                          <SelectItem value={ConstraintMode.BLOCK}>Block Edit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
             )}
          </div>

          <div className="flex flex-row justify-between gap-2 items-center col-span-2">
            <div className="flex items-center gap-2">
              <p>Show 3D Map (View Only)</p>
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
        </div>
      )}
    </div>
  );
}
