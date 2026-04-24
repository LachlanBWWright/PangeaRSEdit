import type { Updater } from "use-immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

type TileAttributeProperty = "flags" | "p0" | "p1" | "p2" | "p3" | "p4";
type CollisionProperty = "hasCollisionMask" | "usePixelAccurateCollision";
type ParamBrushFieldValue = "flags" | "p0" | "p1" | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getNumber(value: unknown, defaultValue = 0): number {
  return typeof value === "number" ? value : defaultValue;
}

export function createUpdateTileAttributeHandler(
  setTerrainData: Updater<TerrainData>,
  currentImageIndex: number | null,
) {
  return (property: TileAttributeProperty, value: number) => {
    if (currentImageIndex === null) {
      return;
    }

    setTerrainData((data) => {
      const tileset = isRecord(data.tileset) ? data.tileset : undefined;
      const tileAttributes =
        tileset && isArray(tileset.tileAttributes)
          ? tileset.tileAttributes
          : undefined;
      const tileAttribute = tileAttributes?.[currentImageIndex];
      if (isRecord(tileAttribute)) {
        tileAttribute[property] = value;
      }

      const levelTileAttribute = data.Atrb?.[1000]?.obj?.[currentImageIndex];
      if (
        levelTileAttribute &&
        (property === "flags" || property === "p0" || property === "p1")
      ) {
        levelTileAttribute[property] = value;
      }
    });
  };
}

export function createUpdateCollisionPropertyHandler(
  setTerrainData: Updater<TerrainData>,
  effectiveSelectedTile: number,
) {
  return (property: CollisionProperty, value: boolean) => {
    setTerrainData((data) => {
      const meta =
        isRecord(data._metadata) &&
        isRecord(data._metadata[1000]) &&
        isRecord(data._metadata[1000].obj)
          ? data._metadata[1000].obj
          : undefined;
      const tileValues =
        meta && isArray(meta.mightyMikeTileValues)
          ? meta.mightyMikeTileValues
          : undefined;
      if (
        !tileValues ||
        effectiveSelectedTile < 0 ||
        effectiveSelectedTile >= tileValues.length
      ) {
        return;
      }
      const tileVal = tileValues[effectiveSelectedTile];
      if (!isRecord(tileVal)) {
        return;
      }
      tileVal[property] = value;
    });
  };
}

export function createToggleBooleanHandler(
  setValue: (next: boolean) => void,
  currentValue: boolean,
) {
  return () => setValue(!currentValue);
}

export function createParamBrushFieldChangeHandler(
  setParamBrushField: (value: ParamBrushFieldValue) => void,
) {
  return (value: string) => {
    if (value === "flags" || value === "p0" || value === "p1") {
      setParamBrushField(value);
      return;
    }

    setParamBrushField(null);
  };
}

export function createCloseEditorHandler(
  setOpen: (next: boolean) => void,
  setUrl?: (next: string | null) => void,
) {
  return () => {
    setOpen(false);
    if (setUrl) {
      setUrl(null);
    }
  };
}

export function createSetManualTilePaletteSelectionHandler(
  setManualTilePaletteSelection: (value: {
    tile: number;
    palette: number;
  }) => void,
  effectiveSelectedTile: number,
) {
  return (palette: number) => {
    setManualTilePaletteSelection({
      tile: effectiveSelectedTile,
      palette,
    });
  };
}

export function getTileAttributeValue(
  currentTileAttributes: Record<string, unknown> | null,
  property: "flags" | "p0" | "p1",
  defaultValue = 0,
) {
  if (!currentTileAttributes) {
    return defaultValue;
  }

  return getNumber(currentTileAttributes[property], defaultValue);
}
