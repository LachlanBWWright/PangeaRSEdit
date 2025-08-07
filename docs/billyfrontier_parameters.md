# Billyfrontier - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 29 usage(s):

### Usage 1

**File:** `Source/Effects/Particles.c`  
**Line:** 1491  
```c
newObj = MakeSmoker(x,z, itemPtr->parm[0]);
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 211  
```c
gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f);	// calc starting rotation aim
```

### Usage 3

**File:** `Source/Enemy/Enemy_TremorAlien.c`  
**Line:** 132  
```c
short	stopPoint 	= itemPtr->parm[0];
```

### Usage 4

**File:** `Source/Enemy/Enemy_TremorAlien.c`  
**Line:** 427  
```c
short		stopPoint 	= itemPtr->parm[0];
```

### Usage 5

**File:** `Source/Enemy/Enemy_TremorGhost.c`  
**Line:** 72  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 6

**File:** `Source/Enemy/Enemy_FrogMan.c`  
**Line:** 62  
```c
short	stopPoint 	= itemPtr->parm[0];
```

### Usage 7

**File:** `Source/Enemy/Enemy_Bandito.c`  
**Line:** 233  
```c
short	stopPoint 	= itemPtr->parm[0];
```

### Usage 8

**File:** `Source/Enemy/Enemy_Shorty.c`  
**Line:** 239  
```c
short	stopPoint 	= itemPtr->parm[0];
```

### Usage 9

**File:** `Source/Enemy/Enemy.c`  
**Line:** 82  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 10

**File:** `Source/System/Areas/Duel.c`  
**Line:** 388  
```c
int		duelerNum = itemPtr->parm[0];
```

### Usage 11

**File:** `Source/System/Areas/Shootout.c`  
**Line:** 422  
```c
if (itemPtr[i].parm[0] == sp)								// is it active on this stop point?
```

### Usage 12

**File:** `Source/System/Areas/Shootout.c`  
**Line:** 1044  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 13

**File:** `Source/Items/Items.c`  
**Line:** 138  
```c
gNewObjectDefinition.type 		= BUILDING_ObjType_Saloon + itemPtr->parm[0];
```

### Usage 14

**File:** `Source/Items/Items.c`  
**Line:** 195  
```c
gNewObjectDefinition.type 		= TOWN_ObjType_Headstone1 + itemPtr->parm[0];
```

### Usage 15

**File:** `Source/Items/Items.c`  
**Line:** 225  
```c
gNewObjectDefinition.type 		= TOWN_ObjType_Cactus + itemPtr->parm[0];
```

### Usage 16

**File:** `Source/Items/Items.c`  
**Line:** 233  
```c
gNewObjectDefinition.type 		= SWAMP_ObjType_MushroomTree + itemPtr->parm[0];
```

### Usage 17

**File:** `Source/Items/Items.c`  
**Line:** 268  
```c
gNewObjectDefinition.type 		= TOWN_ObjType_Coffin + itemPtr->parm[0];
```

### Usage 18

**File:** `Source/Items/Items.c`  
**Line:** 297  
```c
gNewObjectDefinition.type 		= GLOBAL_ObjType_Barrel + itemPtr->parm[0];
```

### Usage 19

**File:** `Source/Items/Items.c`  
**Line:** 315  
```c
if (itemPtr->parm[0] == 1)		// is TNT?
```

### Usage 20

**File:** `Source/Items/Items.c`  
**Line:** 327  
```c
int		type = itemPtr->parm[0];
```

### Usage 21

**File:** `Source/Items/Items.c`  
**Line:** 927  
```c
gNewObjectDefinition.type 		= GLOBAL_ObjType_HayBale + itemPtr->parm[0];
```

### Usage 22

**File:** `Source/Items/Items.c`  
**Line:** 955  
```c
int		type = itemPtr->parm[0];
```

### Usage 23

**File:** `Source/Items/Items.c`  
**Line:** 1123  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 24

**File:** `Source/Items/Items.c`  
**Line:** 1153  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 25

**File:** `Source/Items/Items.c`  
**Line:** 1183  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 26

**File:** `Source/Items/Items.c`  
**Line:** 1226  
```c
int	type = itemPtr->parm[0];
```

### Usage 27

**File:** `Source/Items/Items.c`  
**Line:** 1426  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 28

**File:** `Source/Items/Items.c`  
**Line:** 1453  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 29

**File:** `Source/Items/Items.c`  
**Line:** 1514  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

## Parameter 1

Found 15 usage(s):

### Usage 1

**File:** `Source/Enemy/Enemy_TremorGhost.c`  
**Line:** 61  
```c
short	stopPoint 	= itemPtr->parm[1];
```

### Usage 2

**File:** `Source/Enemy/Enemy_FrogMan.c`  
**Line:** 63  
```c
float	rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 3

**File:** `Source/Enemy/Enemy_Bandito.c`  
**Line:** 234  
```c
short	actionType 	= itemPtr->parm[1];
```

### Usage 4

**File:** `Source/Enemy/Enemy_Shorty.c`  
**Line:** 240  
```c
short	actionType 	= itemPtr->parm[1];
```

### Usage 5

**File:** `Source/Enemy/Enemy_Walker.c`  
**Line:** 111  
```c
newObj->StopPoint = itemPtr->parm[1];				// remember stop point #
```

### Usage 6

**File:** `Source/System/Areas/Duel.c`  
**Line:** 389  
```c
float	rot = (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 7

**File:** `Source/System/Areas/Shootout.c`  
**Line:** 427  
```c
if (itemPtr[i].parm[1] == sp)								// is it active on this stop point?
```

### Usage 8

**File:** `Source/Items/Items.c`  
**Line:** 149  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 9

**File:** `Source/Items/Items.c`  
**Line:** 203  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 10

**File:** `Source/Items/Items.c`  
**Line:** 276  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 11

**File:** `Source/Items/Items.c`  
**Line:** 339  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 12

**File:** `Source/Items/Items.c`  
**Line:** 936  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 13

**File:** `Source/Items/Items.c`  
**Line:** 972  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 14

**File:** `Source/Items/Items.c`  
**Line:** 1175  
```c
gNewObjectDefinition.type 		= TOWN_ObjType_DeadTree + itemPtr->parm[1];
```

### Usage 15

**File:** `Source/Items/Items.c`  
**Line:** 1264  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8);
```

## Parameter 2

Found 4 usage(s):

### Usage 1

**File:** `Source/Enemy/Enemy_TremorAlien.c`  
**Line:** 133  
```c
float	rot 		= (float)itemPtr->parm[2] * (PI2/8);
```

### Usage 2

**File:** `Source/Enemy/Enemy_Bandito.c`  
**Line:** 235  
```c
float	rot 		= (float)itemPtr->parm[2] * (PI2/8);
```

### Usage 3

**File:** `Source/Enemy/Enemy_Shorty.c`  
**Line:** 241  
```c
float	rot 		= (float)itemPtr->parm[2] * (PI2/8);
```

### Usage 4

**File:** `Source/Items/Items.c`  
**Line:** 352  
```c
newObj->Kind = itemPtr->parm[2];								// remember what kind of contents are in this crate
```

## Parameter 4

Found 2 usage(s):

### Usage 1

**File:** `Source/Headers/structs.h`  
**Line:** 50  
```c
Byte			parm[4];
```

### Usage 2

**File:** `Source/Headers/structs.h`  
**Line:** 237  
```c
Byte							parm[4];
```

