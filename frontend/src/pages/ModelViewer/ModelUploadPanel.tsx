import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Download } from "lucide-react";
import { GameModelSelector } from "@/components/GameModelSelector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
} */

interface Props {
  gltfUrl: string | null;
  useGameSelector: boolean;
  setUseGameSelector: (v: boolean) => void;
  loading: boolean;
  uploadStep: "select-bg3d" | "select-skeleton" | "completed";
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
  handleClearModel: () => void;
  onCancelSelection: () => void;
}

export function ModelUploadPanel({
  gltfUrl,
  useGameSelector,
  setUseGameSelector,
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
  handleClearModel,
  onCancelSelection,
}: Props) {
  const fileAccept = ".bg3d,.3dmf";

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">
          {gltfUrl ? "Model Actions" : "Model Upload"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!gltfUrl ? (
          <>
            <Tabs
              value={useGameSelector ? "game-models" : "upload-files"}
              onValueChange={(value) => setUseGameSelector(value === "game-models")}
            >
              <TabsList className="mb-4 grid w-full grid-cols-2 bg-gray-700 border border-gray-600">
                <TabsTrigger value="game-models" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white text-gray-300">Game Models</TabsTrigger>
                <TabsTrigger value="upload-files" className="data-[state=active]:bg-gray-500 data-[state=active]:text-white text-gray-300">Upload Files</TabsTrigger>
              </TabsList>
            </Tabs>

            {useGameSelector ? (
              <GameModelSelector onLoadModel={handleFileUpload} loading={loading} />
            ) : (
              <>
                {uploadStep === "select-bg3d" && (
                  <>
                    <div
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-2">
                        Drop model file here or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Upload .bg3d or .3dmf file first, then optionally add
                        skeleton
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={fileAccept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (
                          file &&
                          (file.name.toLowerCase().endsWith(".bg3d") ||
                            file.name.toLowerCase().endsWith(".3dmf"))
                        ) {
                          handleBg3dFileSelect(file);
                        } else if (file) {
                          /* silent fallback: same as original toast handled upstream */
                        }
                      }}
                    />
                  </>
                )}

                {uploadStep === "select-skeleton" && pendingBg3dFile && (
                  <>
                    <div className="text-sm text-gray-300 mb-3">
                      Model file selected:{" "}
                      <strong>{pendingBg3dFile.name}</strong>
                    </div>
                    <div
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-2">
                        Drop skeleton file here or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Optional: Add .skeleton.rsrc file for animations
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".skeleton.rsrc"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (
                          file &&
                          file.name.toLowerCase().endsWith(".skeleton.rsrc")
                        ) {
                          handleSkeletonFileSelect(file);
                        } else if (file) {
                          /* handled upstream */
                        }
                      }}
                    />
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
                        Choose Different BG3D
                      </Button>
                    </div>
                  </>
                )}

                {loading && (
                  <p className="text-center text-gray-400">Loading model...</p>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-300 mb-3">
              Model loaded successfully
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
