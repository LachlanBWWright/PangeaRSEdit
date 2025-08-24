// Otto Matic terrain file specifications

import { StructConverter } from './resconverters';
import type { ResourceConverter } from './types';

export const ottoMaticSpecs = [
  //Header
  "Hedr:L5i3f5i40x:version,numItems,mapWidth,mapHeight,numTilePages,numTiles,tileSize,minY,maxY,numSplines,numFences,numUniqueSupertiles,numWaterPatches,numCheckpoints",

  /////////////////////////////////////////////////////////////////
  // Supertiles
  /////////////////////////////////////////////////////////////////

  //Tile Attribute Resource (tileAttribType)
  "Atrb:HBB+:flags,p0,p1",

  //Supertile Grid Matrix (SuperTileGridType)
  "STgd:x?H+:isEmpty,superTileId",

  //Map Layer Resources - 2D Array of supertiles (References Tile Attribute Resource)
  //Specifically its flags, used for 'TILE_ATTRIB' bit flags
  "Layr:H+",

  //Height Data Matrix (2D array)
  //Each supertile has SUPERTILE_SIZE values in each direction (8)
  "YCrd:f+",

  /////////////////////////////////////////////////////////////////
  // Items
  /////////////////////////////////////////////////////////////////

  //Item List
  "Itms:LLHBBBBH+:x,z,type,p0,p1,p2,p3,flags",

  /////////////////////////////////////////////////////////////////
  // Splines
  /////////////////////////////////////////////////////////////////

  //Spline List (File_SplineDefType, NOT SplineDefType)
  //2x padding are padding bytes, 4x are dummy fields in the struct (used to be for holding 32-bit pointers)
  "Spln:h 2x 4x i 4x h 2x 4x hhhh+:numNubs,numPoints,numItems,bbTop,bbLeft,bbBottom,bbRight",

  //Spline Nubs
  "SpNb:ff+:x,z",

  //Spline Points
  "SpPt:ff+:x,z",

  //Spline Item Type
  "SpIt:fHBBBBH+:placement,type,p0,p1,p2,p3,flags",

  /////////////////////////////////////////////////////////////////
  // Fences
  /////////////////////////////////////////////////////////////////

  //Fence List
  "Fenc:HhLhhhh+:fenceType,numNubs,junkNubListPtr,bbTop,bbLeft,bbBottom,bbRight",

  //Fence Nubs
  "FnNb:ii+",

  /////////////////////////////////////////////////////////////////
  // Liquids
  /////////////////////////////////////////////////////////////////

  //Liquids
  /* Padding byte placement seems ok, not thoroughly checked */
  "Liqd:H x x I i h x x i 200f f f h h h h+:type,flags,height,numNubs,reserved,x`y[100],hotSpotX,hotSpotZ,bBoxTop,bBoxLeft,bBoxBottom,bBoxRight",
];

export function loadOttoSpecs(specsArray: string[]): Map<string, ResourceConverter> {
  const converters = new Map<string, ResourceConverter>();
  
  for (const spec of specsArray) {
    const trimmedSpec = spec.trim();
    
    // Skip empty lines and comments
    if (!trimmedSpec || trimmedSpec.startsWith('//')) {
      continue;
    }
    
    try {
      const [converter, restype] = StructConverter.fromTemplateStringWithTypename(trimmedSpec);
      
      if (converter && restype) {
        // Convert resource type bytes to string
        const restypeString = new TextDecoder().decode(restype).trim();
        converters.set(restypeString, converter);
      }
    } catch (error) {
      console.warn(`Failed to parse otto spec: ${trimmedSpec}`, error);
    }
  }
  
  return converters;
}

export function loadOttoSpecsFromText(specsText: string): Map<string, ResourceConverter> {
  const lines = specsText.split('\n');
  return loadOttoSpecs(lines);
}

export async function loadOttoSpecsFromFile(filePath: string): Promise<Map<string, ResourceConverter>> {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    return loadOttoSpecsFromText(text);
  } catch (error) {
    console.error('Failed to load otto specs from file:', error);
    return new Map();
  }
}

// Get the default otto converters
export function getDefaultOttoConverters(): Map<string, ResourceConverter> {
  return loadOttoSpecs(ottoMaticSpecs);
}