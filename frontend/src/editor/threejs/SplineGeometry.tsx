import React, { useMemo } from "react";
import {
  SplineData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { Vector3, CatmullRomCurve3, TubeGeometry } from "three";
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";

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

  const splines = splineData.Spln?.[1000]?.obj;
  const splinePointsBySplineIdx = splineData.SpPt;
  const hasValidData = !!splines && !!splinePointsBySplineIdx;

  // Extract YCrd array for dependency tracking - terrain height changes should trigger re-render
  const yCrdData = terrainData.YCrd?.[1000]?.obj;
  
  // Use useMemo to properly track terrain height changes and recompute spline geometry
  const splineGroup = useMemo(() => {
    if (!hasValidData || !splines) return [];
    const group: React.ReactElement[] = [];
    const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

    splines.forEach((_, splineIdx) => {
      const pointsKey = 1000 + splineIdx;
      const nubsKey = 1000 + splineIdx;
      const pointsData = splinePointsBySplineIdx[pointsKey];
      const nubsData = splineData.SpNb?.[nubsKey];

      if (!pointsData || !pointsData.obj || pointsData.obj.length < 2) {
        return;
      }

      const points = pointsData.obj;
      
      // Detect if this spline is circular or open based on nub positions
      const nubs = nubsData?.obj ?? [];
      const splineType = detectSplineType(nubs);
      const isCircular = splineType === SplineType.CIRCULAR;

      // Create line through spline points
      const linePoints: Vector3[] = []; 

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
        linePoints.push(new Vector3(worldX, posY, worldZ));
      });

      // Create TubeGeometry for the spline line
      // For circular splines, use the 'closed' parameter to properly connect end to start
      const curve = new CatmullRomCurve3(linePoints, isCircular);
      const geometry = new TubeGeometry(
        curve,
        Math.max(20, Math.min(100, linePoints.length * 2)),
        SPLINE_LINE_WIDTH / 2,
        4,
        isCircular, // closed parameter - true for circular splines
      );

      group.push(
        <mesh key={`spline-line-${splineIdx}`} geometry={geometry}>
          <meshStandardMaterial color={0x6dd5ed} emissive={0x2c3e50} />
        </mesh>,
      );

      // Add arrows at control points (nubs) to show direction
      if (nubsData && nubsData.obj) {
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
    });

    return group;
  }, [hasValidData, splines, splinePointsBySplineIdx, splineData.SpNb, headerData, terrainData, globals, yCrdData]);

  if (!hasValidData) {
    return null;
  }

  return <group name="splines">{splineGroup}</group>;
};
