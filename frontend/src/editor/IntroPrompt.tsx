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
import { errorSchema } from "@/schemas/common";
import {
  AtomicLevelData,
  splitLevelData,
  combineLevelData,
  validateResourceForkJson,
  sanitizeResourceForkJson,
} from "../data/utils/levelDataUtils";
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
import { NewMapConfirmDialog } from "./IntroPrompt/NewMapConfirmDialog";
import { TestGameDialog } from "./TestGameDialog";
import {
  GAME_PORT_CONFIGS,
  inferPreviewLevelFromFilename,
} from "./utils/gamePortConfig";
import { MIGHTY_MIKE_LEVELS } from "./utils/mightyMikeLevelNumbers";
import { buildPreviewTerrainBlobs } from "@/data/saveMap/saveMap";
import {
  editorNavbarActionsAtom,
  editorNavbarLeftAtom,
  editorNavbarOpenAtom,
} from "@/data/globals/editorNavbarAtoms";
import { serializeNanosaurTerrainTextures } from "@/data/processors/classicProprocessor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCanonicalMightyMikeFilename(fileName: string): string {
  const match = MIGHTY_MIKE_LEVELS.find(
    (level) => level.terrainFile.toLowerCase() === fileName.toLowerCase(),
  );
  return match?.terrainFile ?? fileName;
}

export interface DataHistory {
  items: AtomicLevelData[];
  index: number;
}

export function IntroPrompt() {
  const globals = useAtomValue(Globals);
  const setGlobals = useSetAtom(Globals);
  const setEditorNavbarOpen = useSetAtom(editorNavbarOpenAtom);
  const setEditorNavbarLeft = useSetAtom(editorNavbarLeftAtom);
  const setEditorNavbarActions = useSetAtom(editorNavbarActionsAtom);

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
  const [newMapConfirmOpen, setNewMapConfirmOpen] = useState(false);
  const [previewLevelNumber, setPreviewLevelNumber] = useState(0);
  const [terrainDataBytes, setTerrainDataBytes] = useState<
    Uint8Array | null | undefined
  >(undefined);
  const [terrainRsrcBytes, setTerrainRsrcBytes] = useState<
    Uint8Array | null | undefined
  >(undefined);
  const [terrainTextureBytes, setTerrainTextureBytes] = useState<
    Uint8Array | null | undefined
  >(undefined);
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

  // When a terrain file is loaded, infer the level number from the filename
  // so the "Preview in Game" dialog opens at the correct level by default.
  // Fall back to the game's defaultLevel for games without filename inference
  // (e.g. Cro-Mag Rally uses 1-based track numbers, not 0).
  useEffect(() => {
    if (!mapFile) return;
    const portConfig = GAME_PORT_CONFIGS[globals.GAME_TYPE];
    const inferred = inferPreviewLevelFromFilename(
      globals.GAME_TYPE,
      mapFile.name,
    );
    const level = inferred ?? portConfig?.defaultLevel ?? 0;
    Promise.resolve().then(() => setPreviewLevelNumber(level));
  }, [mapFile, globals.GAME_TYPE]);

  // Warn before unloading the tab when a level is loaded to prevent accidental data loss.
  useEffect(() => {
    if (!mapFile) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mapFile]);

  const undoData = () => {
    if (dataHistory.index > 0) {
      // Read target item BEFORE setDataHistory so we use the current (correct) index
      const historyItem = dataHistory.items[dataHistory.index - 1];
      setDataHistory((draft) => {
        draft.index -= 1;
      });
      if (historyItem) {
        setAllAtomicData(historyItem);
        setBlockHistoryUpdate(true);
      }
    }
  };

  const redoData = () => {
    if (dataHistory.index < dataHistory.items.length - 1) {
      // Read target item BEFORE setDataHistory so we use the current (correct) index
      const historyItem = dataHistory.items[dataHistory.index + 1];
      setDataHistory((draft) => {
        draft.index += 1;
      });
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

    if (combinedDataResult.isErr()) {
      console.error(
        "Download failed: Could not combine level data",
        combinedDataResult.error,
      );
      toast.error("Download failed", {
        description: combinedDataResult.error.message,
      });
      return;
    }

    // Strip HTMLCanvasElement references (e.g. tileset.tileImages, collisionImages) before cloning
    const rawCombined = combinedDataResult.value;
    const rawTileset = rawCombined.tileset;
    const cloneableCombined = isRecord(rawTileset)
      ? {
          ...rawCombined,
          tileset: Object.fromEntries(
            Object.entries(rawTileset).filter(
              ([key]) => key !== "tileImages" && key !== "collisionImages",
            ),
          ),
        }
      : rawCombined;
    const combinedData = structuredClone(cloneableCombined);

    //TODO: Find better solution
    //remove timg from combinedData - needed to fix bug for non-RSRC_FORK games
    if (globals.DATA_TYPE !== DataType.RSRC_FORK) {
      delete combinedData.Timg;
    }

    let mapBlob: Blob;

    // Handle custom binary formats based on Game type
    if (globals.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1: Use custom compiler
      const metadata = isRecord(combinedData._metadata)
        ? combinedData._metadata
        : undefined;
      const rawLevelData = metadata?.nanosaur1RawLevel;
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
        toast.error("Download failed", { description: result.error });
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

      if (!saveResult.ok) {
        console.error("Download failed:", saveResult.error);
        toast.error("Download failed", {
          description: String(saveResult.error),
        });
        return;
      }

      const loadRes = saveResult.value;

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
    const mapDownloadName =
      globals.GAME_TYPE === Game.MIGHTY_MIKE
        ? getCanonicalMightyMikeFilename(mapFile.name)
        : mapFile.name;
    downloadLink.setAttribute("download", mapDownloadName);
    downloadLink.click();

    // For RSRC_FORK games (e.g., Bugdom 1) the texture data (Timg) is
    // embedded in the same resource file; skip the separate texture
    // compression/download flow and finish here.
    // Mighty Mike doesn't need a separate image download (tileset is not re-encoded).
    if (
      globals.DATA_TYPE === DataType.RSRC_FORK ||
      globals.DATA_TYPE === DataType.MIGHTY_MIKE
    ) {
      toast.success("Map Downloaded!");
      return;
    }

    // For Nanosaur 1 (TRT_FILE), serialize the edited tile images back into the
    // original raw 16-bit texture file format.
    if (globals.DATA_TYPE === DataType.TRT_FILE) {
      if (!mapImages || mapImages.length === 0) {
        toast.error("Download failed", {
          description: "No tile images are loaded for this level.",
        });
        return;
      }

      const textureResult = serializeNanosaurTerrainTextures(mapImages);
      if (textureResult.isErr()) {
        toast.error("Download failed", {
          description: textureResult.error.message,
        });
        return;
      }

      const trtBlob = new Blob([textureResult.value], {
        type: "application/octet-stream",
      });
      const trtUrl = URL.createObjectURL(trtBlob);
      const trtLink = document.createElement("a");
      trtLink.href = trtUrl;
      trtLink.setAttribute("download", mapImagesFile?.name || "images.trt");
      trtLink.click();
      URL.revokeObjectURL(trtUrl);
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
    setTerrainDataBytes(undefined);
    setTerrainRsrcBytes(undefined);
    setTerrainTextureBytes(undefined);
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
      const portConfig = GAME_PORT_CONFIGS[gameType.GAME_TYPE];
      setPreviewLevelNumber(portConfig?.defaultLevel ?? 0);
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
    const combinedDataResult = combineLevelData(getCurrentAtomicData());
    if (combinedDataResult.isErr()) {
      toast.error("Preview failed", {
        description: combinedDataResult.error.message,
      });
      return;
    }
    const combinedData = prepareDownloadData(combinedDataResult.value, globals);
    console.info("[GamePreview] Preparing preview level data", {
      game: globals.GAME_NAME,
      dataType: globals.DATA_TYPE,
      levelNumber: previewLevelNumber,
      hasMapImages: Boolean(mapImages?.length),
      mapImagesCount: mapImages?.length ?? 0,
    });
    // Reset bytes to undefined (loading sentinel) and open the dialog immediately so
    // the user sees the level selector without any delay.  Serialization (including
    // async LZSS compression for STANDARD games) runs in the background.  The
    // GamePreviewHost shows "Preparing level data…" until the bytes arrive.
    setTerrainDataBytes(undefined);
    setTerrainRsrcBytes(undefined);
    setTerrainTextureBytes(undefined);
    setTestDialogOpen(true);
    void buildPreviewTerrainBlobs(combinedData, globals, mapImages)
      .then((blobs) => {
        if (!blobs) {
          console.error(
            "[GamePreview] Preview serialization returned no bytes",
            {
              game: globals.GAME_NAME,
              dataType: globals.DATA_TYPE,
            },
          );
          toast.error("Preview failed", {
            description: "Could not serialize the selected level for preview.",
          });
          setTerrainDataBytes(null);
          setTerrainRsrcBytes(null);
          setTerrainTextureBytes(null);
          return;
        }
        console.info("[GamePreview] Preview level data serialized", {
          game: globals.GAME_NAME,
          dataBytes: blobs.dataBytes?.byteLength ?? null,
          rsrcBytes: blobs.rsrcBytes?.byteLength ?? null,
          textureBytes: blobs.textureBytes?.byteLength ?? null,
        });
        setTerrainDataBytes(blobs.dataBytes);
        setTerrainRsrcBytes(blobs.rsrcBytes);
        setTerrainTextureBytes(blobs.textureBytes);
      })
      .catch((error: unknown) => {
        console.error("[GamePreview] Preview serialization failed", error);
        const parseResult = errorSchema.safeParse(error);
        toast.error("Preview failed", {
          description: parseResult.success
            ? parseResult.data.message
            : "Could not serialize the selected level for preview.",
        });
        setTerrainDataBytes(null);
        setTerrainRsrcBytes(null);
        setTerrainTextureBytes(null);
      });
  }, [getCurrentAtomicData, globals, mapImages, previewLevelNumber]);

  // Handle tunnel data updates
  const handleTunnelDataUpdate = useCallback((data: TunnelData) => {
    setTunnelData(data);
  }, []);

  // Handle tunnel editor close
  const handleTunnelClose = useCallback(() => {
    clearAllState();
  }, [clearAllState]);

  const handleDownload = useCallback(() => {
    const combinedDataResult = combineLevelData(getCurrentAtomicData());
    if (combinedDataResult.isOk()) {
      const combinedData = prepareDownloadData(
        combinedDataResult.value,
        globals,
      );
      setAllAtomicData(splitLevelData(combinedData));
    }
    setBlockHistoryUpdate(true);
    setProcessed(true);
  }, [getCurrentAtomicData, globals, setAllAtomicData, setBlockHistoryUpdate]);

  const handleConfirmNewMap = useCallback(() => {
    setNewMapConfirmOpen(false);
    clearAllState();
  }, [clearAllState]);

  useEffect(() => {
    const left =
      mapFile && mapImages ? (
        <Button onClick={() => setNewMapConfirmOpen(true)}>←New Map</Button>
      ) : null;
    const editorActions =
      mapFile && mapImages ? (
        <>
          {GAME_PORT_CONFIGS[globals.GAME_TYPE] && (
            <Button
              data-testid="test-level-button"
              variant="outline"
              onClick={handleTestLevel}
            >
              Preview in Game
            </Button>
          )}
          <Button data-testid="download-button" onClick={handleDownload}>
            Download
          </Button>
          {GAME_PORT_CONFIGS[globals.GAME_TYPE] && (
            <TestGameDialog
              open={testDialogOpen}
              onOpenChange={setTestDialogOpen}
              gameType={globals.GAME_TYPE}
              levelNumber={previewLevelNumber}
              onLevelNumberChange={setPreviewLevelNumber}
              terrainDataBytes={terrainDataBytes}
              terrainRsrcBytes={terrainRsrcBytes}
              terrainTextureBytes={terrainTextureBytes}
            />
          )}
        </>
      ) : null;

    setEditorNavbarOpen(Boolean(left || editorActions));
    setEditorNavbarLeft(left);
    setEditorNavbarActions(editorActions);
    return () => {
      setEditorNavbarOpen(false);
      setEditorNavbarLeft(null);
      setEditorNavbarActions(null);
    };
  }, [
    globals.GAME_TYPE,
    handleDownload,
    handleTestLevel,
    mapFile,
    mapImages,
    previewLevelNumber,
    setEditorNavbarActions,
    setEditorNavbarLeft,
    setEditorNavbarOpen,
    terrainDataBytes,
    terrainRsrcBytes,
    terrainTextureBytes,
    testDialogOpen,
  ]);

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
    <div className="flex flex-col gap-2 text-white overflow-hidden min-w-full p-2 md:p-6 flex-1 min-h-0">
      <NewMapConfirmDialog
        open={newMapConfirmOpen}
        onOpenChange={setNewMapConfirmOpen}
        onConfirm={handleConfirmNewMap}
      />
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
