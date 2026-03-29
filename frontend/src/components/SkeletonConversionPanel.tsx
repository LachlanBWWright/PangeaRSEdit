import { useRef, useState } from "react";
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
import { DEFAULT_BG3D_EXPORT_TARGET } from "../modelParsers/bg3dExportTargets";
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
  const primaryInputRef = useRef<HTMLInputElement | null>(null);

  const pushLog = (message: string) => {
    const entry = `[${title}] ${message}`;
    console.log(entry);
  };

  const handleFileConversion = async (
    bg3dFile: File,
    skeletonFile?: File,
  ) => {
    setLoading(true);
    const toastId = toast.loading(
      `Converting ${bg3dFile.name}${skeletonFile ? ` + ${skeletonFile.name}` : ""}...`,
    );
    pushLog(
      `Starting ${conversionType} for ${bg3dFile.name}${
        skeletonFile ? ` + ${skeletonFile.name}` : ""
      }.`,
    );

    try {
      const bg3dBufferResult = await fromPromise(bg3dFile.arrayBuffer());
      if (bg3dBufferResult.isErr()) {
        const message = `Failed to read model file: ${bg3dBufferResult.error.message}`;
        pushLog(message);
        toast.dismiss(toastId);
        toast.error(`${title} conversion failed: ${bg3dBufferResult.error.message}`);
        return;
      }
      const bg3dBuffer = bg3dBufferResult.value;
      pushLog(`Read ${bg3dBuffer.byteLength} bytes from ${bg3dFile.name}.`);

      let skeletonData: SkeletonResource | undefined;

      if (skeletonFile) {
        pushLog(`Reading skeleton file ${skeletonFile.name}.`);
        const skeletonBufferResult = await fromPromise(
          skeletonFile.arrayBuffer(),
        );
        if (skeletonBufferResult.isErr()) {
          const message = `Failed to read skeleton file: ${skeletonBufferResult.error.message}`;
          pushLog(message);
          toast.dismiss(toastId);
          toast.error(message);
          return;
        }
        const skeletonRawBuffer = skeletonBufferResult.value;
        pushLog(
          `Read ${skeletonRawBuffer.byteLength} bytes from ${skeletonFile.name}.`,
        );

        pushLog("Parsing skeleton resource.");
        const skeletonParseResult = await fromPromise(
          parseSkeletonRsrc(skeletonRawBuffer),
        );
        if (skeletonParseResult.isErr()) {
          const message = `Failed to parse skeleton file: ${skeletonParseResult.error.message}`;
          pushLog(message);
          toast.dismiss(toastId);
          toast.error(message);
          return;
        }
        skeletonData = skeletonParseResult.value;
        pushLog(
          `Parsed skeleton with ${Object.keys(skeletonData.Bone || {}).length} bones and ${Object.keys(skeletonData.AnHd || {}).length} animations.`,
        );
      }

      pushLog("Starting GLB conversion worker.");
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
            message = {
              type: "glb-to-bg3d",
              buffer: bg3dBuffer,
            };
          }

          worker.postMessage(message);
        },
      );

      pushLog(`Worker finished with ${result.type}.`);

      if (result.type === "error") {
        pushLog(`Conversion failed: ${result.error}`);
        toast.dismiss(toastId);
        toast.error(result.error);
        return;
      }

      if (
        result.type === conversionType ||
        result.type === "bg3d-with-skeleton-to-glb"
      ) {
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

        pushLog(`Downloading ${downloadName}.`);
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

        if (
          conversionType === "bg3d-to-glb" &&
          result.type === "bg3d-with-skeleton-to-glb" &&
          result.parsed?.skeleton
        ) {
          pushLog("Serializing skeleton.rsrc for download.");
          const skeletonResource = bg3dSkeletonToSkeletonResource(
            result.parsed.skeleton,
          );

          const skeletonBinaryResult = skeletonResourceToBinary(
            skeletonResource,
          );
          if (skeletonBinaryResult.isErr()) {
            console.error(
              "Failed to convert skeleton to binary:",
              skeletonBinaryResult.error,
            );
            pushLog(
              `Skeleton file generation failed: ${skeletonBinaryResult.error.message}`,
            );
            toast.dismiss(toastId);
            toast.success(
              `${title} conversion completed (skeleton file generation failed)`,
            );
          } else {
            const skeletonBinary = skeletonBinaryResult.value;
            const skeletonName = bg3dFile.name.replace(
              /\.bg3d$/i,
              ".skeleton.rsrc",
            );
            pushLog(`Downloading ${skeletonName}.`);

            const skeletonBlob = new Blob([skeletonBinary], {
              type: "application/octet-stream",
            });
            const skeletonUrl = URL.createObjectURL(skeletonBlob);
            const skeletonLink = document.createElement("a");
            skeletonLink.href = skeletonUrl;
            skeletonLink.download = skeletonName;
            document.body.appendChild(skeletonLink);
            skeletonLink.click();
            document.body.removeChild(skeletonLink);
            setTimeout(() => URL.revokeObjectURL(skeletonUrl), 1000);

            toast.dismiss(toastId);
            toast.success(`${title} conversion completed with skeleton file`);
          }
        } else if (conversionType === "glb-to-bg3d" && result.parsed?.skeleton) {
          pushLog("Serializing skeleton.rsrc from GLB data.");
          const skeletonResource = bg3dSkeletonToSkeletonResource(
            result.parsed.skeleton,
            undefined,
            undefined,
            result.parsed.skeleton.alisData,
            result.parsed.skeleton.metadata,
            bg3dFile.name.replace(/\.(glb|bg3d|3dmf)$/i, ""),
            DEFAULT_BG3D_EXPORT_TARGET,
          );
          const skeletonBinaryResult = skeletonResourceToBinary(skeletonResource);
          if (skeletonBinaryResult.isErr()) {
            toast.dismiss(toastId);
            toast.error(
              `${title} conversion failed: ${skeletonBinaryResult.error.message}`,
            );
            return;
          }
          const skeletonBlob = new Blob([skeletonBinaryResult.value], {
            type: "application/octet-stream",
          });
          const skeletonUrl = URL.createObjectURL(skeletonBlob);
          const skeletonLink = document.createElement("a");
          skeletonLink.href = skeletonUrl;
          skeletonLink.download = bg3dFile.name.replace(
            /\.glb$/i,
            ".skeleton.rsrc",
          );
          document.body.appendChild(skeletonLink);
          skeletonLink.click();
          document.body.removeChild(skeletonLink);
          setTimeout(() => URL.revokeObjectURL(skeletonUrl), 1000);

          toast.dismiss(toastId);
          toast.success(`${title} conversion completed with skeleton file`);
        } else {
          toast.dismiss(toastId);
          toast.success(`${title} conversion completed`);
        }

        setUploadStep("select-bg3d");
        setPendingBg3dFile(null);
        pushLog("Conversion completed successfully.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushLog(`Unexpected conversion error: ${message}`);
      toast.dismiss(toastId);
      toast.error(`${title} conversion failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBg3dFileSelect = async (bg3dFile: File) => {
    pushLog(`Selected primary file ${bg3dFile.name}.`);

    if (conversionType === "glb-to-bg3d") {
      setPendingBg3dFile(null);
      setUploadStep("select-bg3d");
      toast.message(`${title}: GLB selected`, {
        description: bg3dFile.name,
      });
      await handleFileConversion(bg3dFile);
      return;
    }

    setPendingBg3dFile(bg3dFile);
    setUploadStep("select-skeleton");
    toast.message(`${title}: BG3D selected`, {
      description: bg3dFile.name,
    });
  };

  const handleSkeletonFileSelect = async (skeletonFile: File) => {
    if (pendingBg3dFile) {
      pushLog(`Selected skeleton file ${skeletonFile.name}.`);
      await handleFileConversion(pendingBg3dFile, skeletonFile);
    }
  };

  const handleSkipSkeleton = async () => {
    if (pendingBg3dFile) {
      pushLog("Skipping skeleton upload.");
      await handleFileConversion(pendingBg3dFile);
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
          pushLog(
            `Dropped ${primaryFile.name} and ${skeletonFile.name} together.`,
          );
          await handleFileConversion(primaryFile, skeletonFile);
        } else {
          pushLog(`Dropped primary file ${primaryFile.name}.`);
          await handleBg3dFileSelect(primaryFile);
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
        await handleSkeletonFileSelect(skeletonFile);
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
        await handleBg3dFileSelect(file);
      } else {
        toast.error(
          conversionType === "bg3d-to-glb"
            ? "Please select a BG3D or 3DMF file"
            : "Please select a GLB file",
        );
      }
    } else if (uploadStep === "select-skeleton") {
      if (file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
        await handleSkeletonFileSelect(file);
      } else {
        toast.error("Please select a skeleton.rsrc file");
      }
    }

    e.target.value = "";
  };

  const expectedExt = conversionType === "bg3d-to-glb" ? "BG3D or 3DMF" : "GLB";
  const fileAccept = conversionType === "bg3d-to-glb" ? ".bg3d,.3dmf" : ".glb";
  const openPrimaryPicker = () => primaryInputRef.current?.click();

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-300">{description}</p>

        {uploadStep === "select-bg3d" && (
          <>
            <DropArea
              onDrop={handleDrop}
              onClick={openPrimaryPicker}
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
              ref={primaryInputRef}
              onChange={handleFileInput}
            />
          </>
        )}

        {uploadStep === "select-skeleton" &&
          pendingBg3dFile &&
          conversionType === "bg3d-to-glb" && (
            <SkeletonSelectionPanel
              pendingBg3dFileName={pendingBg3dFile.name}
              onDrop={handleDrop}
              onFileInputChange={handleFileInput}
              onSkipSkeleton={handleSkipSkeleton}
              onCancel={() => {
                pushLog("Cancelled skeleton selection.");
                setUploadStep("select-bg3d");
                setPendingBg3dFile(null);
              }}
              loading={loading}
            />
          )}
      </CardContent>
    </Card>
  );
}
