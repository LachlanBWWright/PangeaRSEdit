import { useCallback } from "react";
import { toast } from "sonner";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { createEngineTerrainPackage } from "./engineLevelConversion";
import { downloadEnginePackage } from "./engineDownload";
import type { EnginePackage } from "./enginePackage";

export function useEngineTerrainExport(header: HeaderData | null, terrain: TerrainData | null, globals: GlobalsInterface, filename: string) {
  return useCallback(() => {
    if (!header || !terrain) return;
    const converted = createEngineTerrainPackage(header, terrain, globals, filename);
    if (converted.isErr()) { toast.error(converted.error); return; }
    downloadEnginePackage(converted.value, (action) => {
      if (action.type === "status") toast.error(action.message);
      if (action.type === "saved") toast.success("Terrain package downloaded. Items, textures, water and fences are not converted.");
    });
  }, [header, terrain, globals, filename]);
}

export function useEngineTerrainPreview(header: HeaderData | null, terrain: TerrainData | null, globals: GlobalsInterface, filename: string, onPreview: (packageData: EnginePackage) => void) {
  return useCallback(() => {
    if (!header || !terrain) return;
    createEngineTerrainPackage(header, terrain, globals, filename).match(onPreview, (message) => toast.error(message));
  }, [header, terrain, globals, filename, onPreview]);
}
