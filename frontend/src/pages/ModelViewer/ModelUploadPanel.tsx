import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, X, Download } from "lucide-react";
import { GameModelSelector } from "@/components/GameModelSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BG3D_EXPORT_TARGETS } from "@/modelParsers/bg3dExportTargets";
import type { UploadStep } from "./types";

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
  ) => Promise<import("@/types/result").Result<void, Error>>;
  handleDownloadBG3D: () => void;
  handleDownloadGLB: () => void;
  handleDownload3DMF: () => void;
  modelBaseName: string;
  onModelBaseNameChange: (baseName: string) => void;
  bg3dExportTargetId: string;
  onBg3dExportTargetChange: (targetId: string) => void;
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
  handleDownloadBG3D,
  handleDownloadGLB,
  handleDownload3DMF,
  modelBaseName,
  onModelBaseNameChange,
  bg3dExportTargetId,
  onBg3dExportTargetChange,
  handleClearModel,
  onCancelSelection,
}: Props) {
  const fileAccept = ".bg3d,.3dmf,.glb";
  const awaitingSkeleton = uploadStep === "select-skeleton" && pendingBg3dFile !== null;
  const dropzoneTitle = awaitingSkeleton
    ? "Drop skeleton file here or click to select"
    : "Drop a model file here or click to select";
  const dropzoneBody = awaitingSkeleton
    ? "Optional: add a .skeleton.rsrc file for animations."
    : "Upload .bg3d, .3dmf, or .glb. BG3D and 3DMF files can optionally use a .skeleton.rsrc file.";

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white truncate">
          {gltfUrl ? "Model Actions" : "Model Upload"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!gltfUrl ? (
          <>
            <Card className="border border-gray-700 bg-gray-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">
                  Game Models
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-gray-400 mb-3">
                  Load a bundled model from the game library.
                </div>
                <GameModelSelector onLoadModel={handleFileUpload} loading={loading} />
              </CardContent>
            </Card>

            <Card className="border border-gray-700 bg-gray-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {awaitingSkeleton && (
                    <div className="text-sm text-gray-300">
                      Model file selected:{" "}
                      <strong>{pendingBg3dFile.name}</strong>
                    </div>
                  )}
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400 mb-2">{dropzoneTitle}</p>
                    <p className="text-sm text-gray-500">{dropzoneBody}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={awaitingSkeleton ? ".skeleton.rsrc" : fileAccept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      if (awaitingSkeleton) {
                        if (file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
                          handleSkeletonFileSelect(file);
                        }
                        return;
                      }

                      if (
                        file.name.toLowerCase().endsWith(".bg3d") ||
                        file.name.toLowerCase().endsWith(".3dmf") ||
                        file.name.toLowerCase().endsWith(".glb")
                      ) {
                        handleBg3dFileSelect(file);
                      }
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
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-300 mb-3">
              Model loaded successfully
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Export basename
              </div>
              <Input
                value={modelBaseName}
                onChange={(e) => onModelBaseNameChange(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Otto"
              />
              <p className="text-xs text-gray-500">
                Used for BG3D, 3DMF, and GLB download filenames, and for the
                generated Alias resource target name.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                BG3D export target
              </div>
              <Select
                value={bg3dExportTargetId}
                onValueChange={onBg3dExportTargetChange}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select a game preset" />
                </SelectTrigger>
                <SelectContent>
                  {BG3D_EXPORT_TARGETS.map((target) => (
                    <SelectItem
                      key={target.id}
                      value={target.id}
                      className="text-white focus:bg-gray-600"
                    >
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => handleDownloadBG3D()}
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as BG3D
              </Button>
              <Button
                onClick={() => handleDownload3DMF()}
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as 3DMF
              </Button>
              <Button
                onClick={() => handleDownloadGLB()}
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as GLB
              </Button>
              <Button
                onClick={() => handleClearModel()}
                variant="destructive"
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Model
              </Button>

            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
