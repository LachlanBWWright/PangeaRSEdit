import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonSelectionPanel } from "./SkeletonConversionPanel/SkeletonSelectionPanel";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";
import { parseSkeletonRsrc } from "../modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "../modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "../modelParsers/skeletonBinaryExport";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { toast } from "sonner";
import { DropArea } from "./SkeletonConversionPanel/DropArea";
import { fromPromise } from "@/types/result";

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
  const [uploadStep, setUploadStep] = useState<
    "select-bg3d" | "select-skeleton" | "completed"
  >("select-bg3d");
  const [pendingBg3dFile, setPendingBg3dFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileConversion = async (bg3dFile: File, skeletonFile?: File) => {
    setLoading(true);

    const bg3dBufferResult = await fromPromise(bg3dFile.arrayBuffer());
    if (bg3dBufferResult.isErr()) {
      toast.error(`${title} conversion failed: ${bg3dBufferResult.error.message}`);
      setLoading(false);
      return;
    }
    const bg3dBuffer = bg3dBufferResult.value;

    let skeletonData: SkeletonResource | undefined;

    // Parse skeleton file if provided using TypeScript implementation
    if (skeletonFile) {
      const skeletonBufferResult = await fromPromise(skeletonFile.arrayBuffer());
      if (skeletonBufferResult.isErr()) {
        toast.error(`Failed to read skeleton file: ${skeletonBufferResult.error.message}`);
        setLoading(false);
        return;
      }
      const skeletonArrayBuffer = skeletonBufferResult.value;

      const skeletonParseResult = await fromPromise(parseSkeletonRsrc(skeletonArrayBuffer));
      if (skeletonParseResult.isErr()) {
        toast.error(`Failed to parse skeleton file: ${skeletonParseResult.error.message}`);
        setLoading(false);
        return;
      }
      skeletonData = skeletonParseResult.value;
    }

      const worker = new BG3DGltfWorker();

      const result = await new Promise<BG3DGltfWorkerResponse>(
        (resolve, reject) => {
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
        },
      );

      if (result.type === "error") {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      if (
        result.type === conversionType ||
        result.type === "bg3d-with-skeleton-to-glb"
      ) {
        // Download the converted file
        const outputExtension =
          conversionType === "bg3d-to-glb" ? "glb" : "bg3d";
        const outputMimeType =
          conversionType === "bg3d-to-glb"
            ? "model/gltf-binary"
            : "application/octet-stream";
        const downloadName = bg3dFile.name.replace(
          /\.(bg3d|3dmf|glb)$/,
          `.${outputExtension}`,
        );

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
        if (
          conversionType === "bg3d-to-glb" &&
          result.type === "bg3d-with-skeleton-to-glb" &&
          result.parsed?.skeleton
        ) {
          const skeletonResource = bg3dSkeletonToSkeletonResource(
            result.parsed.skeleton,
          );

          const skeletonBinaryResult = skeletonResourceToBinary(
            skeletonResource,
          );
          if (skeletonBinaryResult.isErr()) {
            console.error("Failed to convert skeleton to binary:", skeletonBinaryResult.error);
            toast.success(
              `${title} conversion completed (skeleton file generation failed)`,
            );
          } else {
            const skeletonBinary = skeletonBinaryResult.value;

            // Download the skeleton file
            const skeletonBlob = new Blob([skeletonBinary], {
              type: "application/octet-stream",
            });
            const skeletonUrl = URL.createObjectURL(skeletonBlob);
            const skeletonLink = document.createElement("a");
            skeletonLink.href = skeletonUrl;
            skeletonLink.download = bg3dFile.name.replace(
              /\.bg3d$/,
              ".skeleton.rsrc",
            );
            document.body.appendChild(skeletonLink);
            skeletonLink.click();
            document.body.removeChild(skeletonLink);
            setTimeout(() => URL.revokeObjectURL(skeletonUrl), 1000);

            toast.success(`${title} conversion completed with skeleton file`);
          }
        } else {
          toast.success(`${title} conversion completed`);
        }

        // Reset state
        setUploadStep("select-bg3d");
        setPendingBg3dFile(null);
      }

    setLoading(false);
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
    const expectedExt =
      conversionType === "bg3d-to-glb" ? [".bg3d", ".3dmf"] : [".glb"];
    const primaryFile = files.find((f) =>
      expectedExt.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    const skeletonFile = files.find((f) =>
      f.name.toLowerCase().endsWith(".skeleton.rsrc"),
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
        toast.error(
          conversionType === "bg3d-to-glb"
            ? "Please drop a BG3D or 3DMF file"
            : "Please drop a GLB file",
        );
      }
    } else if (uploadStep === "select-skeleton") {
      if (skeletonFile) {
        handleSkeletonFileSelect(skeletonFile);
      } else {
        toast.error(
          "Please drop a skeleton.rsrc file or click 'Skip Skeleton'",
        );
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadStep === "select-bg3d") {
      const expectedExt =
        conversionType === "bg3d-to-glb" ? [".bg3d", ".3dmf"] : [".glb"];
      if (expectedExt.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        handleBg3dFileSelect(file);
      } else {
        toast.error(
          conversionType === "bg3d-to-glb"
            ? "Please select a BG3D or 3DMF file"
            : "Please select a GLB file",
        );
      }
    } else if (uploadStep === "select-skeleton") {
      if (file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
        handleSkeletonFileSelect(file);
      } else {
        toast.error("Please select a skeleton.rsrc file");
      }
    }

    e.target.value = ""; // Reset input
  };

  const inputId = `${conversionType}-skeleton-upload`;
  const expectedExt = conversionType === "bg3d-to-glb" ? "BG3D or 3DMF" : "GLB";
  const fileAccept = conversionType === "bg3d-to-glb" ? ".bg3d,.3dmf" : ".glb";

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-300">{description}</p>

        {uploadStep === "select-bg3d" && (
          <>
            <DropArea
              id={inputId}
              onDrop={handleDrop}
              onClick={() => document.getElementById(inputId)?.click()}
            >
              <p className="text-gray-400 mb-2">
                Drop a {expectedExt} file here or click to select
              </p>
              <p className="text-sm text-gray-500">
                {conversionType === "bg3d-to-glb"
                  ? "Upload .bg3d or .3dmf first, then optionally add skeleton"
                  : "Supports .glb files"}
              </p>
            </DropArea>
            <input
              type="file"
              accept={fileAccept}
              className="hidden"
              id={inputId}
              onChange={handleFileInput}
            />
          </>
        )}

        {uploadStep === "select-skeleton" &&
          pendingBg3dFile &&
          conversionType === "bg3d-to-glb" && (
            <>
              <SkeletonSelectionPanel
                pendingBg3dFileName={pendingBg3dFile.name}
                inputId={inputId}
                onDrop={handleDrop}
                onFileInputChange={handleFileInput}
                onSkipSkeleton={handleSkipSkeleton}
                onCancel={() => {
                  setUploadStep("select-bg3d");
                  setPendingBg3dFile(null);
                }}
                loading={loading}
              />
            </>
          )}

        {loading && <p className="text-center text-gray-400">Converting...</p>}
      </CardContent>
    </Card>
  );
}
