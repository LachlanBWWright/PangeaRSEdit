export const nanosaur2Specs = [
  //Header

  /* 
    typedef struct
{
	NumVersion	version;							// version of file
	int32_t		numItems;							// # items in map
	int32_t		mapWidth;							// width of map
	int32_t		mapHeight;							// height of map
	float		tileSize;							// 3D unit size of a tile
	float		minY,maxY;							// min/max height values
	int32_t		numSplines;							// # splines
	int32_t		numFences;							// # fences
	int32_t		numUniqueSuperTiles;				// # unique supertile
	int32_t		numWaterPatches;                    // # water patches
	int32_t		numCheckpoints;						// # checkpoints
	int32_t		unused[10];
}PlayfieldHeaderType;
    
    */
  //TODO: CHECK
  "Hedr:L5i3f5i40x:version,numItems,mapWidth,mapHeight,numTilePages,numTiles,tileSize,minY,maxY,numSplines,numFences,numUniqueSupertiles,numWaterPatches,numCheckpoints",

  /////////////////////////////////////////////////////////////////
  // Supertiles
  /////////////////////////////////////////////////////////////////

  //Tile Attribute Resource (tileAttribType)
  //TODO: CHECK
  "Atrb:HBB+:flags,p0,p1",

  //Supertile Grid Matrix (SuperTileGridType)
  //"STgd:1s?H+:padByte,isEmpty,superTileId",
  //TODO: CHECK
  "STgd:x?H+:isEmpty,superTileId",

  //Map Layer Resources - 2D Array of supertiles (References Tile Attribute Resource)
  //1 For each tile (e.g 176x176 in level 1 => 30976 items)
  //Used to build GetTileAttibsAtRowCol 2D array for Otto Matic, which provides index for gTileAttribList, nothing else.
  //Specifically its flags, used for 'TILE_ATTRIB' bit flags
  //TODO: CHECK
  "Layr:H+", //:TileAttributeIndex",

  //Height Data Matrix (2D array)
  //Each supertile has SUPERTILE_SIZE values in each direction (8)
  //TODO: CHECK
  "YCrd:f+",

  /////////////////////////////////////////////////////////////////
  // Items
  /////////////////////////////////////////////////////////////////

  //Item List
  //TODO: CHECK
  "Itms:LLHBBBBH+:x,z,type,p0,p1,p2,p3,flags",

  /////////////////////////////////////////////////////////////////
  // Splines
  /////////////////////////////////////////////////////////////////

  //Spline List (File_SplineDefType, NOT SplineDefType)
  //2x padding are padding bytes, 4x are dummy fields in the struct (used to be for holding 32-bit pointers)
  //TODO: CHECK
  "Spln:h 2x 4x i 4x h 2x 4x hhhh+:numNubs,numPoints,numItems,bbTop,bbLeft,bbBottom,bbRight",

  //Spline Nubs
  //TODO: CHECK
  "SpNb:ff+:x,z",

  //Spline Points
  //TODO: CHECK
  "SpPt:ff+:x,z",

  //Spline Item Type
  //TODO: CHECK
  "SpIt:fHBBBBH+:placement,type,p0,p1,p2,p3,flags",

  /////////////////////////////////////////////////////////////////
  // Fences
  /////////////////////////////////////////////////////////////////

  //Fence List
  //TODO: CHECK
  "Fenc:HhLhhhh+:fenceType,numNubs,junkNubListPtr,bbTop,bbLeft,bbBottom,bbRight",

  //Fence Nubs
  //TODO: CHECK
  "FnNb:ii+",

  /////////////////////////////////////////////////////////////////
  // Liquids
  /////////////////////////////////////////////////////////////////

  //Liquids
  /* Padding byte placement seems ok, not thoroughly checked */
  //TODO: CHECK
  "Liqd:H x x I i h x x i 200f f f h h h h+:type,flags,height,numNubs,reserved,x`y[100],hotSpotX,hotSpotZ,bBoxTop,bBoxLeft,bBoxBottom,bBoxRight",

  //Not in otto: //TODO: Check
  "CkPt:2x s ff ff:infobits,x1,x2,z1,z2",
];
