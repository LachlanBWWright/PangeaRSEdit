import React, { useEffect, useMemo } from "react";
import {
  resolveLiquidSurfaceHeight,
  supportsFixedHeightLiquid,
} from "@/data/water/fixedHeightLiquid";
import { useAtomValue } from "jotai";
import { useAtom } from "jotai";
import { SelectedWaterBody, SelectedWaterNub } from "@/data/water/waterAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { Globals } from "@/data/globals/globals";
import {
  LiquidData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  CanvasTexture,
  DoubleSide,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
} from "three";
import { WaterBodyType } from "@/data/water/ottoWaterBodyType";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import type { Ray } from "three";
import type { ThreeEntityDragState } from "./threeEntityInteraction";
import { useGameLiquidTexture } from "../subviews/water/useGameLiquidTexture";

interface LiquidGeometryProps {
  liquidData: LiquidData;
  headerData: HeaderData;
  terrainData: TerrainData;
  onNubPointerDown?: (kind: "water", entityIndex: number, pointIndex: number, pointerId: number, startX: number, startZ: number, ray: Ray) => void;
  draggingEntity?: ThreeEntityDragState | null;
}

// Debug flag - set to false in production
const DEBUG_LIQUID_RENDERING = false;

const getLiquidProperties = (type: WaterBodyType) => {
  switch (type) {
    case WaterBodyType.BLUEWATER:
      return { color: 0x0000ff, opacity: 0.7 };
    case WaterBodyType.SOAP:
      return { color: 0xffb6c1, opacity: 0.6 }; // LightPink
    case WaterBodyType.GREENWATER:
      return { color: 0x008000, opacity: 0.7 }; // Green
    case WaterBodyType.OIL:
      return { color: 0x000000, opacity: 0.8 }; // Black
    case WaterBodyType.JUNGLEWATER:
      return { color: 6400, opacity: 0.7 }; // DarkGreen
    case WaterBodyType.MUD:
      return { color: 0x8b4513, opacity: 0.9 }; // SaddleBrown
    case WaterBodyType.RADIOACTIVE:
      return { color: 0x32cd32, opacity: 0.7 }; // LimeGreen
    case WaterBodyType.LAVA:
      return { color: 0xff0000, opacity: 0.9 }; // Red
    default:
      return { color: 0x0000ff, opacity: 0.7 }; // Default to Blue Water
  }
};

function LiquidSurfaceMaterial({
  type,
  color,
  opacity,
  width,
  depth,
}: {
  type: number;
  color: number;
  opacity: number;
  width: number;
  depth: number;
}) {
  const globals = useAtomValue(Globals);
  const canvas = useGameLiquidTexture(globals, type);
  const texture = useMemo(() => {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    const nextTexture = new CanvasTexture(canvas);
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.wrapS = RepeatWrapping;
    nextTexture.wrapT = RepeatWrapping;
    const textureRepeatWorldUnits = globals.GAME_TYPE === 4 ? 2000 : 500;
    nextTexture.repeat.set(
      width / textureRepeatWorldUnits,
      depth / textureRepeatWorldUnits,
    );
    return nextTexture;
  }, [canvas, depth, globals.GAME_TYPE, width]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <meshBasicMaterial
      color={texture ? 0xffffff : color}
      map={texture}
      opacity={opacity}
      transparent
      side={DoubleSide}
    />
  );
}

export const LiquidGeometry: React.FC<LiquidGeometryProps> = ({ liquidData, headerData, terrainData, onNubPointerDown, draggingEntity }) => {
  const globals = useAtomValue(Globals);
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
  const activeView = useAtomValue(ActiveView);

  if (!liquidData.Liqd?.[1000]?.obj) {
    if (DEBUG_LIQUID_RENDERING) {
      console.log("[LiquidGeometry] No liquid data found");
    }
    return null;
  }

  const liquidPatches = liquidData.Liqd[1000].obj;
  if (DEBUG_LIQUID_RENDERING) {
    console.log(`[LiquidGeometry] Found ${liquidPatches.length} liquid patches`);
  }

  return (
    <group>
      {liquidPatches.map((patch, index) => {
        const isSelected =
          activeView === View.water && selectedWaterBody === index;
        if (DEBUG_LIQUID_RENDERING) {
          console.log(`[LiquidGeometry] Patch ${index}:`, {
            numNubs: patch.numNubs,
            nubs: patch.nubs,
            type: patch.type,
          });
        }
        
        if (!patch || patch.numNubs < 3) {
          // A polygon needs at least 3 vertices
          if (DEBUG_LIQUID_RENDERING) {
            console.log(`[LiquidGeometry] Patch ${index} skipped: insufficient nubs`);
          }
          return null;
        }

        if (!patch.nubs || !Array.isArray(patch.nubs)) {
          if (DEBUG_LIQUID_RENDERING) {
            console.log(`[LiquidGeometry] Patch ${index} skipped: nubs not an array`);
          }
          return null;
        }

        //liquidPatches[0].height

        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

        const points = patch.nubs
          .slice(0, patch.numNubs)
          .map((nub, i) => {
            if (!nub || !Array.isArray(nub) || nub.length < 2) {
              if (DEBUG_LIQUID_RENDERING) {
                console.warn(`[LiquidGeometry] Patch ${index} nub ${i} is invalid:`, nub);
              }
              return new Vector2(0, 0);
            }
            const x = nub[0] ?? 0;
            const y = nub[1] ?? 0;
            return new Vector2(x * scale, y * scale);
          });

        // Ensure we still have enough points after slicing and potential filtering if any
        if (points.length < 3) {
          if (DEBUG_LIQUID_RENDERING) {
            console.log(`[LiquidGeometry] Patch ${index} skipped: insufficient points after processing`);
          }
          return null;
        }

        const shape = new Shape(points);
        const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
        const depth = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
        const { color: liquidColor, opacity } = getLiquidProperties(patch.type);
        // Assuming patch.height is in tile units, similar to other Y coordinates
        const terrainRelativeHeight =
          getTerrainHeightAtPoint(
            patch.hotSpotX,
            patch.hotSpotZ,
            headerData,
            terrainData,
            globals,
          ) + 100;
        const liquidLevelY = resolveLiquidSurfaceHeight({
          supportsFixedHeight: supportsFixedHeightLiquid(globals.GAME_TYPE),
          flags: patch.flags,
          heightIndex: patch.height,
          terrainRelativeHeight,
        });

        if (DEBUG_LIQUID_RENDERING) {
          console.log(`[LiquidGeometry] Rendering patch ${index} at Y=${liquidLevelY}`);
        }
        const waterNubHandleHeight = (nub: [number, number]) => {
          const terrainY = getTerrainHeightAtPoint(
            nub[0],
            nub[1],
            headerData,
            terrainData,
            globals,
          );
          const lowerY = Math.min(terrainY, liquidLevelY);
          const upperY = Math.max(terrainY, liquidLevelY);
          const height = Math.max(80, upperY - lowerY + 80);
          return { height, y: lowerY + height / 2 };
        };
        return (
          <React.Fragment key={`liquid-fragment-${index}`}>
            {activeView === View.water && patch.nubs.slice(0, patch.numNubs).map((nub, nubIdx) => (
              (() => {
                const handle = waterNubHandleHeight(nub);
                return (
                  <mesh
                    key={`liquid-nub-${index}-${nubIdx}`}
                    position={[nub[0] * scale, handle.y, nub[1] * scale]}
                    onPointerDown={activeView === View.water ? (event) => {
                      event.stopPropagation();
                      setSelectedWaterBody(index);
                      setSelectedWaterNub(nubIdx);
                      onNubPointerDown?.("water", index, nubIdx, event.pointerId, nub[0], nub[1], event.ray);
                    } : undefined}
                  >
                    <boxGeometry args={[44, handle.height, 44]} />
                    <meshBasicMaterial color={draggingEntity?.kind === "water" && draggingEntity.entityIndex === index && draggingEntity.pointIndex === nubIdx ? 0x22c55e : selectedWaterNub === nubIdx && isSelected ? 0xffffff : 0xfacc15} wireframe={selectedWaterNub !== nubIdx || !isSelected} />
                  </mesh>
                );
              })()
            ))}
            <mesh
              key={`liquid-${index}`}
              position={[
                0, // The shape coordinates are world XZ, mesh is placed at correct Y
                liquidLevelY,
                0,
              ]}
              rotation={[Math.PI / 2, 0, 0]} // Rotate shape from XY plane to XZ plane
              frustumCulled={false} // Optional: if liquid should always be visible
              onPointerDown={activeView === View.water ? (event) => {
                event.stopPropagation();
                setSelectedWaterBody(index);
                setSelectedWaterNub(null);
              } : undefined}
            >
              <shapeGeometry args={[shape]} />
              <LiquidSurfaceMaterial
                type={patch.type ?? 0}
                color={isSelected ? 0xfacc15 : liquidColor}
                opacity={opacity}
                width={width}
                depth={depth}
              />
            </mesh>
            {/* Test Box at hotspot */}
            <mesh
              key={`liquid-hotspot-box-${index}`}
              visible={activeView === View.water}
              position={[
                patch.hotSpotX * scale,
                liquidLevelY,
                patch.hotSpotZ * scale,
              ]}
              onPointerDown={activeView === View.water ? (event) => {
                event.stopPropagation();
                setSelectedWaterBody(index);
                setSelectedWaterNub(null);
              } : undefined}
            >
              <sphereGeometry args={[isSelected ? 38 : 26, 16, 8]} />
              <meshBasicMaterial color={isSelected ? 0xffffff : 0xff4444} wireframe={isSelected} />
            </mesh>
            <mesh
              key={`liquid-hotspot-lower-box-${index}`}
              visible={activeView === View.water}
              position={[
                patch.hotSpotX * scale,
                liquidLevelY - 100,
                patch.hotSpotZ * scale,
              ]}
            >
              <boxGeometry args={[55, 55, 55]} /> {/* Small box */}
              <meshStandardMaterial color="red" />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
};
