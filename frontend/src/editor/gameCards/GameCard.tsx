import React from "react";
import { FileUpload } from "@/components/FileUpload";
import { toast } from "sonner";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import { DataType, Game, type GlobalsInterface } from "@/data/globals/globals";
import { MiniThreeView } from "./MiniThreeView";
import { Card, CardContent } from "@/components/ui/card";
import type { Result } from "@/types/result";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import type { TunnelData } from "@/data/tunnelParser/types";
import { Button } from "@/components/ui/button";

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
      return undefined; // Blank placeholder for 2D game
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

  const levelFileType = isMightyMike
    ? ".map"
    : isNanosaur1
    ? ".ter"
    : ".ter.rsrc";
  const textureFileType =
    isMightyMike || isBugdom1 ? null : isNanosaur1 ? ".trt" : ".ter";
  const showTextureUpload = textureFileType !== null;

  return (
    <Card className="h-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden bg-gray-800 border-gray-700 text-white">
      <CardContent className="flex flex-col p-4">
        <div className="flex-none min-h-8">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        {/* Add extra vertical spacing for Otto Matic to match other cards */}
        {title === "Otto Matic" && <div className="h-4" />}

        <div className="flex-none mt-3 flex flex-col items-center">
          {!isOttoMatic && (
            <p className="text-xs text-gray-400 text-center mb-1">
              (Not Functional)
            </p>
          )}

          {isMightyMike ? (
            <div className="w-100 h-70 flex items-center justify-center">
              <img
                src="https://raw.githubusercontent.com/jorio/MightyMike/refs/heads/master/packaging/MightyMikeRaw.png"
                alt="Mighty Mike"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <MiniThreeView gltfUrl={modelPath} gameType={globals.GAME_TYPE} />
          )}
        </div>

        <div className="flex-none pt-2 mt-2">
          <Button
            className="w-full mb-2"
            onClick={() => onCreateBlankLevel(globals)}
          >
            Create Blank Level
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-1 text-2xl min-w-40">
          {children}
        </div>

        <div className="flex-none pt-2 border-t border-gray-700 mt-2">
          <p className="text-sm text-gray-300">
            Upload Level Data ({levelFileType})
          </p>
          <FileUpload
            className="text-sm"
            acceptType={levelFileType}
            handleOnChange={async (e) => {
              if (!e.target?.files?.[0]) return;
              const file = e.target.files[0];
              setMapFile(file);
              const parseResult = await handleParseLevelDataFile(file, globals);
              if (!parseResult || parseResult.isErr()) {
                const message =
                  parseResult?.error instanceof Error
                    ? parseResult.error.message
                    : String(parseResult?.error);
                console.error("Failed to parse level data:", message);
                toast.error("Failed to parse level data", {
                  description: message,
                });
                return;
              }
            }}
          />

          {showTextureUpload && textureFileType && (
            <>
              <p className="text-sm text-gray-300 mt-2">
                Upload Texture Data ({textureFileType})
              </p>
              <FileUpload
                className="text-sm"
                acceptType={textureFileType}
                handleOnChange={async (e) => {
                  if (!e.target?.files?.[0]) return;
                  const mapImagesFile = e.target.files[0];
                  const buffer = await mapImagesFile.arrayBuffer();
                  const dataView = new DataView(buffer);

                  const mapImagesResult = await loadMapImages(
                    dataView,
                    globals,
                  );
                  if (mapImagesResult.isErr()) {
                    console.error(
                      "Failed to load map images:",
                      mapImagesResult.error.message,
                    );
                    toast.error("Failed to load textures", {
                      description: mapImagesResult.error.message,
                    });
                    return;
                  }
                  setMapImagesFile(mapImagesFile);
                  setMapImages(mapImagesResult.value);
                }}
              />
            </>
          )}

          {/* Tunnel file upload for Bugdom 2 */}
          {isBugdom2 && (
            <>
              <p className="text-sm text-gray-300 mt-2">
                Upload Tunnel Level (.tun)
              </p>
              <FileUpload
                className="text-sm"
                acceptType=".tun"
                handleOnChange={async (e) => {
                  if (!e.target?.files?.[0]) return;
                  const file = e.target.files[0];
                  const buffer = await file.arrayBuffer();
                  const result = parseTunnelFile(buffer);

                  if (result.isErr()) {
                    console.error(
                      "Failed to parse tunnel file:",
                      result.error.message,
                    );
                    toast.error("Failed to parse tunnel file", {
                      description: result.error.message,
                    });
                    return;
                  }

                  setTunnelFileName(file.name);
                  setTunnelData(result.value);
                }}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
