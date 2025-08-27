import { 
  ottoMaticLevel, 
  ottoSupertileGrid, 
  ottoTileAttribute,
  ottoFenceNub
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
 * Adjusts spatial coordinates for items, splines, fences, and liquids
 * when adding/removing from top/left sides
 */
function adjustSpatialCoordinates(
  data: ottoMaticLevel,
  operation: Operation,
  side: Side,
  globals: GlobalsInterface
): ottoMaticLevel {
  const adjustmentX = (operation === Operation.ADD_COLUMN && side === Side.LEFT) ? 
    globals.TILES_PER_SUPERTILE * globals.TILE_SIZE : 
    (operation === Operation.REMOVE_COLUMN && side === Side.LEFT) ? 
    -globals.TILES_PER_SUPERTILE * globals.TILE_SIZE : 0;
    
  const adjustmentZ = (operation === Operation.ADD_ROW && side === Side.TOP) ? 
    globals.TILES_PER_SUPERTILE * globals.TILE_SIZE : 
    (operation === Operation.REMOVE_ROW && side === Side.TOP) ? 
    -globals.TILES_PER_SUPERTILE * globals.TILE_SIZE : 0;

  // Only adjust if we're adding/removing from top or left
  if (adjustmentX === 0 && adjustmentZ === 0) {
    return data;
  }

  const result = { ...data };

  // Adjust items
  if (data.Itms && data.Itms[1000]) {
    result.Itms = {
      ...data.Itms,
      1000: {
        ...data.Itms[1000],
        obj: data.Itms[1000].obj.map(item => ({
          ...item,
          x: item.x + adjustmentX,
          z: item.z + adjustmentZ
        }))
      }
    };
  }

  // Adjust fences
  if (data.Fenc && data.Fenc[1000]) {
    result.Fenc = {
      ...data.Fenc,
      1000: {
        ...data.Fenc[1000],
        obj: data.Fenc[1000].obj.map(fence => ({
          ...fence,
          bbLeft: fence.bbLeft + adjustmentX,
          bbRight: fence.bbRight + adjustmentX,
          bbTop: fence.bbTop + adjustmentZ,
          bbBottom: fence.bbBottom + adjustmentZ
        }))
      }
    };
  }

  // Adjust fence nubs
  if (data.FnNb) {
    result.FnNb = {};
    for (const key in data.FnNb) {
      if (data.FnNb.hasOwnProperty(key)) {
        const fenceNubData = data.FnNb[Number(key)];
        result.FnNb[Number(key)] = {
          ...fenceNubData,
          obj: fenceNubData.obj.map(nub => [nub[0] + adjustmentX, nub[1] + adjustmentZ] as ottoFenceNub)
        };
      }
    }
  }

  // Adjust splines
  if (data.Spln && data.Spln[1000]) {
    result.Spln = {
      ...data.Spln,
      1000: {
        ...data.Spln[1000],
        obj: data.Spln[1000].obj.map(spline => ({
          ...spline,
          bbLeft: spline.bbLeft + adjustmentX,
          bbRight: spline.bbRight + adjustmentX,
          bbTop: spline.bbTop + adjustmentZ,
          bbBottom: spline.bbBottom + adjustmentZ
        }))
      }
    };
  }

  // Adjust spline nubs
  if (data.SpNb) {
    result.SpNb = {};
    for (const key in data.SpNb) {
      if (data.SpNb.hasOwnProperty(key)) {
        const splineNubData = data.SpNb[Number(key)];
        result.SpNb[Number(key)] = {
          ...splineNubData,
          obj: splineNubData.obj.map(nub => ({
            ...nub,
            x: nub.x + adjustmentX,
            z: nub.z + adjustmentZ
          }))
        };
      }
    }
  }

  // Adjust spline points
  if (data.SpPt) {
    result.SpPt = {};
    for (const key in data.SpPt) {
      if (data.SpPt.hasOwnProperty(key)) {
        const splinePointData = data.SpPt[Number(key)];
        result.SpPt[Number(key)] = {
          ...splinePointData,
          obj: splinePointData.obj.map(point => ({
            ...point,
            x: point.x + adjustmentX,
            z: point.z + adjustmentZ
          }))
        };
      }
    }
  }

  // Adjust liquid/water bodies
  if (data.Liqd && data.Liqd[1000]) {
    result.Liqd = {
      ...data.Liqd,
      1000: {
        ...data.Liqd[1000],
        obj: data.Liqd[1000].obj.map(liquid => ({
          ...liquid,
          bBoxLeft: liquid.bBoxLeft + adjustmentX,
          bBoxRight: liquid.bBoxRight + adjustmentX,
          bBoxTop: liquid.bBoxTop + adjustmentZ,
          bBoxBottom: liquid.bBoxBottom + adjustmentZ,
          hotSpotX: liquid.hotSpotX + adjustmentX,
          hotSpotZ: liquid.hotSpotZ + adjustmentZ,
          nubs: liquid.nubs.map(nub => [nub[0] + adjustmentX, nub[1] + adjustmentZ] as [number, number])
        }))
      }
    };
  }

  return result;
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
  
  for (let i = 0; i < newTileCount; i++) {
    newTileAttributes.push(createBlankTileAttribute());
    newLayerData.push(0); // Default layer
  }
  
  // YCrd represents height data at tile vertices, so it needs (width+1) * (height+1) entries
  // When adding a row, we need to add (width+1) * TILES_PER_SUPERTILE new Y coordinates
  const newYCoordCount = (header.mapWidth + 1) * globals.TILES_PER_SUPERTILE;
  const newYCoords: number[] = [];
  for (let i = 0; i < newYCoordCount; i++) {
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
  
  // Create the base level data with terrain changes
  const baseResult = {
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

  // Apply coordinate adjustments for spatial data when adding from top
  return adjustSpatialCoordinates(
    baseResult, 
    Operation.ADD_ROW, 
    side, 
    globals
  );
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
  
  // Create new tile data arrays for Atrb and Layr (per tile)
  const newTileWidth = currentTileWidth + globals.TILES_PER_SUPERTILE;
  const newAtrb: ottoTileAttribute[] = [];
  const newLayr: number[] = [];
  
  for (let tileRow = 0; tileRow < header.mapHeight; tileRow++) {
    for (let tileCol = 0; tileCol < newTileWidth; tileCol++) {
      if (side === Side.LEFT && tileCol < globals.TILES_PER_SUPERTILE) {
        // Insert blank tiles at start of row
        newAtrb.push(createBlankTileAttribute());
        newLayr.push(0);
      } else if (side === Side.RIGHT && tileCol >= currentTileWidth) {
        // Insert blank tiles at end of row
        newAtrb.push(createBlankTileAttribute());
        newLayr.push(0);
      } else {
        // Copy existing tile
        const srcCol = side === Side.LEFT ? tileCol - globals.TILES_PER_SUPERTILE : tileCol;
        const srcIndex = tileCoordsToIndex(srcCol, tileRow, currentTileWidth);
        newAtrb.push(data.Atrb[1000].obj[srcIndex]);
        newLayr.push(data.Layr[1000].obj[srcIndex]);
      }
    }
  }
  
  // Create new Y coordinate data (per vertex, not per tile)
  // YCrd has (width+1) * (height+1) entries for tile vertices
  const newYCoordWidth = newTileWidth + 1;
  const newYCoordHeight = header.mapHeight + 1;
  const currentYCoordWidth = currentTileWidth + 1;
  const newYCrd: number[] = [];
  
  for (let yRow = 0; yRow < newYCoordHeight; yRow++) {
    for (let yCol = 0; yCol < newYCoordWidth; yCol++) {
      if (side === Side.LEFT && yCol < globals.TILES_PER_SUPERTILE) {
        // Insert blank Y coordinates at start of row
        newYCrd.push(0);
      } else if (side === Side.RIGHT && yCol >= currentYCoordWidth) {
        // Insert blank Y coordinates at end of row
        newYCrd.push(0);
      } else {
        // Copy existing Y coordinate
        const srcYCol = side === Side.LEFT ? yCol - globals.TILES_PER_SUPERTILE : yCol;
        const srcYIndex = yRow * currentYCoordWidth + srcYCol;
        newYCrd.push(data.YCrd[1000].obj[srcYIndex]);
      }
    }
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapWidth: header.mapWidth + globals.TILES_PER_SUPERTILE
  };
  
  // Create the base level data with terrain changes
  const baseResult = {
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

  // Apply coordinate adjustments for spatial data when adding from left
  return adjustSpatialCoordinates(
    baseResult, 
    Operation.ADD_COLUMN, 
    side, 
    globals
  );
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
  
  // Remove tile data (Atrb and Layr are per tile)
  const tilesPerSupertileRow = currentSupertileWidth * globals.TILES_PER_SUPERTILE;
  const tilesToRemove = globals.TILES_PER_SUPERTILE * tilesPerSupertileRow;
  
  const newAtrb = [...data.Atrb[1000].obj];
  const newLayr = [...data.Layr[1000].obj];
  
  if (side === Side.TOP) {
    newAtrb.splice(0, tilesToRemove);
    newLayr.splice(0, tilesToRemove);
  } else {
    newAtrb.splice(-tilesToRemove, tilesToRemove);
    newLayr.splice(-tilesToRemove, tilesToRemove);
  }
  
  // Remove Y coordinate data (YCrd is per vertex, has (width+1) * (height+1) entries)
  // When removing a row, we need to remove (width+1) * TILES_PER_SUPERTILE Y coordinates
  const yCoordWidth = header.mapWidth + 1;
  const yCoordsToRemove = yCoordWidth * globals.TILES_PER_SUPERTILE;
  const newYCrd = [...data.YCrd[1000].obj];
  
  if (side === Side.TOP) {
    newYCrd.splice(0, yCoordsToRemove);
  } else {
    newYCrd.splice(-yCoordsToRemove, yCoordsToRemove);
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapHeight: header.mapHeight - globals.TILES_PER_SUPERTILE
  };
  
  // Create the base level data with terrain changes
  const baseResult = {
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

  // Apply coordinate adjustments for spatial data when removing from top
  return adjustSpatialCoordinates(
    baseResult, 
    Operation.REMOVE_ROW, 
    side, 
    globals
  );
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
  
  // Create new tile data arrays for Atrb and Layr (per tile)
  const newTileWidth = currentTileWidth - globals.TILES_PER_SUPERTILE;
  const newAtrb: ottoTileAttribute[] = [];
  const newLayr: number[] = [];
  
  for (let tileRow = 0; tileRow < header.mapHeight; tileRow++) {
    for (let tileCol = 0; tileCol < newTileWidth; tileCol++) {
      const srcCol = side === Side.LEFT ? tileCol + globals.TILES_PER_SUPERTILE : tileCol;
      const srcIndex = tileCoordsToIndex(srcCol, tileRow, currentTileWidth);
      newAtrb.push(data.Atrb[1000].obj[srcIndex]);
      newLayr.push(data.Layr[1000].obj[srcIndex]);
    }
  }
  
  // Create new Y coordinate data (per vertex, not per tile)
  // YCrd has (width+1) * (height+1) entries for tile vertices
  const newYCoordWidth = newTileWidth + 1;
  const newYCoordHeight = header.mapHeight + 1;
  const currentYCoordWidth = currentTileWidth + 1;
  const newYCrd: number[] = [];
  
  for (let yRow = 0; yRow < newYCoordHeight; yRow++) {
    for (let yCol = 0; yCol < newYCoordWidth; yCol++) {
      const srcYCol = side === Side.LEFT ? yCol + globals.TILES_PER_SUPERTILE : yCol;
      const srcYIndex = yRow * currentYCoordWidth + srcYCol;
      newYCrd.push(data.YCrd[1000].obj[srcYIndex]);
    }
  }
  
  // Update header
  const newHeader = {
    ...header,
    mapWidth: header.mapWidth - globals.TILES_PER_SUPERTILE
  };
  
  // Create the base level data with terrain changes
  const baseResult = {
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

  // Apply coordinate adjustments for spatial data when removing from left
  return adjustSpatialCoordinates(
    baseResult, 
    Operation.REMOVE_COLUMN, 
    side, 
    globals
  );
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