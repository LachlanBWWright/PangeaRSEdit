import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image, Rect } from "react-konva";
import { Fragment, useMemo } from "react";
import { SelectedTile } from "../../data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";

export function Supertiles({
  data,
  mapImages,
}: {
  data: ottoMaticLevel;
  mapImages: HTMLCanvasElement[];
}) {
  //if (!data.Itms) return <></>;\
  const globals = useAtomValue(Globals);
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const header = data.Hedr[1000].obj;
  const supertilesWide = header.mapWidth / globals.TILES_PER_SUPERTILE;
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
              image={img}
              onClick={() => setSelectedTile(i)}
              x={
                (i * globals.SUPERTILE_TEXMAP_SIZE) %
                (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
              }
              y={Math.floor(i / supertilesWide) * globals.SUPERTILE_TEXMAP_SIZE}
              width={globals.SUPERTILE_TEXMAP_SIZE}
              height={globals.SUPERTILE_TEXMAP_SIZE}
              fill={isSelected ? "red" : ""}
            />
            {isSelected && (
              <Rect
                onClick={() => setSelectedTile(i)}
                x={
                  (i * globals.SUPERTILE_TEXMAP_SIZE) %
                  (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
                }
                y={
                  Math.floor(i / supertilesWide) * globals.SUPERTILE_TEXMAP_SIZE
                }
                width={globals.SUPERTILE_TEXMAP_SIZE}
                height={globals.SUPERTILE_TEXMAP_SIZE}
                stroke="red"
              />
            )}
          </Fragment>
        );
      })}
    </Layer>
  );
}
