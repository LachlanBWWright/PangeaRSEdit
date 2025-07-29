# Nanosaur2 - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 52 usage(s):

### Usage 1

**File:** `Source/Effects/Particles.c`  
**Line:** 1535  
```c
newObj = MakeSmoker(x,z, itemPtr->parm[0]);
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 231  
```c
p = itemPtr[i].parm[0];											// player # is in parm 0
```

### Usage 3

**File:** `Source/Enemies/Enemy_Ramphor.c`  
**Line:** 85  
```c
long			height = itemPtr->parm[0];
```

### Usage 4

**File:** `Source/Enemies/Enemy.c`  
**Line:** 90  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 5

**File:** `Source/Enemies/Enemy_Brach.c`  
**Line:** 99  
```c
newObj->Rot.y = ((float)itemPtr->parm[0]) * (PI2/8.0f);
```

### Usage 6

**File:** `Source/System/File.c`  
**Line:** 650  
```c
gMasterItemList[i].parm[0] = rezItems[i].parm[0];
```

### Usage 7

**File:** `Source/System/File.c`  
**Line:** 650  
```c
gMasterItemList[i].parm[0] = rezItems[i].parm[0];
```

### Usage 8

**File:** `Source/Items/Bushes.c`  
**Line:** 62  
```c
def.type 		= LEVEL1_ObjType_Grass + itemPtr->parm[0];
```

### Usage 9

**File:** `Source/Items/Bushes.c`  
**Line:** 68  
```c
def.type 		= LEVEL2_ObjType_Grass + itemPtr->parm[0];
```

### Usage 10

**File:** `Source/Items/Bushes.c`  
**Line:** 74  
```c
def.type 		= LEVEL3_ObjType_Grass_Single + itemPtr->parm[0];
```

### Usage 11

**File:** `Source/Items/Bushes.c`  
**Line:** 127  
```c
.type 		= LEVEL1_ObjType_LowFern + itemPtr->parm[0],
```

### Usage 12

**File:** `Source/Items/Bushes.c`  
**Line:** 160  
```c
.type 		= LEVEL1_ObjType_LowBerryBush + itemPtr->parm[0],
```

### Usage 13

**File:** `Source/Items/Bushes.c`  
**Line:** 198  
```c
.type 		= LEVEL1_ObjType_SmallCattail + itemPtr->parm[0],
```

### Usage 14

**File:** `Source/Items/Bushes.c`  
**Line:** 231  
```c
if (itemPtr->parm[0] > 3)
```

### Usage 15

**File:** `Source/Items/Bushes.c`  
**Line:** 239  
```c
.type 		= LEVEL2_ObjType_Bush1 + itemPtr->parm[0],
```

### Usage 16

**File:** `Source/Items/Bushes.c`  
**Line:** 304  
```c
if (itemPtr->parm[0] > 2)
```

### Usage 17

**File:** `Source/Items/Bushes.c`  
**Line:** 310  
```c
.type 		= LEVEL2_ObjType_Cactus_Low + itemPtr->parm[0],
```

### Usage 18

**File:** `Source/Items/Bushes.c`  
**Line:** 349  
```c
if (itemPtr->parm[0] > 2)
```

### Usage 19

**File:** `Source/Items/Bushes.c`  
**Line:** 355  
```c
.type 		= LEVEL2_ObjType_PalmBush1 + itemPtr->parm[0],
```

### Usage 20

**File:** `Source/Items/Bushes.c`  
**Line:** 391  
```c
if (itemPtr->parm[0] > 2)
```

### Usage 21

**File:** `Source/Items/Bushes.c`  
**Line:** 397  
```c
.type 		= LEVEL3_ObjType_GeckoPlant_Small + itemPtr->parm[0],
```

### Usage 22

**File:** `Source/Items/Bushes.c`  
**Line:** 474  
```c
short   type = itemPtr->parm[0];
```

### Usage 23

**File:** `Source/Items/POWs.c`  
**Line:** 63  
```c
short	weaponType = itemPtr->parm[0];
```

### Usage 24

**File:** `Source/Items/Items.c`  
**Line:** 226  
```c
.type 		= base + itemPtr->parm[0],
```

### Usage 25

**File:** `Source/Items/Items.c`  
**Line:** 260  
```c
.type 		= LEVEL1_ObjType_RiverRock1 + itemPtr->parm[0],
```

### Usage 26

**File:** `Source/Items/Items.c`  
**Line:** 299  
```c
.type 		= LEVEL1_ObjType_GasMound1 + itemPtr->parm[0],
```

### Usage 27

**File:** `Source/Items/Items.c`  
**Line:** 315  
```c
newObj->Kind = itemPtr->parm[0];
```

### Usage 28

**File:** `Source/Items/Items.c`  
**Line:** 478  
```c
.type 		= LEVEL3_ObjType_Asteroid_Cracked + itemPtr->parm[0],
```

### Usage 29

**File:** `Source/Items/Items.c`  
**Line:** 494  
```c
newObj->Kind = itemPtr->parm[0];
```

### Usage 30

**File:** `Source/Items/Wormhole.c`  
**Line:** 151  
```c
.rot		= (float)itemPtr->parm[0] * (PI2/8),
```

### Usage 31

**File:** `Source/Items/Mines.c`  
**Line:** 48  
```c
long	h = itemPtr->parm[0];
```

### Usage 32

**File:** `Source/Items/Trees.c`  
**Line:** 51  
```c
.type 		= LEVEL1_ObjType_Tree_Birch_HighRed + itemPtr->parm[0],
```

### Usage 33

**File:** `Source/Items/Trees.c`  
**Line:** 93  
```c
.type 		= LEVEL1_ObjType_Tree_Pine_HighDead + itemPtr->parm[0],
```

### Usage 34

**File:** `Source/Items/Trees.c`  
**Line:** 142  
```c
.rot 		= (float)itemPtr->parm[0] * (PI2/8),
```

### Usage 35

**File:** `Source/Items/Trees.c`  
**Line:** 548  
```c
.type 		= LEVEL1_ObjType_BentPine1_Trunk + itemPtr->parm[0],
```

### Usage 36

**File:** `Source/Items/Trees.c`  
**Line:** 575  
```c
def.type 		= LEVEL1_ObjType_BentPine1_Leaves + itemPtr->parm[0];
```

### Usage 37

**File:** `Source/Items/Trees.c`  
**Line:** 595  
```c
short	type = itemPtr->parm[0];
```

### Usage 38

**File:** `Source/Items/Trees.c`  
**Line:** 598  
```c
if (itemPtr->parm[0] > 4)
```

### Usage 39

**File:** `Source/Items/Trees.c`  
**Line:** 661  
```c
short	type = itemPtr->parm[0];
```

### Usage 40

**File:** `Source/Items/Trees.c`  
**Line:** 725  
```c
short	type = itemPtr->parm[0];
```

### Usage 41

**File:** `Source/Items/Trees.c`  
**Line:** 763  
```c
short	type = itemPtr->parm[0];
```

### Usage 42

**File:** `Source/Items/Trees.c`  
**Line:** 800  
```c
short	type = itemPtr->parm[0];
```

### Usage 43

**File:** `Source/Items/Trees.c`  
**Line:** 843  
```c
.type 		= LEVEL3_ObjType_FallenTree1 + itemPtr->parm[0],
```

### Usage 44

**File:** `Source/Items/Trees.c`  
**Line:** 912  
```c
.type 		= LEVEL3_ObjType_Stump1 + itemPtr->parm[0],
```

### Usage 45

**File:** `Source/Items/ForestDoor.c`  
**Line:** 60  
```c
Byte				keyID = itemPtr->parm[0];
```

### Usage 46

**File:** `Source/Items/ForestDoor.c`  
**Line:** 215  
```c
short				keyID = itemPtr->parm[0];
```

### Usage 47

**File:** `Source/Items/Holes.c`  
**Line:** 72  
```c
newObj->Kind = itemPtr->parm[0];							// remember hole group #
```

### Usage 48

**File:** `Source/Items/Crystals.c`  
**Line:** 43  
```c
if (itemPtr->parm[0] > 2)
```

### Usage 49

**File:** `Source/Items/Crystals.c`  
**Line:** 53  
```c
.type 		= LEVEL2_ObjType_Crystal1Base + itemPtr->parm[0],
```

### Usage 50

**File:** `Source/Items/Crystals.c`  
**Line:** 79  
```c
def.type 		= LEVEL2_ObjType_Crystal1 + itemPtr->parm[0];
```

### Usage 51

**File:** `Source/Items/Eggs.c`  
**Line:** 81  
```c
eggColor = itemPtr[i].parm[0];							// egg color # is in parm 0
```

### Usage 52

**File:** `Source/Items/Eggs.c`  
**Line:** 98  
```c
short	eggColor = itemPtr->parm[0];
```

## Parameter 1

Found 15 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 238  
```c
gPlayerInfo[p].startRotY = (float)itemPtr[i].parm[1] * (PI2/8.0f);	// calc starting rotation aim
```

### Usage 2

**File:** `Source/Enemies/Enemy_Ramphor.c`  
**Line:** 86  
```c
long			speed = itemPtr->parm[1];
```

### Usage 3

**File:** `Source/System/File.c`  
**Line:** 651  
```c
gMasterItemList[i].parm[1] = rezItems[i].parm[1];
```

### Usage 4

**File:** `Source/System/File.c`  
**Line:** 651  
```c
gMasterItemList[i].parm[1] = rezItems[i].parm[1];
```

### Usage 5

**File:** `Source/Items/Bushes.c`  
**Line:** 200  
```c
.rot 		= (randomRot) ? (RandomFloat()*PI2) : ((float)itemPtr->parm[1] * (PI2/8.0f)),
```

### Usage 6

**File:** `Source/Items/Bushes.c`  
**Line:** 475  
```c
short   color = itemPtr->parm[1];
```

### Usage 7

**File:** `Source/Items/Items.c`  
**Line:** 202  
```c
long	rot = itemPtr->parm[1];
```

### Usage 8

**File:** `Source/Items/Wormhole.c`  
**Line:** 158  
```c
newObj->PlayerNum = itemPtr->parm[1];					// remember this for capture the flag modes
```

### Usage 9

**File:** `Source/Items/Trees.c`  
**Line:** 539  
```c
float	rot = (float)itemPtr->parm[1] * (PI2/8.0);
```

### Usage 10

**File:** `Source/Items/Trees.c`  
**Line:** 596  
```c
long	rot = itemPtr->parm[1];
```

### Usage 11

**File:** `Source/Items/Trees.c`  
**Line:** 662  
```c
long	rot = itemPtr->parm[1];
```

### Usage 12

**File:** `Source/Items/Trees.c`  
**Line:** 853  
```c
if (itemPtr->parm[1] > 0)
```

### Usage 13

**File:** `Source/Items/Trees.c`  
**Line:** 854  
```c
def.rot 		= (float)(itemPtr->parm[1]-1) * (PI2/8.0);
```

### Usage 14

**File:** `Source/Items/ForestDoor.c`  
**Line:** 61  
```c
float				rot = (float)itemPtr->parm[1] * (PI/2);
```

### Usage 15

**File:** `Source/Items/ForestDoor.c`  
**Line:** 217  
```c
float				rot = (float)itemPtr->parm[1] * (PI2/8);
```

## Parameter 2

Found 2 usage(s):

### Usage 1

**File:** `Source/System/File.c`  
**Line:** 652  
```c
gMasterItemList[i].parm[2] = rezItems[i].parm[2];
```

### Usage 2

**File:** `Source/System/File.c`  
**Line:** 652  
```c
gMasterItemList[i].parm[2] = rezItems[i].parm[2];
```

## Parameter 3

Found 6 usage(s):

### Usage 1

**File:** `Source/Enemies/Enemy_Raptor.c`  
**Line:** 116  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 2

**File:** `Source/Enemies/Enemy_Brach.c`  
**Line:** 85  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 3

**File:** `Source/System/File.c`  
**Line:** 653  
```c
gMasterItemList[i].parm[3] = rezItems[i].parm[3];
```

### Usage 4

**File:** `Source/System/File.c`  
**Line:** 653  
```c
gMasterItemList[i].parm[3] = rezItems[i].parm[3];
```

### Usage 5

**File:** `Source/Items/Bushes.c`  
**Line:** 193  
```c
Boolean randomRot = (itemPtr->parm[3] & 1);
```

### Usage 6

**File:** `Source/Items/Bushes.c`  
**Line:** 234  
```c
Boolean halfSizeFlag = (itemPtr->parm[3] & 1);							// bit 0 is the half-size flag
```

## Parameter 4

Found 3 usage(s):

### Usage 1

**File:** `Source/Headers/structs.h`  
**Line:** 51  
```c
uint8_t			parm[4];
```

### Usage 2

**File:** `Source/Headers/structs.h`  
**Line:** 243  
```c
Byte							parm[4];
```

### Usage 3

**File:** `Source/Headers/file.h`  
**Line:** 55  
```c
uint8_t							parm[4];
```

