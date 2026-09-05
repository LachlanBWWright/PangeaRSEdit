import { useCallback, useRef, useState } from "react";
import type { TunnelData, TunnelLevelKind } from "@/data/tunnelParser/types";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TunnelUploadPrompt({
  onFileLoaded,
}: {
  onFileLoaded: (
    data: TunnelData,
    fileName: string,
    levelKind: TunnelLevelKind,
  ) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [levelKind, setLevelKind] = useState<TunnelLevelKind>("plumbing");

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const result = parseTunnelFile(buffer);
      if (result.isErr()) {
        toast.error("Failed to parse tunnel file", {
          description: result.error,
        });
        return;
      }
      onFileLoaded(result.value, file.name, levelKind);
    },
    [levelKind, onFileLoaded],
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <h1 className="text-3xl font-bold text-white">Tunnel Level Editor</h1>
      <p className="text-gray-400 text-center max-w-md">
        Edit Bugdom 2 tunnel levels (.tun files). Load a Plumbing.tun or
        Gutter.tun file to get started.
      </p>
      <div className="flex gap-2" role="group" aria-label="Tunnel level">
        {(["plumbing", "gutter"] as const).map((kind) => (
          <Button
            key={kind}
            variant={levelKind === kind ? "default" : "outline"}
            onClick={() => setLevelKind(kind)}
          >
            {kind === "plumbing" ? "Plumbing" : "Gutter"}
          </Button>
        ))}
      </div>
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
