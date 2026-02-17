import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <Select
            value={selectedType}
            onValueChange={(value) => {
              if (value === "sprites" || value === "tga" || value === "tileset") {
                onTypeChange(value);
              } else {
                console.warn("Unknown file type selected:", value);
              }
            }}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select file type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="sprites" className="text-white focus:bg-gray-600">
                Sprites (.shapes)
              </SelectItem>
              <SelectItem value="tga" className="text-white focus:bg-gray-600">
                Images (.tga)
              </SelectItem>
              <SelectItem value="tileset" className="text-white focus:bg-gray-600">
                Tilesets (.tileset)
              </SelectItem>
            </SelectContent>
          </Select>
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
