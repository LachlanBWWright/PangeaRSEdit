import React, { useMemo, memo } from "react";
import {
  SplineData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { useAtom } from "jotai";
import { SelectedSpline, SelectedSplineNub } from "@/data/splines/splineAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { Globals } from "@/data/globals/globals";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { Vector3, CatmullRomCurve3, TubeGeometry } from "three";
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";
import type { Ray } from "three";
import type { ThreeEntityDragState } from "./threeEntityInteraction";

interface SplineGeometryProps {
  splineData: SplineData;
  headerData: HeaderData;
  terrainData: TerrainData;
  onNubPointerDown?: (kind: "spline", entityIndex: number, pointIndex: number, pointerId: number, startX: number, startZ: number, ray: Ray) => void;
  draggingEntity?: ThreeEntityDragState | null;
}

const SPLINE_HEIGHT_ABOVE_TERRAIN = 10; // Slight offset above terrain
const SPLINE_LINE_WIDTH = 8; // Diameter of the line (increased from 2)

const SplineGeometryComponent: React.FC<SplineGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
  onNubPointerDown,
  draggingEntity,
}) => {
  const globals = useAtomValue(Globals);
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
  const [selectedSplineNub, setSelectedSplineNub] = useAtom(SelectedSplineNub);
  const activeView = useAtomValue(ActiveView);

  const splines = splineData.Spln?.[1000]?.obj;
  const splinePointsBySplineIdx = splineData.SpPt;
  const hasValidData = !!splines && !!splinePointsBySplineIdx;

  const splineGroup = useMemo(() => {
    if (!hasValidData || !splines) return [];
    const group: React.ReactElement[] = [];
    const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

    splines.forEach((_, splineIdx) => {
      const pointsKey = 1000 + splineIdx;
      const pointsData = splinePointsBySplineIdx[pointsKey];
      const nubsKey = 1000 + splineIdx;
      const nubsData = splineData.SpNb?.[nubsKey];

      if (!pointsData || !pointsData.obj || pointsData.obj.length < 2) {
        return;
      }

      const points = pointsData.obj;
      
      const nubs = nubsData?.obj ?? [];
      const splineType = detectSplineType(nubs);
      const isCircular = splineType === SplineType.CIRCULAR;
      const isSelected =
        activeView === View.splines && selectedSpline === splineIdx;

      const linePoints: Vector3[] = []; 

      points.forEach((point) => {
        const worldX = point.x * scale;
        const worldZ = point.z * scale;

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

      const curve = new CatmullRomCurve3(linePoints, isCircular);
      const geometry = new TubeGeometry(
        curve,
        Math.max(20, Math.min(100, linePoints.length * 2)),
        SPLINE_LINE_WIDTH / 2,
        4,
        isCircular,
      );

      group.push(
        <mesh
          key={`spline-line-${splineIdx}`}
          geometry={geometry}
          onPointerDown={activeView === View.splines ? (event) => {
            event.stopPropagation();
            setSelectedSpline(splineIdx);
            setSelectedSplineNub(null);
          } : undefined}
        >
          <meshStandardMaterial color={isSelected ? 0xfacc15 : 0x6dd5ed} emissive={0x2c3e50} />
        </mesh>,
      );

      if (activeView === View.splines && nubsData && nubsData.obj) {
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

            const angle = Math.atan2(dirX, dirZ);

            group.push(
              <group
                key={`spline-nub-${splineIdx}-${nubIdx}`}
                position={[worldX, posY, worldZ]}
                rotation={[0, angle, 0]}
                onPointerDown={activeView === View.splines ? (event) => {
                  event.stopPropagation();
                  setSelectedSpline(splineIdx);
                  setSelectedSplineNub(nubIdx);
                  onNubPointerDown?.("spline", splineIdx, nubIdx, event.pointerId, nub.x, nub.z, event.ray);
                } : undefined}
              >
                <mesh position={[0, 0, -20]}>
                  <boxGeometry args={[8, 8, 40]} />
                  <meshStandardMaterial
                    color={draggingEntity?.kind === "spline" && draggingEntity.entityIndex === splineIdx && draggingEntity.pointIndex === nubIdx ? 0x22c55e : isSelected && selectedSplineNub === nubIdx ? 0xffffff : 0xff6b9d}
                    emissive={isSelected && selectedSplineNub === nubIdx ? 0xffffff : 0xff6b9d}
                    emissiveIntensity={0.5}
                  />
                </mesh>
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
  }, [
    globals,
    hasValidData,
    headerData,
    activeView,
    draggingEntity,
    onNubPointerDown,
    selectedSpline,
    selectedSplineNub,
    setSelectedSpline,
    setSelectedSplineNub,
    splineData.SpNb,
    splinePointsBySplineIdx,
    splines,
    terrainData,
  ]);

  if (!hasValidData) {
    return null;
  }

  return <group name="splines">{splineGroup}</group>;
};

export const SplineGeometry = memo(SplineGeometryComponent);
