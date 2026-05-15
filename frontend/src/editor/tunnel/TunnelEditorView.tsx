import { useCallback, useMemo, useState } from "react";
import {
  getGutterItemName,
  getPlumbingItemName,
} from "@/data/tunnelParser/types";
import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import { serializeTunnelFile } from "@/data/tunnelParser/serializeTunnelFile";
import { TunnelViewer } from "./TunnelViewer";
import { TunnelItemEditor } from "./TunnelItemEditor";
import { SectionInspector } from "./SectionInspector";
import type { TunnelSectionMesh } from "@/data/tunnelParser/types";
import { SplineEditor } from "./SplineEditor";
import { TunnelTexturesPanel } from "./TunnelTexturesPanel";
import { getTunnelValidationIssues } from "./tunnelValidation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TestGameDialog } from "@/editor/TestGameDialog";
import { Game } from "@/data/globals/globals";
import type { PreviewVfsFile } from "@/editor/utils/gamePreviewRuntime";
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

type EditorTab = "items" | "sections" | "spline" | "textures" | "validation";

function buildMeshBoundingBox(
  mesh: TunnelSectionMesh,
): TunnelSectionMesh["bBox"] {
  const firstPoint = mesh.points[0];
  if (!firstPoint) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      isEmpty: true,
    };
  }

  const min = { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z };
  const max = { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z };

  for (const point of mesh.points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  }

  return { min, max, isEmpty: false };
}

function normalizeSectionMesh(mesh: TunnelSectionMesh): TunnelSectionMesh {
  return {
    ...mesh,
    bBox: buildMeshBoundingBox(mesh),
    numPoints: mesh.points.length,
    numTriangles: mesh.triangles.length,
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
  const [ghostTunnel, setGhostTunnel] = useState(false);
  const [ghostOpacity, setGhostOpacity] = useState(0.45);
  const [autoSnapToSelection, setAutoSnapToSelection] = useState(true);
  const [snapToItemToken, setSnapToItemToken] = useState(0);
  const [dragSensitivity, setDragSensitivity] = useState(2);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [previewLevelNumber, setPreviewLevelNumber] = useState<number>(
    isPlumbing ? 3 : 6,
  );
  const [previewFiles, setPreviewFiles] = useState<
    readonly PreviewVfsFile[] | undefined
  >(undefined);

  const validationIssues = useMemo(
    () => getTunnelValidationIssues(tunnelData),
    [tunnelData],
  );
  const selectedItem =
    selectedItemIndex !== null ? tunnelData.items[selectedItemIndex] : null;
  const getItemName = isPlumbing ? getPlumbingItemName : getGutterItemName;

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

  const handlePreviewInGame = useCallback(() => {
    const serialized = serializeTunnelFile(tunnelData);
    if (serialized.isErr()) {
      toast.error("Failed to prepare tunnel preview", {
        description: serialized.error,
      });
      return;
    }

    const targetPath = isPlumbing
      ? "Data/Tunnels/Plumbing.tun"
      : "Data/Tunnels/Gutter.tun";
    setPreviewFiles([
      {
        path: targetPath,
        data: new Uint8Array(serialized.value),
      },
    ]);
    setPreviewLevelNumber(isPlumbing ? 3 : 6);
    setTestDialogOpen(true);
  }, [isPlumbing, tunnelData]);

  // Update UVs for a section mesh
  const handleUpdateSectionMeshUv = useCallback(
    (
      sectionIndex: number,
      meshType: "tunnel" | "water",
      uvs: { u: number; v: number }[],
    ) => {
      const sections = tunnelData.sections.map((section, idx) => {
        if (idx !== sectionIndex) return section;
        const mesh: TunnelSectionMesh =
          meshType === "tunnel" ? section.tunnelMesh : section.waterMesh;
        if (uvs.length !== mesh.uvs.length) return section; // Defensive: only update if counts match
        const updatedMesh: TunnelSectionMesh = {
          ...mesh,
          uvs: uvs.map(({ u, v }) => ({ u, v })),
        };
        return meshType === "tunnel"
          ? { ...section, tunnelMesh: updatedMesh }
          : { ...section, waterMesh: updatedMesh };
      });
      onUpdateTunnelData({ ...tunnelData, sections });
    },
    [tunnelData, onUpdateTunnelData],
  );

  const handleReplaceSectionMesh = useCallback(
    (
      sectionIndex: number,
      meshType: "tunnel" | "water",
      mesh: TunnelSectionMesh,
    ) => {
      const normalizedMesh = normalizeSectionMesh(mesh);
      const sections = tunnelData.sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }

        if (meshType === "tunnel") {
          return { ...section, tunnelMesh: normalizedMesh };
        }

        return { ...section, waterMesh: normalizedMesh };
      });

      onUpdateTunnelData({
        ...tunnelData,
        sections,
      });
    },
    [onUpdateTunnelData, tunnelData],
  );

  const handleDragItemSplineIndex = useCallback(
    (itemIndex: number, splineIndex: number) => {
      const item = tunnelData.items[itemIndex];
      if (!item) {
        return;
      }
      if (item.splineIndex === splineIndex) {
        return;
      }
      onUpdateTunnelData(
        updateTunnelItemAtIndex(tunnelData, itemIndex, {
          ...item,
          splineIndex,
        }),
      );
    },
    [onUpdateTunnelData, tunnelData],
  );

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
          <div className="flex items-center gap-2">
            <Checkbox
              id="ghostTunnel"
              checked={ghostTunnel}
              onCheckedChange={(checked) => setGhostTunnel(checked === true)}
            />
            <Label htmlFor="ghostTunnel" className="text-white text-sm">
              Ghost Tunnel
            </Label>
          </div>
          {ghostTunnel && (
            <div className="flex items-center gap-2">
              <Label htmlFor="ghostOpacity" className="text-white text-xs">
                Opacity
              </Label>
              <input
                id="ghostOpacity"
                type="range"
                min={0.15}
                max={0.95}
                step={0.05}
                value={ghostOpacity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    setGhostOpacity(next);
                  }
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoSnapToSelection"
              checked={autoSnapToSelection}
              onCheckedChange={(checked) =>
                setAutoSnapToSelection(checked === true)
              }
            />
            <Label htmlFor="autoSnapToSelection" className="text-white text-sm">
              Auto Snap
            </Label>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSnapToItemToken((current) => current + 1)}
            disabled={selectedItemIndex === null}
          >
            Snap Camera
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="dragSensitivity" className="text-white text-xs">
              Drag Speed
            </Label>
            <input
              id="dragSensitivity"
              type="range"
              min={0.3}
              max={5}
              step={0.1}
              value={dragSensitivity}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setDragSensitivity(next);
                }
              }}
            />
          </div>
        </div>
        <Button variant="outline" onClick={handlePreviewInGame}>
          Test in Game
        </Button>
        <Button onClick={handleSave}>Download</Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <TunnelViewer
            tunnelData={tunnelData}
            isPlumbing={isPlumbing}
            selectedSection={selectedSection}
            selectedItemIndex={selectedItemIndex}
            showWater={showWater}
            showSpline={showSpline}
            showItems={showItems}
            tunnelOpacity={ghostTunnel ? ghostOpacity : 1}
            autoSnapToSelectedItem={autoSnapToSelection}
            snapToItemToken={snapToItemToken}
            dragSensitivity={dragSensitivity}
            onSelectItem={setSelectedItemIndex}
            onUpdateItemSplineIndex={handleDragItemSplineIndex}
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
            <button
              className={`flex-1 px-4 py-2 text-sm ${activeTab === "textures" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab("textures")}
            >
              Textures
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm ${activeTab === "validation" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab("validation")}
            >
              Validation
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
                onUpdateSectionMeshUv={handleUpdateSectionMeshUv}
                onReplaceSectionMesh={handleReplaceSectionMesh}
              />
            )}
            {activeTab === "textures" && (
              <TunnelTexturesPanel
                tunnelData={tunnelData}
                onUpdateTunnelData={onUpdateTunnelData}
              />
            )}
            {activeTab === "validation" && (
              <div className="flex flex-col h-full bg-gray-800 p-4 overflow-y-auto">
                <h2 className="text-lg font-bold text-white mb-2">
                  Tunnel Validation
                </h2>
                {validationIssues.length === 0 ? (
                  <div className="text-green-300 text-sm">
                    No structural issues detected.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {validationIssues.map((issue) => (
                      <li
                        key={issue.id}
                        className="text-sm text-amber-200 bg-amber-950/40 border border-amber-800 rounded p-2"
                      >
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <TestGameDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        gameType={Game.BUGDOM_2}
        levelNumber={previewLevelNumber}
        onLevelNumberChange={setPreviewLevelNumber}
        terrainDataBytes={null}
        terrainRsrcBytes={null}
        terrainTextureBytes={null}
        customFiles={previewFiles}
      />

      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
        {selectedItem && selectedItemIndex !== null ? (
          <span className="text-amber-300">
            Selected #{selectedItemIndex}: {getItemName(selectedItem.type)}{" "}
            (Spline {selectedItem.splineIndex})
          </span>
        ) : (
          <span className="text-gray-300">No item selected</span>
        )}
        <span>•</span>
        <span>{tunnelData.header.fullPipe ? "Full Pipe" : "Half Pipe"}</span>
        <span>•</span>
        <span>{tunnelData.header.numSections} Sections</span>
        <span>•</span>
        <span>{tunnelData.items.length} Items</span>
        <span>•</span>
        <span>{tunnelData.splinePoints.length} Spline Points</span>
        <span>•</span>
        <span>
          Tunnel Texture {tunnelData.tunnelTexture.width}x
          {tunnelData.tunnelTexture.height}
        </span>
        <span>•</span>
        <span>
          Water Texture {tunnelData.waterTexture.width}x
          {tunnelData.waterTexture.height}
        </span>
      </div>
    </div>
  );
}
