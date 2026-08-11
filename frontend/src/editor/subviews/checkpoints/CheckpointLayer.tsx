import { Circle, Group, Line, Text } from "react-konva";
import { useAtom } from "jotai";
import type { Updater } from "use-immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { selectedCheckpointAtom } from "@/data/checkpoints/checkpointAtoms";

interface CheckpointLayerProps {
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
  readonly coordinateScale: number;
}

export function CheckpointLayer({
  terrainData,
  setTerrainData,
  coordinateScale,
}: CheckpointLayerProps) {
  const [selected, setSelected] = useAtom(selectedCheckpointAtom);
  const checkpoints = terrainData.CkPt?.[1000]?.obj ?? [];

  const moveEndpoint = (
    checkpointIndex: number,
    endpoint: 1 | 2,
    x: number,
    z: number,
  ) => {
    setTerrainData((draft) => {
      const checkpoint = draft.CkPt?.[1000]?.obj[checkpointIndex];
      if (!checkpoint) return;
      if (endpoint === 1) {
        checkpoint.x1 = Math.round(x / coordinateScale);
        checkpoint.z1 = Math.round(z / coordinateScale);
      } else {
        checkpoint.x2 = Math.round(x / coordinateScale);
        checkpoint.z2 = Math.round(z / coordinateScale);
      }
    });
  };

  if (checkpoints.length === 0) return null;
  return (
    <Group>
      {checkpoints.map((checkpoint, index) => {
        const isSelected = selected === index;
        const x1 = checkpoint.x1 * coordinateScale;
        const z1 = checkpoint.z1 * coordinateScale;
        const x2 = checkpoint.x2 * coordinateScale;
        const z2 = checkpoint.z2 * coordinateScale;
        return (
          <Group key={`checkpoint-${index}`}>
            <Line
              points={[x1, z1, x2, z2]}
              stroke={isSelected ? "#facc15" : "#22d3ee"}
              strokeWidth={isSelected ? 7 : 5}
              shadowColor="#000000"
              shadowBlur={3}
              shadowOpacity={0.9}
              hitStrokeWidth={20}
              perfectDrawEnabled={false}
              onClick={(event) => {
                event.cancelBubble = true;
                setSelected(index);
              }}
            />
            {[{ x: x1, z: z1 }, { x: x2, z: z2 }].map((point, endpoint) => (
              <Group
                key={endpoint}
                x={point.x}
                y={point.z}
                draggable={isSelected}
                onMouseDown={(event) => {
                  event.cancelBubble = true;
                  setSelected(index);
                }}
                onDragMove={(event) => {
                  moveEndpoint(
                    index,
                    endpoint === 0 ? 1 : 2,
                    event.target.x(),
                    event.target.y(),
                  );
                }}
              >
                <Circle
                  radius={10}
                  fill={isSelected ? "#facc15" : "#22d3ee"}
                  stroke="#111827"
                  strokeWidth={isSelected ? 3 : 2}
                  perfectDrawEnabled={false}
                />
                {endpoint === 0 && (
                  <Text
                    x={-10}
                    y={-10}
                    width={20}
                    height={20}
                    text={`${index + 1}`}
                    fill="white"
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                )}
              </Group>
            ))}
          </Group>
        );
      })}
    </Group>
  );
}
