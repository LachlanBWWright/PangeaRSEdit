import { useCallback, useState } from "react";
import type {
  TunnelData,
  TunnelItem,
  TunnelSection,
  TunnelSectionMesh,
  BoundingBox,
} from "@/data/tunnelParser/types";
import { serializeTunnelFile } from "@/data/tunnelParser/serializeTunnelFile";
import { TunnelViewer } from "./TunnelViewer";
import { TunnelItemEditor } from "./TunnelItemEditor";
import { SectionInspector } from "./SectionInspector";
import { SplineEditor } from "./SplineEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type EditorTab = "items" | "sections" | "spline";

function createEmptySectionMesh(): TunnelSectionMesh {
  const emptyBBox: BoundingBox = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
    isEmpty: true,
  };
  return {
    bBox: emptyBBox,
    numPoints: 0,
    numTriangles: 0,
    points: [],
    normals: [],
    uvs: [],
    triangles: [],
  };
}

function createEmptySection(): TunnelSection {
  return {
    tunnelMesh: createEmptySectionMesh(),
    waterMesh: createEmptySectionMesh(),
  };
}

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
      const newItems = [...tunnelData.items];
      newItems[index] = item;
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      const newItems = tunnelData.items.filter((_, i) => i !== index);
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleAddItem = useCallback(
    (item: TunnelItem) => {
      const newItems = [...tunnelData.items, item];
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
      setSelectedItemIndex(newItems.length - 1);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleAddSection = useCallback(
    (afterIndex?: number) => {
      const newSection = createEmptySection();
      const insertIndex =
        afterIndex !== undefined ? afterIndex + 1 : tunnelData.sections.length;
      const newSections = [
        ...tunnelData.sections.slice(0, insertIndex),
        newSection,
        ...tunnelData.sections.slice(insertIndex),
      ];
      onUpdateTunnelData({
        ...tunnelData,
        sections: newSections,
        header: { ...tunnelData.header, numSections: newSections.length },
      });
      setSelectedSection(insertIndex);
      toast.success(`Added section at position ${insertIndex}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDeleteSection = useCallback(
    (index: number) => {
      if (tunnelData.sections.length <= 1) {
        toast.error("Cannot delete the last section");
        return;
      }
      const newSections = tunnelData.sections.filter((_, i) => i !== index);
      const newItems = tunnelData.items.map((item) => {
        if (item.sectionNum > index)
          return { ...item, sectionNum: item.sectionNum - 1 };
        if (item.sectionNum === index)
          return { ...item, sectionNum: Math.max(0, index - 1) };
        return item;
      });
      onUpdateTunnelData({
        ...tunnelData,
        sections: newSections,
        items: newItems,
        header: { ...tunnelData.header, numSections: newSections.length },
      });
      setSelectedSection(null);
      toast.success(`Deleted section ${index}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleDuplicateSection = useCallback(
    (index: number) => {
      const sectionToDuplicate = tunnelData.sections[index];
      if (!sectionToDuplicate) return;
      const clonedSection: TunnelSection = structuredClone(sectionToDuplicate);
      const newSections = [
        ...tunnelData.sections.slice(0, index + 1),
        clonedSection,
        ...tunnelData.sections.slice(index + 1),
      ];
      const newItems = tunnelData.items.map((item) =>
        item.sectionNum > index
          ? { ...item, sectionNum: item.sectionNum + 1 }
          : item,
      );
      onUpdateTunnelData({
        ...tunnelData,
        sections: newSections,
        items: newItems,
        header: { ...tunnelData.header, numSections: newSections.length },
      });
      setSelectedSection(index + 1);
      toast.success(`Duplicated section ${index}`);
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleSave = useCallback(() => {
    const result = serializeTunnelFile(tunnelData);
    if (result.isErr()) {
      toast.error("Failed to save", { description: result.error.message });
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
