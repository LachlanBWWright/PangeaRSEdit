import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/tiles/tileAtoms";
import { Updater } from "use-immer";
import {
  OTTO_SUPERTILE_TEXMAP_SIZE,
  ottoMaticLevel,
} from "../../../python/structSpecs/ottoMaticInterface";
import { FileUpload } from "../../../components/FileUpload";

export function TileMenu({
  data,
  setData,
  mapImages,
  setMapImages,
}: {
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedTile = useAtomValue(SelectedTile);
  //data.YCrd[1000].obj[0]
  console.log(mapImages.map((i) => i.width));
  console.log("Image found");
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <div className="flex flex-col gap-2">
        <p>Replace Selected Tile</p>
        <FileUpload
          acceptType="image"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            if (!file) return;

            const canvas = document.createElement("canvas");
            canvas.width = OTTO_SUPERTILE_TEXMAP_SIZE;
            canvas.height = OTTO_SUPERTILE_TEXMAP_SIZE;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.fillStyle = "black";

            context.drawImage(
              await createImageBitmap(file, {
                resizeWidth: OTTO_SUPERTILE_TEXMAP_SIZE,
                resizeHeight: OTTO_SUPERTILE_TEXMAP_SIZE,
                resizeQuality: "high",
              }),
              0,
              0,
            );
            const newMapImages = [...mapImages];
            newMapImages.splice(
              data.STgd[1000].obj[selectedTile].superTileId,
              1,
              canvas,
            );
            setMapImages(newMapImages);
          }}
        />
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

{
  /*         <select
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
        </select> */
}
