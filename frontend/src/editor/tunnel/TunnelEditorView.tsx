import { useCallback, useState } from "react";
import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import { serializeTunnelFile } from "@/data/tunnelParser/serializeTunnelFile";
import { TunnelViewer } from "./TunnelViewer";
import { TunnelItemEditor } from "./TunnelItemEditor";
import { SectionInspector } from "./SectionInspector";
import { SplineEditor } from "./SplineEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  addTunnelItem,
  addTunnelSection,
  canDeleteTunnelSection,
  deleteTunnelItemAtIndex,
  deleteTunnelSection,
  duplicateTunnelSection,
  updateTunnelItemAtIndex,
} from "@/editor/tunnel/tunnelEditorState";

type EditorTab = "items" | "sections" | "spline";

export interface TunnelEditorViewProps {
  tunnelData: TunnelData;
  fileName: string;
  isPlumbing: boolean;
  onUpdateTunnelData: (data: TunnelData) => void;
  onClose: () => void;
}

export function TunnelEditorView({
  tunnelData,
  fileName,
  isPlumbing,
  onUpdateTunnelData,
  onClose,
}: TunnelEditorViewProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("items");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null,
  );
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [showWater, setShowWater] = useState(true);
  const [showSpline, setShowSpline] = useState(true);
  const [showItems, setShowItems] = useState(true);

  const handleUpdateItem = useCallback(
    (index: number, item: TunnelItem) => {
      onUpdateTunnelData(updateTunnelItemAtIndex(tunnelData, index, item));
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      onUpdateTunnelData(deleteTunnelItemAtIndex(tunnelData, index));
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleAddItem = useCallback(
    (item: TunnelItem) => {
      const result = addTunnelItem(tunnelData, item);
      onUpdateTunnelData(result.data);
      setSelectedItemIndex(result.newIndex);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleAddSection = useCallback(
    (afterIndex?: number) => {
      const result = addTunnelSection(tunnelData, afterIndex);
      onUpdateTunnelData(result.data);
      setSelectedSection(result.insertedIndex);
      toast.success(`Added section at position ${result.insertedIndex}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDeleteSection = useCallback(
    (index: number) => {
      if (!canDeleteTunnelSection(tunnelData)) {
        toast.error("Cannot delete the last section");
        return;
      }
      onUpdateTunnelData(deleteTunnelSection(tunnelData, index));
      setSelectedSection(null);
      toast.success(`Deleted section ${index}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDuplicateSection = useCallback(
    (index: number) => {
      const result = duplicateTunnelSection(tunnelData, index);
      if (!result) return;
      onUpdateTunnelData(result.data);
      setSelectedSection(result.duplicatedIndex);
      toast.success(`Duplicated section ${index}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleSave = useCallback(() => {
    const result = serializeTunnelFile(tunnelData);
    if (result.isErr()) {
      toast.error("Failed to save", { description: result.error });
      return;
    }
    const blob = new Blob([result.value], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Tunnel file saved!");
  }, [tunnelData, fileName]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <Button variant="outline" onClick={onClose}>
          ← Back
        </Button>
        <div className="flex-1 text-white font-medium">{fileName}</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="showWater"
              checked={showWater}
              onCheckedChange={(checked) => setShowWater(checked === true)}
            />
            <Label htmlFor="showWater" className="text-white text-sm">
              Water
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showSpline"
              checked={showSpline}
              onCheckedChange={(checked) => setShowSpline(checked === true)}
            />
            <Label htmlFor="showSpline" className="text-white text-sm">
              Spline
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showItems"
              checked={showItems}
              onCheckedChange={(checked) => setShowItems(checked === true)}
            />
            <Label htmlFor="showItems" className="text-white text-sm">
              Items
            </Label>
          </div>
        </div>
        <Button onClick={handleSave}>Download</Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <TunnelViewer
            tunnelData={tunnelData}
            selectedSection={selectedSection}
            showWater={showWater}
            showSpline={showSpline}
            showItems={showItems}
          />
        </div>
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          <div className="flex border-b border-gray-700">
            <button
              className={`flex-1 px-4 py-2 text-sm ${activeTab === "items" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab("items")}
            >
              Items
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm ${activeTab === "spline" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab("spline")}
            >
              Spline
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm ${activeTab === "sections" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab("sections")}
            >
              Sections
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "items" && (
              <TunnelItemEditor
                tunnelData={tunnelData}
                isPlumbing={isPlumbing}
                selectedItemIndex={selectedItemIndex}
                onSelectItem={setSelectedItemIndex}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
              />
            )}
            {activeTab === "spline" && (
              <SplineEditor
                tunnelData={tunnelData}
                isPlumbing={isPlumbing}
                selectedItemIndex={selectedItemIndex}
                onSelectItem={setSelectedItemIndex}
                onUpdateItem={handleUpdateItem}
              />
            )}
            {activeTab === "sections" && (
              <SectionInspector
                tunnelData={tunnelData}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
                onAddSection={handleAddSection}
                onDeleteSection={handleDeleteSection}
                onDuplicateSection={handleDuplicateSection}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
        <span>{tunnelData.header.fullPipe ? "Full Pipe" : "Half Pipe"}</span>
        <span>•</span>
        <span>{tunnelData.header.numSections} Sections</span>
        <span>•</span>
        <span>{tunnelData.items.length} Items</span>
        <span>•</span>
        <span>{tunnelData.splinePoints.length} Spline Points</span>
      </div>
    </div>
  );
}
