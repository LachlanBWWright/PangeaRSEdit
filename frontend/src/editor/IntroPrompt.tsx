import { useEffect, useState, useCallback } from "react";
import { ResultAsync, okAsync } from "neverthrow";
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
import { toast } from "sonner";
import { errorSchema } from "@/schemas/common";
import {
  AtomicLevelData,
  splitLevelData,
  combineLevelData,
} from "../data/utils/levelDataUtils";
import { createBlankLevel, getDefaultDimensions } from "@/data/levelTemplates";
import { SafeItemTypes, SafeSplineItemTypes } from "../data/items/itemAtoms";
import { extractSafeItemTypes } from "../data/items/extractSafeItemTypes";
import type { TunnelData } from "@/data/tunnelParser/types";
import { prepareDownloadData } from "./utils/introPromptUtils";
import { createBlankMapImagesForGame } from "./IntroPrompt/canvasUtils";
import { NewMapConfirmDialog } from "./IntroPrompt/NewMapConfirmDialog";
import { TestGameDialog } from "./TestGameDialog";
import { LevelActionMenu } from "./LevelActionMenu";
import {
  GAME_PORT_CONFIGS,
  inferPreviewLevelFromFilename,
} from "./utils/gamePortConfig";
import { MIGHTY_MIKE_LEVELS } from "./utils/mightyMikeLevelNumbers";
import {
  buildPreviewTerrainBlobs,
  saveMap as saveLevelFiles,
} from "@/data/saveMap/saveMap";
import {
  editorNavbarActionsAtom,
  editorNavbarLeftAtom,
  editorNavbarOpenAtom,
} from "@/data/globals/editorNavbarAtoms";
import { createSavedLevel } from "@/api/savedLevelsApi";
import { getMe } from "@/api/authApi";
import { getGoogleSignInUrl } from "@/api/authApi";
import { mapErr } from "@/utils/mapErr";
import { currentAuthUserAtom } from "@/data/globals/authState";

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
  const authUser = useAtomValue(currentAuthUserAtom);
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
  const canSaveToCloud = authUser !== null;

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

    const saveToastId = "save-map";
    toast.loading("Processing map data...", { id: saveToastId });
    const combinedDataResult = combineLevelData(getCurrentAtomicData());

    if (combinedDataResult.isErr()) {
      toast.error("Download failed", {
        id: saveToastId,
        description: combinedDataResult.error,
      });
      return;
    }

    const combinedData = prepareDownloadData(combinedDataResult.value, globals);
    await saveLevelFiles({
      mapFile,
      mapImagesFile,
      mapImages,
      data: combinedData,
      globals,
      mapDownloadName:
        globals.GAME_TYPE === Game.MIGHTY_MIKE
          ? getCanonicalMightyMikeFilename(mapFile.name)
          : mapFile.name,
      onProgress: ({ message, completed, total }) => {
        const description =
          completed && total ? `${message} (${completed}/${total})` : message;
        toast.loading("Processing map data...", {
          id: saveToastId,
          description,
        });
      },
      toast: ({ title, description }) => {
        if (title === "Map Downloaded!") {
          toast.success(title, { id: saveToastId, description });
          return;
        }
        toast.error(title, { id: saveToastId, description });
      },
    });
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
          description: result.error,
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
        description: combinedDataResult.error,
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
    const previewToastId = "prepare-preview-level-data";
    void buildPreviewTerrainBlobs(
      combinedData,
      globals,
      mapImages,
      ({ message, completed, total }) => {
        const description =
          completed && total ? `${message} (${completed}/${total})` : message;
        toast.loading("Preparing level data...", {
          id: previewToastId,
          description,
        });
      },
    )
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
            id: previewToastId,
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
        toast.dismiss(previewToastId);
      })
      .catch((error: unknown) => {
        console.error("[GamePreview] Preview serialization failed", error);
        const parseResult = errorSchema.safeParse(error);
        toast.error("Preview failed", {
          id: previewToastId,
          description: parseResult.success
            ? parseResult.data
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
    // Keep the click handler lightweight so the menu interaction stays responsive.
    // The actual serialization happens in the level I/O worker inside saveMap().
    setBlockHistoryUpdate(true);
    setProcessed(true);
  }, [setBlockHistoryUpdate]);

  const handleSaveToCloud = useCallback(() => {
    const cloudToastId = "save-to-cloud";
    toast.loading("Checking sign-in…", { id: cloudToastId });
    void ResultAsync.fromPromise(getMe(), mapErr)
      .andThen((meResult) => {
        if (meResult.isErr()) {
          toast.error("Sign in to save to cloud", {
            id: cloudToastId,
            description: "Use the account button in the top right.",
            action: {
              label: "Sign in",
              onClick: () => {
                window.location.href = getGoogleSignInUrl(window.location.href);
              },
            },
          });
          return okAsync(undefined);
        }

        const combinedDataResult = combineLevelData(getCurrentAtomicData());
        if (combinedDataResult.isErr()) {
          toast.error("Could not save: level data error", {
            id: cloudToastId,
            description: combinedDataResult.error,
          });
          return okAsync(undefined);
        }

        toast.loading("Saving to cloud…", { id: cloudToastId });
        return ResultAsync.fromPromise(
          createSavedLevel({
            gameName: String(globals.GAME_TYPE),
            levelId: mapFile?.name ?? "unknown",
            displayName: mapFile?.name ?? "Untitled Level",
            payload: combinedDataResult.value,
            sourceFileMetadata: mapFile
              ? { fileName: mapFile.name, fileSize: mapFile.size }
              : undefined,
          }),
          mapErr,
        ).andThen((saveResult) => {
          if (saveResult.isOk()) {
            toast.success("Level saved to cloud!", { id: cloudToastId });
            return okAsync(undefined);
          }

          toast.error("Save failed", {
            id: cloudToastId,
            description: saveResult.error.message,
          });
          return okAsync(undefined);
        });
      })
      .mapErr((error) => {
        toast.error("Save failed", {
          id: cloudToastId,
          description: error,
        });
        return error;
      })
      .match(
        () => undefined,
        () => undefined,
      );
  }, [getCurrentAtomicData, globals, mapFile]);

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
          <LevelActionMenu
            canPreviewInGame={Boolean(GAME_PORT_CONFIGS[globals.GAME_TYPE])}
            canSaveToCloud={canSaveToCloud === true}
            onPreviewInGame={handleTestLevel}
            onDownload={handleDownload}
            onSaveToCloud={handleSaveToCloud}
          />
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
  }, [
    globals.GAME_TYPE,
    handleDownload,
    handleSaveToCloud,
    handleTestLevel,
    mapFile,
    mapImages,
    canSaveToCloud,
    previewLevelNumber,
    setEditorNavbarActions,
    setEditorNavbarLeft,
    setEditorNavbarOpen,
    terrainDataBytes,
    terrainRsrcBytes,
    terrainTextureBytes,
    testDialogOpen,
  ]);

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
