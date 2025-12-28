/**
 * Supertiles.tsx
 * 
 * Main dispatcher component for rendering supertiles based on tile system type.
 * Detects whether the game uses individual tiles or pre-composed supertiles
 * and delegates to the appropriate specialized component.
 */

import { memo } from "react";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { IndividualTileSupertiles } from "./supertiles/IndividualTileSupertiles";
import { StandardSupertiles } from "./supertiles/StandardSupertiles";

export const Supertiles = memo(
  ({
    headerData,
    terrainData,
    mapImages,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    mapImages: HTMLCanvasElement[];
  }) => {
    // Detect tile system based on data structure, not game type
    // Individual tile games (Bugdom 1, Nanosaur 1) have Layr data and possibly Xlat
    // Standard games have STgd with supertile grid data
    const hasLayr = Boolean(terrainData.Layr?.[1000]?.obj);
    const hasSTgd = Boolean(terrainData.STgd?.[1000]?.obj);
    const usesIndividualTiles = hasLayr && !hasSTgd;

    console.log("Supertiles dispatcher:", {
      usesIndividualTiles,
      hasLayr,
      hasSTgd,
      mapImagesCount: mapImages.length,
    });

    // For individual tile games (Bugdom 1, Nanosaur 1), use IndividualTileSupertiles
    // which constructs supertiles from individual 32x32 tiles
    if (usesIndividualTiles) {
      return (
        <IndividualTileSupertiles
          headerData={headerData}
          terrainData={terrainData}
          mapImages={mapImages}
        />
      );
    }

    // Standard supertile rendering for other games (requires STgd)
    if (!terrainData.STgd?.[1000]?.obj) {
      return null; // No supertile grid available
    }

    return (
      <StandardSupertiles
        headerData={headerData}
        terrainData={terrainData}
        mapImages={mapImages}
      />
    );
  },
);

Supertiles.displayName = "Supertiles";
