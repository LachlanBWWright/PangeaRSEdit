import React from "react";
import { Upload } from "lucide-react";

interface DropAreaProps {
  id?: string;
  onDrop: (e: React.DragEvent) => void;
  onClick?: () => void;
  children?: React.ReactNode;
  hint?: string;
}

export function DropArea({
  id,
  onDrop,
  onClick,
  children,
  hint,
}: DropAreaProps) {
  return (
    <div
      id={id}
      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      {children}
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

export default DropArea;
