import { 
  ottoMaticLevel, 
  ottoSupertileGrid, 
  ottoTileAttribute 
} from "../python/structSpecs/ottoMaticInterface";
import { GlobalsInterface } from "../data/globals/globals";

export enum Side {
  TOP = "top",
  BOTTOM = "bottom", 
  LEFT = "left",
  RIGHT = "right"
}

export enum Operation {
  ADD_ROW = "add_row",
  REMOVE_ROW = "remove_row", 
  ADD_COLUMN = "add_column",
  REMOVE_COLUMN = "remove_column"
}

/**
 * Converts 2D supertile coordinates to 1D supertile index
 */
export function supertileCoordsToIndex(
  x: number, 
  y: number, 
  supertileWidth: number
): number {
  return y * supertileWidth + x;
}

/**
 * Converts 1D supertile index to 2D coordinates
 */
export function supertileIndexToCoords(
  index: number, 
  supertileWidth: number
): { x: number; y: number } {
  return {
    x: index % supertileWidth,
    y: Math.floor(index / supertileWidth)
  };
}

/**
 * Converts 2D tile coordinates to 1D tile index
 */
export function tileCoordsToIndex(
  x: number, 
  y: number, 
  tileWidth: number
): number {
  return y * tileWidth + x;
}

/**
 * Converts 1D tile index to 2D coordinates
 */
export function tileIndexToCoords(
  index: number, 
  tileWidth: number
): { x: number; y: number } {
  return {
    x: index % tileWidth,
    y: Math.floor(index / tileWidth)
  };
}

/**
 * Creates a blank supertile entry
 */
export function createBlankSupertile(): ottoSupertileGrid {
  return {
    padByte: "",
    isEmpty: true,
    superTileId: 0
  };
}

/**
 * Creates a blank tile attribute entry
 */
export function createBlankTileAttribute(): ottoTileAttribute {
  return {
    flags: 0,
    p0: 0,
    p1: 0
  };
}

/**
 * Adds a row of supertiles to the specified side
 */
export function addSupertileRow(
  data: ottoMaticLevel,
  side: Side.TOP | Side.BOTTOM,
  globals: GlobalsInterface
): ottoMaticLevel {
  const header = data.Hedr[1000].obj;
  const currentSupertileWidth = header.mapWidth / globals.TILES_PER_SUPERTILE;
  
  // Create new supertiles for the new row
  const newSupertiles: ottoSupertileGrid[] = [];
  for (let i = 0; i < currentSupertileWidth; i++) {
    newSupertiles.push(createBlankSupertile());
  }
  
  // Update supertile grid
  const newSTgd = [...data.STgd[1000].obj];
  if (side === Side.TOP) {
    newSTgd.unshift(...newSupertiles);
  } else {
    newSTgd.push(...newSupertiles);
  }
  
  // Update tile data arrays (each supertile = TILES_PER_SUPERTILE^2 tiles)
  const tilesPerSupertileRow = currentSupertileWidth * globals.TILES_PER_SUPERTILE;
  const newTileRowCount = globals.TILES_PER_SUPERTILE; // Adding one supertile row = TILES_PER_SUPERTILE tile rows
  const newTileCount = tilesPerSupertileRow * newTileRowCount;
  
  const newTileAttributes: ottoTileAttribute[] = [];
  const newLayerData: number[] = [];
  const newYCoords: number[] = [];
  
  for (let i = 0; i < newTileCount; i++) {
    newTileAttributes.push(createBlankTileAttribute());
    newLayerData.push(0); // Default layer
    newYCoords.push(0); // Default Y coordinate
  }
  
  // Insert new tile data
  const newAtrb = [...data.Atrb[1000].obj];
  const newLayr = [...data.Layr[1000].obj];
  const newYCrd = [...data.YCrd[1000].obj];
  
  if (side === Side.TOP) {
    newAtrb.unshift(...newTileAttributes);
    newLayr.unshift(...newLayerData);
    newYCrd.unshift(...newYCoords);
  } else {
    newAtrb.push(...newTileAttributes);
    newLayr.push(...newLayerData);
    newYCrd.push(...newYCoords);
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapHeight: header.mapHeight + globals.TILES_PER_SUPERTILE
  };
  
  return {
    ...data,
    Hedr: {
      1000: {
        ...data.Hedr[1000],
        obj: newHeader
      }
    },
    STgd: {
      1000: {
        ...data.STgd[1000],
        obj: newSTgd
      }
    },
    Atrb: {
      1000: {
        ...data.Atrb[1000],
        obj: newAtrb
      }
    },
    Layr: {
      1000: {
        ...data.Layr[1000],
        obj: newLayr
      }
    },
    YCrd: {
      1000: {
        ...data.YCrd[1000],
        obj: newYCrd
      }
    }
  };
}

/**
 * Adds a column of supertiles to the specified side
 */
export function addSupertileColumn(
  data: ottoMaticLevel,
  side: Side.LEFT | Side.RIGHT,
  globals: GlobalsInterface
): ottoMaticLevel {
  const header = data.Hedr[1000].obj;
  const currentSupertileWidth = header.mapWidth / globals.TILES_PER_SUPERTILE;
  const currentSupertileHeight = header.mapHeight / globals.TILES_PER_SUPERTILE;
  const currentTileWidth = header.mapWidth;
  
  // Create new supertile grid
  const newSTgd: ottoSupertileGrid[] = [];
  
  for (let row = 0; row < currentSupertileHeight; row++) {
    for (let col = 0; col < currentSupertileWidth + 1; col++) {
      if (side === Side.LEFT && col === 0) {
        // Insert blank supertile at start of row
        newSTgd.push(createBlankSupertile());
      } else if (side === Side.RIGHT && col === currentSupertileWidth) {
        // Insert blank supertile at end of row
        newSTgd.push(createBlankSupertile());
      } else {
        // Copy existing supertile
        const srcCol = side === Side.LEFT ? col - 1 : col;
        const srcIndex = supertileCoordsToIndex(srcCol, row, currentSupertileWidth);
        newSTgd.push(data.STgd[1000].obj[srcIndex]);
      }
    }
  }
  
  // Create new tile data arrays
  const newTileWidth = currentTileWidth + globals.TILES_PER_SUPERTILE;
  const newAtrb: ottoTileAttribute[] = [];
  const newLayr: number[] = [];
  const newYCrd: number[] = [];
  
  for (let tileRow = 0; tileRow < header.mapHeight; tileRow++) {
    for (let tileCol = 0; tileCol < newTileWidth; tileCol++) {
      if (side === Side.LEFT && tileCol < globals.TILES_PER_SUPERTILE) {
        // Insert blank tiles at start of row
        newAtrb.push(createBlankTileAttribute());
        newLayr.push(0);
        newYCrd.push(0);
      } else if (side === Side.RIGHT && tileCol >= currentTileWidth) {
        // Insert blank tiles at end of row
        newAtrb.push(createBlankTileAttribute());
        newLayr.push(0);
        newYCrd.push(0);
      } else {
        // Copy existing tile
        const srcCol = side === Side.LEFT ? tileCol - globals.TILES_PER_SUPERTILE : tileCol;
        const srcIndex = tileCoordsToIndex(srcCol, tileRow, currentTileWidth);
        newAtrb.push(data.Atrb[1000].obj[srcIndex]);
        newLayr.push(data.Layr[1000].obj[srcIndex]);
        newYCrd.push(data.YCrd[1000].obj[srcIndex]);
      }
    }
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapWidth: header.mapWidth + globals.TILES_PER_SUPERTILE
  };
  
  return {
    ...data,
    Hedr: {
      1000: {
        ...data.Hedr[1000],
        obj: newHeader
      }
    },
    STgd: {
      1000: {
        ...data.STgd[1000],
        obj: newSTgd
      }
    },
    Atrb: {
      1000: {
        ...data.Atrb[1000],
        obj: newAtrb
      }
    },
    Layr: {
      1000: {
        ...data.Layr[1000],
        obj: newLayr
      }
    },
    YCrd: {
      1000: {
        ...data.YCrd[1000],
        obj: newYCrd
      }
    }
  };
}

/**
 * Removes a row of supertiles from the specified side
 */
export function removeSupertileRow(
  data: ottoMaticLevel,
  side: Side.TOP | Side.BOTTOM,
  globals: GlobalsInterface
): ottoMaticLevel {
  const header = data.Hedr[1000].obj;
  const currentSupertileWidth = header.mapWidth / globals.TILES_PER_SUPERTILE;
  const currentSupertileHeight = header.mapHeight / globals.TILES_PER_SUPERTILE;
  
  // Don't allow removing if we'd go below 1 supertile row
  if (currentSupertileHeight <= 1) {
    throw new Error("Cannot remove row: map must have at least one supertile row");
  }
  
  // Remove supertiles
  const newSTgd = [...data.STgd[1000].obj];
  if (side === Side.TOP) {
    newSTgd.splice(0, currentSupertileWidth);
  } else {
    newSTgd.splice(-currentSupertileWidth, currentSupertileWidth);
  }
  
  // Remove tile data
  const tilesPerSupertileRow = currentSupertileWidth * globals.TILES_PER_SUPERTILE;
  const tilesToRemove = globals.TILES_PER_SUPERTILE * tilesPerSupertileRow;
  
  const newAtrb = [...data.Atrb[1000].obj];
  const newLayr = [...data.Layr[1000].obj];
  const newYCrd = [...data.YCrd[1000].obj];
  
  if (side === Side.TOP) {
    newAtrb.splice(0, tilesToRemove);
    newLayr.splice(0, tilesToRemove);
    newYCrd.splice(0, tilesToRemove);
  } else {
    newAtrb.splice(-tilesToRemove, tilesToRemove);
    newLayr.splice(-tilesToRemove, tilesToRemove);
    newYCrd.splice(-tilesToRemove, tilesToRemove);
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapHeight: header.mapHeight - globals.TILES_PER_SUPERTILE
  };
  
  return {
    ...data,
    Hedr: {
      1000: {
        ...data.Hedr[1000],
        obj: newHeader
      }
    },
    STgd: {
      1000: {
        ...data.STgd[1000],
        obj: newSTgd
      }
    },
    Atrb: {
      1000: {
        ...data.Atrb[1000],
        obj: newAtrb
      }
    },
    Layr: {
      1000: {
        ...data.Layr[1000],
        obj: newLayr
      }
    },
    YCrd: {
      1000: {
        ...data.YCrd[1000],
        obj: newYCrd
      }
    }
  };
}

/**
 * Removes a column of supertiles from the specified side
 */
export function removeSupertileColumn(
  data: ottoMaticLevel,
  side: Side.LEFT | Side.RIGHT,
  globals: GlobalsInterface
): ottoMaticLevel {
  const header = data.Hedr[1000].obj;
  const currentSupertileWidth = header.mapWidth / globals.TILES_PER_SUPERTILE;
  const currentSupertileHeight = header.mapHeight / globals.TILES_PER_SUPERTILE;
  const currentTileWidth = header.mapWidth;
  
  // Don't allow removing if we'd go below 1 supertile column
  if (currentSupertileWidth <= 1) {
    throw new Error("Cannot remove column: map must have at least one supertile column");
  }
  
  // Create new supertile grid
  const newSTgd: ottoSupertileGrid[] = [];
  
  for (let row = 0; row < currentSupertileHeight; row++) {
    for (let col = 0; col < currentSupertileWidth - 1; col++) {
      const srcCol = side === Side.LEFT ? col + 1 : col;
      const srcIndex = supertileCoordsToIndex(srcCol, row, currentSupertileWidth);
      newSTgd.push(data.STgd[1000].obj[srcIndex]);
    }
  }
  
  // Create new tile data arrays
  const newTileWidth = currentTileWidth - globals.TILES_PER_SUPERTILE;
  const newAtrb: ottoTileAttribute[] = [];
  const newLayr: number[] = [];
  const newYCrd: number[] = [];
  
  for (let tileRow = 0; tileRow < header.mapHeight; tileRow++) {
    for (let tileCol = 0; tileCol < newTileWidth; tileCol++) {
      const srcCol = side === Side.LEFT ? tileCol + globals.TILES_PER_SUPERTILE : tileCol;
      const srcIndex = tileCoordsToIndex(srcCol, tileRow, currentTileWidth);
      newAtrb.push(data.Atrb[1000].obj[srcIndex]);
      newLayr.push(data.Layr[1000].obj[srcIndex]);
      newYCrd.push(data.YCrd[1000].obj[srcIndex]);
    }
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapWidth: header.mapWidth - globals.TILES_PER_SUPERTILE
  };
  
  return {
    ...data,
    Hedr: {
      1000: {
        ...data.Hedr[1000],
        obj: newHeader
      }
    },
    STgd: {
      1000: {
        ...data.STgd[1000],
        obj: newSTgd
      }
    },
    Atrb: {
      1000: {
        ...data.Atrb[1000],
        obj: newAtrb
      }
    },
    Layr: {
      1000: {
        ...data.Layr[1000],
        obj: newLayr
      }
    },
    YCrd: {
      1000: {
        ...data.YCrd[1000],
        obj: newYCrd
      }
    }
  };
}

/**
 * Adds new blank supertile textures to the mapImages array
 */
export function addBlankSupertileTextures(
  mapImages: HTMLCanvasElement[],
  count: number,
  globals: GlobalsInterface
): HTMLCanvasElement[] {
  const newImages = [...mapImages];
  
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = globals.SUPERTILE_TEXMAP_SIZE;
    canvas.height = globals.SUPERTILE_TEXMAP_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    newImages.push(canvas);
  }
  
  return newImages;
}