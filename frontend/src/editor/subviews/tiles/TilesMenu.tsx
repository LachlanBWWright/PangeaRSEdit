import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/tiles/tileAtoms";
import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";

export function TileMenu({
  data,
  setData,
  mapImages,
}: {
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedTile = useAtomValue(SelectedTile);
  //data.YCrd[1000].obj[0]
  console.log(mapImages);
  if (!mapImages[20]) return <></>;
  console.log("Image found");
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <div className="flex flex-col gap-2">
        <select
          className="text-black"
          value={selectedTile}
          onChange={(e) => {
            //setSelectedTile(parseInt(e.target.value)
            setData((data) => {
              data.STgd[1000].obj[selectedTile].superTileId = parseInt(
                e.target.value,
              );
            });
          }}
        >
          {mapImages.map((_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <Stage width={250} height={250}>
          <Layer>
            <ImageDisplay
              image={mapImages[data.STgd[1000].obj[selectedTile].superTileId]}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function ImageDisplay({ image }: { image: HTMLCanvasElement }) {
  if (!image) return <></>;

  return <Image image={image} width={250} height={250} />;
}
