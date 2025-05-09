import React from "react";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { DoubleSide, Shape, Vector2 } from "three";
import { WaterBodyType } from "@/data/water/ottoWaterBodyType";
import { getTerrainHeightAtPoint } from "./FenceGeometry";

interface LiquidGeometryProps {
  data: ottoMaticLevel;
  // Potentially add a prop for liquid type if colors/properties need to vary
  // liquidType?: 'water' | 'lava' | 'acid';
}

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
      return { color: 0x006400, opacity: 0.7 }; // DarkGreen
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

export const LiquidGeometry: React.FC<LiquidGeometryProps> = ({ data }) => {
  const globals = useAtomValue(Globals);

  if (!data.Liqd?.[1000]?.obj) {
    return null;
  }

  const liquidPatches = data.Liqd[1000].obj;

  return (
    <group>
      {liquidPatches.map((patch, index) => {
        if (!patch || patch.numNubs < 3) {
          // A polygon needs at least 3 vertices
          return null;
        }

        //liquidPatches[0].height

        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

        const points = patch.nubs
          .slice(0, patch.numNubs)
          .map((nub) => new Vector2(nub[0] * scale, nub[1] * scale));

        // Ensure we still have enough points after slicing and potential filtering if any
        if (points.length < 3) {
          return null;
        }

        const shape = new Shape(points);
        const { color: liquidColor, opacity } = getLiquidProperties(patch.type);
        // Assuming patch.height is in tile units, similar to other Y coordinates
        const liquidLevelY =
          getTerrainHeightAtPoint(
            patch.hotSpotX,
            patch.hotSpotZ,
            data,
            globals,
          ) + 100; //patch.height;

        console.log("Patch height", patch.height);
        return (
          <mesh
            key={`liquid-${index}`}
            position={[
              0, // The shape coordinates are world XZ, mesh is placed at correct Y
              liquidLevelY,
              0,
            ]}
            rotation={[Math.PI / 2, 0, 0]} // Rotate shape from XY plane to XZ plane
            frustumCulled={false} // Optional: if liquid should always be visible
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={liquidColor}
              opacity={opacity}
              transparent={true}
              side={DoubleSide} // Render both sides
            />
          </mesh>
        );
      })}
    </group>
  );
};
