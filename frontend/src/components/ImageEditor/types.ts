export interface BrushStroke {
  points: number[];
  color: string;
  size: number;
  shape: "circle" | "square";
}

export interface ImageEditorSaveAction {
  label: string;
  onSave: (editedImageData: ImageData) => Promise<void>;
}
