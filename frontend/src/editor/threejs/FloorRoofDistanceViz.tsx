import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { useAtomValue } from 'jotai';
import { Globals } from '@/data/globals/globals';
import { MIN_ROOF_FLOOR_DISTANCE } from '../utils/topologyBrushUtils';

interface FloorRoofDistanceVizProps {
  floorData: number[] | Int16Array;
  roofData: number[] | Int16Array;
  mapWidth: number;
  mapHeight: number;
  showViolations?: boolean;
  version?: number;
}

export function FloorRoofDistanceViz({
  floorData,
  roofData,
  mapWidth,
  mapHeight,
  showViolations = true,
  version = 0,
}: FloorRoofDistanceVizProps) {
  const globals = useAtomValue(Globals);

  // Create lines connecting floor and roof vertices
  const { geometry, violationsGeometry } = useMemo(() => {
    const vertices: number[] = [];
    const violationVertices: number[] = [];

    // Iterate over all vertices
    for (let z = 0; z <= mapHeight; z++) {
      for (let x = 0; x <= mapWidth; x++) {
        const idx = z * (mapWidth + 1) + x;
        if (idx >= floorData.length || idx >= roofData.length) continue;

        const floorY = floorData[idx];
        const roofY = roofData[idx];

        if (floorY === undefined || roofY === undefined) continue;

        const worldX = x * globals.TILE_INGAME_SIZE;
        const worldZ = z * globals.TILE_INGAME_SIZE;

        // Add line segment
        const isViolation = (roofY - floorY) < MIN_ROOF_FLOOR_DISTANCE;

        if (isViolation && showViolations) {
            violationVertices.push(worldX, floorY, worldZ);
            violationVertices.push(worldX, roofY, worldZ);
        } else {
            vertices.push(worldX, floorY, worldZ);
            vertices.push(worldX, roofY, worldZ);
        }
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));

    const vioGeom = new BufferGeometry();
    vioGeom.setAttribute('position', new Float32BufferAttribute(violationVertices, 3));

    return { geometry: geom, violationsGeometry: vioGeom };
  }, [floorData, roofData, mapWidth, mapHeight, globals.TILE_INGAME_SIZE, showViolations, version]);

  return (
    <group>
      {/* Normal lines (grey, faint) */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#444444" transparent opacity={0.2} />
      </lineSegments>

      {/* Violation lines (red, bright) */}
      {showViolations && (
        <lineSegments geometry={violationsGeometry}>
           <lineBasicMaterial color="#ff0000" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
