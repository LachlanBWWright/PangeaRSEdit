import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import { parseSkeletonRsrcTS } from "../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "../modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "../modelParsers/skeletonBinaryExport";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { toast } from "sonner";

interface SkeletonConversionPanelProps {
  title: string;
  description: string;
  conversionType: "bg3d-to-glb" | "glb-to-bg3d";
}

export function SkeletonConversionPanel({
  title,
  description,
  conversionType,
}: SkeletonConversionPanelProps) {
  const [uploadStep, setUploadStep] = useState<"select-bg3d" | "select-skeleton" | "completed">("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);



  const handleFileConversion = async (bg3dFile: File, skeletonFile?: File) => {
    setLoading(true);
    try {
      const bg3dBuffer = await bg3dFile.arrayBuffer();
      let skeletonData: SkeletonResource | undefined;

      // Parse skeleton file if provided using TypeScript implementation
      if (skeletonFile) {
        console.log("Parsing skeleton file for conversion with TypeScript...");
        const skeletonArrayBuffer = await skeletonFile.arrayBuffer();
        skeletonData = parseSkeletonRsrcTS(skeletonArrayBuffer);
        console.log("Skeleton data parsed for conversion:", skeletonData);
      }

      const worker = new BG3DGltfWorker();
      
      const result = await new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
        worker.onmessage = (event) => {
          resolve(event.data);
          worker.terminate();
        };
        
        worker.onerror = (error) => {
          reject(error);
          worker.terminate();
        };
        
        // Choose the appropriate message type based on conversion direction and skeleton presence
        let message: BG3DGltfWorkerMessage;
        
        if (conversionType === "bg3d-to-glb") {
          message = skeletonData
            ? {
                type: "bg3d-with-skeleton-to-glb",
                bg3dBuffer,
                skeletonData,
              }
            : {
                type: "bg3d-to-glb",
                buffer: bg3dBuffer,
              };
        } else {
          // glb-to-bg3d conversion
          message = {
            type: "glb-to-bg3d",
            buffer: bg3dBuffer,
          };
        }
        
        worker.postMessage(message);
      });
      
      if (result.type === "error") {
        throw new Error(result.error);
      }
      
      if (result.type === conversionType || result.type === "bg3d-with-skeleton-to-glb") {
        // Download the converted file
        const outputExtension = conversionType === "bg3d-to-glb" ? "glb" : "bg3d";
        const outputMimeType = conversionType === "bg3d-to-glb" ? "model/gltf-binary" : "application/octet-stream";
        const downloadName = bg3dFile.name.replace(/\.(bg3d|glb)$/, `.${outputExtension}`);
        
        const convertedBlob = new Blob([result.result], {
          type: outputMimeType,
        });
        const url = URL.createObjectURL(convertedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        // If we converted BG3D to GLB and we have animations, also generate skeleton file
        if (conversionType === "bg3d-to-glb" && result.type === "bg3d-with-skeleton-to-glb" && result.parsed.skeleton) {
          try {
            console.log("Converting skeleton to resource format for download...");
            const skeletonResource = bg3dSkeletonToSkeletonResource(result.parsed.skeleton);
            
            console.log("Converting skeleton resource to binary for download...");
            const skeletonBinary = skeletonResourceToBinary(skeletonResource);
            
            // Download the skeleton file
            const skeletonBlob = new Blob([skeletonBinary], { type: "application/octet-stream" });
            const skeletonUrl = URL.createObjectURL(skeletonBlob);
            const skeletonLink = document.createElement("a");
            skeletonLink.href = skeletonUrl;
            skeletonLink.download = bg3dFile.name.replace(/\.bg3d$/, ".skeleton.rsrc");
            document.body.appendChild(skeletonLink);
            skeletonLink.click();
            document.body.removeChild(skeletonLink);
            setTimeout(() => URL.revokeObjectURL(skeletonUrl), 1000);
            
            toast.success(`${title} conversion completed with skeleton file`);
          } catch (error) {
            console.error("Error generating skeleton file:", error);
            toast.success(`${title} conversion completed (skeleton file generation failed)`);
          }
        } else {
          toast.success(`${title} conversion completed`);
        }

        // Reset state
        setUploadStep("select-bg3d");
        setPendingBg3dFile(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`${title} conversion failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBg3dFileSelect = (bg3dFile: File) => {
    setPendingBg3dFile(bg3dFile);
    setUploadStep("select-skeleton");
  };

  const handleSkeletonFileSelect = (skeletonFile: File) => {
    if (pendingBg3dFile) {
      handleFileConversion(pendingBg3dFile, skeletonFile);
    }
  };

  const handleSkipSkeleton = () => {
    if (pendingBg3dFile) {
      handleFileConversion(pendingBg3dFile);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const expectedExt = conversionType === "bg3d-to-glb" ? ".bg3d" : ".glb";
    const primaryFile = files.find((f) =>
      f.name.toLowerCase().endsWith(expectedExt)
    );
    const skeletonFile = files.find((f) =>
      f.name.toLowerCase().endsWith(".skeleton.rsrc")
    );

    if (uploadStep === "select-bg3d") {
      if (primaryFile) {
        if (skeletonFile && conversionType === "bg3d-to-glb") {
          // Both files dropped at once for bg3d-to-glb
          await handleFileConversion(primaryFile, skeletonFile);
        } else {
          // Only primary file dropped
          handleBg3dFileSelect(primaryFile);
        }
      } else {
        toast.error(`Please drop a ${expectedExt.substring(1).toUpperCase()} file`);
      }
    } else if (uploadStep === "select-skeleton") {
      if (skeletonFile) {
        handleSkeletonFileSelect(skeletonFile);
      } else {
        toast.error("Please drop a skeleton.rsrc file or click 'Skip Skeleton'");
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadStep === "select-bg3d") {
      const expectedExt = conversionType === "bg3d-to-glb" ? ".bg3d" : ".glb";
      if (file.name.toLowerCase().endsWith(expectedExt)) {
        handleBg3dFileSelect(file);
      } else {
        toast.error(`Please select a ${expectedExt.substring(1).toUpperCase()} file`);
      }
    } else if (uploadStep === "select-skeleton") {
      if (file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
        handleSkeletonFileSelect(file);
      } else {
        toast.error("Please select a skeleton.rsrc file");
      }
    }

    e.target.value = ''; // Reset input
  };

  const inputId = `${conversionType}-skeleton-upload`;
  const expectedExt = conversionType === "bg3d-to-glb" ? "BG3D" : "GLB";
  const fileAccept = conversionType === "bg3d-to-glb" ? ".bg3d" : ".glb";

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-300">{description}</p>
        
        {uploadStep === "select-bg3d" && (
          <>
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById(inputId)?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400 mb-2">
                Drop a {expectedExt} file here or click to select
              </p>
              <p className="text-sm text-gray-500">
                {conversionType === "bg3d-to-glb" 
                  ? "Upload .bg3d file first, then optionally add skeleton" 
                  : "Supports .glb files"}
              </p>
            </div>
            <input
              type="file"
              accept={fileAccept}
              className="hidden"
              id={inputId}
              onChange={handleFileInput}
            />
          </>
        )}

        {uploadStep === "select-skeleton" && pendingBg3dFile && conversionType === "bg3d-to-glb" && (
          <>
            <div className="text-sm text-gray-300 mb-3">
              BG3D file selected: <strong>{pendingBg3dFile.name}</strong>
            </div>
            
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById(inputId)?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400 mb-2">
                Drop skeleton file here or click to select
              </p>
              <p className="text-sm text-gray-500">Optional: Add .skeleton.rsrc file for animations</p>
            </div>

            <input
              type="file"
              accept=".skeleton.rsrc"
              className="hidden"
              id={inputId}
              onChange={handleFileInput}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleSkipSkeleton}
                variant="outline"
                className="flex-1 text-white"
                disabled={loading}
              >
                {loading ? "Converting..." : "Skip Skeleton"}
              </Button>
              <Button
                onClick={() => {
                  setUploadStep("select-bg3d");
                  setPendingBg3dFile(null);
                }}
                variant="ghost"
                className="flex-1 text-gray-400 hover:text-white"
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </>
        )}

        {loading && (
          <p className="text-center text-gray-400">Converting...</p>
        )}
      </CardContent>
    </Card>
  );
}