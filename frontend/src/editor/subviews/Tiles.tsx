import {
  OTTO_SUPERTILE_SIZE,
  OTTO_SUPERTILE_TEXMAP_SIZE,
  ottoMaticLevel,
} from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image, Rect } from "react-konva";
import { Fragment, useMemo } from "react";
import { SelectedTile } from "../../data/tiles/tileAtoms";
import { useAtom } from "jotai";

export function Tiles({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  //if (!data.Itms) return <></>;\
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
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
      {imageGrid.map((img, i) => {
        const isSelected = selectedTile === i;

        return (
          <Fragment key={i}>
            <Image
              image={superTileGrid[i].superTileId === 0 ? undefined : img}
              onClick={() => setSelectedTile(i)}
              x={
                (i * OTTO_SUPERTILE_TEXMAP_SIZE) %
                (OTTO_SUPERTILE_TEXMAP_SIZE * supertilesWide)
              }
              y={Math.floor(i / supertilesWide) * OTTO_SUPERTILE_TEXMAP_SIZE}
              width={OTTO_SUPERTILE_TEXMAP_SIZE}
              height={OTTO_SUPERTILE_TEXMAP_SIZE}
              fill={isSelected ? "red" : ""}
            />
            {isSelected && (
              <Rect
                onClick={() => setSelectedTile(i)}
                x={
                  (i * OTTO_SUPERTILE_TEXMAP_SIZE) %
                  (OTTO_SUPERTILE_TEXMAP_SIZE * supertilesWide)
                }
                y={Math.floor(i / supertilesWide) * OTTO_SUPERTILE_TEXMAP_SIZE}
                width={OTTO_SUPERTILE_TEXMAP_SIZE}
                height={OTTO_SUPERTILE_TEXMAP_SIZE}
                stroke="red"
              />
            )}
          </Fragment>
        );
      })}
    </Layer>
  );
}
