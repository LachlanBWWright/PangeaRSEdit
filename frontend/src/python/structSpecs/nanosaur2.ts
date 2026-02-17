export const nanosaur2Specs = [
  //Header
  // Nanosaur 2 header format - same as Otto Matic but without numTilePages/numTiles
  // Source: games/nanosaur2/Source/System/File.c - PlayfieldHeaderType
  // Note: Uses numWaterPatches like Otto Matic (not numPaths like CroMag)
  "Hedr:4L3f5L40x:version,numItems,mapWidth,mapHeight,tileSize,minY,maxY,numSplines,numFences,numUniqueSupertiles,numWaterPatches,numCheckpoints",

  /////////////////////////////////////////////////////////////////
  // Supertiles
  /////////////////////////////////////////////////////////////////

  //Tile Attribute Resource (tileAttribType)
  "Atrb:HBB+:flags,p0,p1",

  //Supertile Grid Matrix - signed short, -1 = empty
  "STgd:h+:superTileId",

  //Map Layer Resources - 2D Array of tile indices
  "Layr:H+",

  //Height Data Matrix (2D array of floats)
  "YCrd:f+",

  /////////////////////////////////////////////////////////////////
  // Checkpoints/Line Markers
  /////////////////////////////////////////////////////////////////

  //Line Marker - used for checkpoints
  //Source: games/nanosaur2/Source/Headers/terrain.h - LineMarkerDefType
  "CkPt:hhffff+:unused,infoBits,x1,x2,z1,z2",

  /////////////////////////////////////////////////////////////////
  // Items
  /////////////////////////////////////////////////////////////////

  //Item List - 32-bit coordinates like Otto Matic
  "Itms:LLHBBBBH+:x,z,type,p0,p1,p2,p3,flags",

  /////////////////////////////////////////////////////////////////
  // Splines
  /////////////////////////////////////////////////////////////////

  //Spline List (File_SplineDefType)
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

  //Liquids - same format as Otto Matic
  "Liqd:H x x I i h x x i 200f f f h h h h+:type,flags,height,numNubs,reserved,x`y[100],hotSpotX,hotSpotZ,bBoxTop,bBoxLeft,bBoxBottom,bBoxRight",
];
