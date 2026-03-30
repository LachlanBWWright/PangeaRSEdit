import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  className?: string;
  acceptType: string;
  disabled?: boolean;
  handleOnChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

/**
 * Themed file upload button — visually consistent with the rest of the editor.
 * Renders a styled Button with a hidden <input type="file"> attached.
 */
export function FileUpload({ className, handleOnChange, acceptType, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={className}>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-1" />
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={acceptType}
        className="hidden"
        disabled={disabled}
        onChange={handleOnChange}
      />
    </div>
  );
}
