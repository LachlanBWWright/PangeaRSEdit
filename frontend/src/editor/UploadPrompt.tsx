import { Button } from "../components/Button";
import { FileUpload } from "../components/FileUpload";
import { lzssDecompress } from "../utils/lzss";
import { OTTO_SUPERTILE_TEXMAP_SIZE } from "../python/structSpecs/ottoMaticInterface";
import { sixteenBitToImageData } from "../utils/imageConverter";

//import level1Url from "./assets/ottoMatic/terrain/EarthFarm.ter.rsrc?url";

export function UploadPrompt({
  mapFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
}: {
  mapFile: File | undefined;
  setMapFile: (file: File) => void;
  setMapImagesFile: (file: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
}) {
  const useFile = async (url: string) => {
    const rsrcName = url + ".rsrc"; //.ter to .ter.rsrc
    const name = rsrcName.split("/").pop();
    if (!name) return;

    const res = await fetch(rsrcName);
    const file = await res.blob();
    setMapFile(new File([file], name));

    const imgRes = await fetch(url);
    const img = await imgRes.blob();
    const imgFile = new File([img], url.split("/").pop() ?? "");
    const imgBuffer = await imgFile.arrayBuffer();
    const imgDataView = new DataView(imgBuffer);
    const mapImages = loadMapImages(imgDataView);

    setMapImagesFile(imgFile);
    setMapImages(mapImages);
  };

  return (
    <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center">
      <div className="w-1/2">
        <p>Upload Level Data (.ter.rsrc)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter.rsrc"
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;

            const file = e.target.files[0];
            setMapFile(file);
          }}
        />
        <p>Upload Texture Data (.ter)</p>
        <FileUpload
          className="text-2xl"
          acceptType=".ter"
          disabled={!mapFile}
          handleOnChange={async (e) => {
            if (!e.target?.files?.[0]) return;
            const mapImagesFile = e.target.files[0];
            const buffer = await mapImagesFile.arrayBuffer();

            //Uses Big Endian by default - Which is what Otto uses
            const dataView = new DataView(buffer);

            const mapImages = loadMapImages(dataView);
            setMapImagesFile(mapImagesFile);
            setMapImages(mapImages);
          }}
        />
      </div>

      <div className="grid grid-cols-1 grid-rows-11 grid-flow-col text-2xl gap-1">
        <p>Otto Matic Levels</p>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/EarthFarm.ter")}
        >
          Level 1
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BlobWorld.ter")}
        >
          Level 2
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BlobBoss.ter")}
        >
          Level 3
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/Apocalypse.ter")}
        >
          Level 4
        </Button>
        <Button onClick={() => useFile("assets/ottoMatic/terrain/Cloud.ter")}>
          Level 5
        </Button>
        <Button onClick={() => useFile("assets/ottoMatic/terrain/Jungle.ter")}>
          Level 6
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/JungleBoss.ter")}
        >
          Level 7
        </Button>
        <Button onClick={() => useFile("assets/ottoMatic/terrain/FireIce.ter")}>
          Level 8
        </Button>
        <Button onClick={() => useFile("assets/ottoMatic/terrain/Saucer.ter")}>
          Level 9
        </Button>
        <Button
          onClick={() => useFile("assets/ottoMatic/terrain/BrainBoss.ter")}
        >
          Level 10
        </Button>
      </div>
    </div>
  );
}

function loadMapImages(dataView: DataView): HTMLCanvasElement[] {
  let offset = 0;
  let numSupertiles = 0;

  const mapImages: HTMLCanvasElement[] = [];
  const mapImagesData: ArrayBuffer[] = [];

  const canvas = document.createElement("canvas");
  canvas.width = OTTO_SUPERTILE_TEXMAP_SIZE;
  canvas.height = OTTO_SUPERTILE_TEXMAP_SIZE;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  //Read Each
  while (offset != dataView.byteLength) {
    numSupertiles++;
    let size = dataView.getInt32(offset);

    offset += 4;
    const buffer = new DataView(dataView.buffer.slice(offset, offset + size));

    const decompressedSize =
      OTTO_SUPERTILE_TEXMAP_SIZE * OTTO_SUPERTILE_TEXMAP_SIZE * 2;
    const decompressedBuffer = new DataView(new ArrayBuffer(decompressedSize));
    lzssDecompress(buffer, decompressedBuffer);
    mapImagesData.push(decompressedBuffer.buffer);

    //const imgCanvas = document.createElement("canvas");
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = OTTO_SUPERTILE_TEXMAP_SIZE;
    imgCanvas.height = OTTO_SUPERTILE_TEXMAP_SIZE;
    const imgCtx = imgCanvas.getContext("2d");

    const imageData = imgCtx?.getImageData(
      0,
      0,
      imgCanvas.width,
      imgCanvas.height,
    );

    if (!imageData) {
      throw new Error("Could not create image data");
    }

    sixteenBitToImageData(decompressedBuffer, imageData);

    if (!imgCtx) {
      throw new Error("Bad data!");
    }
    //16-bit buffer from current buffer
    imgCtx?.putImageData(imageData, 0, 0);

    offset += size;
    imgCanvas;
    mapImages.push(imgCanvas);
  }
  return mapImages;
}
