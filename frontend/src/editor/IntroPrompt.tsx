import { useEffect, useState, useCallback } from "react";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { UploadPrompt } from "./UploadPrompt";
import { EditorView } from "./EditorView";
import { Button } from "@/components/ui/button";
import { Updater, useImmer } from "use-immer";
import { ottoPreprocessor } from "../data/processors/ottoPreprocessor";
import { Globals, DataType } from "../data/globals/globals";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { BlockHistoryUpdate } from "../data/globals/history";
import LzssWorker from "../utils/lzssWorker?worker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import { toast } from "sonner";
import {
  AtomicLevelData,
  splitLevelData,
  combineLevelData,
  isAtomicDataComplete,
  validateResourceForkJson,
  sanitizeResourceForkJson,
} from "../data/utils/levelDataUtils";
import { isOk } from "../types/result";
import { SafeItemTypes, SafeSplineItemTypes } from "../data/items/itemAtoms";
import { extractSafeItemTypes } from "../data/items/extractSafeItemTypes";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";

export interface DataHistory {
  items: AtomicLevelData[];
  index: number;
}

export function IntroPrompt() {
  const globals = useAtomValue(Globals);

  // Atomic data types instead of monolithic data
  const [headerData, setHeaderData] = useImmer<HeaderData | null>(null);
  const [itemData, setItemData] = useImmer<ItemData | null>(null);
  const [liquidData, setLiquidData] = useImmer<LiquidData | null>(null);
  const [fenceData, setFenceData] = useImmer<FenceData | null>(null);
  const [splineData, setSplineData] = useImmer<SplineData | null>(null);
  const [terrainData, setTerrainData] = useImmer<TerrainData | null>(null);

  // Safe item types tracking
  const setSafeItemTypes = useSetAtom(SafeItemTypes);
  const setSafeSplineItemTypes = useSetAtom(SafeSplineItemTypes);

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
  // Helper to get current atomic data
  const getCurrentAtomicData = useCallback((): AtomicLevelData => {
    return {
      headerData,
      itemData,
      liquidData,
      fenceData,
      splineData,
      terrainData,
    };
  }, [headerData, itemData, liquidData, fenceData, splineData, terrainData]);

  // Helper to set all atomic data from AtomicLevelData
  const setAllAtomicData = useCallback((atomicData: AtomicLevelData) => {
    setHeaderData(atomicData.headerData);
    setItemData(atomicData.itemData);
    setLiquidData(atomicData.liquidData);
    setFenceData(atomicData.fenceData);
    setSplineData(atomicData.splineData);
    setTerrainData(atomicData.terrainData);

    // Extract and store safe item types from the loaded level
    const levelData = {
      Hedr: atomicData.headerData,
      Itms: atomicData.itemData?.Itms,
      Spln: atomicData.splineData?.Spln,
      SpIt: atomicData.splineData?.SpIt,
    };

    const { itemTypes, splineItemTypes } = extractSafeItemTypes(levelData);
    
    // Update the atoms
    setSafeItemTypes(itemTypes);
    setSafeSplineItemTypes(splineItemTypes);
  }, [setHeaderData, setItemData, setLiquidData, setFenceData, setSplineData, setTerrainData, setSafeItemTypes, setSafeSplineItemTypes]);

  // Wrapper for header which EditorView expects non-null updates for
  const setHeaderDataNonNull: Updater<HeaderData> = useCallback(
    (updater) => {
      setHeaderData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setHeaderData],
  );

  const setTerrainDataNonNull: Updater<TerrainData> = useCallback(
    (updater) => {
      setTerrainData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setTerrainData],
  );

  //Update History
  useEffect(() => {
    const currentData = getCurrentAtomicData();
    //Wipe history for new map
    if (!isAtomicDataComplete(currentData)) {
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
      if (!isAtomicDataComplete(currentData)) return;
      //Remove subsequent history
      draft.items.splice(draft.index + 1, draft.items.length - draft.index - 1);
      draft.items.push(currentData);
      draft.index = draft.items.length - 1;

      //Limit history size
      if (draft.items.length > 10) {
        draft.items.shift();
        draft.index -= 1;
      }
    });
  }, [
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
    blockHistoryUpdate,
    getCurrentAtomicData,
    setBlockHistoryUpdate,
    setDataHistory,
  ]);

  const undoData = () => {
    if (dataHistory.index > 0) {
      setDataHistory((draft) => {
        draft.index -= 1;
      });
      const historyItem = dataHistory.items[dataHistory.index - 1];
      if (historyItem) {
        setAllAtomicData(historyItem);
        setBlockHistoryUpdate(true);
      }
    }
  };

  const redoData = () => {
    if (dataHistory.index < dataHistory.items.length - 1) {
      setDataHistory((draft) => {
        draft.index += 1;
      });
      const historyItem = dataHistory.items[dataHistory.index + 1];
      if (historyItem) {
        setAllAtomicData(historyItem);
        setBlockHistoryUpdate(true);
      }
    }
  };

  const saveMap = useCallback(async () => {
    if (!mapFile || (globals.DATA_TYPE !== DataType.RSRC_FORK && !mapImagesFile)) {
      console.error("Download failed: Map file or images file not loaded");
      toast.error("Download failed", {
        description:
          "Map file or images file not loaded. Please load a level first.",
      });
      return;
    }

    toast.loading("Processing map data...");

    // Combine atomic data for file I/O
    // Combine atomic data for serialization; optional sections may be missing
    const combinedDataResult = combineLevelData(getCurrentAtomicData());

    if (!isOk(combinedDataResult)) {
      console.error(
        "Download failed: Could not combine level data",
        combinedDataResult.error,
      );
      toast.error("Download failed", {
        description: combinedDataResult.error.message,
      });
      return;
    }

    const combinedData = combinedDataResult.value;

    //TODO: Find better solution
    //remove timg from combinedData - needed to fix bug for non-RSRC_FORK games
    if (globals.DATA_TYPE !== DataType.RSRC_FORK) {
      delete combinedData.Timg;
    }

    try {
      // Validate JSON shape expected by rsrcdump
      const validation = validateResourceForkJson(
        sanitizeResourceForkJson(combinedData),
      );
      if (!validation.ok) {
        console.error("Invalid JSON for resource fork:", validation);
        toast.error("Download failed", {
          description: `Invalid map data structure for resource fork: ${validation.message}`,
        });
        return;
      }

      // Use rsrcdump-ts to convert JSON to binary
      const saveResult = loadBytesFromJson(
        combinedData,
        globals.STRUCT_SPECS,
        [], // onlyTypes
        [], // skipTypes
        true, // adf
      );

      if (!saveResult.ok) {
        console.error("Download failed:", saveResult.error);
        toast.error("Download failed", {
          description: saveResult.error,
        });
        return;
      }

      const loadRes = saveResult.value as Uint8Array;

      if (!loadRes || loadRes.byteLength === 0) {
        console.error("Download failed: Generated map data is empty");
        toast.error("Download failed", {
          description: "Generated map data is empty",
        });
        return;
      }

      const mapBlob = new Blob([loadRes.slice(0)], { type: ".ter.rsrc" });
      const mapUrl = URL.createObjectURL(mapBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = mapUrl;
      downloadLink.setAttribute("download", mapFile.name);
      downloadLink.click();

      console.log(
        `Map downloaded successfully: ${mapFile.name} (${loadRes.byteLength} bytes)`,
      );

      // For RSRC_FORK games (e.g., Bugdom 1) the texture data (Timg) is
      // embedded in the same resource file; skip the separate texture
      // compression/download flow and finish here.
      if (globals.DATA_TYPE === DataType.RSRC_FORK) {
        toast.success("Map Downloaded!");
        return;
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error during map serialization",
      });
      return;
    }

    //Download Images
    if (!mapImages) {
      console.warn("No map images to download");
      return;
    }

    toast.loading("Compressing textures...");

    //Webworker promise
    const compressTextures = new Promise<DataView[]>((res, err) => {
      const compressedTextures: DataView[] = new Array(mapImages.length);
      const resolvedTextures = { count: 0 };
      console.time("compress");
      for (let i = 0; i < mapImages.length; i++) {
        const canvas = mapImages[i];
        if (!canvas) {
          err(new Error(`Canvas at index ${i} is undefined`));
          return;
        }
        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) {
          err(new Error("Could not get canvas context"));
          return;
        }

        const imageData = canvasCtx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
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
    for (const buffer of bufferList) {
      if (!buffer) continue;
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

    const imageDownloadLink = document.createElement("a");
    imageDownloadLink.href = imageUrl;
    imageDownloadLink.setAttribute("download", mapImagesFile?.name || "images.ter");
    imageDownloadLink.click();

    toast.success("Map Downloaded!");
  }, [
    mapFile,
    mapImagesFile,
    mapImages,
    globals,
    getCurrentAtomicData,
  ]);

  useEffect(() => {
    if (!processed) return;
    saveMap();
    Promise.resolve().then(() => setProcessed(false));
  }, [
    processed,
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
    saveMap,
  ]);

  if (!mapFile || !mapImages)
    return (
      <UploadPrompt
        mapFile={mapFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
        setData={setAllAtomicData}
      />
    );
  return (
    <div className="flex flex-col gap-2 text-white overflow-clip min-w-full p-2 md:p-6 h-[calc(100vh-56px)]">
      <div className="flex flex-row items-center justify-center gap-2 mx-auto w-full">
        <Button
          onClick={() => {
            setMapFile(undefined);
            setAllAtomicData(splitLevelData(null));
            setMapImages(undefined);
            setMapImagesFile(undefined);
          }}
        >
          ←New Map
        </Button>
        <div className="flex-1" />

        <Button
          data-testid="download-button"
          onClick={() => {
            const combinedDataResult = combineLevelData(getCurrentAtomicData());
            if (isOk(combinedDataResult)) {
              const combinedData = combinedDataResult.value;
              ottoPreprocessor((updater) => {
                // Apply the update to a combined data structure
                const updated =
                  typeof updater === "function"
                    ? updater(combinedData) ?? combinedData
                    : updater;
                // Split back into atomic data
                setAllAtomicData(splitLevelData(updated));
              }, globals);
            }
            setBlockHistoryUpdate(true);
            setProcessed(true); //Trigger useEffect for downloading
          }}
        >
          Download
        </Button>
      </div>
      <hr />
      {/* Render editor when we have images; allow some atomic pieces to be null. */}
      {mapImages && headerData && terrainData ? (
        <EditorView
          headerData={headerData}
          setHeaderData={setHeaderDataNonNull}
          itemData={itemData}
          setItemData={setItemData}
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          fenceData={fenceData}
          setFenceData={setFenceData}
          splineData={splineData}
          setSplineData={setSplineData}
          terrainData={terrainData}
          setTerrainData={setTerrainDataNonNull}
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
