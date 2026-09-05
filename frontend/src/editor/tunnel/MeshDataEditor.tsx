import { useState } from "react";
import type {
  TunnelSectionMesh,
  Point3D,
  Vector3D,
} from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MeshDataEditorProps {
  mesh: TunnelSectionMesh;
  meshType: "tunnel" | "water";
  onChange: (mesh: TunnelSectionMesh) => void;
}

function numberValue(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function updatePoint(
  mesh: TunnelSectionMesh,
  index: number,
  component: "points" | "normals",
  axis: "x" | "y" | "z",
  value: number,
): TunnelSectionMesh {
  const values = mesh[component];
  if (!values || !values[index]) return mesh;
  const nextValues = values.map((point, pointIndex) =>
    pointIndex === index ? { ...point, [axis]: value } : point,
  );
  return { ...mesh, [component]: nextValues };
}

function updateUv(
  mesh: TunnelSectionMesh,
  index: number,
  axis: "u" | "v",
  value: number,
): TunnelSectionMesh {
  const nextUvs = mesh.uvs.map((uv, uvIndex) =>
    uvIndex === index ? { ...uv, [axis]: value } : uv,
  );
  return { ...mesh, uvs: nextUvs };
}

function updateTriangle(
  mesh: TunnelSectionMesh,
  index: number,
  axis: "a" | "b" | "c",
  value: number,
): TunnelSectionMesh {
  const nextTriangles = mesh.triangles.map((triangle, triangleIndex) =>
    triangleIndex === index ? { ...triangle, [axis]: value } : triangle,
  );
  return { ...mesh, triangles: nextTriangles };
}

function VectorFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Point3D | Vector3D;
  onChange: (axis: "x" | "y" | "z", value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <div className="grid grid-cols-3 gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <Input
            key={axis}
            aria-label={`${label} ${axis}`}
            type="number"
            step="0.01"
            value={value[axis]}
            onChange={(event) => {
              const next = numberValue(event.target.value);
              if (next !== null) onChange(axis, next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MeshDataEditor({ mesh, meshType, onChange }: MeshDataEditorProps) {
  const [vertexIndex, setVertexIndex] = useState(0);
  const [triangleIndex, setTriangleIndex] = useState(0);
  const point = mesh.points[vertexIndex];
  const normal = mesh.normals?.[vertexIndex];
  const uv = mesh.uvs[vertexIndex];
  const triangle = mesh.triangles[triangleIndex];

  return (
    <div className="space-y-3 rounded border border-gray-600 bg-gray-900 p-3">
      <div className="text-sm font-medium text-white">
        Edit {meshType} mesh data
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-300">Vertex index</Label>
        <Input
          type="number"
          min={0}
          max={Math.max(0, mesh.points.length - 1)}
          value={vertexIndex}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isInteger(next) && next >= 0 && next < mesh.points.length) {
              setVertexIndex(next);
            }
          }}
        />
      </div>
      {point && (
        <VectorFields
          label="Position"
          value={point}
          onChange={(axis, value) => onChange(updatePoint(mesh, vertexIndex, "points", axis, value))}
        />
      )}
      {normal && (
        <VectorFields
          label="Normal"
          value={normal}
          onChange={(axis, value) => onChange(updatePoint(mesh, vertexIndex, "normals", axis, value))}
        />
      )}
      {uv && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-300">UV</Label>
          <div className="grid grid-cols-2 gap-1">
            {(["u", "v"] as const).map((axis) => (
              <Input
                key={axis}
                aria-label={`UV ${axis}`}
                type="number"
                step="0.01"
                value={uv[axis]}
                onChange={(event) => {
                  const next = numberValue(event.target.value);
                  if (next !== null) onChange(updateUv(mesh, vertexIndex, axis, next));
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2 border-t border-gray-700 pt-2">
        <Label className="text-xs text-gray-300">Triangle index</Label>
        <Input
          type="number"
          min={0}
          max={Math.max(0, mesh.triangles.length - 1)}
          value={triangleIndex}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isInteger(next) && next >= 0 && next < mesh.triangles.length) {
              setTriangleIndex(next);
            }
          }}
        />
        {triangle && (
          <div className="grid grid-cols-3 gap-1">
            {(["a", "b", "c"] as const).map((axis) => (
              <Input
                key={axis}
                aria-label={`Triangle ${axis}`}
                type="number"
                min={0}
                max={Math.max(0, mesh.points.length - 1)}
                value={triangle[axis]}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isInteger(next) && next >= 0 && next < mesh.points.length) {
                    onChange(updateTriangle(mesh, triangleIndex, axis, next));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => onChange(mesh)}>
        Keep changes
      </Button>
    </div>
  );
}
