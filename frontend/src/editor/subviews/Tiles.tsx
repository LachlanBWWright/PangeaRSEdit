import {
  OTTO_SUPERTILE_SIZE,
  ottoMaticLevel,
} from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image } from "react-konva";
import { OTTO_SUPERTILE_TEXMAP_SIZE } from "../UploadPrompt";
import { useMemo } from "react";

export function Tiles({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  //if (!data.Itms) return <></>;
  const header = data.Hedr[1000].obj;
  const supertilesWide = header.mapWidth / OTTO_SUPERTILE_SIZE;
  const superTileGrid = data.STgd[1000].obj;

  const imageGrid = useMemo(() => {
    const imageArray: HTMLCanvasElement[] = [];
    for (const supertile of superTileGrid) {
      imageArray.push(mapImages[supertile.superTileId]);
    }
    return imageArray;
  }, [data.Hedr, data.STgd, mapImages]);
  //Create blank image

  return (
    <Layer>
      {imageGrid.map((img, i) => (
        <Image
          key={i}
          image={img}
          x={
            (i * OTTO_SUPERTILE_TEXMAP_SIZE) %
            (OTTO_SUPERTILE_TEXMAP_SIZE * supertilesWide)
          }
          y={Math.floor(i / supertilesWide) * OTTO_SUPERTILE_TEXMAP_SIZE}
          width={OTTO_SUPERTILE_TEXMAP_SIZE}
          height={OTTO_SUPERTILE_TEXMAP_SIZE}
        />
      ))}
    </Layer>
  );
}
