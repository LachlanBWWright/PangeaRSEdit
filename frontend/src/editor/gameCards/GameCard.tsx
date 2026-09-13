import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { progressToast } from "@/toasts/progressToast";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import { parseNanosaurTerrainWithWorker } from "@/data/level-io/nanosaurTerrainWorkerClient";
import { imagePayloadsToCanvases } from "@/data/level-io/terrainImageSnapshots";
import { DataType, Game, type GlobalsInterface } from "@/data/globals/globals";
import { MiniThreeView } from "./MiniThreeView";
import { MightyMikePreview } from "./MightyMikePreview";
import { Card, CardContent } from "@/components/ui/card";
import { Result } from "neverthrow";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import type { TunnelData, TunnelLevelKind } from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import {
  classifyUploadFile,
  getUploadAcceptTypes,
  updateStagedFiles,
} from "./uploadStagingUtils";
import { cn } from "@/lib/utils";
import {
  formatTypeList,
  getGameCardModelPath,
  getLevelFileType,
  getSupportedUploadTypes,
  getTextureFileType,
} from "./gameCardDisplayState";
import type { ParsedLevelDataFile } from "@/editor/loadLogic/parseLevelDataFile";
import { useFeatureFlags } from "@/config/useFeatureFlags";

const GAME_CARD_PREVIEW_HEIGHT_CLASS = "h-60";

export function GameCard({
  title,
  children,
  globals,
  handleParseLevelDataFile,
  setMapFile,
  setMapImagesFile,
  setMapImages,
  setTunnelData,
  setTunnelFileName,
  setTunnelLevelKind,
  onCreateBlankLevel,
}: {
  title: string;
  children: React.ReactNode;
  globals: GlobalsInterface;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
    companionTextureFile?: File,
    companionMetadataFile?: File,
  ) => Promise<Result<ParsedLevelDataFile, string>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  setTunnelLevelKind: (kind: TunnelLevelKind) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
}) {
  const { levelMetadata: levelMetadataEnabled } = useFeatureFlags();
  const modelPath = getGameCardModelPath(globals.GAME_TYPE);
  const isBugdom2 = globals.GAME_TYPE === Game.BUGDOM_2;
  const isMightyMike = globals.GAME_TYPE === Game.MIGHTY_MIKE;
  const isBugdom1 = globals.DATA_TYPE === DataType.RSRC_FORK;
  const isNanosaur1 = globals.DATA_TYPE === DataType.TRT_FILE;
  const supportsMetadataCompanion = isNanosaur1 || isMightyMike;
  const inputRef = useRef<HTMLInputElement>(null);
  const [stagedLevelFile, setStagedLevelFile] = useState<File | null>(null);
  const [stagedTextureFile, setStagedTextureFile] = useState<File | null>(null);
  const [stagedMetadataFile, setStagedMetadataFile] = useState<File | null>(null);
  const stagedLevelRef = useRef<File | null>(null);
  const stagedTextureRef = useRef<File | null>(null);
  const stagedMetadataRef = useRef<File | null>(null);

  const levelFileType = getLevelFileType(isMightyMike, globals.DATA_TYPE);
  const textureFileType = getTextureFileType(
    isMightyMike,
    isBugdom1,
    isNanosaur1,
  );

  const accepts = useMemo(() => {
    return getUploadAcceptTypes({
      isBugdom2,
      isNanosaur1,
      isMightyMike,
      levelFileType,
      textureFileType,
      hasStagedLevel: stagedLevelFile !== null,
      hasStagedTexture: stagedTextureFile !== null,
      hasStagedMetadata: levelMetadataEnabled && stagedMetadataFile !== null,
      levelMetadataEnabled,
    });
  }, [
    isBugdom2,
    isNanosaur1,
    isMightyMike,
    levelFileType,
    textureFileType,
    stagedLevelFile,
    stagedTextureFile,
    stagedMetadataFile,
    levelMetadataEnabled,
  ]);
  const allTypes = getSupportedUploadTypes(
    levelFileType,
    textureFileType,
    isBugdom2,
    supportsMetadataCompanion,
    levelMetadataEnabled,
  );

  const stagedBadge = (name: string, kind: "level" | "texture" | "metadata") => (
    <span className="inline-flex items-center gap-0.5">
      {name}
      <Button
        type="button"
        variant="icon"
        size="icon"
        className="h-5 w-5 rounded-full p-0.5"
        aria-label={`Remove ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          if (kind === "level") {
            stagedLevelRef.current = null;
            setStagedLevelFile(null);
          } else if (kind === "texture") {
            stagedTextureRef.current = null;
            setStagedTextureFile(null);
          } else {
            stagedMetadataRef.current = null;
            setStagedMetadataFile(null);
          }
        }}
      >
        <X className="w-3 h-3" />
      </Button>
    </span>
  );
  const uploadDropzoneClassName = cn(
    "border-2 border-dashed border-gray-600 rounded-lg p-2 h-20 text-center",
    "cursor-pointer hover:border-gray-500 transition-colors flex flex-col",
    "justify-center gap-0.5",
  );

  const clearStaged = () => {
    stagedLevelRef.current = null;
    stagedTextureRef.current = null;
    stagedMetadataRef.current = null;
    setStagedLevelFile(null);
    setStagedTextureFile(null);
    setStagedMetadataFile(null);
  };

  const loadStagedLevel = async (levelFile: File, textureFile: File | null, metadataFile: File | null) => {
    const activeMetadataFile = levelMetadataEnabled ? metadataFile : null;
    const toastId = "level-load-progress";
    progressToast.start({
      id: toastId,
      title: "Loading level files...",
      description: levelFile.name,
      current: 0,
      completed: textureFile || activeMetadataFile ? 4 : 2,
    });
    setMapFile(levelFile);
    progressToast.update({
      id: toastId,
      title: "Parsing level data...",
      description: levelFile.name,
      current: 1,
      completed: textureFile || activeMetadataFile ? 4 : 2,
    });
    const parseResult = await handleParseLevelDataFile(
      levelFile,
      globals,
      isMightyMike ? (textureFile ?? undefined) : undefined,
      supportsMetadataCompanion
        ? (activeMetadataFile ?? undefined)
        : undefined,
    );
    if (parseResult.isErr()) {
      progressToast.fail({
        id: toastId,
        title: "Failed to parse level data",
        description: parseResult.error,
      });
      return;
    }
    if (parseResult.value.mapImages.length > 0) {
      setMapImages([...parseResult.value.mapImages]);
      if (parseResult.value.mapImagesFile) {
        setMapImagesFile(parseResult.value.mapImagesFile);
      }
    }
    if (textureFile && !isMightyMike) {
      progressToast.update({
        id: toastId,
        title: "Decoding terrain textures...",
        description: textureFile.name,
        current: 2,
        completed: 4,
      });
      const buffer = await textureFile.arrayBuffer();

      if (isNanosaur1) {
        const tilesResult = await parseNanosaurTerrainWithWorker(buffer);
        if (tilesResult.isErr() || tilesResult.value.length === 0) {
          progressToast.fail({
            id: toastId,
            title: "Failed to load textures",
            description: "No terrain textures decoded",
          });
          console.error("[terrain] staged Nanosaur texture decode failed", {
            gameName: globals.GAME_NAME,
            levelFile: levelFile.name,
            textureFile: textureFile.name,
            textureBytes: buffer.byteLength,
          });
          return;
        }

        const canvasesResult = imagePayloadsToCanvases(tilesResult.value);
        if (canvasesResult.isErr()) {
          progressToast.fail({
            id: toastId,
            title: "Failed to materialize textures",
            description: canvasesResult.error,
          });
          return;
        }
        setMapImagesFile(textureFile);
        setMapImages(canvasesResult.value);
      } else {
        const mapImagesResult = await loadMapImages(
          new DataView(buffer),
          globals,
          ({ completed, total }) => {
            if (total <= 0) {
              return;
            }

            const percent = Math.floor((completed / total) * 100);
            progressToast.update({
              id: toastId,
              title: "Decoding terrain textures...",
              description: `${completed}/${total} supertiles (${percent}%)`,
              current: 2 + completed / total,
              completed: 4,
            });
          },
        );
        if (mapImagesResult.isErr()) {
          progressToast.fail({
            id: toastId,
            title: "Failed to load textures",
            description: mapImagesResult.error,
          });
          console.error("[terrain] staged texture decode failed", {
            gameName: globals.GAME_NAME,
            levelFile: levelFile.name,
            textureFile: textureFile.name,
            error: mapImagesResult.error,
          });
          return;
        }

        setMapImagesFile(textureFile);
        setMapImages(mapImagesResult.value);
      }
    }
    clearStaged();
    progressToast.complete({
      id: toastId,
      title: "Level loaded",
    });
  };

  const handleFile = async (file: File) => {
    const fileKind = classifyUploadFile(
      file.name,
      levelFileType,
      textureFileType,
      isBugdom2,
      supportsMetadataCompanion,
      levelMetadataEnabled,
    );
    if (fileKind === "tunnel") {
      const result = parseTunnelFile(await file.arrayBuffer());
      if (result.isErr()) {
        toast.error("Failed to parse tunnel file", {
          description: result.error,
        });
        return;
      }
      const levelKind = file.name.toLowerCase().includes("plumb")
        ? "plumbing"
        : file.name.toLowerCase().includes("gutter")
          ? "gutter"
          : null;
      if (levelKind === null) {
        toast.error("Choose a Plumbing.tun or Gutter.tun filename", {
          description: "The game uses different models and collision rules for each tunnel level.",
        });
        return;
      }
      setTunnelFileName(file.name);
      setTunnelLevelKind(levelKind);
      setTunnelData(result.value);
      toast.success("Tunnel level loaded");
      return;
    }

    const isLevel = fileKind === "level";
    const isTexture = fileKind === "texture";
    const isMetadata = levelMetadataEnabled && fileKind === "metadata";

    if (!isLevel && !isTexture && !isMetadata) {
      toast.error("Unsupported file type", {
        description: `Expected ${accepts}`,
      });
      return;
    }

    const nextStaged = updateStagedFiles(
      {
        level: stagedLevelRef.current,
        texture: stagedTextureRef.current,
        metadata: stagedMetadataRef.current,
      },
      file,
      fileKind,
    );
    const nextLevel = nextStaged.level;
    const nextTexture = nextStaged.texture;

    if (isLevel) {
      stagedLevelRef.current = file;
      setStagedLevelFile(file);
      toast.success("Level file staged", {
        description: file.name,
      });
    }
    if (isTexture) {
      stagedTextureRef.current = file;
      setStagedTextureFile(file);
      toast.success("Texture file staged", {
        description: file.name,
      });
    }
    if (isMetadata) {
      stagedMetadataRef.current = file;
      setStagedMetadataFile(file);
      toast.success("Metadata companion staged", { description: file.name });
    }

    if (!textureFileType) {
      if (nextLevel) {
        await loadStagedLevel(
          nextLevel,
          null,
          levelMetadataEnabled ? (nextStaged.metadata ?? null) : null,
        );
      }
      return;
    }

    if (nextLevel && (nextTexture || (levelMetadataEnabled && nextStaged.metadata))) {
      await loadStagedLevel(
        nextLevel,
        nextTexture,
        levelMetadataEnabled ? (nextStaged.metadata ?? null) : null,
      );
      return;
    }

    toast.message("File staged", {
      description: nextLevel
        ? `Now upload ${textureFileType} to finish loading`
        : `Now upload ${levelFileType} to finish loading`,
    });
  };

  const onInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    toast.message("Processing selected files", {
      description: `${files.length} file${files.length > 1 ? "s" : ""} selected`,
    });
    for (const file of files) {
      await handleFile(file);
    }
    event.target.value = "";
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      return;
    }
    toast.message("Processing dropped files", {
      description: `${files.length} file${files.length > 1 ? "s" : ""} dropped`,
    });
    for (const file of files) {
      await handleFile(file);
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col min-h-125 h-full bg-gray-800 border-gray-700 text-white",
      )}
    >
      <CardContent className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex-none min-h-8 text-center">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="flex-none flex flex-col items-center">
          {isMightyMike ? (
            <MightyMikePreview className={GAME_CARD_PREVIEW_HEIGHT_CLASS} />
          ) : (
            <MiniThreeView
              gltfUrl={modelPath}
              gameType={globals.GAME_TYPE}
              className={GAME_CARD_PREVIEW_HEIGHT_CLASS}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col text-base min-w-40">
          <div className="overflow-y-auto min-h-0 flex-1 space-y-2">
            <Button
              className="w-full"
              onClick={() => onCreateBlankLevel(globals)}
            >
              Create Blank Level
            </Button>
            {children}
          </div>
        </div>

        <div className="flex-none border-t border-gray-700 pt-2 space-y-1">
          <div
            className={cn(uploadDropzoneClassName)}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-300">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1 break-all">
              {levelMetadataEnabled && stagedMetadataFile ? (
                <>
                  Staged: {stagedBadge(stagedMetadataFile.name, "metadata")}{" "}
                  {stagedLevelFile ? "— metadata ready" : "— now upload level file"}
                </>
              ) : stagedLevelFile && stagedTextureFile ? (
                <>
                  Staged: {stagedBadge(stagedLevelFile.name, "level")},{" "}
                  {stagedBadge(stagedTextureFile.name, "texture")}
                </>
              ) : stagedLevelFile ? (
                <>
                  Staged: {stagedBadge(stagedLevelFile.name, "level")} — now
                  upload {textureFileType} file
                </>
              ) : stagedTextureFile ? (
                <>
                  Staged: {stagedBadge(stagedTextureFile.name, "texture")} — now
                  upload {levelFileType} file
                </>
              ) : (
                <>Accepts {formatTypeList(allTypes)}</>
              )}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accepts}
            multiple
            onChange={onInputChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
