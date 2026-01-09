/**
 * Tunnel Editor Page
 *
 * Main editor interface for Bugdom 2 tunnel levels.
 */

import { useState, useCallback, useRef } from "react";
import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import { serializeTunnelFile } from "@/data/tunnelParser/serializeTunnelFile";
import { TunnelViewer } from "./TunnelViewer";
import { TunnelItemEditor } from "./TunnelItemEditor";
import { SectionInspector } from "./SectionInspector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type EditorTab = "items" | "sections" | "spline";

interface TunnelEditorViewProps {
  tunnelData: TunnelData;
  fileName: string;
  isPlumbing: boolean;
  onUpdateTunnelData: (data: TunnelData) => void;
  onClose: () => void;
}

/**
 * Editor view with 3D viewer and editing panels
 */
function TunnelEditorView({
  tunnelData,
  fileName,
  isPlumbing,
  onUpdateTunnelData,
  onClose,
}: TunnelEditorViewProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("items");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [showWater, setShowWater] = useState(true);
  const [showSpline, setShowSpline] = useState(true);
  const [showItems, setShowItems] = useState(true);

  const handleUpdateItem = useCallback(
    (index: number, item: TunnelItem) => {
      const newItems = [...tunnelData.items];
      newItems[index] = item;
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
    },
    [tunnelData, onUpdateTunnelData]
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      const newItems = tunnelData.items.filter((_, i) => i !== index);
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
    },
    [tunnelData, onUpdateTunnelData]
  );

  const handleAddItem = useCallback(
    (item: TunnelItem) => {
      const newItems = [...tunnelData.items, item];
      onUpdateTunnelData({
        ...tunnelData,
        items: newItems,
        header: { ...tunnelData.header, numItems: newItems.length },
      });
      setSelectedItemIndex(newItems.length - 1);
    },
    [tunnelData, onUpdateTunnelData]
  );

  const handleSave = useCallback(() => {
    const result = serializeTunnelFile(tunnelData);
    if (!result.ok) {
      toast.error("Failed to save", { description: result.error.message });
      return;
    }

    const blob = new Blob([result.value], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Tunnel file saved!");
  }, [tunnelData, fileName]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <Button variant="outline" onClick={onClose}>
          ← Back
        </Button>
        <div className="flex-1 text-white font-medium">{fileName}</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="showWater"
              checked={showWater}
              onCheckedChange={(checked) => setShowWater(checked === true)}
            />
            <Label htmlFor="showWater" className="text-white text-sm">
              Water
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showSpline"
              checked={showSpline}
              onCheckedChange={(checked) => setShowSpline(checked === true)}
            />
            <Label htmlFor="showSpline" className="text-white text-sm">
              Spline
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showItems"
              checked={showItems}
              onCheckedChange={(checked) => setShowItems(checked === true)}
            />
            <Label htmlFor="showItems" className="text-white text-sm">
              Items
            </Label>
          </div>
        </div>
        <Button onClick={handleSave}>Download</Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* 3D Viewer */}
        <div className="flex-1 min-w-0">
          <TunnelViewer
            tunnelData={tunnelData}
            selectedSection={selectedSection}
            showWater={showWater}
            showSpline={showSpline}
            showItems={showItems}
          />
        </div>

        {/* Side panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === "items"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("items")}
            >
              Items
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === "sections"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("sections")}
            >
              Sections
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "items" && (
              <TunnelItemEditor
                tunnelData={tunnelData}
                isPlumbing={isPlumbing}
                selectedItemIndex={selectedItemIndex}
                onSelectItem={setSelectedItemIndex}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
              />
            )}
            {activeTab === "sections" && (
              <SectionInspector
                tunnelData={tunnelData}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm text-gray-400">
        <span>
          {tunnelData.header.fullPipe ? "Full Pipe" : "Half Pipe"}
        </span>
        <span>•</span>
        <span>{tunnelData.header.numSections} Sections</span>
        <span>•</span>
        <span>{tunnelData.items.length} Items</span>
        <span>•</span>
        <span>{tunnelData.splinePoints.length} Spline Points</span>
      </div>
    </div>
  );
}

/**
 * Upload prompt for tunnel files
 */
function TunnelUploadPrompt({
  onFileLoaded,
}: {
  onFileLoaded: (data: TunnelData, fileName: string, isPlumbing: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const result = parseTunnelFile(buffer);

      if (!result.ok) {
        toast.error("Failed to parse tunnel file", {
          description: result.error.message,
        });
        return;
      }

      const isPlumbing = file.name.toLowerCase().includes("plumb");
      onFileLoaded(result.value, file.name, isPlumbing);
    },
    [onFileLoaded]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <h1 className="text-3xl font-bold text-white">Tunnel Level Editor</h1>
      <p className="text-gray-400 text-center max-w-md">
        Edit Bugdom 2 tunnel levels (.tun files). Load a Plumbing.tun or
        Gutter.tun file to get started.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".tun"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        size="lg"
        onClick={() => fileInputRef.current?.click()}
      >
        Open Tunnel File (.tun)
      </Button>
    </div>
  );
}

/**
 * Main tunnel editor component
 * Can be used in two ways:
 * 1. Controlled: Pass tunnelData and other props to manage state externally
 * 2. Standalone: Use without props for self-contained file upload and management
 */
export interface TunnelEditorProps {
  tunnelData?: TunnelData;
  fileName?: string;
  isPlumbing?: boolean;
  onUpdateTunnelData?: (data: TunnelData) => void;
  onClose?: () => void;
}

export function TunnelEditor({
  tunnelData: externalTunnelData,
  fileName: externalFileName,
  isPlumbing: externalIsPlumbing,
  onUpdateTunnelData: externalOnUpdate,
  onClose: externalOnClose,
}: TunnelEditorProps = {}) {
  // Internal state for standalone mode
  const [internalTunnelData, setInternalTunnelData] = useState<TunnelData | null>(null);
  const [internalFileName, setInternalFileName] = useState<string>("");
  const [internalIsPlumbing, setInternalIsPlumbing] = useState<boolean>(true);

  // Use external props if provided, otherwise use internal state
  const tunnelData = externalTunnelData ?? internalTunnelData;
  const fileName = externalFileName ?? internalFileName;
  const isPlumbing = externalIsPlumbing ?? internalIsPlumbing;
  
  const handleUpdate = useCallback((data: TunnelData) => {
    if (externalOnUpdate) {
      externalOnUpdate(data);
    } else {
      setInternalTunnelData(data);
    }
  }, [externalOnUpdate]);

  const handleClose = useCallback(() => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalTunnelData(null);
      setInternalFileName("");
    }
  }, [externalOnClose]);

  const handleFileLoaded = useCallback(
    (data: TunnelData, name: string, plumbing: boolean) => {
      if (externalOnUpdate) {
        externalOnUpdate(data);
      } else {
        setInternalTunnelData(data);
        setInternalFileName(name);
        setInternalIsPlumbing(plumbing);
      }
    },
    [externalOnUpdate]
  );

  // If no data is available, show upload prompt (standalone mode only)
  if (!tunnelData) {
    return <TunnelUploadPrompt onFileLoaded={handleFileLoaded} />;
  }

  return (
    <TunnelEditorView
      tunnelData={tunnelData}
      fileName={fileName}
      isPlumbing={isPlumbing}
      onUpdateTunnelData={handleUpdate}
      onClose={handleClose}
    />
  );
}
