import { Arrow, Circle, Group, Line } from "react-konva";
import { useAtom } from "jotai";
import type { Updater } from "use-immer";
import { selectedPathAtom } from "@/data/paths/pathAtoms";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { KonvaIconButton } from "../shared/KonvaIconButton";

interface CroMagPathLayerProps {
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
}

function updatePathPoint(
  setTerrainData: Updater<TerrainData>,
  pathIndex: number,
  pointIndex: number,
  x: number,
  z: number,
): void {
  setTerrainData((draft) => {
    const point = draft.PaPt?.[1000 + pathIndex]?.obj[pointIndex];
    if (!point) return;
    point.x = Math.round(x);
    point.z = Math.round(z);
  });
}

function addPathPoint(
  setTerrainData: Updater<TerrainData>,
  pathIndex: number,
  atFront: boolean,
): void {
  setTerrainData((draft) => {
    const path = draft.Path?.[1000]?.obj[pathIndex];
    const points = draft.PaPt?.[1000 + pathIndex]?.obj;
    if (!path || !points || points.length < 2) return;
    const endpoint = atFront ? points[0] : points.at(-1);
    const neighbor = atFront ? points[1] : points.at(-2);
    if (!endpoint || !neighbor) return;
    const point = {
      x: Math.round(endpoint.x + endpoint.x - neighbor.x),
      z: Math.round(endpoint.z + endpoint.z - neighbor.z),
    };
    if (atFront) points.unshift(point);
    else points.push(point);
    path.numPoints = points.length;
  });
}

function removePathPoint(
  setTerrainData: Updater<TerrainData>,
  pathIndex: number,
  atFront: boolean,
): void {
  setTerrainData((draft) => {
    const path = draft.Path?.[1000]?.obj[pathIndex];
    const points = draft.PaPt?.[1000 + pathIndex]?.obj;
    if (!path || !points || points.length <= 2) return;
    if (atFront) points.shift();
    else points.pop();
    path.numPoints = points.length;
  });
}

export function CroMagPathLayer({
  terrainData,
  setTerrainData,
}: CroMagPathLayerProps) {
  const [selectedPath, setSelectedPath] = useAtom(selectedPathAtom);
  const paths = terrainData.Path?.[1000]?.obj ?? [];

  if (paths.length === 0) return null;

  return (
    <Group>
      {paths.map((_path, pathIndex) => {
        const points = terrainData.PaPt?.[1000 + pathIndex]?.obj ?? [];
        const selected = selectedPath === pathIndex;
        const linePoints = points.flatMap((point) => [point.x, point.z]);
        const firstPoint = points[0];
        const lastPoint = points.at(-1);
        const buttonOffset = 34;
        return (
          <Group key={`path-${pathIndex}`}>
            {linePoints.length >= 4 && (
              <Line
                points={linePoints}
                stroke={selected ? "#facc15" : "#f97316"}
                strokeWidth={selected ? 6 : 4}
                hitStrokeWidth={18}
                lineCap="round"
                lineJoin="round"
                perfectDrawEnabled={false}
                onClick={(event) => {
                  event.cancelBubble = true;
                  setSelectedPath(pathIndex);
                }}
              />
            )}
            {points.slice(0, -1).map((point, pointIndex) => {
              const nextPoint = points[pointIndex + 1];
              if (!nextPoint) return null;
              const startX = point.x + (nextPoint.x - point.x) * 0.42;
              const startZ = point.z + (nextPoint.z - point.z) * 0.42;
              const endX = point.x + (nextPoint.x - point.x) * 0.58;
              const endZ = point.z + (nextPoint.z - point.z) * 0.58;
              return (
                <Arrow
                  key={`direction-${pointIndex}`}
                  points={[startX, startZ, endX, endZ]}
                  stroke={selected ? "#facc15" : "#f97316"}
                  fill={selected ? "#facc15" : "#f97316"}
                  strokeWidth={selected ? 3 : 2}
                  pointerLength={selected ? 8 : 6}
                  pointerWidth={selected ? 7 : 5}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              );
            })}
            {points.map((point, pointIndex) => (
              <Circle
                key={pointIndex}
                x={point.x}
                y={point.z}
                radius={selected ? 7 : 4}
                fill={selected ? "#facc15" : "#fb923c"}
                stroke="#111827"
                strokeWidth={2}
                draggable={selected}
                onMouseDown={(event) => {
                  event.cancelBubble = true;
                  setSelectedPath(pathIndex);
                }}
                onDragMove={(event) =>
                  updatePathPoint(
                    setTerrainData,
                    pathIndex,
                    pointIndex,
                    event.target.x(),
                    event.target.y(),
                  )
                }
              />
            ))}
            {selected && firstPoint && (
              <>
                <Line points={[firstPoint.x - buttonOffset, firstPoint.z - buttonOffset, firstPoint.x, firstPoint.z]} stroke="#22c55e" strokeWidth={1.5} dash={[4, 3]} opacity={0.7} listening={false} />
                <KonvaIconButton x={firstPoint.x - buttonOffset} y={firstPoint.z - buttonOffset} label="+" backgroundColor="#22c55e" onClick={() => addPathPoint(setTerrainData, pathIndex, true)} />
                {points.length > 2 && <>
                  <Line points={[firstPoint.x + buttonOffset, firstPoint.z - buttonOffset, firstPoint.x, firstPoint.z]} stroke="#ef4444" strokeWidth={1.5} dash={[4, 3]} opacity={0.7} listening={false} />
                  <KonvaIconButton x={firstPoint.x + buttonOffset} y={firstPoint.z - buttonOffset} label="×" backgroundColor="#ef4444" onClick={() => removePathPoint(setTerrainData, pathIndex, true)} />
                </>}
              </>
            )}
            {selected && lastPoint && lastPoint !== firstPoint && (
              <>
                <Line points={[lastPoint.x + buttonOffset, lastPoint.z + buttonOffset, lastPoint.x, lastPoint.z]} stroke="#22c55e" strokeWidth={1.5} dash={[4, 3]} opacity={0.7} listening={false} />
                <KonvaIconButton x={lastPoint.x + buttonOffset} y={lastPoint.z + buttonOffset} label="+" backgroundColor="#22c55e" onClick={() => addPathPoint(setTerrainData, pathIndex, false)} />
                {points.length > 2 && <>
                  <Line points={[lastPoint.x - buttonOffset, lastPoint.z + buttonOffset, lastPoint.x, lastPoint.z]} stroke="#ef4444" strokeWidth={1.5} dash={[4, 3]} opacity={0.7} listening={false} />
                  <KonvaIconButton x={lastPoint.x - buttonOffset} y={lastPoint.z + buttonOffset} label="×" backgroundColor="#ef4444" onClick={() => removePathPoint(setTerrainData, pathIndex, false)} />
                </>}
              </>
            )}
          </Group>
        );
      })}
    </Group>
  );
}
