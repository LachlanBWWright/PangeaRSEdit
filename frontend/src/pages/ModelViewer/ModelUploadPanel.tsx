import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Download } from "lucide-react";
import { GameModelSelector } from "@/components/GameModelSelector";

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
  loadTestModel: () => Promise<void>;
  loadTestModelWithoutSkeleton: () => Promise<void>;
  handleFileUpload: (bg3dFile: File, skeletonFile?: File) => Promise<void>;
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
  loadTestModel,
  loadTestModelWithoutSkeleton,
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
            <div className="flex space-x-2 mb-4">
              <Button
                onClick={() => setUseGameSelector(true)}
                variant={useGameSelector ? "default" : "outline"}
                size="sm"
                className={`flex-1 ${
                  !useGameSelector ? "text-gray-300 hover:text-white" : ""
                }`}
              >
                Game Models
              </Button>
              <Button
                onClick={() => setUseGameSelector(false)}
                variant={!useGameSelector ? "default" : "outline"}
                size="sm"
                className={`flex-1 ${
                  useGameSelector ? "text-gray-300 hover:text-white" : ""
                }`}
              >
                Upload Files
              </Button>
            </div>

            {useGameSelector ? (
              <>
                <GameModelSelector
                  onLoadModel={handleFileUpload}
                  loading={loading}
                />
                <hr className="border-gray-600 my-4" />
                <p className="text-xs text-gray-400 text-center mb-2">
                  Or use sample files:
                </p>
                <Button
                  onClick={loadTestModel}
                  variant="outline"
                  className="w-full text-white text-xs"
                  disabled={loading}
                >
                  Otto Sample (with Skeleton)
                </Button>
                <Button
                  onClick={loadTestModelWithoutSkeleton}
                  variant="outline"
                  className="w-full text-white text-xs mt-2"
                  disabled={loading}
                >
                  Otto Sample (no Skeleton)
                </Button>
              </>
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
                        Upload .bg3d or .3dmf file first, then optionally add skeleton
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={fileAccept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && (file.name.toLowerCase().endsWith(".bg3d") || file.name.toLowerCase().endsWith(".3dmf"))) {
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
                        variant="outline"
                        className="flex-1 text-white"
                        disabled={loading}
                      >
                        Skip Skeleton
                      </Button>
                      <Button
                        onClick={() => onCancelSelection()}
                        variant="ghost"
                        className="flex-1 text-gray-400 hover:text-white"
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
                variant="outline"
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as BG3D
              </Button>
              <Button
                onClick={() => handleDownload3DMF()}
                variant="outline"
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as 3DMF
              </Button>
              <Button
                onClick={() => handleDownloadGLB()}
                variant="outline"
                className="w-full text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download as GLB
              </Button>
              <Button
                onClick={() => handleClearModel()}
                variant="outline"
                className="w-full text-red-400 hover:text-red-300 border-red-600 hover:border-red-500"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Model
              </Button>
            </div>
            <hr className="border-gray-600" />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load Different Model
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".bg3d,.skeleton.rsrc"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const bg3dFile = files.find((f) =>
                  f.name.toLowerCase().endsWith(".bg3d"),
                );
                const skeletonFile = files.find((f) =>
                  f.name.toLowerCase().endsWith(".skeleton.rsrc"),
                );
                if (bg3dFile) {
                  handleFileUpload(bg3dFile, skeletonFile);
                }
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
