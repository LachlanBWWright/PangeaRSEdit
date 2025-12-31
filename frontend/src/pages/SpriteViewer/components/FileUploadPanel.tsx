import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

type FileType = "sprites" | "tga" | "tileset";

interface FileUploadPanelProps {
  selectedType: FileType;
  onTypeChange: (type: FileType) => void;
  onFileSelected: (file: File, type: FileType) => void;
  loading: boolean;
}

export function FileUploadPanel({
  selectedType,
  onTypeChange,
  onFileSelected,
  loading,
}: FileUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelected(file, selectedType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">Upload Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-2">File Type</label>
          <select
            value={selectedType}
            onChange={(e) => { onTypeChange(e.target.value); }}
            className="w-full bg-gray-700 text-white rounded px-2 py-2 text-sm border border-gray-600"
          >
            <option value="sprites" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Sprites (.shapes)</option>
            <option value="tga" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Images (.tga)</option>
            <option value="tileset" style={{ color: "white", backgroundColor: "#1a1a2e" }}>Tilesets (.tileset)</option>
          </select>
        </div>

        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
          <p className="text-xs text-gray-400">Drag & drop or click to upload</p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) onFileSelected(file, selectedType);
            }}
            className="hidden"
          />
        </div>

        {loading && <p className="text-sm text-blue-400">Loading...</p>}
      </CardContent>
    </Card>
  );
}
