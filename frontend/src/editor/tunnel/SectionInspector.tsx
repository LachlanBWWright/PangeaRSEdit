/**
 * Section Inspector Component
 *
 * Displays information about tunnel geometry sections and allows
 * adding, removing, and duplicating sections.
 */

import type { TunnelData } from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import {
  getSectionStats,
  getTotalSectionStats,
  toggleSelectedSection,
} from "@/editor/tunnel/sectionInspectorState";

interface SectionInspectorProps {
  tunnelData: TunnelData;
  selectedSection: number | null;
  onSelectSection: (index: number | null) => void;
  onAddSection?: (afterIndex?: number) => void;
  onDeleteSection?: (index: number) => void;
  onDuplicateSection?: (index: number) => void;
}

export function SectionInspector({
  tunnelData,
  selectedSection,
  onSelectSection,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
}: SectionInspectorProps) {
  const totalStats = getTotalSectionStats(tunnelData);

  const selectedSectionData =
    selectedSection !== null ? tunnelData.sections[selectedSection] : null;
  const selectedStats = selectedSectionData
    ? getSectionStats(selectedSectionData)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">Geometry Sections</h2>
        {onAddSection && (
          <Button size="sm" onClick={() => onAddSection()}>
            + Add Section
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-700 p-3 rounded mb-4">
        <div className="text-sm text-gray-300">
          <div>
            Total Sections:{" "}
            <span className="text-white">{tunnelData.sections.length}</span>
          </div>
          <div>
            Total Vertices:{" "}
            <span className="text-white">
              {totalStats.vertices.toLocaleString()}
            </span>
          </div>
          <div>
            Total Triangles:{" "}
            <span className="text-white">
              {totalStats.triangles.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-4">
        {tunnelData.sections.map((section, index) => {
          const stats = getSectionStats(section);
          return (
            <div
              key={index}
              className={`p-2 rounded cursor-pointer ${
                selectedSection === index
                  ? "bg-blue-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() =>
                onSelectSection(toggleSelectedSection(selectedSection, index))
              }
            >
              <div className="text-sm text-white font-medium">
                Section #{index}
              </div>
              <div className="text-xs text-gray-300">
                {stats.totalVertices} verts | {stats.totalTriangles} tris
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected section details */}
      {selectedStats && selectedSectionData && selectedSection !== null && (
        <div className="border-t border-gray-600 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">
              Section #{selectedSection} Details
            </h3>
          </div>

          {/* Section actions */}
          {(onAddSection || onDeleteSection || onDuplicateSection) && (
            <div className="flex gap-2 mb-3">
              {onDuplicateSection && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDuplicateSection(selectedSection)}
                >
                  Duplicate
                </Button>
              )}
              {onAddSection && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddSection(selectedSection)}
                >
                  Insert After
                </Button>
              )}
              {onDeleteSection && tunnelData.sections.length > 1 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteSection(selectedSection)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {/* Tunnel mesh */}
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm font-medium text-white mb-1">
                Tunnel Mesh
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Vertices: {selectedStats.tunnelVertices}</div>
                <div>Triangles: {selectedStats.tunnelTriangles}</div>
                <div>
                  Has Normals:{" "}
                  {selectedSectionData.tunnelMesh.normals ? "Yes" : "No"}
                </div>
              </div>
            </div>

            {/* Water mesh */}
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm font-medium text-white mb-1">
                Water Mesh
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Vertices: {selectedStats.waterVertices}</div>
                <div>Triangles: {selectedStats.waterTriangles}</div>
              </div>
            </div>

            {/* Bounding box */}
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm font-medium text-white mb-1">
                Bounding Box
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Width: {selectedStats.dimensions.width}</div>
                <div>Height: {selectedStats.dimensions.height}</div>
                <div>Depth: {selectedStats.dimensions.depth}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
