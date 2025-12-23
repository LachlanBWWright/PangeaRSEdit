import React, { useMemo } from "react";
import {
  SplineData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import * as THREE from "three";

interface SplineGeometryProps {
  splineData: SplineData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const SPLINE_HEIGHT_ABOVE_TERRAIN = 10; // Slight offset above terrain
const SPLINE_LINE_WIDTH = 8; // Diameter of the line (increased from 2)

export const SplineGeometry: React.FC<SplineGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);

  if (!splineData.Spln || !splineData.Spln[1000] || !splineData.SpPt) {
    return null;
  }

  const splines = splineData.Spln[1000].obj;
  const splinePointsBySplineIdx = splineData.SpPt;

  const splineGroup = useMemo(() => {
    const group: JSX.Element[] = [];
    const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

    splines.forEach((_, splineIdx) => {
      const pointsKey = 1000 + splineIdx;
      const pointsData = splinePointsBySplineIdx[pointsKey];

      if (!pointsData || !pointsData.obj || pointsData.obj.length < 2) {
        return;
      }

      const points = pointsData.obj;

      // Create line through spline points
      const linePoints: THREE.Vector3[] = [];

      points.forEach((point) => {
        const worldX = point.x * scale;
        const worldZ = point.z * scale;

        // Get terrain height at this point
        const terrainY = getTerrainHeightAtPoint(
          point.x,
          point.z,
          headerData,
          terrainData,
          globals,
        );

        const posY = terrainY + SPLINE_HEIGHT_ABOVE_TERRAIN;
        linePoints.push(new THREE.Vector3(worldX, posY, worldZ));
      });

      // Create TubeGeometry for the spline line
      const curve = new THREE.CatmullRomCurve3(linePoints);
      const geometry = new THREE.TubeGeometry(
        curve,
        Math.max(20, Math.min(100, linePoints.length * 2)),
        SPLINE_LINE_WIDTH / 2,
        4,
        false,
      );

      group.push(
        <mesh key={`spline-line-${splineIdx}`} geometry={geometry}>
          <meshStandardMaterial color={0x6dd5ed} emissive={0x2c3e50} />
        </mesh>,
      );

      // Add arrows at control points (nubs) to show direction
      const nubsKey = 1000 + splineIdx;
      if (splineData.SpNb && splineData.SpNb[nubsKey]) {
        const nubsData = splineData.SpNb[nubsKey];
        if (nubsData.obj) {
          nubsData.obj.forEach((nub, nubIdx) => {
            const worldX = nub.x * scale;
            const worldZ = nub.z * scale;

            const terrainY = getTerrainHeightAtPoint(
              nub.x,
              nub.z,
              headerData,
              terrainData,
              globals,
            );

            const posY = terrainY + SPLINE_HEIGHT_ABOVE_TERRAIN;

            // Calculate direction to next nub
            let dirX = 0,
              dirZ = 0;
            if (nubIdx < nubsData.obj.length - 1) {
              const nextNub = nubsData.obj[nubIdx + 1];
              if (nextNub) {
                const nextWorldX = nextNub.x * scale;
                const nextWorldZ = nextNub.z * scale;
                dirX = nextWorldX - worldX;
                dirZ = nextWorldZ - worldZ;
                const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (len > 0) {
                  dirX /= len;
                  dirZ /= len;
                }
              }
            } else if (nubIdx > 0) {
              // For last nub, use direction from previous nub
              const prevNub = nubsData.obj[nubIdx - 1];
              if (prevNub) {
                const prevWorldX = prevNub.x * scale;
                const prevWorldZ = prevNub.z * scale;
                dirX = worldX - prevWorldX;
                dirZ = worldZ - prevWorldZ;
                const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (len > 0) {
                  dirX /= len;
                  dirZ /= len;
                }
              }
            }

            // Calculate rotation to point in direction
            const angle = Math.atan2(dirX, dirZ);

            group.push(
              <group
                key={`spline-nub-${splineIdx}-${nubIdx}`}
                position={[worldX, posY, worldZ]}
                rotation={[0, angle, 0]}
              >
                {/* Arrow shaft */}
                <mesh position={[0, 0, -20]}>
                  <boxGeometry args={[8, 8, 40]} />
                  <meshStandardMaterial
                    color={0xff6b9d}
                    emissive={0xff6b9d}
                    emissiveIntensity={0.5}
                  />
                </mesh>
                {/* Arrow head - cone */}
                <mesh position={[0, 0, -45]}>
                  <coneGeometry args={[20, 30, 8]} />
                  <meshStandardMaterial
                    color={0xff6b9d}
                    emissive={0xff6b9d}
                    emissiveIntensity={0.5}
                  />
                </mesh>
              </group>,
            );
          });
        }
      }
    });

    return group;
  }, [splines, splinePointsBySplineIdx, headerData, terrainData, globals]);

  return <group name="splines">{splineGroup}</group>;
};
