export const ottoMaticSpecs = [
  //Header
  "Hedr:L5i3f5i40s:version,numItems,mapWidth,mapHeight,numTilePages,numTiles,tileSize,minY,maxY,numSplines,numFences,numUniqueSupertiles,numWaterPatches,numCheckpoints,padding",

  /////////////////////////////////////////////////////////////////
  // Supertiles
  /////////////////////////////////////////////////////////////////

  //Tile Attribute Resource (tileAttribType)
  "Atrb:HBB+:flags,p0,p1",

  //Supertile Grid Matrix (SuperTileGridType)
  //"STgd:1s?H+:padByte,isEmpty,superTileId",
  "STgd:x?H+:isEmpty,superTileId",

  //Map Layer Resources - 2D Array of supertiles (References Tile Attribute Resource)
  //Specifically its flags, used for 'TILE_ATTRIB' bit flags
  "Layr:H+", //:TileAttributeIndex",

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

  //Spline List
  //"Spln:HHLLLHHLhhhh+:numNubs,,,numPoints,,numItems,,,bbTop,bbLeft,bbBottom,bbRight",
  //"Spln:iffiffiffhhhh+:numNubs,,,numPoints,,numItems,,,bbTop,bbLeft,bbBottom,bbRight",
  "Spln:ixxxxixxxxixxxxhhhh+:numNubs,numPoints,numItems,bbTop,bbLeft,bbBottom,bbRight",
  //first 2 Missing are double floats (x z)

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

/* 
//Struct specifications 
//https://docs.python.org/3/library/struct.html#format-characters


*/
