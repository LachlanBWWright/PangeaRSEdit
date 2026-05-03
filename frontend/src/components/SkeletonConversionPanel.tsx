import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import { errorSchema } from "@/schemas/common";
import { UploadStepContent } from "./SkeletonConversionPanel/UploadStepContent";
import {
  getExpectedExtLabel,
  getFileAccept,
  handleConversionFileInput,
  handleDroppedConversionFiles,
} from "./SkeletonConversionPanel/fileSelectionUtils";

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

  const handleFileConversion = async (bg3dFile: File, skeletonFile?: File) => {
    setLoading(true);
    const toastId = toast.loading(
      `Converting ${bg3dFile.name}${skeletonFile ? ` + ${skeletonFile.name}` : ""}...`,
    );
    pushLog(
      `Starting ${conversionType} for ${bg3dFile.name}${
        skeletonFile ? ` + ${skeletonFile.name}` : ""
      }.`,
    );

    await (async () => {
      const bg3dResult = await ResultAsync.fromPromise(
        bg3dFile.arrayBuffer(),
        mapErr,
      );
      if (bg3dResult.isErr()) {
        const message = `Failed to read model file: ${bg3dResult.error}`;
        pushLog(message);
        toast.dismiss(toastId);
        toast.error(`${title} conversion failed: ${message}`);
        return;
      }
      const bg3dBuffer = bg3dResult.value;
      pushLog(`Read ${bg3dBuffer.byteLength} bytes from ${bg3dFile.name}.`);

      let skeletonData: SkeletonResource | undefined;

      if (skeletonFile) {
        pushLog(`Reading skeleton file ${skeletonFile.name}.`);
        const skeletonRawResult = await ResultAsync.fromPromise(
          skeletonFile.arrayBuffer(),
          mapErr,
        );
        if (skeletonRawResult.isErr()) {
          const message = `Failed to read skeleton file: ${skeletonRawResult.error}`;
          pushLog(message);
          toast.dismiss(toastId);
          toast.error(message);
          return;
        }
        const skeletonRawBuffer = skeletonRawResult.value;
        pushLog(
          `Read ${skeletonRawBuffer.byteLength} bytes from ${skeletonFile.name}.`,
        );

        pushLog("Parsing skeleton resource.");
        const skeletonParseResult = await ResultAsync.fromPromise(
          parseSkeletonRsrc(skeletonRawBuffer),
          mapErr,
        );
        if (skeletonParseResult.isErr()) {
          const message = `Failed to parse skeleton file: ${skeletonParseResult.error}`;
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

          const skeletonBinaryResult =
            skeletonResourceToBinary(skeletonResource);
          if (skeletonBinaryResult.isErr()) {
            console.error(
              "Failed to convert skeleton to binary:",
              skeletonBinaryResult.error,
            );
            pushLog(
              `Skeleton file generation failed: ${skeletonBinaryResult.error}`,
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
        } else if (
          conversionType === "glb-to-bg3d" &&
          result.parsed?.skeleton
        ) {
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
          const skeletonBinaryResult =
            skeletonResourceToBinary(skeletonResource);
          if (skeletonBinaryResult.isErr()) {
            toast.dismiss(toastId);
            toast.error(
              `${title} conversion failed: ${skeletonBinaryResult.error}`,
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
    })()
      .catch((error: unknown) => {
        const parseResult = errorSchema.safeParse(error);
        const message = parseResult.success
          ? parseResult.data
          : String(error);
        pushLog(`Unexpected conversion error: ${message}`);
        toast.dismiss(toastId);
        toast.error(`${title} conversion failed: ${message}`);
      })
      .finally(() => {
        setLoading(false);
      });
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

  const handleDrop = async (event: React.DragEvent) => {
    await handleDroppedConversionFiles({
      event,
      uploadStep,
      conversionType,
      onConvertPrimaryFile: async (primaryFile, skeletonFile) => {
        if (skeletonFile)
          pushLog(
            `Dropped ${primaryFile.name} and ${skeletonFile.name} together.`,
          );
        else pushLog(`Dropped primary file ${primaryFile.name}.`);
        await handleFileConversion(primaryFile, skeletonFile);
      },
      onSelectPrimaryFile: async (primaryFile) => {
        pushLog(`Dropped primary file ${primaryFile.name}.`);
        await handleBg3dFileSelect(primaryFile);
      },
      onSelectSkeletonFile: handleSkeletonFileSelect,
    });
  };

  const handleFileInput = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    await handleConversionFileInput({
      event,
      uploadStep,
      conversionType,
      onSelectPrimaryFile: handleBg3dFileSelect,
      onSelectSkeletonFile: handleSkeletonFileSelect,
    });
  };

  const expectedExt = getExpectedExtLabel(conversionType);
  const fileAccept = getFileAccept(conversionType);
  const openPrimaryPicker = () => primaryInputRef.current?.click();

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-300">{description}</p>
        <UploadStepContent
          uploadStep={uploadStep}
          pendingBg3dFileName={pendingBg3dFile?.name ?? null}
          conversionType={conversionType}
          expectedExt={expectedExt}
          fileAccept={fileAccept}
          loading={loading}
          onDrop={handleDrop}
          onOpenPrimaryPicker={openPrimaryPicker}
          onFileInputChange={handleFileInput}
          onSkipSkeleton={handleSkipSkeleton}
          onCancelSkeleton={() => {
            pushLog("Cancelled skeleton selection.");
            setUploadStep("select-bg3d");
            setPendingBg3dFile(null);
          }}
          primaryInputRef={primaryInputRef}
        />
      </CardContent>
    </Card>
  );
}
