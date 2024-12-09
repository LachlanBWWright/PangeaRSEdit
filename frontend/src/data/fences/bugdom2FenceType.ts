export enum FenceType {
  GRASS,
  LAWNEDGING,
  DOGHAIR,
  BRICKWALL,
  DOGCOLLAR,
  DOGHAIRDENSE,
  CARD,
  BLOCK,
  BALSA,
  CLOTH,
  BOOKS,
  COMPUTER,
  SHOEBOX,
  WATERGRASS,
  GARBAGECAN,
  BOXFENCE,
}

export const fenceTypeNames: Record<FenceType, string> = {
  [FenceType.GRASS]: "Grass",
  [FenceType.LAWNEDGING]: "Lawn Edging",
  [FenceType.DOGHAIR]: "Dog Hair",
  [FenceType.BRICKWALL]: "Brick Wall",
  [FenceType.DOGCOLLAR]: "Dog Collar",
  [FenceType.DOGHAIRDENSE]: "Dog Hair Dense",
  [FenceType.CARD]: "Card",
  [FenceType.BLOCK]: "Block",
  [FenceType.BALSA]: "Balsa",
  [FenceType.CLOTH]: "Cloth",
  [FenceType.BOOKS]: "Books",
  [FenceType.COMPUTER]: "Computer",
  [FenceType.SHOEBOX]: "Shoebox",
  [FenceType.WATERGRASS]: "Water Grass",
  [FenceType.GARBAGECAN]: "Garbage Can",
  [FenceType.BOXFENCE]: "Box Fence",
};

/* 
TODO: Textures:

static const short gFenceTexture[NUM_FENCE_TYPES][2] =
{
	[FENCE_TYPE_GRASS]			= { SPRITE_GROUP_GLOBAL,		GLOBAL_SObjType_Fence_Grass },
	[FENCE_TYPE_LAWNEDGING]		= { SPRITE_GROUP_LEVELSPECIFIC,	GARDEN_SObjType_Fence_Edging },
	[FENCE_TYPE_DOGHAIR]		= { SPRITE_GROUP_LEVELSPECIFIC,	FIDO_SObjType_Fence_DogHair },
	[FENCE_TYPE_BRICKWALL]		= { SPRITE_GROUP_GLOBAL,		GLOBAL_SObjType_Fence_Brick },
	[FENCE_TYPE_DOGCOLLAR]		= { SPRITE_GROUP_LEVELSPECIFIC,	FIDO_SObjType_Fence_DogCollar },
	[FENCE_TYPE_DOGHAIRDENSE]	= { SPRITE_GROUP_LEVELSPECIFIC,	FIDO_SObjType_Fence_DogHairDense },
	[FENCE_TYPE_CARD]			= { SPRITE_GROUP_LEVELSPECIFIC,	PLAYROOM_SObjType_Fence_Cards },
	[FENCE_TYPE_BLOCK]			= { SPRITE_GROUP_LEVELSPECIFIC,	PLAYROOM_SObjType_Fence_Blocks },
	[FENCE_TYPE_BALSA]			= { SPRITE_GROUP_LEVELSPECIFIC,	BALSA_SObjType_Fence_Balsa },
	[FENCE_TYPE_CLOTH]			= { SPRITE_GROUP_LEVELSPECIFIC,	CLOSET_SObjType_Fence_Cloth },
	[FENCE_TYPE_BOOKS]			= { SPRITE_GROUP_LEVELSPECIFIC,	CLOSET_SObjType_Fence_Books },
	[FENCE_TYPE_COMPUTER]		= { SPRITE_GROUP_LEVELSPECIFIC,	CLOSET_SObjType_Fence_Computer },
	[FENCE_TYPE_SHOEBOX]		= { SPRITE_GROUP_LEVELSPECIFIC,	CLOSET_SObjType_Fence_ShoeBox },
	[FENCE_TYPE_WATERGRASS]		= { SPRITE_GROUP_LEVELSPECIFIC,	PARK_SObjType_WaterGrassFence },
	[FENCE_TYPE_GARBAGECAN]		= { SPRITE_GROUP_LEVELSPECIFIC,	GARBAGE_SObjType_Fence_GarbageCan },
	[FENCE_TYPE_BOXFENCE]		= { SPRITE_GROUP_LEVELSPECIFIC,	GARBAGE_SObjType_Fence_Box },
};



*/
