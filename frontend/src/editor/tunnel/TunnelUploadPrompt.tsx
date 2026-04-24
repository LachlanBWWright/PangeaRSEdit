import { useCallback, useRef } from "react";
import type { TunnelData } from "@/data/tunnelParser/types";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TunnelUploadPrompt({
  onFileLoaded,
}: {
  onFileLoaded: (
    data: TunnelData,
    fileName: string,
    isPlumbing: boolean,
  ) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const result = parseTunnelFile(buffer);
      if (result.isErr()) {
        toast.error("Failed to parse tunnel file", {
          description: result.error.message,
        });
        return;
      }
      const isPlumbing = file.name.toLowerCase().includes("plumb");
      onFileLoaded(result.value, file.name, isPlumbing);
    },
    [onFileLoaded],
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
      <Button size="lg" onClick={() => fileInputRef.current?.click()}>
        Open Tunnel File (.tun)
      </Button>
    </div>
  );
}
