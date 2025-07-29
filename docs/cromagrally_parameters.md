# Cromagrally - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 44 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain.c`  
**Line:** 1115  
```c
gTileAttribParm[0] = (*gTileAttribList)[tile].parm[0];		// and parameters
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 248  
```c
p = itemPtr[i].parm[0];											// player # is in parm 0
```

### Usage 3

**File:** `Source/Terrain/Liquids.c`  
**Line:** 102  
```c
// parm[3] bit 0 = fixed ht, parm[0] = ht.
```

### Usage 4

**File:** `Source/Terrain/Liquids.c`  
**Line:** 118  
```c
y = gWaterHeights[gTrackNum][itemPtr->parm[0]];
```

### Usage 5

**File:** `Source/Terrain/Liquids.c`  
**Line:** 227  
```c
// parm[0] = rot 0..15
```

### Usage 6

**File:** `Source/Terrain/Liquids.c`  
**Line:** 238  
```c
rot = PI2 * ((float)itemPtr->parm[0] * (1.0f/16.0f));		// get rotation angle
```

### Usage 7

**File:** `Source/Terrain/Liquids.c`  
**Line:** 342  
```c
.scale 		= 1.0 + (float)(itemPtr->parm[0]) * .5f
```

### Usage 8

**File:** `Source/Items/Traps.c`  
**Line:** 613  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 9

**File:** `Source/Items/Traps.c`  
**Line:** 1074  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 10

**File:** `Source/Items/Traps.c`  
**Line:** 1848  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 11

**File:** `Source/Items/Items.c`  
**Line:** 139  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 12

**File:** `Source/Items/Items.c`  
**Line:** 331  
```c
if (itemPtr->parm[0] >= 4)
```

### Usage 13

**File:** `Source/Items/Items.c`  
**Line:** 334  
```c
SDL_Log("Illegal tree type #%d %ld %ld", itemPtr->parm[0], x, z);
```

### Usage 14

**File:** `Source/Items/Items.c`  
**Line:** 342  
```c
.type 		= types[gTrackNum][itemPtr->parm[0]],
```

### Usage 15

**File:** `Source/Items/Items.c`  
**Line:** 356  
```c
if (aimAtPlayer[gTrackNum][itemPtr->parm[0]])
```

### Usage 16

**File:** `Source/Items/Items.c`  
**Line:** 396  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 17

**File:** `Source/Items/Items.c`  
**Line:** 425  
```c
.rot 		= (float)itemPtr->parm[0] / 8.0f * PI2,
```

### Usage 18

**File:** `Source/Items/Items.c`  
**Line:** 547  
```c
short	type = itemPtr->parm[0];
```

### Usage 19

**File:** `Source/Items/Items.c`  
**Line:** 639  
```c
def.coord.y = gWaterHeights[gTrackNum][itemPtr->parm[0]];	// put on top of water
```

### Usage 20

**File:** `Source/Items/Items.c`  
**Line:** 644  
```c
def.coord.y = gWaterHeights[gTrackNum][itemPtr->parm[0]];	// put on top of water
```

### Usage 21

**File:** `Source/Items/Items.c`  
**Line:** 719  
```c
.type 		= types[gTrackNum][itemPtr->parm[0]],
```

### Usage 22

**File:** `Source/Items/Items.c`  
**Line:** 765  
```c
.rot 		= itemPtr->parm[0] * (PI/2),
```

### Usage 23

**File:** `Source/Items/Items.c`  
**Line:** 797  
```c
.type 		= GLOBAL_ObjType_Sign_Fire + itemPtr->parm[0],
```

### Usage 24

**File:** `Source/Items/Items.c`  
**Line:** 879  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 25

**File:** `Source/Items/Items.c`  
**Line:** 912  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/4.0f)),
```

### Usage 26

**File:** `Source/Items/Items.c`  
**Line:** 941  
```c
.type 		= SCANDINAVIA_ObjType_Baracade1 + itemPtr->parm[0],
```

### Usage 27

**File:** `Source/Items/Items.c`  
**Line:** 977  
```c
.type 		= GLOBAL_ObjType_GreyRock + itemPtr->parm[0],
```

### Usage 28

**File:** `Source/Items/Items.c`  
**Line:** 1020  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 29

**File:** `Source/Items/Items.c`  
**Line:** 1062  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 30

**File:** `Source/Items/Items.c`  
**Line:** 1143  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 31

**File:** `Source/Items/Items.c`  
**Line:** 1174  
```c
.type 		= EUROPE_ObjType_CastleTower + itemPtr->parm[0],
```

### Usage 32

**File:** `Source/Items/Items.c`  
**Line:** 1178  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 33

**File:** `Source/Items/Items.c`  
**Line:** 1290  
```c
short	type = itemPtr->parm[0];
```

### Usage 34

**File:** `Source/Items/Items.c`  
**Line:** 1452  
```c
.rot 		= PI2 * ((float)itemPtr->parm[0] * (1.0f/8.0f)),
```

### Usage 35

**File:** `Source/Items/Items.c`  
**Line:** 1484  
```c
short	type = itemPtr->parm[0];
```

### Usage 36

**File:** `Source/Items/Triggers.c`  
**Line:** 203  
```c
powType = itemPtr->parm[0];								// get POW type
```

### Usage 37

**File:** `Source/Items/Triggers.c`  
**Line:** 776  
```c
short	cactusType = itemPtr->parm[0];			// get cactus type
```

### Usage 38

**File:** `Source/Items/Triggers.c`  
**Line:** 926  
```c
.rot 		= (float)(itemPtr->parm[0]) / 8.0f * PI2,
```

### Usage 39

**File:** `Source/Items/Triggers.c`  
**Line:** 1184  
```c
newObj->TorchTeam		= itemPtr->parm[0];						// which team?
```

### Usage 40

**File:** `Source/Items/Triggers.c`  
**Line:** 1341  
```c
.type		= GLOBAL_ObjType_TeamBaseRed + itemPtr->parm[0],
```

### Usage 41

**File:** `Source/Items/Triggers.c`  
**Line:** 1366  
```c
newObj->TorchTeam		= itemPtr->parm[0];						// which team?
```

### Usage 42

**File:** `Source/Items/Triggers.c`  
**Line:** 1456  
```c
.rot 		= (float)(itemPtr->parm[0]) / 8.0f * PI2,
```

### Usage 43

**File:** `Source/Items/Triggers.c`  
**Line:** 1675  
```c
.rot		= PI2 * ((float)itemPtr->parm[0] * (1.0f/4.0f)),
```

### Usage 44

**File:** `Source/Items/Triggers.c`  
**Line:** 1849  
```c
.coord.y	= GetTerrainY(x,z) + 300.0f + (float)itemPtr->parm[0] * 15.0f,
```

## Parameter 1

Found 12 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain.c`  
**Line:** 1116  
```c
gTileAttribParm[1] = (*gTileAttribList)[tile].parm[1];
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 255  
```c
gPlayerInfo[p].startRotY = PI2 * ((float)itemPtr[i].parm[1] * (1.0f/16.0f));	// calc starting rotation aim
```

### Usage 3

**File:** `Source/Terrain/Liquids.c`  
**Line:** 228  
```c
// parm[1] = scale 0..n
```

### Usage 4

**File:** `Source/Terrain/Liquids.c`  
**Line:** 239  
```c
scale = 2.0f + ((float)itemPtr->parm[1] * .3f);
```

### Usage 5

**File:** `Source/Items/Items.c`  
**Line:** 631  
```c
.rot 		= PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),
```

### Usage 6

**File:** `Source/Items/Items.c`  
**Line:** 725  
```c
.rot 		= itemPtr->parm[1] * (PI/4),
```

### Usage 7

**File:** `Source/Items/Items.c`  
**Line:** 804  
```c
.rot 		= PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),
```

### Usage 8

**File:** `Source/Items/Items.c`  
**Line:** 946  
```c
.rot 		= PI2 * ((float)itemPtr->parm[1] * (1.0f/4.0f)),
```

### Usage 9

**File:** `Source/Items/Items.c`  
**Line:** 1069  
```c
def.type 		= DESERT_ObjType_RockOverhang  + itemPtr->parm[1];
```

### Usage 10

**File:** `Source/Items/Items.c`  
**Line:** 1298  
```c
.rot 		= PI2 * ((float)itemPtr->parm[1] * (1.0f/8.0f)),
```

### Usage 11

**File:** `Source/Items/Items.c`  
**Line:** 1494  
```c
.rot 		= PI2 * ((float)itemPtr->parm[1] * (1.0f/64.0f)),
```

### Usage 12

**File:** `Source/Items/Triggers.c`  
**Line:** 204  
```c
heightOff = (float)itemPtr->parm[1] * 400.0f;			// get height off ground
```

## Parameter 2

Found 2 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain.c`  
**Line:** 1117  
```c
gTileAttribParm[2] = (*gTileAttribList)[tile].parm[2];
```

### Usage 2

**File:** `Source/Headers/terrain.h`  
**Line:** 90  
```c
Byte			parm[2];
```

## Parameter 3

Found 10 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 238  
```c
if (!(itemPtr[i].parm[3] & 1))								// only check ones with bit set
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 243  
```c
if (itemPtr[i].parm[3] & 1)									// skip those with bit set
```

### Usage 3

**File:** `Source/Terrain/Liquids.c`  
**Line:** 102  
```c
// parm[3] bit 0 = fixed ht, parm[0] = ht.
```

### Usage 4

**File:** `Source/Terrain/Liquids.c`  
**Line:** 116  
```c
if (itemPtr->parm[3] & 1)						// see if use fixed height
```

### Usage 5

**File:** `Source/Items/Items.c`  
**Line:** 329  
```c
Boolean	isSolid = itemPtr->parm[3] & 1;
```

### Usage 6

**File:** `Source/Items/Items.c`  
**Line:** 353  
```c
if (itemPtr->parm[3] & (1<<1))											// see if bump up
```

### Usage 7

**File:** `Source/Items/Items.c`  
**Line:** 546  
```c
Boolean	notSolid = itemPtr->parm[3] & 1;						// see if solid or not
```

### Usage 8

**File:** `Source/Items/Items.c`  
**Line:** 1169  
```c
Boolean	isSolid = itemPtr->parm[3] & 1;						// see if solid or not
```

### Usage 9

**File:** `Source/Items/Items.c`  
**Line:** 1289  
```c
Boolean	notSolid = itemPtr->parm[3] & 1;						// see if solid or not
```

### Usage 10

**File:** `Source/Items/Triggers.c`  
**Line:** 775  
```c
Boolean	notSolid = itemPtr->parm[3];
```

## Parameter 4

Found 2 usage(s):

### Usage 1

**File:** `Source/Headers/structs.h`  
**Line:** 47  
```c
Byte			parm[4];
```

### Usage 2

**File:** `Source/Headers/structs.h`  
**Line:** 248  
```c
Byte							parm[4];
```

