/**
 * Spline Editor Component
 *
 * Provides UI for editing spline placement of items in tunnel levels.
 * Items in Bugdom 2 tunnels are positioned relative to the spline path
 * using a "distance down spline + rotation" placement method.
 */

import { useState, useMemo, useCallback } from "react";
import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import {
  getPlumbingItemName,
  getGutterItemName,
} from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SplineEditorProps {
  tunnelData: TunnelData;
  isPlumbing: boolean;
  selectedItemIndex: number | null;
  onSelectItem: (index: number | null) => void;
  onUpdateItem: (index: number, item: TunnelItem) => void;
}

/**
 * Calculate the spline progress (0-100%) from spline index
 */
function getSplineProgress(splineIndex: number, totalSplinePoints: number): number {
  if (totalSplinePoints <= 1) return 0;
  return (splineIndex / (totalSplinePoints - 1)) * 100;
}

/**
 * Calculate spline index from progress percentage
 */
function getSplineIndexFromProgress(progress: number, totalSplinePoints: number): number {
  if (totalSplinePoints <= 1) return 0;
  return Math.round((progress / 100) * (totalSplinePoints - 1));
}

/**
 * Calculate rotation angle in degrees from radians
 */
function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function SplineEditor({
  tunnelData,
  isPlumbing,
  selectedItemIndex,
  onSelectItem,
  onUpdateItem,
}: SplineEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getItemName = isPlumbing ? getPlumbingItemName : getGutterItemName;
  const totalSplinePoints = tunnelData.splinePoints.length;

  // Filter items by search term
  const filteredItems = useMemo(() => {
    return tunnelData.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        getItemName(item.type).toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.item.splineIndex - b.item.splineIndex);
  }, [tunnelData.items, searchTerm, getItemName]);

  const selectedItem =
    selectedItemIndex !== null ? tunnelData.items[selectedItemIndex] : null;

  const handleSplineProgressChange = useCallback(
    (progress: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      const newSplineIndex = getSplineIndexFromProgress(progress, totalSplinePoints);
      onUpdateItem(selectedItemIndex, {
        ...selectedItem,
        splineIndex: newSplineIndex,
      });
    },
    [selectedItemIndex, selectedItem, totalSplinePoints, onUpdateItem]
  );

  const handleRotationChange = useCallback(
    (axis: "x" | "y" | "z", degrees: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      onUpdateItem(selectedItemIndex, {
        ...selectedItem,
        rot: {
          ...selectedItem.rot,
          [axis]: degToRad(degrees),
        },
      });
    },
    [selectedItemIndex, selectedItem, onUpdateItem]
  );

  const handleOffsetChange = useCallback(
    (axis: "x" | "y" | "z", value: number) => {
      if (selectedItemIndex === null || !selectedItem) return;
      onUpdateItem(selectedItemIndex, {
        ...selectedItem,
        positionOffset: {
          ...selectedItem.positionOffset,
          [axis]: value,
        },
      });
    },
    [selectedItemIndex, selectedItem, onUpdateItem]
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
          const progress = getSplineProgress(item.splineIndex, totalSplinePoints);
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
                  onChange={(e) =>
                    handleRotationChange("x", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  value={radToDeg(selectedItem.rot.y).toFixed(1)}
                  onChange={(e) =>
                    handleRotationChange("y", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Z</Label>
                <Input
                  type="number"
                  value={radToDeg(selectedItem.rot.z).toFixed(1)}
                  onChange={(e) =>
                    handleRotationChange("z", parseFloat(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    handleOffsetChange("x", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedItem.positionOffset.y.toFixed(1)}
                  onChange={(e) =>
                    handleOffsetChange("y", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Z</Label>
                <Input
                  type="number"
                  step="1"
                  value={selectedItem.positionOffset.z.toFixed(1)}
                  onChange={(e) =>
                    handleOffsetChange("z", parseFloat(e.target.value) || 0)
                  }
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
