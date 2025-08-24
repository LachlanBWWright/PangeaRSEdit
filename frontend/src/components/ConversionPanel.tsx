import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import BG3DGltfWorker from "../modelParsers/bg3dGltfWorker?worker";
import {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "../modelParsers/bg3dGltfWorker";

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
    const downloadName = file.name.replace(new RegExp(`\\.${fileExtension}$`), `.${outputExtension}`);
    
    try {
      const buffer = await file.arrayBuffer();
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
        
        const message: BG3DGltfWorkerMessage = {
          type: conversionType,
          buffer,
        };
        
        worker.postMessage(message, [buffer]);
      });
      
      if (result.type === "error") {
        throw new Error(result.error);
      }
      
      if (result.type === conversionType) {
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
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`${title} conversion failed: ${errorMessage}`);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files.find((f) =>
      f.name.toLowerCase().endsWith(`.${fileExtension}`)
    );
    if (file) {
      await handleFileConversion(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileConversion(file);
    e.target.value = ''; // Reset input
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