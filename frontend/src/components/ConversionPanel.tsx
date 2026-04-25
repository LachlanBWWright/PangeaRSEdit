import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import {
  getDroppedFile,
  runConversionWorker,
  toDownloadName,
  triggerConversionDownload,
} from "@/components/conversionPanelActions";

interface ConversionPanelProps {
  title: string;
  description: string;
  acceptedFileType: string;
  fileExtension: string;
  outputExtension: string;
  conversionType: "bg3d-to-glb" | "glb-to-bg3d";
  outputMimeType: string;
}

export function ConversionPanel({
  title,
  description,
  acceptedFileType,
  fileExtension,
  outputExtension,
  conversionType,
  outputMimeType,
}: ConversionPanelProps) {
  const handleFileConversion = async (file: File) => {
    const downloadName = toDownloadName(
      file.name,
      fileExtension,
      outputExtension,
    );

    const result = await runConversionWorker({
      file,
      conversionType,
      fileExtension,
    });
    if (!result) {
      alert(`${title} conversion failed`);
      return;
    }

    if (result.type === "error") {
      alert(`${title} conversion failed: ${result.error}`);
      return;
    }

    if (result.type === conversionType) {
      triggerConversionDownload(downloadName, outputMimeType, result.result);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = getDroppedFile(e, fileExtension);
    if (file) {
      await handleFileConversion(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    await handleFileConversion(file);
    e.target.value = "";
  };

  const inputId = `${conversionType}-upload`;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-300">{description}</p>
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">
            Drop a {fileExtension.toUpperCase()} file here or click to select
          </p>
          <p className="text-sm text-gray-500">Supports {acceptedFileType}</p>
        </div>
        <input
          type="file"
          accept={acceptedFileType}
          className="hidden"
          id={inputId}
          onChange={handleFileInput}
        />
      </CardContent>
    </Card>
  );
}
