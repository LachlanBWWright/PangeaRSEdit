import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import type { ImageEditorSaveAction } from "./types";

interface ImageEditorFooterProps {
  handleClose: () => void;
  saveActions?: ImageEditorSaveAction[];
  handleSave: (
    customSaveHandler?: (editedImageData: ImageData) => Promise<void>,
  ) => Promise<void>;
  onSave: (editedImageData: ImageData) => Promise<void>;
  saving: boolean;
}

export function ImageEditorFooter({
  handleClose,
  saveActions,
  handleSave,
  onSave,
  saving,
}: ImageEditorFooterProps) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-gray-600">
      <Button onClick={handleClose} variant="outline">
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>

      {saveActions && saveActions.length > 0 ? (
        <div className="flex gap-2">
          {saveActions.map((action) => (
            <Button
              key={action.label}
              onClick={() => handleSave(action.onSave)}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : action.label}
            </Button>
          ))}
        </div>
      ) : (
        <Button
          onClick={() => handleSave(onSave)}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
