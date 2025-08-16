import { useEffect, useState } from "react";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { UploadPrompt } from "./UploadPrompt";
import { EditorView } from "./EditorView";
import { Button } from "@/components/ui/button";
import { Updater, useImmer } from "use-immer";
import { ottoPreprocessor } from "../data/processors/ottoPreprocessor";
import { Globals } from "../data/globals/globals";
import { useAtom, useAtomValue } from "jotai";
import { BlockHistoryUpdate } from "../data/globals/history";
import LzssWorker from "../utils/lzssWorker?worker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import { toast } from "sonner";
import { PyodideMessage, PyodideResponse } from "@/python/pyodideWorker";

export type DataHistory = {
  items: ottoMaticLevel[];
  index: number;
};

export function IntroPrompt({ pyodideWorker }: { pyodideWorker: Worker }) {
  const globals = useAtomValue(Globals);
  const [data, setData] = useImmer<ottoMaticLevel | null>(null);
  //History of previous states for undo/redo purposes
  const [dataHistory, setDataHistory] = useImmer<DataHistory>({
    items: [],
    index: 0,
  });
  //Set to true to block updating history, so that undo/redo doesn't change the history
  const [blockHistoryUpdate, setBlockHistoryUpdate] =
    useAtom(BlockHistoryUpdate);

  const [mapFile, setMapFile] = useState<undefined | File>(undefined);
  const [mapImagesFile, setMapImagesFile] = useState<undefined | File>(
    undefined,
  );
  const [mapImages, setMapImages] = useState<HTMLCanvasElement[] | undefined>(
    undefined,
  );
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (!processed) return;
    saveMap();
    setProcessed(false);
  }, [processed, data]);

  //Update History
  useEffect(() => {
    //Wipe history for new map
    if (!data) {
      setDataHistory(() => ({ items: [], index: 0 }));
    }
    /*
    Don't update history if change is coming from undo/redo, or something that 
    will trigger an immediate change (e.g spline nubs triggering spline points change)
    */
    if (blockHistoryUpdate) {
      setBlockHistoryUpdate(false);
      return;
    }

    setDataHistory((draft) => {
      if (!data) return;
      //Remove subsequent history
      draft.items.splice(draft.index + 1, draft.items.length - draft.index - 1);
      draft.items.push(data);
      draft.index = draft.items.length - 1;

      //Limit history size
      if (draft.items.length > 10) {
        draft.items.shift();
        draft.index -= 1;
      }
    });
  }, [data]);

  const undoData = () => {
    if (dataHistory.index > 0) {
      setDataHistory((draft) => {
        draft.index -= 1;
      });
      setData(dataHistory.items[dataHistory.index - 1]);
      setBlockHistoryUpdate(true);
    }
  };

  const redoData = () => {
    if (dataHistory.index < dataHistory.items.length - 1) {
      setDataHistory((draft) => {
        draft.index += 1;
      });
      setData(dataHistory.items[dataHistory.index + 1]);
      setBlockHistoryUpdate(true);
    }
  };

  async function saveMap() {
    if (!mapFile || !mapImagesFile) return;

    toast.loading("Processing map data...");

    const loadResPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      pyodideWorker.postMessage({
        type: "load_bytes_from_json",
        json_blob: data,
        converters: globals.STRUCT_SPECS,
        only_types: [],
        skip_types: [],
        adf: "True",
      } satisfies PyodideMessage);

      pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
        if (event.data.type === "load_bytes_from_json") {
          resolve(event.data.result);
        } else {
          reject(new Error("Unexpected response from pyodide worker"));
        }
      };
    });
    const loadRes = await loadResPromise;

    const mapBlob = new Blob([loadRes], { type: ".ter.rsrc" });
    const mapUrl = URL.createObjectURL(mapBlob);

    let downloadLink = document.createElement("a");
    downloadLink.href = mapUrl;
    downloadLink.setAttribute("download", mapFile.name);
    downloadLink.click();

    //Download Images
    if (!mapImages) return;

    toast.loading("Compressing textures...");

    //Webworker promise
    const compressTextures: Promise<DataView[]> = new Promise((res, err) => {
      const compressedTextures: DataView[] = new Array(mapImages.length);
      const resolvedTextures = { count: 0 };
      console.time("compress");
      for (let i = 0; i < mapImages.length; i++) {
        const canvasCtx = mapImages[i].getContext("2d");
        if (!canvasCtx) {
          err(new Error("Could not get canvas context"));
          return;
        }

        const imageData = canvasCtx.getImageData(
          0,
          0,
          mapImages[i].width,
          mapImages[i].height,
        );
        //const decompressedBuffer = imageDataToSixteenBit(imageData.data);

        const lzssWorker = new LzssWorker();
        lzssWorker.onmessage = (e: MessageEvent<LzssResponse>) => {
          const data = e.data;
          if (data.type !== "compressRes") return;

          compressedTextures[data.id] = new DataView(data.dataBuffer);
          resolvedTextures.count++;

          if (resolvedTextures.count === mapImages.length) {
            console.timeEnd("compress");
            res(compressedTextures);
          }
          lzssWorker.terminate();
        };

        console.log("Before", imageData.data.buffer.byteLength);
        lzssWorker.postMessage(
          {
            uIntArray: imageData.data,
            //decompressedDataView: decompressedBuffer,
            type: "compress",
            id: i,
          } satisfies LzssMessage,
          [imageData.data.buffer],
        );
        console.log("After", imageData.data.buffer.byteLength);
      }
    });
    const bufferList = await compressTextures;
    //Combine into single buffer
    // Calculate total size needed for combined buffer
    let totalSize = 0;
    for (const buffer of bufferList) {
      totalSize += 4 + buffer.byteLength; // 4 bytes for size header + buffer size
    }

    // Create a new buffer to hold all textures
    const imageDownloadBuffer = new DataView(new ArrayBuffer(totalSize));
    // Fill imageDownloadBuffer with data from bufferList
    let pos2 = 0;
    for (let i = 0; i < bufferList.length; i++) {
      const buffer = bufferList[i];
      // Write size header (4 bytes)
      imageDownloadBuffer.setInt32(pos2, buffer.byteLength);
      pos2 += 4;

      // Copy buffer data
      for (let j = 0; j < buffer.byteLength; j++) {
        imageDownloadBuffer.setUint8(pos2, buffer.getUint8(j));
        pos2++;
      }
    }

    const imageBlob = new Blob([imageDownloadBuffer.buffer], {
      type: ".ter",
    });
    const imageUrl = URL.createObjectURL(imageBlob);

    downloadLink = document.createElement("a");
    downloadLink.href = imageUrl;
    downloadLink.setAttribute("download", mapImagesFile.name);
    downloadLink.click();

    toast.success("Map Downloaded!");
  }

  if (!mapFile || !mapImages)
    return (
      <UploadPrompt
        mapFile={mapFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
        pyodideWorker={pyodideWorker}
        setData={setData}
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

        <Button
          onClick={() => {
            ottoPreprocessor(setData as Updater<ottoMaticLevel>, globals);
            setBlockHistoryUpdate(true);
            setProcessed(true); //Trigger useEffect for downloading
          }}
        >
          Download
        </Button>
      </div>
      <hr />
      {data !== null && data !== undefined && mapImages ? (
        <EditorView
          data={data}
          setData={setData as Updater<ottoMaticLevel>}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
