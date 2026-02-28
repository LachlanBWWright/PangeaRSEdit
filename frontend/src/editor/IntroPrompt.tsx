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
import { TunnelEditor } from "./tunnel/TunnelEditor";
import { Button } from "@/components/ui/button";
import { Updater, useImmer } from "use-immer";
import {
  Globals,
  DataType,
  Game,
  type GlobalsInterface,
} from "../data/globals/globals";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { BlockHistoryUpdate } from "../data/globals/history";
import LzssWorker from "../utils/lzssWorker?worker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import { toast } from "sonner";
import {
  AtomicLevelData,
  splitLevelData,
  combineLevelData,
  validateResourceForkJson,
  sanitizeResourceForkJson,
} from "../data/utils/levelDataUtils";
import { err, isOk, ok } from "../types/result";
import { createBlankLevel, getDefaultDimensions } from "@/data/levelTemplates";
import { SafeItemTypes, SafeSplineItemTypes } from "../data/items/itemAtoms";
import { extractSafeItemTypes } from "../data/items/extractSafeItemTypes";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import { compileNanosaur1Level } from "./loadLogic/compileNanosaur1Level";
import { serializeMightyMikeLevel } from "./loadLogic/parseMightyMikeFile";
import { isNanosaur1LevelData } from "./loadLogic/typeGuards";
import type { TunnelData } from "@/data/tunnelParser/types";
import { prepareDownloadData } from "./utils/introPromptUtils";
import { createBlankMapImagesForGame } from "./IntroPrompt/canvasUtils";
import { TestGameDialog } from "./TestGameDialog";
import {
  DEFAULT_OTTO_LEVEL,
  OTTO_LEVELS,
  inferLevelNumberFromFilename,
} from "./utils/ottoLevelNumbers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DataHistory {
  items: AtomicLevelData[];
  index: number;
}

export function IntroPrompt() {
  const globals = useAtomValue(Globals);
  const setGlobals = useSetAtom(Globals);

  // Atomic data types instead of monolithic data
  const [headerData, setHeaderData] = useImmer<HeaderData | null>(null);
  const [itemData, setItemData] = useImmer<ItemData | null>(null);
  const [liquidData, setLiquidData] = useImmer<LiquidData | null>(null);
  const [fenceData, setFenceData] = useImmer<FenceData | null>(null);
  const [splineData, setSplineData] = useImmer<SplineData | null>(null);
  const [terrainData, setTerrainData] = useImmer<TerrainData | null>(null);

  // Tunnel data for Bugdom 2 tunnel levels
  const [tunnelData, setTunnelData] = useState<TunnelData | null>(null);
  const [tunnelFileName, setTunnelFileName] = useState<string>("");

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
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [ottoLevelNumber, setOttoLevelNumber] = useState(DEFAULT_OTTO_LEVEL);
  const [terrainRsrcBlob, setTerrainRsrcBlob] = useState<Blob | null>(null);
  const [terrainDataBlob, setTerrainDataBlob] = useState<Blob | null>(null);
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
  const setAllAtomicData = useCallback(
    (atomicData: AtomicLevelData) => {
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
    },
    [
      setHeaderData,
      setItemData,
      setLiquidData,
      setFenceData,
      setSplineData,
      setTerrainData,
      setSafeItemTypes,
      setSafeSplineItemTypes,
    ],
  );

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
    //Wipe history for new map
    if (!headerData) {
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
      if (!headerData) return;
      const currentData = getCurrentAtomicData();
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
    if (
      !mapFile ||
      (globals.DATA_TYPE !== DataType.RSRC_FORK &&
        globals.DATA_TYPE !== DataType.MIGHTY_MIKE &&
        !mapImagesFile)
    ) {
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

    const combinedData = structuredClone(combinedDataResult.value);

    //TODO: Find better solution
    //remove timg from combinedData - needed to fix bug for non-RSRC_FORK games
    if (globals.DATA_TYPE !== DataType.RSRC_FORK) {
      delete combinedData.Timg;
    }

    let mapBlob: Blob;

    // Handle custom binary formats based on Game type
    if (globals.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1: Use custom compiler
      const rawLevelData = combinedData._metadata?.nanosaur1RawLevel;
      if (!isNanosaur1LevelData(rawLevelData)) {
        console.error("Missing raw Nanosaur 1 level data");
        toast.error("Download failed", {
          description: "Missing original raw data. Please reload the level.",
        });
        return;
      }

      const result = compileNanosaur1Level(combinedData, rawLevelData);
      if (result.isErr()) {
        console.error("Nanosaur compilation failed:", result.error);
        toast.error("Download failed", { description: result.error.message });
        return;
      }

      mapBlob = new Blob([result.value], { type: ".ter" });
    } else if (globals.GAME_TYPE === Game.MIGHTY_MIKE) {
      // Mighty Mike: Use custom serializer
      const result = serializeMightyMikeLevel(combinedData);
      if (result.isErr()) {
        console.error("Mighty Mike serialization failed:", result.error);
        toast.error("Download failed", { description: result.error.message });
        return;
      }
      mapBlob = new Blob([result.value], { type: ".map" });
    } else {
      // Standard Resource Fork games: Use rsrcdump-ts

      // Sanitize JSON to remove empty resource arrays (rsrcdump-ts throws on 0 resources)
      const sanitizedData = sanitizeResourceForkJson(combinedData);

      // Validate JSON shape expected by rsrcdump
      const validation = validateResourceForkJson(sanitizedData);
      if (validation.isErr()) {
        console.error("Invalid JSON for resource fork:", validation.error);
        toast.error("Download failed", {
          description: `Invalid map data structure for resource fork: ${validation.error.message}`,
        });
        return;
      }

      // Use rsrcdump-ts to convert JSON to binary
      const saveResult = loadBytesFromJson(
        sanitizedData,
        globals.STRUCT_SPECS,
        [], // onlyTypes
        [], // skipTypes
        true, // adf
      );

      const serializedResult = saveResult.ok
        ? ok(saveResult.value)
        : err(saveResult.error);

      if (serializedResult.isErr()) {
        console.error("Download failed:", serializedResult.error);
        toast.error("Download failed", {
          description: String(serializedResult.error),
        });
        return;
      }

      const loadRes = serializedResult.value;

      if (!loadRes || loadRes.byteLength === 0) {
        console.error("Download failed: Generated map data is empty");
        toast.error("Download failed", {
          description: "Generated map data is empty",
        });
        return;
      }

      mapBlob = new Blob([loadRes.slice(0)], { type: ".ter.rsrc" });
    }

    const mapUrl = URL.createObjectURL(mapBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = mapUrl;
    downloadLink.setAttribute("download", mapFile.name);
    downloadLink.click();

    // For RSRC_FORK games (e.g., Bugdom 1) the texture data (Timg) is
    // embedded in the same resource file; skip the separate texture
    // compression/download flow and finish here.
    // Also skip image download for Mighty Mike (2D game) and Nanosaur (TRT file handles images differently? No, wait)
    // Nanosaur 1 uses .trt files which are separate but not handled here.
    // But standard .ter download is done.
    // Mighty Mike doesn't use mapImages in the same way (tileset).
    if (
      globals.DATA_TYPE === DataType.RSRC_FORK ||
      globals.DATA_TYPE === DataType.MIGHTY_MIKE
    ) {
      toast.success("Map Downloaded!");
      return;
    }

    //Download Images
    if (!mapImages) {
      toast.error("Download failed", {
        description: "No map images are loaded for this level.",
      });
      return;
    }

    toast.loading("Saving Map - Compressing textures");

    //Webworker promise
    const compressTextures = new Promise<DataView[]>((res, err) => {
      const compressedTextures: DataView[] = new Array(mapImages.length);
      const resolvedTextures = { count: 0 };
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
            res(compressedTextures);
          }
          lzssWorker.terminate();
        };

        lzssWorker.postMessage(
          {
            uIntArray: imageData.data,
            //decompressedDataView: decompressedBuffer,
            type: "compress",
            id: i,
          } satisfies LzssMessage,
          [imageData.data.buffer],
        );
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
    imageDownloadLink.setAttribute(
      "download",
      mapImagesFile?.name || "images.ter",
    );
    imageDownloadLink.click();

    toast.success("Map Downloaded!");
  }, [mapFile, mapImagesFile, mapImages, globals, getCurrentAtomicData]);

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

  // Clear all state helper
  const clearAllState = useCallback(() => {
    setMapFile(undefined);
    setAllAtomicData(splitLevelData(null));
    setMapImages(undefined);
    setMapImagesFile(undefined);
    setTunnelData(null);
    setTunnelFileName("");
  }, [setAllAtomicData]);

  const handleCreateBlankLevel = useCallback(
    (gameType: GlobalsInterface) => {
      setGlobals(gameType);
      const dimensions = getDefaultDimensions(gameType.GAME_TYPE);
      const result = createBlankLevel(gameType.GAME_TYPE, dimensions);
      if (result.isErr()) {
        toast.error("Failed to create blank level", {
          description: result.error.message,
        });
        return;
      }
      const blankLevel = result.value;
      const blankAtomicData: AtomicLevelData = {
        headerData: blankLevel.headerData,
        itemData: blankLevel.itemData,
        fenceData: blankLevel.fenceData,
        splineData: blankLevel.splineData,
        liquidData: blankLevel.liquidData,
        terrainData: blankLevel.terrainData,
      };
      setAllAtomicData(blankAtomicData);
      const baseName = gameType.GAME_NAME.replace(/\s+/g, "");
      const fileExtension =
        gameType.DATA_TYPE === DataType.MIGHTY_MIKE ? "map" : "ter";
      const blankMapFile = new File([], `${baseName}.${fileExtension}`);
      setMapFile(blankMapFile);
      const imageExtension =
        gameType.DATA_TYPE === DataType.MIGHTY_MIKE ? "tileset" : "ter";
      const blankImagesFile = new File([], `${baseName}.${imageExtension}`);
      setMapImagesFile(blankImagesFile);
      const mapImagesArray = createBlankMapImagesForGame(
        gameType,
        blankLevel.headerData,
        blankLevel.terrainData,
      );
      setMapImages(mapImagesArray);
      setDataHistory(() => ({ items: [blankAtomicData], index: 0 }));
      setBlockHistoryUpdate(true);
      if (gameType.GAME_TYPE === Game.OTTO_MATIC) {
        setOttoLevelNumber(DEFAULT_OTTO_LEVEL);
      }
    },
    [
      setGlobals,
      setAllAtomicData,
      setBlockHistoryUpdate,
      setDataHistory,
      setMapFile,
      setMapImages,
      setMapImagesFile,
    ],
  );

  const handleTestLevel = useCallback(() => {
    if (globals.GAME_TYPE !== Game.OTTO_MATIC) return;

    const combinedDataResult = combineLevelData(getCurrentAtomicData());
    if (!isOk(combinedDataResult)) {
      toast.error("Cannot compile level data", {
        description: combinedDataResult.error.message,
      });
      return;
    }

    const combinedData = prepareDownloadData(
      combinedDataResult.value,
      globals,
    );

    const sanitizedData = sanitizeResourceForkJson(
      structuredClone(combinedData),
    );

    const validation = validateResourceForkJson(sanitizedData);
    if (validation.isErr()) {
      toast.error("Invalid level data", {
        description: validation.error.message,
      });
      return;
    }

    const saveResult = loadBytesFromJson(
      sanitizedData,
      globals.STRUCT_SPECS,
      [],
      [],
      true,
    );

    const serializedResult = saveResult.ok
      ? ok(saveResult.value)
      : err(saveResult.error);

    if (serializedResult.isErr()) {
      toast.error("Failed to compile level", {
        description: String(serializedResult.error),
      });
      return;
    }

    const loadRes = serializedResult.value;
    if (!loadRes || loadRes.byteLength === 0) {
      toast.error("Compiled level data is empty");
      return;
    }

    setTerrainRsrcBlob(new Blob([loadRes.slice(0)], { type: "application/octet-stream" }));

    if (mapFile) {
      const inferred = inferLevelNumberFromFilename(mapFile.name);
      if (inferred !== undefined) {
        setOttoLevelNumber(inferred);
      }
    }

    setTerrainDataBlob(null);
    setTestDialogOpen(true);
  }, [globals, getCurrentAtomicData, mapFile]);

  // Handle tunnel data updates
  const handleTunnelDataUpdate = useCallback((data: TunnelData) => {
    setTunnelData(data);
  }, []);

  // Handle tunnel editor close
  const handleTunnelClose = useCallback(() => {
    clearAllState();
  }, [clearAllState]);

  // If we have tunnel data, show the tunnel editor
  if (tunnelData) {
    return (
      <TunnelEditor
        tunnelData={tunnelData}
        fileName={tunnelFileName}
        isPlumbing={tunnelFileName.toLowerCase().includes("plumb")}
        onUpdateTunnelData={handleTunnelDataUpdate}
        onClose={handleTunnelClose}
      />
    );
  }

  if (!mapFile || !mapImages)
    return (
      <UploadPrompt
        mapFile={mapFile}
        setMapFile={setMapFile}
        setMapImagesFile={setMapImagesFile}
        setMapImages={setMapImages}
        setData={setAllAtomicData}
        setTunnelData={setTunnelData}
        setTunnelFileName={setTunnelFileName}
        onCreateBlankLevel={handleCreateBlankLevel}
      />
    );
  return (
    <div className="flex flex-col gap-2 text-white overflow-auto min-w-full p-2 md:p-6 h-[calc(100vh-56px)]">
      <div className="flex flex-row items-center justify-center gap-2 mx-auto w-full">
        <Button onClick={clearAllState}>←New Map</Button>
        <div className="flex-1" />

        <Button
          data-testid="download-button"
          onClick={() => {
            const combinedDataResult = combineLevelData(getCurrentAtomicData());
            if (isOk(combinedDataResult)) {
              const combinedData = prepareDownloadData(
                combinedDataResult.value,
                globals,
              );
              setAllAtomicData(splitLevelData(combinedData));
            }
            setBlockHistoryUpdate(true);
            setProcessed(true); //Trigger useEffect for downloading
          }}
        >
          Download
        </Button>
        {globals.GAME_TYPE === Game.OTTO_MATIC && (
          <>
            <Select
              value={String(ottoLevelNumber)}
              onValueChange={(v) => setOttoLevelNumber(Number(v))}
            >
              <SelectTrigger className="w-44" data-testid="otto-level-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OTTO_LEVELS.map((l) => (
                  <SelectItem key={l.levelNumber} value={String(l.levelNumber)}>
                    {`Lv ${String(l.levelNumber + 1)}: ${l.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              data-testid="test-level-button"
              variant="outline"
              onClick={handleTestLevel}
            >
              Test Level
            </Button>
            <TestGameDialog
              open={testDialogOpen}
              onOpenChange={setTestDialogOpen}
              levelNumber={ottoLevelNumber}
              onLevelNumberChange={setOttoLevelNumber}
              terrainRsrcBlob={terrainRsrcBlob}
              terrainDataBlob={terrainDataBlob}
            />
          </>
        )}
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
