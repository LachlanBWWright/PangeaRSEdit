import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Upload, X, Info } from "lucide-react";
import { GameModelSelector } from "@/components/GameModelSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UploadStep } from "./types";
import {
  getUploadDropzoneText,
  processUploadSelection,
} from "@/pages/ModelViewer/modelUploadPanelState";

/* interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
} */

interface Props {
  gltfUrl: string | null;
  loading: boolean;
  uploadStep: UploadStep;
  pendingBg3dFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleBg3dFileSelect: (f: File) => void;
  handleSkeletonFileSelect: (f?: File) => void;
  handleSkipSkeleton: () => void;
  handleFileUpload: (
    bg3dFile: File,
    skeletonFile?: File,
    gameLabel?: string,
  ) => Promise<import("neverthrow").Result<void, string>>;
  modelBaseName: string;
  onModelBaseNameChange: (baseName: string) => void;
  exportTargets: { id: string; label: string }[];
  handleDownloadSelectedExport: (targetId: string) => void | Promise<void>;
  handleClearModel: () => void;
  onCancelSelection: () => void;
}

export function ModelUploadPanel({
  gltfUrl,
  loading,
  uploadStep,
  pendingBg3dFile,
  fileInputRef,
  handleDrop,
  handleDragOver,
  handleBg3dFileSelect,
  handleSkeletonFileSelect,
  handleSkipSkeleton,
  handleFileUpload,
  modelBaseName,
  onModelBaseNameChange,
  exportTargets,
  handleDownloadSelectedExport,
  handleClearModel,
  onCancelSelection,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const fileAccept = ".bg3d,.3dmf,.glb,.gltf";
  const awaitingSkeleton =
    uploadStep === "select-skeleton" && pendingBg3dFile !== null;
  const { title: dropzoneTitle, body: dropzoneBody } =
    getUploadDropzoneText(awaitingSkeleton);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white truncate">
          {gltfUrl ? "Model Actions" : "Model Upload"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!gltfUrl ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              This is a work in progress, it is not fully functional.
            </div>
            <section className="space-y-2">
              <div className="text-sm font-medium text-white">Game Models</div>
              <div className="text-xs text-gray-400">
                Load a bundled model from the game library.
              </div>
              <GameModelSelector
                onLoadModel={handleFileUpload}
                loading={loading}
              />
            </section>

            <section className="space-y-2 border-t border-gray-700 pt-4">
              <div className="text-sm font-medium text-white">Upload Files</div>
              <div className="space-y-3">
                {awaitingSkeleton && (
                  <div className="text-sm text-gray-300">
                    Model file selected: <strong>{pendingBg3dFile.name}</strong>
                  </div>
                )}
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed border-gray-600 p-8 text-center transition-colors hover:border-gray-500"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-gray-400">{dropzoneTitle}</p>
                  <p className="text-sm text-gray-500">{dropzoneBody}</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    awaitingSkeleton ? ".skeleton.rsrc,.rsrc" : fileAccept
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    processUploadSelection({
                      file,
                      awaitingSkeleton,
                      handleSkeletonFileSelect,
                      handleBg3dFileSelect,
                    });
                  }}
                />
                {awaitingSkeleton && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSkipSkeleton}
                      className="flex-1 text-white"
                      disabled={loading}
                    >
                      Skip Skeleton
                    </Button>
                    <Button
                      onClick={() => onCancelSelection()}
                      className="flex-1 text-white"
                    >
                      Choose Different File
                    </Button>
                  </div>
                )}

                {loading && (
                  <p className="text-center text-gray-400">Loading model...</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Export basename
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={modelBaseName}
                  onChange={(e) => onModelBaseNameChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Otto"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Export basename help"
                      className="flex h-7 w-7 min-h-7 min-w-7 aspect-square items-center justify-center rounded-full border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-left">
                    Used for download filenames, and for the generated Alias
                    resource target name in the skeleton.rsrc file. In some
                    games, a wrong name may cause crashing. I.E. if the
                    accompanying BG3D file is called 'Otto.bg3d', the base name
                    must be 'Otto', as the game loads the skeleton.rsrc file
                    first, and tries to find the BG3D model with the Alias.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Export target
              </div>
              <Popover open={exportOpen} onOpenChange={setExportOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-between bg-gray-700 text-white hover:bg-gray-600"
                  >
                    <span>Export</span>
                    <span className="text-xs text-gray-300">Choose game</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-gray-700 bg-gray-900 text-white">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">
                        Select export target
                      </p>
                      <p className="text-xs text-gray-400">
                        Download starts as soon as you choose a target.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {exportTargets.map((target) => (
                        <Button
                          key={target.id}
                          type="button"
                          variant="ghost"
                          className="justify-start border border-gray-700 bg-gray-800 text-left text-white hover:bg-gray-700"
                          onClick={() => {
                            void handleDownloadSelectedExport(target.id);
                            setExportOpen(false);
                          }}
                        >
                          {target.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={() => handleClearModel()}
              variant="destructive"
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Model
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
