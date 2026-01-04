/**
 * Tunnel Item Editor Component
 *
 * Provides UI for editing items in tunnel levels.
 */

import { useState } from "react";
import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import {
  getPlumbingItemName,
  getGutterItemName,
  PlumbingItemType,
  GutterItemType,
} from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TunnelItemEditorProps {
  tunnelData: TunnelData;
  isPlumbing: boolean;
  selectedItemIndex: number | null;
  onSelectItem: (index: number | null) => void;
  onUpdateItem: (index: number, item: TunnelItem) => void;
  onDeleteItem: (index: number) => void;
  onAddItem: (item: TunnelItem) => void;
}

/**
 * Get item type options based on level type
 */
function getItemTypeOptions(isPlumbing: boolean): { value: string; label: string }[] {
  if (isPlumbing) {
    return [
      { value: String(PlumbingItemType.NAIL), label: "Nail" },
      { value: String(PlumbingItemType.BLOB), label: "Blob" },
      { value: String(PlumbingItemType.HEALTH_POW), label: "Health POW" },
      { value: String(PlumbingItemType.RING), label: "Ring" },
      { value: String(PlumbingItemType.SPRAY), label: "Spray" },
    ];
  }
  return [
    { value: String(GutterItemType.PINE_CONE), label: "Pine Cone" },
    { value: String(GutterItemType.LEAF), label: "Leaf" },
    { value: String(GutterItemType.SPRAY), label: "Spray" },
  ];
}

/**
 * Create a default item
 */
function createDefaultItem(isPlumbing: boolean): TunnelItem {
  return {
    type: isPlumbing ? PlumbingItemType.RING : GutterItemType.LEAF,
    splineIndex: 0,
    sectionNum: 0,
    scale: 1.0,
    rot: { x: 0, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0, z: 0 },
    flags: 0,
    parms: [0, 0, 0],
  };
}

export function TunnelItemEditor({
  tunnelData,
  isPlumbing,
  selectedItemIndex,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: TunnelItemEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getItemName = isPlumbing ? getPlumbingItemName : getGutterItemName;
  const itemTypeOptions = getItemTypeOptions(isPlumbing);

  // Filter items by search term
  const filteredItems = tunnelData.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      getItemName(item.type).toLowerCase().includes(searchTerm.toLowerCase())
    );

  const selectedItem =
    selectedItemIndex !== null ? tunnelData.items[selectedItemIndex] : null;

  const handleUpdateField = <K extends keyof TunnelItem>(
    field: K,
    value: TunnelItem[K]
  ) => {
    if (selectedItemIndex === null || !selectedItem) return;
    onUpdateItem(selectedItemIndex, { ...selectedItem, [field]: value });
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">Items</h2>
        <Button
          size="sm"
          onClick={() => onAddItem(createDefaultItem(isPlumbing))}
        >
          + Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1">
        {filteredItems.map(({ item, index }) => (
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
            <div className="text-xs text-gray-300">
              Spline: {item.splineIndex} | Section: {item.sectionNum}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-4">
            No items found
          </div>
        )}
      </div>

      {/* Item details panel */}
      {selectedItem && selectedItemIndex !== null && (
        <div className="border-t border-gray-600 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Item Details</h3>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onDeleteItem(selectedItemIndex);
                onSelectItem(null);
              }}
            >
              Delete
            </Button>
          </div>

          {/* Type selector */}
          <div>
            <Label className="text-white">Type</Label>
            <Select
              value={String(selectedItem.type)}
              onValueChange={(value) =>
                handleUpdateField("type", parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spline Index */}
          <div>
            <Label className="text-white">Spline Index</Label>
            <Input
              type="number"
              value={selectedItem.splineIndex}
              onChange={(e) =>
                handleUpdateField("splineIndex", parseInt(e.target.value) || 0)
              }
              min={0}
              max={tunnelData.splinePoints.length - 1}
            />
          </div>

          {/* Section Number */}
          <div>
            <Label className="text-white">Section Number</Label>
            <Input
              type="number"
              value={selectedItem.sectionNum}
              onChange={(e) =>
                handleUpdateField("sectionNum", parseInt(e.target.value) || 0)
              }
              min={0}
              max={tunnelData.sections.length - 1}
            />
          </div>

          {/* Scale */}
          <div>
            <Label className="text-white">Scale</Label>
            <Input
              type="number"
              step="0.1"
              value={selectedItem.scale}
              onChange={(e) =>
                handleUpdateField("scale", parseFloat(e.target.value) || 1)
              }
            />
          </div>

          {/* Position Offset */}
          <div>
            <Label className="text-white">Position Offset</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="X"
                value={selectedItem.positionOffset.x}
                onChange={(e) =>
                  handleUpdateField("positionOffset", {
                    ...selectedItem.positionOffset,
                    x: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Y"
                value={selectedItem.positionOffset.y}
                onChange={(e) =>
                  handleUpdateField("positionOffset", {
                    ...selectedItem.positionOffset,
                    y: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Z"
                value={selectedItem.positionOffset.z}
                onChange={(e) =>
                  handleUpdateField("positionOffset", {
                    ...selectedItem.positionOffset,
                    z: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-white">Rotation (radians)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="X"
                value={selectedItem.rot.x}
                onChange={(e) =>
                  handleUpdateField("rot", {
                    ...selectedItem.rot,
                    x: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Y"
                value={selectedItem.rot.y}
                onChange={(e) =>
                  handleUpdateField("rot", {
                    ...selectedItem.rot,
                    y: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Z"
                value={selectedItem.rot.z}
                onChange={(e) =>
                  handleUpdateField("rot", {
                    ...selectedItem.rot,
                    z: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
