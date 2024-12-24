import { useAtomValue } from "jotai";
import { Layer, Stage, Image } from "react-konva";
import { SelectedTile } from "../../../data/tiles/tileAtoms";
import { Updater } from "use-immer";
import {
  OTTO_SUPERTILE_SIZE,
  // globals.SUPERTILE_TEXMAP_SIZE,
  ottoMaticLevel,
} from "../../../python/structSpecs/ottoMaticInterface";
import { FileUpload } from "../../../components/FileUpload";
import { Globals } from "../../../data/globals/globals";

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
  const hedr = data.Hedr[1000].obj;
  const globals = useAtomValue(Globals);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col gap-2">
        <p>Replace Selected Tile ({selectedTile})</p>
        <FileUpload
          acceptType="image"
          disabled={data.STgd[1000].obj[selectedTile].superTileId === 0}
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            if (!file) return;

            const canvas = document.createElement("canvas");
            canvas.width = globals.SUPERTILE_TEXMAP_SIZE;
            canvas.height = globals.SUPERTILE_TEXMAP_SIZE;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.fillStyle = "black";

            context.drawImage(
              await createImageBitmap(file, {
                resizeWidth: globals.SUPERTILE_TEXMAP_SIZE,
                resizeHeight: globals.SUPERTILE_TEXMAP_SIZE,
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
        <Stage width={250} height={250} className="mx-auto">
          <Layer>
            <ImageDisplay
              image={mapImages[data.STgd[1000].obj[selectedTile].superTileId]}
            />
          </Layer>
        </Stage>
      </div>
      <div className="flex flex-col gap-2">
        <p>Upload Image For Whole Map</p>
        <FileUpload
          acceptType="image"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            if (!file) return;

            const canvas = document.createElement("canvas");
            canvas.width =
              globals.SUPERTILE_TEXMAP_SIZE *
              (hedr.mapWidth / OTTO_SUPERTILE_SIZE);
            canvas.height =
              globals.SUPERTILE_TEXMAP_SIZE *
              (hedr.mapHeight / OTTO_SUPERTILE_SIZE);
            const context = canvas.getContext("2d");
            if (!context) return;
            context.fillStyle = "black";

            context.drawImage(
              await createImageBitmap(file, {
                resizeWidth:
                  globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapWidth / OTTO_SUPERTILE_SIZE),
                resizeHeight:
                  globals.SUPERTILE_TEXMAP_SIZE *
                  (hedr.mapHeight / OTTO_SUPERTILE_SIZE),
                resizeQuality: "high",
              }),
              0,
              0,
            );

            const canvasArray: HTMLCanvasElement[] = [];

            const blackCanvas = document.createElement("canvas");
            blackCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
            blackCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
            const blackContext = blackCanvas.getContext("2d");
            if (!blackContext) return;
            blackContext.fillStyle = "black";
            canvasArray.push(blackCanvas);
            for (let i = 0; i < hedr.mapHeight / OTTO_SUPERTILE_SIZE; i++) {
              for (let j = 0; j < hedr.mapWidth / OTTO_SUPERTILE_SIZE; j++) {
                const tileImage = context.getImageData(
                  j * globals.SUPERTILE_TEXMAP_SIZE,
                  i * globals.SUPERTILE_TEXMAP_SIZE,
                  j * globals.SUPERTILE_TEXMAP_SIZE +
                    globals.SUPERTILE_TEXMAP_SIZE,
                  i * globals.SUPERTILE_TEXMAP_SIZE +
                    globals.SUPERTILE_TEXMAP_SIZE,
                );

                const newCanvas = document.createElement("canvas");
                newCanvas.width = globals.SUPERTILE_TEXMAP_SIZE;
                newCanvas.height = globals.SUPERTILE_TEXMAP_SIZE;
                const newContext = newCanvas.getContext("2d");
                if (!newContext) return;
                newContext.fillStyle = "black";

                newContext.putImageData(tileImage, 0, 0);

                canvasArray.push(newCanvas);
                //canvasArray.push(canvas);
              }
            }

            setMapImages(canvasArray);
            setData((data) => {
              for (let i = 0; i < data.STgd[1000].obj.length; i++) {
                //1 is added to i because of the blank
                data.STgd[1000].obj[i].superTileId = i + 1;
              }
              data.Hedr[1000].obj.numUniqueSupertiles = canvasArray.length; //Blanks counted as unique supertile
            });
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p>Supertiles Wide: {hedr.mapWidth / OTTO_SUPERTILE_SIZE}</p>
        <p>Supertiles High: {hedr.mapHeight / OTTO_SUPERTILE_SIZE}</p>
        <p>Unique Supertiles {hedr.numUniqueSupertiles}</p>
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
