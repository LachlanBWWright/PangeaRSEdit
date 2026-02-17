import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import { DataType, Game, type GlobalsInterface } from "@/data/globals/globals";
import { MiniThreeView } from "./MiniThreeView";
import { Card, CardContent } from "@/components/ui/card";
import type { Result } from "@/types/result";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import type { TunnelData } from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import {
  classifyUploadFile,
  getUploadAcceptTypes,
  updateStagedFiles,
} from "./uploadStagingUtils";
import { cn } from "@/lib/utils";

const GAME_CARD_PREVIEW_HEIGHT_CLASS = "h-60";

const getModelPath = (gameType: Game): string | undefined => {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return "/glbModels/OttoMatic.glb";
    case Game.BUGDOM:
      return "/glbModels/Bugdom1.glb";
    case Game.BUGDOM_2:
      return "/glbModels/Bugdom2.glb";
    case Game.CRO_MAG:
      return "/glbModels/CroMag.glb";
    case Game.NANOSAUR:
      return "/glbModels/Nanosaur1.glb";
    case Game.NANOSAUR_2:
      return "/glbModels/Nanosaur2.glb";
    case Game.BILLY_FRONTIER:
      return "/glbModels/BillyFrontier.glb";
    case Game.MIGHTY_MIKE:
      return undefined;
    default:
      return "/glbModels/OttoMatic.glb";
  }
};

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
  onCreateBlankLevel,
}: {
  title: string;
  children: React.ReactNode;
  globals: GlobalsInterface;
  handleParseLevelDataFile: (
    file: Blob,
    gameType: GlobalsInterface,
  ) => Promise<Result<unknown, Error>>;
  setMapFile: (f: File) => void;
  setMapImagesFile: (f: File) => void;
  setMapImages: (images: HTMLCanvasElement[]) => void;
  setTunnelData: (data: TunnelData | null) => void;
  setTunnelFileName: (name: string) => void;
  onCreateBlankLevel: (gameType: GlobalsInterface) => void;
}) {
  const modelPath = getModelPath(globals.GAME_TYPE);
  const isBugdom2 = globals.GAME_TYPE === Game.BUGDOM_2;
  const isOttoMatic = globals.GAME_TYPE === Game.OTTO_MATIC;
  const isMightyMike = globals.GAME_TYPE === Game.MIGHTY_MIKE;
  const isBugdom1 = globals.DATA_TYPE === DataType.RSRC_FORK;
  const isNanosaur1 = globals.DATA_TYPE === DataType.TRT_FILE;
  const inputRef = useRef<HTMLInputElement>(null);
  const [stagedLevelFile, setStagedLevelFile] = useState<File | null>(null);
  const [stagedTextureFile, setStagedTextureFile] = useState<File | null>(null);
  const stagedLevelRef = useRef<File | null>(null);
  const stagedTextureRef = useRef<File | null>(null);

  const levelFileType = isMightyMike
    ? ".map"
    : isNanosaur1
      ? ".ter"
      : ".ter.rsrc";
  const textureFileType =
    isMightyMike || isBugdom1 ? null : isNanosaur1 ? ".trt" : ".ter";

  const accepts = useMemo(() => {
    return getUploadAcceptTypes({
      isBugdom2,
      levelFileType,
      textureFileType,
      hasStagedLevel: stagedLevelFile !== null,
      hasStagedTexture: stagedTextureFile !== null,
    });
  }, [
    isBugdom2,
    levelFileType,
    textureFileType,
    stagedLevelFile,
    stagedTextureFile,
  ]);
  const allTypes = [
    levelFileType,
    textureFileType,
    isBugdom2 ? ".tun" : null,
  ].filter((t): t is string => t !== null);

  const formatTypeList = (types: string[]) => {
    if (types.length <= 1) return types[0] ?? "";
    return types.slice(0, -1).join(", ") + " or " + types[types.length - 1];
  };

  const stagedBadge = (name: string, kind: "level" | "texture") => (
    <span className="inline-flex items-center gap-0.5">
      {name}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (kind === "level") {
            stagedLevelRef.current = null;
            setStagedLevelFile(null);
          } else {
            stagedTextureRef.current = null;
            setStagedTextureFile(null);
          }
        }}
        className="inline-flex items-center justify-center rounded-full hover:bg-gray-600 p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
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
    setStagedLevelFile(null);
    setStagedTextureFile(null);
  };

  const loadStagedLevel = async (levelFile: File, textureFile: File | null) => {
    const toastId = toast.loading("Loading level files...");
    setMapImages([]);
    setMapFile(levelFile);
    const parseResult = await handleParseLevelDataFile(levelFile, globals);
    if (parseResult.isErr()) {
      toast.dismiss(toastId);
      toast.error("Failed to parse level data", {
        description: parseResult.error.message,
      });
      return;
    }
    if (textureFile) {
      const buffer = await textureFile.arrayBuffer();
      const mapImagesResult = await loadMapImages(
        new DataView(buffer),
        globals,
      );
      if (mapImagesResult.isErr()) {
        toast.dismiss(toastId);
        toast.error("Failed to load textures", {
          description: mapImagesResult.error.message,
        });
        return;
      }
      setMapImagesFile(textureFile);
      setMapImages(mapImagesResult.value);
    }
    clearStaged();
    toast.dismiss(toastId);
    toast.success("Level loaded");
  };

  const handleFile = async (file: File) => {
    const fileKind = classifyUploadFile(
      file.name,
      levelFileType,
      textureFileType,
      isBugdom2,
    );
    if (fileKind === "tunnel") {
      const result = parseTunnelFile(await file.arrayBuffer());
      if (result.isErr()) {
        toast.error("Failed to parse tunnel file", {
          description: result.error.message,
        });
        return;
      }
      setTunnelFileName(file.name);
      setTunnelData(result.value);
      toast.success("Tunnel level loaded");
      return;
    }

    const isLevel = fileKind === "level";
    const isTexture = fileKind === "texture";

    if (!isLevel && !isTexture) {
      toast.error("Unsupported file type", {
        description: `Expected ${accepts}`,
      });
      return;
    }

    const nextStaged = updateStagedFiles(
      {
        level: stagedLevelRef.current,
        texture: stagedTextureRef.current,
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

    if (!textureFileType) {
      if (nextLevel) {
        await loadStagedLevel(nextLevel, null);
      }
      return;
    }

    if (nextLevel && nextTexture) {
      await loadStagedLevel(nextLevel, nextTexture);
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
        "flex flex-col min-h-[500px] h-full bg-gray-800 border-gray-700 text-white",
      )}
    >
      <CardContent className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex-none min-h-8">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="flex-none flex flex-col items-center">
          <p
            className={cn(
              "text-xs text-center mb-1",
              isOttoMatic ? "invisible" : "text-gray-400",
            )}
          >
            (Not Functional)
          </p>

          {isMightyMike ? (
            <div
              className={cn(
                "w-full flex items-center justify-center",
                GAME_CARD_PREVIEW_HEIGHT_CLASS,
              )}
            >
              <img
                src="https://raw.githubusercontent.com/jorio/MightyMike/refs/heads/master/packaging/MightyMikeRaw.png"
                alt="Mighty Mike"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <MiniThreeView
              gltfUrl={modelPath}
              gameType={globals.GAME_TYPE}
              className={GAME_CARD_PREVIEW_HEIGHT_CLASS}
            />
          )}
        </div>

        <div className="flex-none">
          <Button
            className="w-full"
            onClick={() => onCreateBlankLevel(globals)}
          >
            Create Blank Level
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col text-base min-w-40">
          <div className="overflow-y-auto min-h-0 flex-1">{children}</div>
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
              {stagedLevelFile && stagedTextureFile ? (
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
