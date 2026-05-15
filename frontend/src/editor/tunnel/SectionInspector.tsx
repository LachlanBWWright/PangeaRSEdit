/**
 * Section Inspector Component
 *
 * Displays information about tunnel geometry sections and allows
 * adding, removing, duplicating, and importing/exporting section meshes.
 */

import { useRef, useState } from "react";
import { ResultAsync, err, ok } from "neverthrow";
import { WebIO, Document } from "@gltf-transform/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UvMapEditor } from "@/components/TextureManager/UvMapEditor";
import { tunnelTextureToDataUrl } from "@/data/tunnelParser/textureUtils";
import type { TunnelData, TunnelSectionMesh } from "@/data/tunnelParser/types";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";
import { mapErr } from "@/utils/mapErr";
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
  onUpdateSectionMeshUv?: (
    sectionIndex: number,
    meshType: "tunnel" | "water",
    uvs: { u: number; v: number }[],
  ) => void;
  onReplaceSectionMesh?: (
    sectionIndex: number,
    meshType: "tunnel" | "water",
    mesh: TunnelSectionMesh,
  ) => void;
}

function meshToUvLayout(
  mesh: TunnelSectionMesh,
  meshType: "tunnel" | "water",
): UvLayout {
  return {
    textureName: meshType === "tunnel" ? "Tunnel Texture" : "Water Texture",
    meshes: [
      {
        meshId: `${meshType}-mesh`,
        meshName: meshType === "tunnel" ? "Tunnel Mesh" : "Water Mesh",
        geometryIndex: 0,
        vertices: mesh.uvs.map(({ u, v }) => ({ u, v })),
        faces: mesh.triangles.map((tri) => ({
          vertexIndices: [tri.a, tri.b, tri.c],
        })),
      },
    ],
  };
}

function exportMeshToGlb(
  mesh: TunnelSectionMesh,
  meshName: string,
): ResultAsync<Blob, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const doc = new Document();
      const buffer = doc.createBuffer("BaseBuffer");
      const gltfMesh = doc.createMesh(meshName);
      const primitive = doc.createPrimitive();

      const positionAccessor = doc
        .createAccessor()
        .setType("VEC3")
        .setArray(
          new Float32Array(
            mesh.points.flatMap((point) => [point.x, point.y, point.z]),
          ),
        )
        .setBuffer(buffer);
      primitive.setAttribute("POSITION", positionAccessor);

      if (mesh.normals && mesh.normals.length === mesh.points.length) {
        const normalAccessor = doc
          .createAccessor()
          .setType("VEC3")
          .setArray(
            new Float32Array(
              mesh.normals.flatMap((normal) => [normal.x, normal.y, normal.z]),
            ),
          )
          .setBuffer(buffer);
        primitive.setAttribute("NORMAL", normalAccessor);
      }

      if (mesh.uvs.length === mesh.points.length) {
        const uvAccessor = doc
          .createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(mesh.uvs.flatMap((uv) => [uv.u, uv.v])))
          .setBuffer(buffer);
        primitive.setAttribute("TEXCOORD_0", uvAccessor);
      }

      if (mesh.triangles.length > 0) {
        const indexAccessor = doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(
            new Uint32Array(
              mesh.triangles.flatMap((triangle) => [
                triangle.a,
                triangle.b,
                triangle.c,
              ]),
            ),
          )
          .setBuffer(buffer);
        primitive.setIndices(indexAccessor);
      }

      gltfMesh.addPrimitive(primitive);
      doc.createScene().addChild(doc.createNode(meshName).setMesh(gltfMesh));

      const io = new WebIO();
      const bytes = await io.writeBinary(doc);
      return new Blob([bytes], { type: "model/gltf-binary" });
    })(),
    mapErr,
  );
}

function importGlbToMesh(file: File): ResultAsync<TunnelSectionMesh, string> {
  return ResultAsync.fromPromise(file.arrayBuffer(), mapErr)
    .andThen((arrayBuffer) =>
      ResultAsync.fromPromise(
        (async () => {
          const io = new WebIO();
          return io.readBinary(new Uint8Array(arrayBuffer));
        })(),
        mapErr,
      ),
    )
    .andThen((doc) => {
      const mesh = doc.getRoot().listMeshes()[0];
      if (!mesh) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(err("No mesh found in the imported GLB.")),
        );
      }

      const primitive = mesh.listPrimitives()[0];
      if (!primitive) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(err("No mesh primitive found in the imported GLB.")),
        );
      }

      const positionAccessor = primitive.getAttribute("POSITION");
      if (!positionAccessor) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(err("Imported mesh is missing POSITION data.")),
        );
      }

      const points = Array.from(
        { length: positionAccessor.getCount() },
        (_, index) => ({
          x: positionAccessor.getX(index),
          y: positionAccessor.getY(index),
          z: positionAccessor.getZ(index),
        }),
      );

      if (points.length < 3) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(
            err("Imported mesh must contain at least 3 vertices."),
          ),
        );
      }

      const normalAccessor = primitive.getAttribute("NORMAL");
      const normals = normalAccessor
        ? Array.from({ length: normalAccessor.getCount() }, (_, index) => ({
            x: normalAccessor.getX(index),
            y: normalAccessor.getY(index),
            z: normalAccessor.getZ(index),
          }))
        : undefined;

      const uvAccessor = primitive.getAttribute("TEXCOORD_0");
      const uvs = uvAccessor
        ? Array.from({ length: uvAccessor.getCount() }, (_, index) => ({
            u: uvAccessor.getX(index),
            v: uvAccessor.getY(index),
          }))
        : Array.from({ length: points.length }, () => ({ u: 0, v: 0 }));

      if (uvs.length !== points.length) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(
            err("Imported mesh UV count must match vertex count."),
          ),
        );
      }

      const indicesAccessor = primitive.getIndices();
      const triangles = indicesAccessor
        ? Array.from(
            { length: Math.floor(indicesAccessor.getCount() / 3) },
            (_, triIndex) => {
              const base = triIndex * 3;
              return {
                a: indicesAccessor.getX(base),
                b: indicesAccessor.getX(base + 1),
                c: indicesAccessor.getX(base + 2),
              };
            },
          )
        : Array.from(
            { length: Math.floor(points.length / 3) },
            (_, triIndex) => {
              const base = triIndex * 3;
              return { a: base, b: base + 1, c: base + 2 };
            },
          );

      if (triangles.length === 0) {
        return ResultAsync.fromSafePromise(
          Promise.resolve(
            err("Imported mesh must contain at least one triangle."),
          ),
        );
      }

      return ResultAsync.fromSafePromise(
        Promise.resolve(
          ok({
            bBox: {
              min: { x: 0, y: 0, z: 0 },
              max: { x: 0, y: 0, z: 0 },
              isEmpty: true,
            },
            numPoints: points.length,
            numTriangles: triangles.length,
            points,
            normals,
            uvs,
            triangles,
          }),
        ),
      );
    })
    .andThen((result) =>
      result.isOk()
        ? ResultAsync.fromSafePromise(Promise.resolve(ok(result.value)))
        : ResultAsync.fromSafePromise(Promise.resolve(err(result.error))),
    );
}

export function SectionInspector({
  tunnelData,
  selectedSection,
  onSelectSection,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
  onUpdateSectionMeshUv,
  onReplaceSectionMesh,
}: SectionInspectorProps) {
  const totalStats = getTotalSectionStats(tunnelData);
  const [uvEditorTarget, setUvEditorTarget] = useState<null | {
    meshType: "tunnel" | "water";
  }>(null);
  const tunnelImportInputRef = useRef<HTMLInputElement | null>(null);
  const waterImportInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSectionData =
    selectedSection !== null ? tunnelData.sections[selectedSection] : null;
  const selectedStats = selectedSectionData
    ? getSectionStats(selectedSectionData)
    : null;

  const handleExportMesh = (
    meshType: "tunnel" | "water",
    mesh: TunnelSectionMesh,
    sectionIndex: number,
  ) => {
    void exportMeshToGlb(
      mesh,
      meshType === "tunnel"
        ? `TunnelSection${String(sectionIndex)}`
        : `WaterSection${String(sectionIndex)}`,
    ).match(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          meshType === "tunnel"
            ? `tunnel-section-${String(sectionIndex)}.glb`
            : `water-section-${String(sectionIndex)}.glb`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(
          meshType === "tunnel"
            ? "Tunnel mesh exported"
            : "Water mesh exported",
        );
      },
      (error) => {
        toast.error("Failed to export mesh", { description: error });
      },
    );
  };

  const handleImportMesh = (
    meshType: "tunnel" | "water",
    file: File,
    sectionIndex: number,
  ) => {
    if (!onReplaceSectionMesh) {
      toast.error("Mesh replacement is unavailable in this view.");
      return;
    }

    void importGlbToMesh(file).match(
      (mesh) => {
        onReplaceSectionMesh(sectionIndex, meshType, mesh);
        toast.success(
          meshType === "tunnel"
            ? "Tunnel mesh imported"
            : "Water mesh imported",
        );
      },
      (error) => {
        toast.error("Failed to import mesh", { description: error });
      },
    );
  };

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

      {selectedStats && selectedSectionData && selectedSection !== null && (
        <div className="border-t border-gray-600 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">
              Section #{selectedSection} Details
            </h3>
          </div>

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
            <div className="bg-gray-700 p-3 rounded flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-white mb-1">
                  Tunnel Mesh
                </div>
                <div className="flex gap-1">
                  {onUpdateSectionMeshUv && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setUvEditorTarget({ meshType: "tunnel" })}
                    >
                      Edit UVs
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      handleExportMesh(
                        "tunnel",
                        selectedSectionData.tunnelMesh,
                        selectedSection,
                      )
                    }
                  >
                    Export Mesh
                  </Button>
                  <input
                    ref={tunnelImportInputRef}
                    type="file"
                    accept=".glb"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      handleImportMesh("tunnel", file, selectedSection);
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => tunnelImportInputRef.current?.click()}
                  >
                    Import Mesh
                  </Button>
                </div>
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

            <div className="bg-gray-700 p-3 rounded flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-white mb-1">
                  Water Mesh
                </div>
                <div className="flex gap-1">
                  {onUpdateSectionMeshUv && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setUvEditorTarget({ meshType: "water" })}
                    >
                      Edit UVs
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      handleExportMesh(
                        "water",
                        selectedSectionData.waterMesh,
                        selectedSection,
                      )
                    }
                  >
                    Export Mesh
                  </Button>
                  <input
                    ref={waterImportInputRef}
                    type="file"
                    accept=".glb"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      handleImportMesh("water", file, selectedSection);
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => waterImportInputRef.current?.click()}
                  >
                    Import Mesh
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>Vertices: {selectedStats.waterVertices}</div>
                <div>Triangles: {selectedStats.waterTriangles}</div>
              </div>
            </div>

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

          {uvEditorTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-bold text-white">
                    Edit{" "}
                    {uvEditorTarget.meshType === "tunnel" ? "Tunnel" : "Water"}{" "}
                    Mesh UVs
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setUvEditorTarget(null)}
                  >
                    Close
                  </Button>
                </div>
                <UvMapEditor
                  textureUrl={tunnelTextureToDataUrl(
                    uvEditorTarget.meshType === "tunnel"
                      ? tunnelData.tunnelTexture
                      : tunnelData.waterTexture,
                  )}
                  textureName={
                    uvEditorTarget.meshType === "tunnel"
                      ? "Tunnel Texture"
                      : "Water Texture"
                  }
                  uvLayout={meshToUvLayout(
                    uvEditorTarget.meshType === "tunnel"
                      ? selectedSectionData.tunnelMesh
                      : selectedSectionData.waterMesh,
                    uvEditorTarget.meshType,
                  )}
                  textureSize={{
                    width:
                      uvEditorTarget.meshType === "tunnel"
                        ? tunnelData.tunnelTexture.width
                        : tunnelData.waterTexture.width,
                    height:
                      uvEditorTarget.meshType === "tunnel"
                        ? tunnelData.tunnelTexture.height
                        : tunnelData.waterTexture.height,
                  }}
                  onApplyEdit={(updatedLayout) => {
                    const mesh = updatedLayout.meshes[0];
                    if (mesh && onUpdateSectionMeshUv) {
                      onUpdateSectionMeshUv(
                        selectedSection,
                        uvEditorTarget.meshType,
                        mesh.vertices.map(({ u, v }) => ({ u, v })),
                      );
                    }
                    setUvEditorTarget(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
