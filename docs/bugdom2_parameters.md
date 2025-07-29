# Bugdom2 - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 61 usage(s):

### Usage 1

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 241  
```c
gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f);	// calc starting rotation aim
```

### Usage 2

**File:** `Source/Terrain/Terrain2.c`  
**Line:** 638  
```c
if (gMasterItemList[i].parm[0] == 2)	// only shadow tall stack
```

### Usage 3

**File:** `Source/Enemies/Enemy_Ant.c`  
**Line:** 108  
```c
int		foodType = itemPtr->parm[0];
```

### Usage 4

**File:** `Source/Enemies/Enemy_Ant.c`  
**Line:** 548  
```c
int				foodType = itemPtr->parm[0];
```

### Usage 5

**File:** `Source/Enemies/Enemy_Moth.c`  
**Line:** 124  
```c
newObj->MothTargetID = itemPtr->parm[0];						// get target ID #
```

### Usage 6

**File:** `Source/Enemies/Enemy_Moth.c`  
**Line:** 589  
```c
int	pathNum = itemPtr->parm[0];
```

### Usage 7

**File:** `Source/Enemies/Enemy.c`  
**Line:** 98  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 8

**File:** `Source/System/File.c`  
**Line:** 718  
```c
gMasterItemList[i].parm[0] = rezItems[i].parm[0];
```

### Usage 9

**File:** `Source/System/File.c`  
**Line:** 718  
```c
gMasterItemList[i].parm[0] = rezItems[i].parm[0];
```

### Usage 10

**File:** `Source/System/File.c`  
**Line:** 829  
```c
spline->itemList[j].parm[0]		= rezItems[j].parm[0];
```

### Usage 11

**File:** `Source/System/File.c`  
**Line:** 829  
```c
spline->itemList[j].parm[0]		= rezItems[j].parm[0];
```

### Usage 12

**File:** `Source/Items/Powerups.c`  
**Line:** 55  
```c
int		powKind = itemPtr->parm[0];
```

### Usage 13

**File:** `Source/Items/Powerups.c`  
**Line:** 586  
```c
pow = MakePOW(itemPtr->parm[0], &where);
```

### Usage 14

**File:** `Source/Items/Traps.c`  
**Line:** 121  
```c
gNewObjectDefinition.rot 		= itemPtr->parm[0] * (PI/2);
```

### Usage 15

**File:** `Source/Items/Traps.c`  
**Line:** 300  
```c
float	r = itemPtr->parm[0] * (PI2/4.0f);
```

### Usage 16

**File:** `Source/Items/Traps.c`  
**Line:** 327  
```c
if (itemPtr->parm[0] & 1)									// build 2 collision boxes
```

### Usage 17

**File:** `Source/Items/Traps.c`  
**Line:** 743  
```c
gNewObjectDefinition.rot 		= r = (float)itemPtr->parm[0] * (PI / 2);
```

### Usage 18

**File:** `Source/Items/Items3.c`  
**Line:** 362  
```c
int		type = itemPtr->parm[0];
```

### Usage 19

**File:** `Source/Items/Items3.c`  
**Line:** 409  
```c
int		type = itemPtr->parm[0];
```

### Usage 20

**File:** `Source/Items/Items3.c`  
**Line:** 457  
```c
int		type = itemPtr->parm[0];
```

### Usage 21

**File:** `Source/Items/Items3.c`  
**Line:** 527  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 22

**File:** `Source/Items/Items3.c`  
**Line:** 570  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 23

**File:** `Source/Items/Items3.c`  
**Line:** 602  
```c
int		part = itemPtr->parm[0];
```

### Usage 24

**File:** `Source/Items/Snails2.c`  
**Line:** 52  
```c
int		part = itemPtr->parm[0];
```

### Usage 25

**File:** `Source/Items/Snails2.c`  
**Line:** 519  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 26

**File:** `Source/Items/Items.c`  
**Line:** 182  
```c
gNewObjectDefinition.type 		= FOLIAGE_ObjType_Daisy1 + itemPtr->parm[0];
```

### Usage 27

**File:** `Source/Items/Items.c`  
**Line:** 236  
```c
gNewObjectDefinition.type 		= FOLIAGE_ObjType_Tulip1 + itemPtr->parm[0];
```

### Usage 28

**File:** `Source/Items/Items.c`  
**Line:** 301  
```c
gNewObjectDefinition.type 		= FOLIAGE_ObjType_Grass1 + itemPtr->parm[0];
```

### Usage 29

**File:** `Source/Items/Items.c`  
**Line:** 422  
```c
gNewObjectDefinition.rot 	= itemPtr->parm[0] * PI/2 + PI/2;
```

### Usage 30

**File:** `Source/Items/Items.c`  
**Line:** 424  
```c
gNewObjectDefinition.rot 	= itemPtr->parm[0] * PI/2;
```

### Usage 31

**File:** `Source/Items/Items.c`  
**Line:** 539  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * PI/2;
```

### Usage 32

**File:** `Source/Items/Items.c`  
**Line:** 561  
```c
int	type = itemPtr->parm[0];
```

### Usage 33

**File:** `Source/Items/Items.c`  
**Line:** 628  
```c
gNewObjectDefinition.type 		= GARDEN_ObjType_LargeStone + itemPtr->parm[0];
```

### Usage 34

**File:** `Source/Items/Items.c`  
**Line:** 632  
```c
gNewObjectDefinition.type 		= SIDEWALK_ObjType_LargeStone + itemPtr->parm[0];
```

### Usage 35

**File:** `Source/Items/Items.c`  
**Line:** 684  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4.0f);
```

### Usage 36

**File:** `Source/Items/Items.c`  
**Line:** 695  
```c
switch(itemPtr->parm[0])
```

### Usage 37

**File:** `Source/Items/Items.c`  
**Line:** 716  
```c
switch(itemPtr->parm[0])
```

### Usage 38

**File:** `Source/Items/Items.c`  
**Line:** 898  
```c
gNewObjectDefinition.rot 		= PI + ((float)itemPtr->parm[0] * (PI2/4));
```

### Usage 39

**File:** `Source/Items/Items.c`  
**Line:** 950  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 40

**File:** `Source/Items/SlotCar.c`  
**Line:** 91  
```c
carNum = itemPtr->parm[0];
```

### Usage 41

**File:** `Source/Items/SlotCar.c`  
**Line:** 878  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 42

**File:** `Source/Items/Items2.c`  
**Line:** 55  
```c
gNewObjectDefinition.type 		= PLAYROOM_ObjType_LetterBlock1 + itemPtr->parm[0];
```

### Usage 43

**File:** `Source/Items/Items2.c`  
**Line:** 372  
```c
int		type = itemPtr->parm[0];
```

### Usage 44

**File:** `Source/Items/Items2.c`  
**Line:** 693  
```c
int		type = itemPtr->parm[0];
```

### Usage 45

**File:** `Source/Items/Items2.c`  
**Line:** 754  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 46

**File:** `Source/Items/Items2.c`  
**Line:** 793  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4);
```

### Usage 47

**File:** `Source/Items/Items2.c`  
**Line:** 814  
```c
int	type = itemPtr->parm[0];
```

### Usage 48

**File:** `Source/Items/Items2.c`  
**Line:** 870  
```c
gNewObjectDefinition.rot 	= itemPtr->parm[0] * PI/2 + PI/2;
```

### Usage 49

**File:** `Source/Items/Items2.c`  
**Line:** 872  
```c
gNewObjectDefinition.rot 	= itemPtr->parm[0] * PI/2;
```

### Usage 50

**File:** `Source/Items/Items2.c`  
**Line:** 1123  
```c
gNewObjectDefinition.type 		= CLOSET_ObjType_PictureFrame_Brian + itemPtr->parm[0];
```

### Usage 51

**File:** `Source/Items/Items2.c`  
**Line:** 1241  
```c
int	type = itemPtr->parm[0];
```

### Usage 52

**File:** `Source/Items/Items2.c`  
**Line:** 1301  
```c
gNewObjectDefinition.type 		= PARK_ObjType_Fork + itemPtr->parm[0];
```

### Usage 53

**File:** `Source/Items/Chipmunk.c`  
**Line:** 127  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * PI2/8;
```

### Usage 54

**File:** `Source/Items/Snails.c`  
**Line:** 86  
```c
int		snailKind = itemPtr->parm[0];
```

### Usage 55

**File:** `Source/Items/Snails.c`  
**Line:** 812  
```c
if (itemPtr->parm[0] == 0)
```

### Usage 56

**File:** `Source/Items/Snails.c`  
**Line:** 1337  
```c
OGLMatrix3x3_SetRotate(&m, (float)itemPtr->parm[0] * (PI2/8));
```

### Usage 57

**File:** `Source/Items/Pickups.c`  
**Line:** 288  
```c
int	type = itemPtr->parm[0];
```

### Usage 58

**File:** `Source/Items/Pickups.c`  
**Line:** 681  
```c
Boolean	part = itemPtr->parm[0];
```

### Usage 59

**File:** `Source/Items/BeeHive.c`  
**Line:** 68  
```c
gNewObjectDefinition.rot 		= 0; //(float)itemPtr->parm[0] * (PI2/4);
```

### Usage 60

**File:** `Source/Items/BeeHive.c`  
**Line:** 237  
```c
Boolean	part = itemPtr->parm[0];
```

### Usage 61

**File:** `Source/Player/RideBall.c`  
**Line:** 64  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0f);
```

## Parameter 1

Found 15 usage(s):

### Usage 1

**File:** `Source/System/File.c`  
**Line:** 719  
```c
gMasterItemList[i].parm[1] = rezItems[i].parm[1];
```

### Usage 2

**File:** `Source/System/File.c`  
**Line:** 719  
```c
gMasterItemList[i].parm[1] = rezItems[i].parm[1];
```

### Usage 3

**File:** `Source/System/File.c`  
**Line:** 830  
```c
spline->itemList[j].parm[1]		= rezItems[j].parm[1];
```

### Usage 4

**File:** `Source/System/File.c`  
**Line:** 830  
```c
spline->itemList[j].parm[1]		= rezItems[j].parm[1];
```

### Usage 5

**File:** `Source/Items/Items3.c`  
**Line:** 475  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 6

**File:** `Source/Items/Items.c`  
**Line:** 366  
```c
int		doorColor = itemPtr->parm[1];
```

### Usage 7

**File:** `Source/Items/Items2.c`  
**Line:** 371  
```c
int		r = itemPtr->parm[1];
```

### Usage 8

**File:** `Source/Items/Items2.c`  
**Line:** 692  
```c
int		stackLevel = itemPtr->parm[1];
```

### Usage 9

**File:** `Source/Items/Items2.c`  
**Line:** 737  
```c
int		stackLevel = itemPtr->parm[1];
```

### Usage 10

**File:** `Source/Items/Items2.c`  
**Line:** 779  
```c
int	type = itemPtr->parm[1];
```

### Usage 11

**File:** `Source/Items/Items2.c`  
**Line:** 831  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 12

**File:** `Source/Items/Items2.c`  
**Line:** 1131  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI/2);
```

### Usage 13

**File:** `Source/Items/Items2.c`  
**Line:** 1309  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 14

**File:** `Source/Items/Chipmunk.c`  
**Line:** 80  
```c
int		kind = itemPtr->parm[1];
```

### Usage 15

**File:** `Source/Items/Snails.c`  
**Line:** 95  
```c
snail = MakeSnail(SNAIL_SLOT, x, z, snailKind, itemPtr->parm[2], itemPtr->parm[1], taskCompleted);
```

## Parameter 2

Found 6 usage(s):

### Usage 1

**File:** `Source/System/File.c`  
**Line:** 720  
```c
gMasterItemList[i].parm[2] = rezItems[i].parm[2];
```

### Usage 2

**File:** `Source/System/File.c`  
**Line:** 720  
```c
gMasterItemList[i].parm[2] = rezItems[i].parm[2];
```

### Usage 3

**File:** `Source/System/File.c`  
**Line:** 831  
```c
spline->itemList[j].parm[2]		= rezItems[j].parm[2];
```

### Usage 4

**File:** `Source/System/File.c`  
**Line:** 831  
```c
spline->itemList[j].parm[2]		= rezItems[j].parm[2];
```

### Usage 5

**File:** `Source/Items/Chipmunk.c`  
**Line:** 135  
```c
newObj->CheckPointNum = itemPtr->parm[2];
```

### Usage 6

**File:** `Source/Items/Snails.c`  
**Line:** 95  
```c
snail = MakeSnail(SNAIL_SLOT, x, z, snailKind, itemPtr->parm[2], itemPtr->parm[1], taskCompleted);
```

## Parameter 3

Found 25 usage(s):

### Usage 1

**File:** `Source/Enemies/Enemy_Flea.c`  
**Line:** 142  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 2

**File:** `Source/Enemies/Enemy_ToySoldier.c`  
**Line:** 112  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 3

**File:** `Source/Enemies/Enemy_Gnome.c`  
**Line:** 94  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 4

**File:** `Source/Enemies/Enemy_Ant.c`  
**Line:** 114  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 5

**File:** `Source/Enemies/Enemy_Frog2.c`  
**Line:** 83  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 6

**File:** `Source/Enemies/Enemy_HouseFly.c`  
**Line:** 101  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 7

**File:** `Source/Enemies/Enemy_Moth.c`  
**Line:** 92  
```c
if (itemPtr->parm[3] & 1)								// see if target
```

### Usage 8

**File:** `Source/Enemies/Enemy_ComputerBug.c`  
**Line:** 104  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 9

**File:** `Source/Enemies/Enemy_Otto.c`  
**Line:** 121  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 10

**File:** `Source/Enemies/Enemy_Frog.c`  
**Line:** 74  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 11

**File:** `Source/Enemies/Enemy_Roach.c`  
**Line:** 132  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 12

**File:** `Source/Enemies/Enemy_DragonFly.c`  
**Line:** 96  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 13

**File:** `Source/System/File.c`  
**Line:** 721  
```c
gMasterItemList[i].parm[3] = rezItems[i].parm[3];
```

### Usage 14

**File:** `Source/System/File.c`  
**Line:** 721  
```c
gMasterItemList[i].parm[3] = rezItems[i].parm[3];
```

### Usage 15

**File:** `Source/System/File.c`  
**Line:** 832  
```c
spline->itemList[j].parm[3]		= rezItems[j].parm[3];
```

### Usage 16

**File:** `Source/System/File.c`  
**Line:** 832  
```c
spline->itemList[j].parm[3]		= rezItems[j].parm[3];
```

### Usage 17

**File:** `Source/Items/Powerups.c`  
**Line:** 54  
```c
Boolean	upHigh = itemPtr->parm[3] & (1<<1);
```

### Usage 18

**File:** `Source/Items/Powerups.c`  
**Line:** 88  
```c
body->Regenerate = itemPtr->parm[3] & 1;					// see if regenerating kind
```

### Usage 19

**File:** `Source/Items/Traps.c`  
**Line:** 705  
```c
if (!(item->parm[3] & 1))								// is not primed?
```

### Usage 20

**File:** `Source/Items/Traps.c`  
**Line:** 708  
```c
if (item->parm[3] & (1<<1))							// is drowning?
```

### Usage 21

**File:** `Source/Items/Traps.c`  
**Line:** 723  
```c
Boolean	primed = itemPtr->parm[3] & 0x1;
```

### Usage 22

**File:** `Source/Items/Traps.c`  
**Line:** 724  
```c
Boolean	drowning = itemPtr->parm[3] & (1<<1);
```

### Usage 23

**File:** `Source/Items/Items.c`  
**Line:** 670  
```c
Boolean	isCorner = itemPtr->parm[3] & 1;							// see if it's a corner piece
```

### Usage 24

**File:** `Source/Items/Items.c`  
**Line:** 783  
```c
if (itemPtr->parm[3] & 1)								// see if has key
```

### Usage 25

**File:** `Source/Items/Items2.c`  
**Line:** 410  
```c
if (itemPtr->parm[3] & 1)							// see if choose random color brick
```

## Parameter 4

Found 2 usage(s):

### Usage 1

**File:** `Source/Headers/structs.h`  
**Line:** 48  
```c
Byte			parm[4];
```

### Usage 2

**File:** `Source/Headers/structs.h`  
**Line:** 229  
```c
Byte							parm[4];
```

