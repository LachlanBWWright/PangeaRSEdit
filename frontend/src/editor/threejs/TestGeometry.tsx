import { GlobalsInterface } from "@/data/globals/globals";
import { StandardHeader } from "@/python/structSpecs/LevelTypes";

interface TestGeometryProps {
  header: StandardHeader;
  globals: GlobalsInterface;
}

export function TestGeometry({ header, globals }: TestGeometryProps) {
  const mapWidthPixels = header.mapWidth * globals.TILE_INGAME_SIZE;
  const mapDepthPixels = header.mapHeight * globals.TILE_INGAME_SIZE;
  const mapTileSize = header.tileSize;
  const yScale = globals.TILE_INGAME_SIZE / mapTileSize;
  const boxHeight = header.maxY * yScale;

  return (
    <mesh
      position={[
        mapWidthPixels / 2,
        boxHeight / 2, // Positioned so the base is at y=0
        mapDepthPixels / 2,
      ]}
    >
      <boxGeometry args={[mapWidthPixels, boxHeight, mapDepthPixels]} />
      <meshStandardMaterial color="blue" transparent opacity={0.5} />
    </mesh>
  );
}
