import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FlipHorizontal, FlipVertical, Maximize2, Move, RotateCw, Scale } from "lucide-react";
import type { UvLayout, UvTransformMode } from "@/modelEditing/uv/uvTypes";
import { defaultUvTransformState } from "@/modelEditing/uv/uvTypes";
import { applyUvTransform, fitUvToImage, snapUvToPixelGrid } from "@/modelEditing/uv/uvTransforms";

interface UvMapEditorProps {
  textureUrl: string;
  textureName: string;
  uvLayout: UvLayout | null;
  textureSize?: { width: number; height: number };
  onApplyEdit?: (updatedLayout: UvLayout) => void;
}

/** Build SVG path data for a single mesh's UV faces */
function buildUvPaths(
  uvLayout: UvLayout,
  displayWidth: number,
  displayHeight: number,
): string {
  const paths: string[] = [];

  for (const mesh of uvLayout.meshes) {
    for (const face of mesh.faces) {
      const [i0, i1, i2] = face.vertexIndices;
      const v0 = mesh.vertices[i0];
      const v1 = mesh.vertices[i1];
      const v2 = mesh.vertices[i2];
      if (!v0 || !v1 || !v2) continue;

      const x0 = v0.u * displayWidth;
      const y0 = v0.v * displayHeight;
      const x1 = v1.u * displayWidth;
      const y1 = v1.v * displayHeight;
      const x2 = v2.u * displayWidth;
      const y2 = v2.v * displayHeight;

      paths.push(`M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} Z`);
    }
  }

  return paths.join(" ");
}

export function UvMapEditor({
  textureUrl,
  textureName,
  uvLayout,
  textureSize,
  onApplyEdit,
}: UvMapEditorProps) {
  const [transform, setTransform] = useState(defaultUvTransformState);
  const [activeMode, setActiveMode] = useState<UvTransformMode>("none");

  const previewLayout = uvLayout
    ? applyUvTransform({
        layout: uvLayout,
        offsetU: transform.offsetU,
        offsetV: transform.offsetV,
        rotationDeg: transform.rotation,
        scaleU: transform.scaleU,
        scaleV: transform.scaleV,
        flipU: transform.flipU,
        flipV: transform.flipV,
      })
    : null;

  const handleApply = useCallback(() => {
    if (!previewLayout || !onApplyEdit) return;
    onApplyEdit(previewLayout);
    setTransform(defaultUvTransformState());
    setActiveMode("none");
  }, [previewLayout, onApplyEdit]);

  const handleReset = useCallback(() => {
    setTransform(defaultUvTransformState());
    setActiveMode("none");
  }, []);

  const handleFitToImage = useCallback(() => {
    if (!uvLayout || !onApplyEdit) return;
    onApplyEdit(fitUvToImage(uvLayout));
    setTransform(defaultUvTransformState());
  }, [uvLayout, onApplyEdit]);

  const handleSnapToPixelGrid = useCallback(() => {
    if (!uvLayout || !onApplyEdit || !textureSize) return;
    onApplyEdit(snapUvToPixelGrid(uvLayout, textureSize.width, textureSize.height));
    setTransform(defaultUvTransformState());
  }, [uvLayout, onApplyEdit, textureSize]);

  const handleFlipU = useCallback(() => {
    if (!uvLayout || !onApplyEdit) return;
    onApplyEdit(
      applyUvTransform({
        layout: uvLayout,
        offsetU: 0,
        offsetV: 0,
        rotationDeg: 0,
        scaleU: 1,
        scaleV: 1,
        flipU: true,
        flipV: false,
      }),
    );
  }, [uvLayout, onApplyEdit]);

  const handleFlipV = useCallback(() => {
    if (!uvLayout || !onApplyEdit) return;
    onApplyEdit(
      applyUvTransform({
        layout: uvLayout,
        offsetU: 0,
        offsetV: 0,
        rotationDeg: 0,
        scaleU: 1,
        scaleV: 1,
        flipU: false,
        flipV: true,
      }),
    );
  }, [uvLayout, onApplyEdit]);

  const displayWidth = 400;
  const displayHeight = 400;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={activeMode === "move" ? "default" : "outline"}
          className="justify-start gap-1"
          onClick={() => setActiveMode(activeMode === "move" ? "none" : "move")}
        >
          <Move className="w-3 h-3" /> Move
        </Button>
        <Button
          size="sm"
          variant={activeMode === "rotate" ? "default" : "outline"}
          className="justify-start gap-1"
          onClick={() => setActiveMode(activeMode === "rotate" ? "none" : "rotate")}
        >
          <RotateCw className="w-3 h-3" /> Rotate
        </Button>
        <Button
          size="sm"
          variant={activeMode === "scale" ? "default" : "outline"}
          className="justify-start gap-1"
          onClick={() => setActiveMode(activeMode === "scale" ? "none" : "scale")}
        >
          <Scale className="w-3 h-3" /> Scale
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={handleFlipU}
          disabled={!uvLayout || !onApplyEdit}
          title="Flip U (horizontal)"
        >
          <FlipHorizontal className="w-3 h-3" /> Flip U
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={handleFlipV}
          disabled={!uvLayout || !onApplyEdit}
          title="Flip V (vertical)"
        >
          <FlipVertical className="w-3 h-3" /> Flip V
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={handleFitToImage}
          disabled={!uvLayout || !onApplyEdit}
        >
          <Maximize2 className="w-3 h-3" /> Fit to Image
        </Button>
        {textureSize && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={handleSnapToPixelGrid}
            disabled={!uvLayout || !onApplyEdit}
          >
            Snap to Grid
          </Button>
        )}
      </div>

      {/* Transform Controls */}
      {activeMode === "move" && (
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Offset U: {transform.offsetU.toFixed(3)}</Label>
            <Slider
              min={-1}
              max={1}
              step={0.001}
              value={[transform.offsetU]}
              onValueChange={([value]) => setTransform((t) => ({ ...t, offsetU: value ?? 0 }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Offset V: {transform.offsetV.toFixed(3)}</Label>
            <Slider
              min={-1}
              max={1}
              step={0.001}
              value={[transform.offsetV]}
              onValueChange={([value]) => setTransform((t) => ({ ...t, offsetV: value ?? 0 }))}
            />
          </div>
        </div>
      )}

      {activeMode === "rotate" && (
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Rotation: {transform.rotation.toFixed(1)}°</Label>
            <Slider
              min={-180}
              max={180}
              step={0.5}
              value={[transform.rotation]}
              onValueChange={([value]) => setTransform((t) => ({ ...t, rotation: value ?? 0 }))}
            />
          </div>
        </div>
      )}

      {activeMode === "scale" && (
        <div className="rounded border border-gray-700 bg-gray-900/60 p-3 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Scale U: {transform.scaleU.toFixed(2)}×</Label>
            <Slider
              min={0.1}
              max={4}
              step={0.01}
              value={[transform.scaleU]}
              onValueChange={([value]) => setTransform((t) => ({ ...t, scaleU: value ?? 1 }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Scale V: {transform.scaleV.toFixed(2)}×</Label>
            <Slider
              min={0.1}
              max={4}
              step={0.01}
              value={[transform.scaleV]}
              onValueChange={([value]) => setTransform((t) => ({ ...t, scaleV: value ?? 1 }))}
            />
          </div>
        </div>
      )}

      {/* UV Viewport */}
      <div
        className="relative mx-auto overflow-hidden rounded border border-gray-700 bg-checkered"
        style={{ width: displayWidth, height: displayHeight, maxWidth: "100%" }}
      >
        {/* Texture background */}
        <img
          src={textureUrl}
          alt={`${textureName} UV map`}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        {/* UV overlay */}
        <svg
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {previewLayout ? (
            <path
              d={buildUvPaths(previewLayout, displayWidth, displayHeight)}
              fill="none"
              stroke="rgba(56, 189, 248, 0.85)"
              strokeWidth="0.8"
            />
          ) : (
            <text
              x={displayWidth / 2}
              y={displayHeight / 2}
              textAnchor="middle"
              className="fill-gray-400 text-xs"
              fontSize="14"
            >
              No UV data available
            </text>
          )}
        </svg>
      </div>

      {uvLayout && (
        <p className="text-xs text-gray-500">
          {uvLayout.meshes.reduce((sum, m) => sum + m.faces.length, 0)} faces across{" "}
          {uvLayout.meshes.length} mesh{uvLayout.meshes.length !== 1 ? "es" : ""}
        </p>
      )}

      {/* Apply / Reset */}
      {activeMode !== "none" && onApplyEdit && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleApply} disabled={!previewLayout}>
            Apply
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
