import { useCallback, useMemo, useState } from "react";
import type {
  TunnelData,
  TunnelItem,
  TunnelSplinePoint,
} from "@/data/tunnelParser/types";
import { serializeTunnelFile } from "@/data/tunnelParser/serializeTunnelFile";
import { TunnelViewer } from "./TunnelViewer";
import { TunnelItemEditor } from "./TunnelItemEditor";
import { SectionInspector } from "./SectionInspector";
import type { TunnelSectionMesh } from "@/data/tunnelParser/types";
import { SplineEditor } from "./SplineEditor";
import { TunnelTexturesPanel } from "./TunnelTexturesPanel";
import { TunnelCanvasHistoryControls } from "./TunnelCanvasHistoryControls";
import { TunnelViewerOptionsMenu } from "./TunnelViewerOptionsMenu";
import {
  TunnelEditorNavbar,
  type TunnelEditorTab,
} from "./TunnelEditorNavbar";
import { getTunnelValidationIssues } from "./tunnelValidation";
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
  updateTunnelSplinePointAtIndex,
} from "@/editor/tunnel/tunnelEditorState";

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
  const [activeTab, setActiveTab] = useState<TunnelEditorTab>("items");
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
  const [history, setHistory] = useState<{
    past: TunnelData[];
    future: TunnelData[];
  }>({ past: [], future: [] });

  const commitTunnelData = useCallback(
    (nextData: TunnelData) => {
      setHistory((current) => ({
        past: [...current.past, tunnelData].slice(-50),
        future: [],
      }));
      onUpdateTunnelData(nextData);
    },
    [onUpdateTunnelData, tunnelData],
  );

  const handleUndo = useCallback(() => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({
      past: history.past.slice(0, -1),
      future: [tunnelData, ...history.future].slice(0, 50),
    });
    onUpdateTunnelData(previous);
  }, [history, onUpdateTunnelData, tunnelData]);

  const handleRedo = useCallback(() => {
    const next = history.future[0];
    if (!next) return;
    setHistory({
      past: [...history.past, tunnelData].slice(-50),
      future: history.future.slice(1),
    });
    onUpdateTunnelData(next);
  }, [history, onUpdateTunnelData, tunnelData]);

  const validationIssues = useMemo(
    () => getTunnelValidationIssues(tunnelData, isPlumbing ? "plumbing" : "gutter"),
    [isPlumbing, tunnelData],
  );
  const handleUpdateItem = useCallback(
    (index: number, item: TunnelItem) => {
      commitTunnelData(updateTunnelItemAtIndex(tunnelData, index, item));
    },
    [tunnelData, commitTunnelData],
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      commitTunnelData(deleteTunnelItemAtIndex(tunnelData, index));
    },
    [tunnelData, commitTunnelData],
  );

  const handleAddItem = useCallback(
    (item: TunnelItem) => {
      const result = addTunnelItem(tunnelData, item);
      commitTunnelData(result.data);
      setSelectedItemIndex(result.newIndex);
    },
    [tunnelData, commitTunnelData],
  );

  const handleAddSection = useCallback(
    (afterIndex?: number) => {
      const result = addTunnelSection(tunnelData, afterIndex);
      commitTunnelData(result.data);
      setSelectedSection(result.insertedIndex);
      toast.success(`Added section at position ${result.insertedIndex}`);
    },
    [tunnelData, commitTunnelData],
  );

  const handleDeleteSection = useCallback(
    (index: number) => {
      if (!canDeleteTunnelSection(tunnelData)) {
        toast.error("Cannot delete the last section");
        return;
      }
      commitTunnelData(deleteTunnelSection(tunnelData, index));
      setSelectedSection(null);
      toast.success(`Deleted section ${index}`);
    },
    [tunnelData, commitTunnelData],
  );

  const handleDuplicateSection = useCallback(
    (index: number) => {
      const result = duplicateTunnelSection(tunnelData, index);
      if (!result) return;
      commitTunnelData(result.data);
      setSelectedSection(result.duplicatedIndex);
      toast.success(`Duplicated section ${index}`);
    },
    [tunnelData, commitTunnelData],
  );

  const handleSave = useCallback(() => {
    if (validationIssues.length > 0) {
      toast.error("Cannot download tunnel", {
        description: `${validationIssues.length} validation issue${validationIssues.length === 1 ? "" : "s"} must be fixed first.`,
      });
      return;
    }
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
  }, [fileName, tunnelData, validationIssues.length]);

  const handlePreviewInGame = useCallback(() => {
    if (validationIssues.length > 0) {
      toast.error("Cannot preview invalid tunnel", {
        description: "Fix the issues in the Validation tab first.",
      });
      return;
    }
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
  }, [isPlumbing, tunnelData, validationIssues.length]);

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
      commitTunnelData({ ...tunnelData, sections });
    },
    [tunnelData, commitTunnelData],
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

      commitTunnelData({
        ...tunnelData,
        sections,
      });
    },
    [commitTunnelData, tunnelData],
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
      commitTunnelData(
        updateTunnelItemAtIndex(tunnelData, itemIndex, {
          ...item,
          splineIndex,
        }),
      );
    },
    [commitTunnelData, tunnelData],
  );

  const handleUpdateSplinePoint = useCallback(
    (index: number, point: TunnelSplinePoint) => {
      commitTunnelData(updateTunnelSplinePointAtIndex(tunnelData, index, point));
    },
    [commitTunnelData, tunnelData],
  );

  return (
    <div className="flex flex-col h-full">
      <TunnelEditorNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={onClose}
        onPreview={handlePreviewInGame}
        onSave={handleSave}
      />

      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0">
          <div className="absolute left-2 top-2 z-10">
            <TunnelViewerOptionsMenu
              showWater={showWater}
              showSpline={showSpline}
              showItems={showItems}
              ghostTunnel={ghostTunnel}
              ghostOpacity={ghostOpacity}
              autoSnapToSelection={autoSnapToSelection}
              dragSensitivity={dragSensitivity}
              selectedItem={selectedItemIndex}
              onShowWaterChange={setShowWater}
              onShowSplineChange={setShowSpline}
              onShowItemsChange={setShowItems}
              onGhostTunnelChange={setGhostTunnel}
              onGhostOpacityChange={setGhostOpacity}
              onAutoSnapChange={setAutoSnapToSelection}
              onSnapCamera={() => setSnapToItemToken((current) => current + 1)}
              onDragSensitivityChange={setDragSensitivity}
            />
          </div>
          <div className="absolute right-2 top-2 z-10">
            <TunnelCanvasHistoryControls
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>
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
        <div className="w-80 min-w-0 bg-gray-900 border-l border-gray-700 flex flex-col">
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
                onUpdateSplinePoint={handleUpdateSplinePoint}
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

    </div>
  );
}
