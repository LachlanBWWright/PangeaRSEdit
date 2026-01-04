/**
 * Section Inspector Component
 *
 * Displays information about tunnel geometry sections.
 */

import type { TunnelData, TunnelSection } from "@/data/tunnelParser/types";

interface SectionInspectorProps {
  tunnelData: TunnelData;
  selectedSection: number | null;
  onSelectSection: (index: number | null) => void;
}

/**
 * Calculate statistics for a section
 */
function getSectionStats(section: TunnelSection) {
  const tunnelVertices = section.tunnelMesh.numPoints;
  const tunnelTriangles = section.tunnelMesh.numTriangles;
  const waterVertices = section.waterMesh.numPoints;
  const waterTriangles = section.waterMesh.numTriangles;

  const tBBox = section.tunnelMesh.bBox;
  const tunnelWidth = tBBox.max.x - tBBox.min.x;
  const tunnelHeight = tBBox.max.y - tBBox.min.y;
  const tunnelDepth = tBBox.max.z - tBBox.min.z;

  return {
    tunnelVertices,
    tunnelTriangles,
    waterVertices,
    waterTriangles,
    totalVertices: tunnelVertices + waterVertices,
    totalTriangles: tunnelTriangles + waterTriangles,
    dimensions: {
      width: tunnelWidth.toFixed(1),
      height: tunnelHeight.toFixed(1),
      depth: tunnelDepth.toFixed(1),
    },
  };
}

export function SectionInspector({
  tunnelData,
  selectedSection,
  onSelectSection,
}: SectionInspectorProps) {
  // Calculate total statistics
  const totalStats = tunnelData.sections.reduce(
    (acc, section) => {
      const stats = getSectionStats(section);
      return {
        vertices: acc.vertices + stats.totalVertices,
        triangles: acc.triangles + stats.totalTriangles,
      };
    },
    { vertices: 0, triangles: 0 }
  );

  const selectedSectionData =
    selectedSection !== null ? tunnelData.sections[selectedSection] : null;
  const selectedStats = selectedSectionData
    ? getSectionStats(selectedSectionData)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-800 p-4 rounded-lg">
      <h2 className="text-lg font-bold text-white mb-4">Geometry Sections</h2>

      {/* Summary */}
      <div className="bg-gray-700 p-3 rounded mb-4">
        <div className="text-sm text-gray-300">
          <div>
            Total Sections: <span className="text-white">{tunnelData.sections.length}</span>
          </div>
          <div>
            Total Vertices: <span className="text-white">{totalStats.vertices.toLocaleString()}</span>
          </div>
          <div>
            Total Triangles: <span className="text-white">{totalStats.triangles.toLocaleString()}</span>
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
                onSelectSection(selectedSection === index ? null : index)
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
          <h3 className="text-sm font-bold text-white mb-3">
            Section #{selectedSection} Details
          </h3>

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
                <div>
                  Width: {selectedStats.dimensions.width}
                </div>
                <div>
                  Height: {selectedStats.dimensions.height}
                </div>
                <div>
                  Depth: {selectedStats.dimensions.depth}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
