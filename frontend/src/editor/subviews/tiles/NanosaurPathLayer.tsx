import { startTransition, useEffect, useRef, useState } from "react";
import { Image, Layer } from "react-konva";
import { useAtomValue } from "jotai";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Updater } from "use-immer";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Globals } from "@/data/globals/globals";
import {
  editNanosaurPathLayerAtom,
  nanosaurPathTileAtom,
  showNanosaurPathLayerAtom,
} from "@/data/terrain/nanosaurPathAtoms";
import {
  buildNanosaurPathCanvas,
  paintNanosaurPathCanvasCell,
} from "./nanosaurPathTileVisuals";

interface NanosaurPathLayerProps {
  readonly headerData: HeaderData;
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
}

export function NanosaurPathLayer({ headerData, terrainData, setTerrainData }: NanosaurPathLayerProps) {
  const shown = useAtomValue(showNanosaurPathLayerAtom);
  const values = terrainData.nanosaurPathLayer ?? [];
  if (!shown || values.length === 0) return null;
  return (
    <VisibleNanosaurPathLayer
      key={`${headerData.Hedr[1000].obj.mapWidth}x${headerData.Hedr[1000].obj.mapHeight}`}
      headerData={headerData}
      terrainData={terrainData}
      setTerrainData={setTerrainData}
      values={values}
    />
  );
}

function VisibleNanosaurPathLayer({
  headerData,
  setTerrainData,
  values,
}: NanosaurPathLayerProps & { readonly values: readonly number[] }) {
  const editing = useAtomValue(editNanosaurPathLayerAtom);
  const selectedTile = useAtomValue(nanosaurPathTileAtom);
  const globals = useAtomValue(Globals);
  const header = headerData.Hedr[1000].obj;
  const [canvas] = useState(() =>
    buildNanosaurPathCanvas(values, header.mapWidth, header.mapHeight),
  );
  const pendingChanges = useRef(new Map<number, number>());
  const committedValues = useRef(values);
  useEffect(() => {
    committedValues.current = values;
  }, [values]);

  const paint = (event: KonvaEventObject<MouseEvent>) => {
    if (!editing) return;
    const point = event.target.getStage()?.getRelativePointerPosition();
    if (!point) return;
    const x = Math.floor(point.x / globals.TILE_SIZE);
    const z = Math.floor(point.y / globals.TILE_SIZE);
    if (x < 0 || z < 0 || x >= header.mapWidth || z >= header.mapHeight) return;
    const index = z * header.mapWidth + x;
    if (committedValues.current[index] === selectedTile) return;
    if (pendingChanges.current.get(index) === selectedTile) return;
    pendingChanges.current.set(index, selectedTile);
    paintNanosaurPathCanvasCell(canvas, selectedTile, x, z);
    event.target.getLayer()?.batchDraw();
  };

  const commitStroke = () => {
    if (pendingChanges.current.size === 0) return;
    const changes = new Map(pendingChanges.current);
    pendingChanges.current.clear();
    const nextValues = committedValues.current.slice();
    changes.forEach((value, index) => {
      nextValues[index] = value;
    });
    committedValues.current = nextValues;
    startTransition(() => {
      setTerrainData((draft) => {
        draft.nanosaurPathLayer = nextValues;
      });
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        image={canvas}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        opacity={0.55}
        listening={editing}
        onMouseDown={(event) => {
          pendingChanges.current.clear();
          paint(event);
        }}
        onMouseMove={(event) => {
          if (event.evt.buttons === 1) paint(event);
        }}
        onMouseUp={commitStroke}
        onMouseLeave={commitStroke}
      />
    </Layer>
  );
}
