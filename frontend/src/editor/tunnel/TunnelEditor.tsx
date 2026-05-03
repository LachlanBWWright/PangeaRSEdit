/**
 * Tunnel Editor Page
 *
 * Main editor interface for Bugdom 2 tunnel levels.
 */

import { useCallback, useState } from "react";
import type { TunnelData } from "@/data/tunnelParser/types";
import { TunnelEditorView } from "./TunnelEditorView";
import { TunnelUploadPrompt } from "./TunnelUploadPrompt";

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
  const [internalTunnelData, setInternalTunnelData] =
    useState<TunnelData | null>(null);
  const [internalFileName, setInternalFileName] = useState<string>("");
  const [internalIsPlumbing, setInternalIsPlumbing] = useState<boolean>(true);

  // Use external props if provided, otherwise use internal state
  const tunnelData = externalTunnelData ?? internalTunnelData;
  const fileName = externalFileName ?? internalFileName;
  const isPlumbing = externalIsPlumbing ?? internalIsPlumbing;

  const handleUpdate = useCallback(
    (data: TunnelData) => {
      if (externalOnUpdate) {
        externalOnUpdate(data);
      } else {
        setInternalTunnelData(data);
      }
    },
    [externalOnUpdate],
  );

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
    [externalOnUpdate],
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
