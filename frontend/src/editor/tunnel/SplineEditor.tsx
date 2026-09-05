/**
 * Spline Editor Component
 *
 * Provides UI for editing spline placement of items in tunnel levels.
 * Items in Bugdom 2 tunnels are positioned relative to the spline path
 * using a "distance down spline + rotation" placement method.
 */

import { useState, useMemo, useCallback } from "react";
import type {
  TunnelData,
  TunnelItem,
  TunnelSplinePoint,
} from "@/data/tunnelParser/types";
import {
  getPlumbingItemName,
  getGutterItemName,
} from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  filterTunnelItemsByName,
  getSplineIndexFromProgress,
  getSplineProgress,
  radToDeg,
  updateTunnelItemOffset,
  updateTunnelItemRotation,
} from "@/editor/tunnel/splineEditorState";

interface SplineEditorProps {
  tunnelData: TunnelData;
  isPlumbing: boolean;
  selectedItemIndex: number | null;
  onSelectItem: (index: number | null) => void;
  onUpdateItem: (index: number, item: TunnelItem) => void;
  onUpdateSplinePoint: (index: number, point: TunnelSplinePoint) => void;
}

export function SplineEditor({
  tunnelData,
  isPlumbing,
  selectedItemIndex,
  onSelectItem,
  onUpdateItem,
  onUpdateSplinePoint,
}: SplineEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSplinePointIndex, setSelectedSplinePointIndex] = useState(0);

  const getItemName = isPlumbing ? getPlumbingItemName : getGutterItemName;
  const totalSplinePoints = tunnelData.splinePoints.length;

  // Filter items by search term
  const filteredItems = useMemo(() => {
    return filterTunnelItemsByName(tunnelData.items, searchTerm, getItemName);
  }, [tunnelData.items, searchTerm, getItemName]);

  const selectedItem =
    selectedItemIndex !== null ? tunnelData.items[selectedItemIndex] : null;
  const selectedSplinePoint =
    tunnelData.splinePoints[selectedSplinePointIndex] ?? null;

  const updateSplinePointAxis = useCallback(
    (component: "point" | "up", axis: "x" | "y" | "z", value: number) => {
      if (!selectedSplinePoint || !Number.isFinite(value)) return;
      onUpdateSplinePoint(selectedSplinePointIndex, {
        ...selectedSplinePoint,
        [component]: { ...selectedSplinePoint[component], [axis]: value },
      });
    },
    [onUpdateSplinePoint, selectedSplinePoint, selectedSplinePointIndex],
  );

  const handleSplineProgressChange = useCallback(
    (progress: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      const newSplineIndex = getSplineIndexFromProgress(
        progress,
        totalSplinePoints,
      );
      onUpdateItem(selectedItemIndex, {
        ...selectedItem,
        splineIndex: newSplineIndex,
      });
    },
    [selectedItemIndex, selectedItem, totalSplinePoints, onUpdateItem],
  );

  const handleRotationChange = useCallback(
    (axis: "x" | "y" | "z", degrees: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      onUpdateItem(
        selectedItemIndex,
        updateTunnelItemRotation(selectedItem, axis, degrees),
      );
    },
    [selectedItemIndex, selectedItem, onUpdateItem],
  );

  const handleOffsetChange = useCallback(
    (axis: "x" | "y" | "z", value: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      onUpdateItem(
        selectedItemIndex,
        updateTunnelItemOffset(selectedItem, axis, value),
      );
    },
    [selectedItemIndex, selectedItem, onUpdateItem],
  );

  const currentProgress = selectedItem
    ? getSplineProgress(selectedItem.splineIndex, totalSplinePoints)
    : 0;

  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-lg">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Spline Placement</h2>
        <p className="text-xs text-gray-400 mt-1">
          Position items along the tunnel spline path
        </p>
      </div>

      <div className="mb-4 space-y-2 border-b border-gray-600 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Spline Path Point</h3>
          <p className="mt-1 text-xs text-gray-400">
            Edit the runtime points used by player movement and item placement.
          </p>
        </div>
        <Label className="text-xs text-gray-400">Point index</Label>
        <Input
          type="number"
          min={0}
          max={Math.max(0, totalSplinePoints - 1)}
          value={selectedSplinePointIndex}
          onChange={(event) => {
            const value = Number.parseInt(event.target.value, 10);
            if (
              Number.isInteger(value) &&
              value >= 0 &&
              value < totalSplinePoints
            ) {
              setSelectedSplinePointIndex(value);
            }
          }}
        />
        {selectedSplinePoint && (
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis}>
                <Label className="text-xs text-gray-400">
                  {axis.toUpperCase()}
                </Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedSplinePoint.point[axis]}
                  onChange={(event) =>
                    updateSplinePointAxis("point", axis, Number.parseFloat(event.target.value))
                  }
                />
              </div>
            ))}
          </div>
        )}
        {selectedSplinePoint && (
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis}>
                <Label className="text-xs text-gray-400">
                  Up {axis.toUpperCase()}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={selectedSplinePoint.up[axis]}
                  onChange={(event) =>
                    updateSplinePointAxis("up", axis, Number.parseFloat(event.target.value))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Item list sorted by spline position */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1">
        {filteredItems.map(({ item, index }) => {
          const progress = getSplineProgress(
            item.splineIndex,
            totalSplinePoints,
          );
          return (
            <div
              key={index}
              className={`p-2 rounded cursor-pointer ${
                selectedItemIndex === index
                  ? "bg-blue-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => onSelectItem(index)}
            >
              <div className="text-sm text-white font-medium">
                #{index}: {getItemName(item.type)}
              </div>
              <div className="text-xs text-gray-300 flex justify-between">
                <span>Position: {progress.toFixed(1)}%</span>
                <span>Spline: {item.splineIndex}</span>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-4">
            No items found
          </div>
        )}
      </div>

      {/* Spline placement editor */}
      {selectedItem && selectedItemIndex !== null && (
        <div className="border-t border-gray-600 pt-4 space-y-4">
          <h3 className="text-sm font-bold text-white">
            #{selectedItemIndex}: {getItemName(selectedItem.type)}
          </h3>

          {/* Distance along spline (progress slider) */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-white">Distance Along Spline</Label>
              <span className="text-xs text-gray-400">
                {currentProgress.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[currentProgress]}
              onValueChange={([value]) => {
                if (value !== undefined) {
                  handleSplineProgressChange(value);
                }
              }}
              min={0}
              max={100}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>

          {/* Rotation around spline */}
          <div className="space-y-2">
            <Label className="text-white">Rotation (degrees)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-400">X</Label>
                <Input
                  type="number"
                  value={radToDeg(selectedItem.rot.x).toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleRotationChange("x", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  value={radToDeg(selectedItem.rot.y).toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleRotationChange("y", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Z</Label>
                <Input
                  type="number"
                  value={radToDeg(selectedItem.rot.z).toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleRotationChange("z", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Offset from spline */}
          <div className="space-y-2">
            <Label className="text-white">Offset from Spline</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-400">X</Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedItem.positionOffset.x.toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleOffsetChange("x", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedItem.positionOffset.y.toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleOffsetChange("y", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Z</Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedItem.positionOffset.z.toFixed(1)}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleOffsetChange("z", !isNaN(parsed) ? parsed : 0);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <Label className="text-white">Scale</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedItem.scale}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                // Only update if the input is a valid number, otherwise keep previous value
                if (!isNaN(parsed) && parsed > 0) {
                  onUpdateItem(selectedItemIndex, {
                    ...selectedItem,
                    scale: parsed,
                  });
                }
              }}
            />
          </div>

          {/* Quick preset buttons for common rotations */}
          <div className="space-y-2">
            <Label className="text-white text-xs">Quick Rotation Presets</Label>
            <div className="grid grid-cols-4 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotationChange("y", 0)}
              >
                0°
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotationChange("y", 90)}
              >
                90°
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotationChange("y", 180)}
              >
                180°
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotationChange("y", 270)}
              >
                270°
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
