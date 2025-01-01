import { PyodideInterface } from "pyodide";
import { useEffect, useState } from "react";
import { load_bytes_from_json, save_to_json } from "../python/rsrcdump";
import {
  //globals.SUPERTILE_TEXMAP_SIZE,
  ottoMaticLevel,
} from "../python/structSpecs/ottoMaticInterface";
import { UploadPrompt } from "./UploadPrompt";
import { EditorView } from "./EditorView";
import { Button } from "../components/Button";
import { Updater, useImmer } from "use-immer";
import ottoPreprocessor, {
  newJsonProcess,
} from "../data/preprocessors/ottoPreprocessor";
import { lzssCompress } from "../utils/lzss";
import { imageDataToSixteenBit } from "../utils/imageConverter";
import { Globals } from "../data/globals/globals";
import { useAtomValue } from "jotai";

export function MapPrompt({ pyodide }: { pyodide: PyodideInterface }) {
  const globals = useAtomValue(Globals);
  const [data, setData] = useImmer<ottoMaticLevel | null>(null);
  const [mapFile, setMapFile] = useState<undefined | File>(undefined);
  const [mapImagesFile, setMapImagesFile] = useState<undefined | File>(
    undefined,
  );
  const [mapImages, setMapImages] = useState<HTMLCanvasElement[] | undefined>(
    undefined,
  );
  const [processed, setProcessed] = useState(false);
  useEffect(() => {
    const loadMap = async () => {
      if (!mapFile) return;
      const levelBuffer = await mapFile.arrayBuffer();

      let res = await save_to_json<ottoMaticLevel>(
        pyodide,
        levelBuffer,
        globals.STRUCT_SPECS,
        [],
        [],
      );

      newJsonProcess(res, globals);
      setData(res);
    };
    loadMap();
  }, [mapFile]);

  useEffect(() => {
    if (!processed) return;
    saveMap();
    setProcessed(false);
  }, [processed, data]);

  async function saveMap() {
    if (!mapFile || !mapImagesFile) return;
    let loadRes = await load_bytes_from_json(
      pyodide,
      data,
      globals.STRUCT_SPECS,
      [],
      [],
    );

    const mapBlob = new Blob([loadRes], { type: ".ter.rsrc" });
    let mapUrl = URL.createObjectURL(mapBlob);

    let downloadLink = document.createElement("a");
    downloadLink.href = mapUrl;
    downloadLink.setAttribute("download", mapFile.name);
    downloadLink.click();

    //Download Images
    if (!mapImages) return;

    //TODO: Hardcoded values that will break for other games / if actual compression is implemented
    const imageSize =
      globals.SUPERTILE_TEXMAP_SIZE * globals.SUPERTILE_TEXMAP_SIZE * 2;
    const compressedImageSize = imageSize + Math.ceil(imageSize / 8);
    const imageDownloadBuffer = new DataView(
      new ArrayBuffer(mapImages.length * (4 + compressedImageSize)),
    );
    for (let i = 0; i < mapImages.length; i++) {
      const pos = i * (compressedImageSize + 4);
      //New dataview
      //Output file has 32-bit size headers before each image, image is size^2 2-byte pixels
      imageDownloadBuffer.setInt32(pos, compressedImageSize);
      const canvasCtx = mapImages[i].getContext("2d");
      if (!canvasCtx) throw new Error("Could not get canvas context");
      const decompressed = lzssCompress(
        imageDataToSixteenBit(
          canvasCtx.getImageData(0, 0, mapImages[i].width, mapImages[i].height)
            .data,
        ),
      );

      //const decompressed = lzssCompress(new DataView(mapImagesData[i]));
      for (let j = 0; j < decompressed.byteLength; j++) {
        imageDownloadBuffer.setUint8(pos + 4 + j, decompressed.getUint8(j));
      }
    }

    const imageBlob = new Blob([imageDownloadBuffer], { type: ".ter" });
    const imageUrl = URL.createObjectURL(imageBlob);

    downloadLink = document.createElement("a");
    downloadLink.href = imageUrl;
    downloadLink.setAttribute("download", mapImagesFile.name);
    downloadLink.click();
  }

  if (!mapFile || !mapImages)
    return (
      <UploadPrompt
        mapFile={mapFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
      />
    );
  return (
    <div className="flex flex-col gap-2 text-white h-screen max-h-screen overflow-clip min-w-full p-2 md:p-6">
      <div className="flex flex-row items-center justify-center gap-2 mx-auto w-full">
        <Button
          onClick={() => {
            setMapFile(undefined);
            setData(null);
            setMapImages(undefined);
            setMapImagesFile(undefined);
          }}
        >
          ←New Map
        </Button>
        <div className="flex-1" />

        <p className="text-xl">{mapFile.name}</p>
        <Button
          onClick={() => {
            ottoPreprocessor(setData as Updater<ottoMaticLevel>, globals);
            setProcessed(true); //Trigger useEffect for downloading
          }}
        >
          Save and download map
        </Button>
      </div>
      <hr />
      {data !== null && data !== undefined && mapImages ? (
        <EditorView
          data={data}
          setData={setData as Updater<ottoMaticLevel>}
          mapImages={mapImages}
          setMapImages={setMapImages}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
