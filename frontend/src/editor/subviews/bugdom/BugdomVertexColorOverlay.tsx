import { Image, Layer, Rect } from "react-konva";
import Konva from "konva";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import type { Updater } from "use-immer";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  bugdomVertexColorBrushAtom,
  bugdomVertexColorBrushRadiusAtom,
  bugdomVertexColorDisplayModeAtom,
  editBugdomVertexColorsAtom,
} from "@/data/terrain/bugdomVertexColorAtoms";
import {
  decodeBugdomVertexColors,
  encodeBugdomVertexColors,
  type TerrainVertexColor,
} from "@/data/terrain/bugdomVertexColors";
import { hexToRgb } from "@/utils/colorUtils";

interface BugdomVertexColorOverlayProps {
  readonly headerData: HeaderData;
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
  readonly tileSize: number;
  readonly layerKey: 1000 | 1001;
}

interface VertexColorCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly imageData: ImageData;
  readonly colors: TerrainVertexColor[];
}

function buildVertexColorCanvas(
  colors: readonly TerrainVertexColor[],
  columns: number,
  rows: number,
): VertexColorCanvas | null {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const imageData = context.createImageData(columns, rows);
  for (let index = 0; index < colors.length; index += 1) {
    const color = colors[index];
    if (!color) continue;
    imageData.data[index * 4] = Math.round(color.r * 255);
    imageData.data[index * 4 + 1] = Math.round(color.g * 255);
    imageData.data[index * 4 + 2] = Math.round(color.b * 255);
    imageData.data[index * 4 + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return { canvas, imageData, colors: colors.slice() };
}

function paintCanvasVertices(input: {
  readonly target: VertexColorCanvas;
  readonly columns: number;
  readonly rows: number;
  readonly centerColumn: number;
  readonly centerRow: number;
  readonly radius: number;
  readonly color: TerrainVertexColor;
}): void {
  const radiusSquared = input.radius * input.radius;
  const minRow = Math.max(0, input.centerRow - input.radius);
  const maxRow = Math.min(input.rows - 1, input.centerRow + input.radius);
  const minColumn = Math.max(0, input.centerColumn - input.radius);
  const maxColumn = Math.min(input.columns - 1, input.centerColumn + input.radius);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const dx = column - input.centerColumn;
      const dy = row - input.centerRow;
      if (dx * dx + dy * dy > radiusSquared) continue;
      const index = row * input.columns + column;
      input.target.colors[index] = input.color;
      input.target.imageData.data[index * 4] = Math.round(input.color.r * 255);
      input.target.imageData.data[index * 4 + 1] = Math.round(input.color.g * 255);
      input.target.imageData.data[index * 4 + 2] = Math.round(input.color.b * 255);
    }
  }
  input.target.canvas
    .getContext("2d")
    ?.putImageData(input.target.imageData, 0, 0);
}

export function BugdomVertexColorOverlay({
  headerData,
  terrainData,
  setTerrainData,
  tileSize,
  layerKey,
}: BugdomVertexColorOverlayProps) {
  const displayMode = useAtomValue(bugdomVertexColorDisplayModeAtom);
  const editing = useAtomValue(editBugdomVertexColorsAtom);
  const brushHex = useAtomValue(bugdomVertexColorBrushAtom);
  const brushRadius = useAtomValue(bugdomVertexColorBrushRadiusAtom);
  const imageRef = useRef<Konva.Image>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const activeStrokeRef = useRef<VertexColorCanvas | null>(null);
  const lastPaintedIndexRef = useRef<number | null>(null);
  const header = headerData.Hedr[1000].obj;
  const columns = header.mapWidth + 1;
  const rows = header.mapHeight + 1;
  const resource = terrainData.Vcol?.[layerKey];
  const decoded = useMemo(() => {
    if (!resource) return null;
    const result = decodeBugdomVertexColors(resource.data, columns * rows);
    return result.isOk() ? result.value : null;
  }, [columns, resource, rows]);
  const display = useMemo(
    () => (decoded ? buildVertexColorCanvas(decoded, columns, rows) : null),
    [columns, decoded, rows],
  );
  const colorsOnly = displayMode === "colors-only";

  useEffect(() => {
    const canvas = layerRef.current?.getNativeCanvasElement();
    if (!canvas) return;
    canvas.style.mixBlendMode = colorsOnly ? "normal" : "multiply";
    return () => {
      canvas.style.mixBlendMode = "normal";
    };
  }, [colorsOnly, displayMode]);

  if (displayMode === "none" || !display) return null;

  const paintAtPointer = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!editing) return;
    event.cancelBubble = true;
    const position = event.target.getStage()?.getRelativePointerPosition();
    const rgb = hexToRgb(brushHex);
    if (!position || !rgb) return;
    const centerColumn = Math.max(0, Math.min(header.mapWidth, Math.round(position.x / tileSize)));
    const centerRow = Math.max(0, Math.min(header.mapHeight, Math.round(position.y / tileSize)));
    const index = centerRow * columns + centerColumn;
    if (lastPaintedIndexRef.current === index) return;
    lastPaintedIndexRef.current = index;
    const target = activeStrokeRef.current ?? display;
    activeStrokeRef.current = target;
    paintCanvasVertices({
      target,
      columns,
      rows,
      centerColumn,
      centerRow,
      radius: brushRadius,
      color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
    });
    imageRef.current?.getLayer()?.batchDraw();
  };

  const commitStroke = () => {
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    lastPaintedIndexRef.current = null;
    if (!stroke) return;
    const encoded = encodeBugdomVertexColors(stroke.colors);
    setTerrainData((draft) => {
      const targetResource = draft.Vcol?.[layerKey];
      if (targetResource) targetResource.data = encoded;
    });
  };

  const renderedWidth = columns * tileSize;
  const renderedHeight = rows * tileSize;
  const opacity = displayMode === "half" ? 0.5 : 1;

  return (
    <Layer ref={layerRef}>
      <Image
        ref={imageRef}
        image={display.canvas}
        x={-tileSize / 2}
        y={-tileSize / 2}
        width={renderedWidth}
        height={renderedHeight}
        imageSmoothingEnabled
        opacity={opacity}
        listening={false}
      />
      {editing && (
        <Rect
          width={header.mapWidth * tileSize}
          height={header.mapHeight * tileSize}
          fill="rgba(255,255,255,0.001)"
          onMouseDown={paintAtPointer}
          onMouseMove={(event) => {
            if (event.evt.buttons === 1) paintAtPointer(event);
          }}
          onMouseUp={(event) => {
            event.cancelBubble = true;
            commitStroke();
          }}
          onMouseLeave={commitStroke}
        />
      )}
    </Layer>
  );
}
