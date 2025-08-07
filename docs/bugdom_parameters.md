# Bugdom - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 77 usage(s):

### Usage 1

**File:** `src/Terrain/Terrain2.c`  
**Line:** 213  
```c
gMyStartAim = itemPtr[i].parm[0];								// get aim 0..7
```

### Usage 2

**File:** `src/Enemies/Enemy_FireFly.c`  
**Line:** 77  
```c
// parm[0] = target ID.
```

### Usage 3

**File:** `src/Enemies/Enemy_FireFly.c`  
**Line:** 129  
```c
newObj->FireFlyTargetID = itemPtr->parm[0];						// get target ID #
```

### Usage 4

**File:** `src/Enemies/Enemy_FireFly.c`  
**Line:** 560  
```c
if (itemPtr[i].parm[0] == id)									// see if ID's match
```

### Usage 5

**File:** `src/Enemies/Enemy_Ant.c`  
**Line:** 132  
```c
// parm[0] = attack type:  0 = spear, 1 = rock
```

### Usage 6

**File:** `src/Enemies/Enemy_Ant.c`  
**Line:** 149  
```c
rockThrower = itemPtr->parm[0] == 1;						// see if rock thrower
```

### Usage 7

**File:** `src/Enemies/Enemy_Bee_Flying.c`  
**Line:** 75  
```c
// parm[0] = yoffset * 100 units or 0 = default.
```

### Usage 8

**File:** `src/Enemies/Enemy_Bee_Flying.c`  
**Line:** 117  
```c
if (itemPtr->parm[0] == 0)
```

### Usage 9

**File:** `src/Enemies/Enemy_Bee_Flying.c`  
**Line:** 120  
```c
newObj->Coord.y += (float)itemPtr->parm[0] * 100.0f;
```

### Usage 10

**File:** `src/Enemies/Enemy_WorkerBee.c`  
**Line:** 105  
```c
if (!gDetonatorBlown[itemPtr->parm[0]])									// see if detonator has been triggered
```

### Usage 11

**File:** `src/Enemies/Enemy.c`  
**Line:** 297  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 12

**File:** `src/Enemies/Enemy_QueenBee.c`  
**Line:** 114  
```c
if (itemPtr->parm[0] != 0)			// queen is at base #0
```

### Usage 13

**File:** `src/Enemies/Enemy_QueenBee.c`  
**Line:** 695  
```c
gQueenBaseID[gNumQueenBases] = itemPtr[i].parm[0];				// remember ID#
```

### Usage 14

**File:** `src/Ride/DragonFly.c`  
**Line:** 70  
```c
// parm[0] = initial aim (0..15 clockwise)
```

### Usage 15

**File:** `src/Ride/DragonFly.c`  
**Line:** 95  
```c
gNewObjectDefinition.rot 		= itemPtr->parm[0] * (PI2/16);
```

### Usage 16

**File:** `src/Ride/WaterBug.c`  
**Line:** 54  
```c
// parm[0] = initial aim (0..15 ccw)
```

### Usage 17

**File:** `src/Ride/WaterBug.c`  
**Line:** 82  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/16.0);
```

### Usage 18

**File:** `src/Items/Triggers2.c`  
**Line:** 62  
```c
// parm[0] = checkpoint num
```

### Usage 19

**File:** `src/Items/Triggers2.c`  
**Line:** 69  
```c
int		checkpointNum = itemPtr->parm[0];
```

### Usage 20

**File:** `src/Items/Triggers2.c`  
**Line:** 119  
```c
droplet->CheckPointNum	= itemPtr->parm[0];				// save checkpoint #
```

### Usage 21

**File:** `src/Items/Triggers2.c`  
**Line:** 238  
```c
// itemPtr->parm[0] = rotation 0..3 (ccw)
```

### Usage 22

**File:** `src/Items/Triggers2.c`  
**Line:** 245  
```c
Byte		rot = itemPtr->parm[0];
```

### Usage 23

**File:** `src/Items/Triggers2.c`  
**Line:** 436  
```c
// parm[0] = ID#
```

### Usage 24

**File:** `src/Items/Triggers2.c`  
**Line:** 477  
```c
newObj->PipeID = itemPtr->parm[0];						// get pipe ID#
```

### Usage 25

**File:** `src/Items/Traps.c`  
**Line:** 517  
```c
// parm[0] = type 0..1
```

### Usage 26

**File:** `src/Items/Traps.c`  
**Line:** 538  
```c
gNewObjectDefinition.type 		= FOREST_MObjType_Thorn1 + itemPtr->parm[0];
```

### Usage 27

**File:** `src/Items/Traps.c`  
**Line:** 566  
```c
if (itemPtr->parm[0])
```

### Usage 28

**File:** `src/Items/Traps.c`  
**Line:** 732  
```c
// parm[0] = valve ID#
```

### Usage 29

**File:** `src/Items/Traps.c`  
**Line:** 767  
```c
newObj->ValveID	= itemPtr->parm[0];			// get valve ID#
```

### Usage 30

**File:** `src/Items/Items.c`  
**Line:** 161  
```c
n = itemPtr->parm[0];
```

### Usage 31

**File:** `src/Items/Items.c`  
**Line:** 203  
```c
n = itemPtr->parm[0];
```

### Usage 32

**File:** `src/Items/Items.c`  
**Line:** 234  
```c
gNewObjectDefinition.slot 		= 40+itemPtr->parm[0];
```

### Usage 33

**File:** `src/Items/Items.c`  
**Line:** 262  
```c
gNewObjectDefinition.type 		= LAWN2_MObjType_Weed + itemPtr->parm[0];
```

### Usage 34

**File:** `src/Items/Items.c`  
**Line:** 956  
```c
if (itemPtr->parm[0] > 2)
```

### Usage 35

**File:** `src/Items/Items.c`  
**Line:** 957  
```c
DoFatalAlert("AddPondGrass:parm[0] out of range!");
```

### Usage 36

**File:** `src/Items/Items.c`  
**Line:** 962  
```c
gNewObjectDefinition.type 		= POND_MObjType_PondGrass + itemPtr->parm[0];
```

### Usage 37

**File:** `src/Items/Items.c`  
**Line:** 994  
```c
if (itemPtr->parm[0] > 1)
```

### Usage 38

**File:** `src/Items/Items.c`  
**Line:** 995  
```c
DoFatalAlert("AddReed:parm[0] out of range!");
```

### Usage 39

**File:** `src/Items/Items.c`  
**Line:** 999  
```c
gNewObjectDefinition.type 		= POND_MObjType_Reed + itemPtr->parm[0];
```

### Usage 40

**File:** `src/Items/Items.c`  
**Line:** 1017  
```c
if (itemPtr->parm[0] == 0)
```

### Usage 41

**File:** `src/Items/Items.c`  
**Line:** 1031  
```c
// parm[0] = rot ccw
```

### Usage 42

**File:** `src/Items/Items.c`  
**Line:** 1052  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 43

**File:** `src/Items/Items.c`  
**Line:** 1088  
```c
// parm[0] = rot ccw
```

### Usage 44

**File:** `src/Items/Items.c`  
**Line:** 1111  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 45

**File:** `src/Items/Items.c`  
**Line:** 1125  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 46

**File:** `src/Items/Items2.c`  
**Line:** 80  
```c
id = itemPtr->parm[0];							// get ID #
```

### Usage 47

**File:** `src/Items/Items2.c`  
**Line:** 97  
```c
gNewObjectDefinition.type 		= NIGHT_MObjType_CherryBomb + itemPtr->parm[0];
```

### Usage 48

**File:** `src/Items/Items2.c`  
**Line:** 121  
```c
if (itemPtr->parm[0] == 0)									// cherry bomb
```

### Usage 49

**File:** `src/Items/Items2.c`  
**Line:** 280  
```c
id = itemPtr->parm[0];
```

### Usage 50

**File:** `src/Items/Items2.c`  
**Line:** 469  
```c
gNewObjectDefinition.rot 		= itemPtr->parm[0]*(PI/2);
```

### Usage 51

**File:** `src/Items/Items2.c`  
**Line:** 480  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 52

**File:** `src/Items/Items2.c`  
**Line:** 528  
```c
// parm[0] = rotation 0..8
```

### Usage 53

**File:** `src/Items/Items2.c`  
**Line:** 552  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0);
```

### Usage 54

**File:** `src/Items/Items2.c`  
**Line:** 666  
```c
// parm[0] = type:
```

### Usage 55

**File:** `src/Items/Items2.c`  
**Line:** 691  
```c
gNewObjectDefinition.type 	= NIGHT_MObjType_FlatRock + itemPtr->parm[0];
```

### Usage 56

**File:** `src/Items/Items2.c`  
**Line:** 697  
```c
gNewObjectDefinition.type 	= LAWN2_MObjType_Rock1 + itemPtr->parm[0];
```

### Usage 57

**File:** `src/Items/Items2.c`  
**Line:** 703  
```c
gNewObjectDefinition.type 	= FOREST_MObjType_FlatRock + itemPtr->parm[0];
```

### Usage 58

**File:** `src/Items/Items2.c`  
**Line:** 730  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 59

**File:** `src/Items/Items2.c`  
**Line:** 737  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 60

**File:** `src/Items/Items2.c`  
**Line:** 744  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 61

**File:** `src/Items/Items2.c`  
**Line:** 764  
```c
// parm[0] = type 0..3
```

### Usage 62

**File:** `src/Items/Items2.c`  
**Line:** 774  
```c
n = itemPtr->parm[0];
```

### Usage 63

**File:** `src/Items/Items2.c`  
**Line:** 1012  
```c
gNewObjectDefinition.rot 		= itemPtr->parm[0]*(PI/2);
```

### Usage 64

**File:** `src/Items/Triggers.c`  
**Line:** 214  
```c
// parm[0] = nut contents
```

### Usage 65

**File:** `src/Items/Triggers.c`  
**Line:** 235  
```c
contents = itemPtr->parm[0];			// get contents
```

### Usage 66

**File:** `src/Items/Triggers.c`  
**Line:** 430  
```c
// parm[0] = type
```

### Usage 67

**File:** `src/Items/Triggers.c`  
**Line:** 443  
```c
Boolean	isMetal = itemPtr->parm[0] & 1;
```

### Usage 68

**File:** `src/Items/Triggers.c`  
**Line:** 600  
```c
// parm[0] = ID #
```

### Usage 69

**File:** `src/Items/Triggers.c`  
**Line:** 641  
```c
boxObj->DetonatorID		= itemPtr->parm[0];					// save detonator ID#
```

### Usage 70

**File:** `src/Items/Triggers.c`  
**Line:** 750  
```c
// parm[0] = key ID
```

### Usage 71

**File:** `src/Items/Triggers.c`  
**Line:** 763  
```c
keyID = itemPtr->parm[0];
```

### Usage 72

**File:** `src/Items/Triggers.c`  
**Line:** 1318  
```c
// parm[0] = ID #
```

### Usage 73

**File:** `src/Items/Triggers.c`  
**Line:** 1355  
```c
newObj->ValveID		= itemPtr->parm[0];
```

### Usage 74

**File:** `src/Items/Liquids.c`  
**Line:** 257  
```c
// parm[0] = # tiles wide
```

### Usage 75

**File:** `src/Items/Liquids.c`  
**Line:** 339  
```c
width = itemPtr->parm[0];
```

### Usage 76

**File:** `src/Items/Liquids.c`  
**Line:** 805  
```c
// parm[0] = # tiles wide
```

### Usage 77

**File:** `src/Items/Liquids.c`  
**Line:** 839  
```c
width = itemPtr->parm[0];								// get width & depth of water patch
```

## Parameter 1

Found 32 usage(s):

### Usage 1

**File:** `src/Enemies/Enemy_Bee_Flying.c`  
**Line:** 99  
```c
if (!gDetonatorBlown[itemPtr->parm[1]])						// see if detonator has been triggered
```

### Usage 2

**File:** `src/Items/Triggers2.c`  
**Line:** 63  
```c
// parm[1] = player rot 0..3
```

### Usage 3

**File:** `src/Items/Triggers2.c`  
**Line:** 129  
```c
droplet->PlayerRot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 4

**File:** `src/Items/Traps.c`  
**Line:** 518  
```c
// parm[1] = rotation 0..3 (counter clockw)
```

### Usage 5

**File:** `src/Items/Traps.c`  
**Line:** 534  
```c
rot = itemPtr->parm[1];
```

### Usage 6

**File:** `src/Items/Traps.c`  
**Line:** 733  
```c
// parm[1] = rot 0 = -, 1 = \, 2 = |
```

### Usage 7

**File:** `src/Items/Traps.c`  
**Line:** 747  
```c
r = itemPtr->parm[1];						// get rot 0..2
```

### Usage 8

**File:** `src/Items/Items.c`  
**Line:** 1032  
```c
// parm[1] = valve ID#
```

### Usage 9

**File:** `src/Items/Items.c`  
**Line:** 1069  
```c
newObj->ValveID = itemPtr->parm[1];
```

### Usage 10

**File:** `src/Items/Items.c`  
**Line:** 1089  
```c
// parm[1] = height to place
```

### Usage 11

**File:** `src/Items/Items.c`  
**Line:** 1106  
```c
gNewObjectDefinition.coord.y 	= GetTerrainHeightAtCoord(x,z,FLOOR) + ((float)itemPtr->parm[1] * 10.0f);
```

### Usage 12

**File:** `src/Items/Items2.c`  
**Line:** 271  
```c
rot = itemPtr->parm[1];
```

### Usage 13

**File:** `src/Items/Items2.c`  
**Line:** 529  
```c
// parm[1] = sync # 0..3
```

### Usage 14

**File:** `src/Items/Items2.c`  
**Line:** 578  
```c
newObj->RootSync = itemPtr->parm[1];
```

### Usage 15

**File:** `src/Items/Items2.c`  
**Line:** 765  
```c
// parm[1] = aim 0..3
```

### Usage 16

**File:** `src/Items/Items2.c`  
**Line:** 792  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4);
```

### Usage 17

**File:** `src/Items/Items2.c`  
**Line:** 875  
```c
if (itemPtr->parm[1] == 0)
```

### Usage 18

**File:** `src/Items/Items2.c`  
**Line:** 878  
```c
h = itemPtr->parm[1];
```

### Usage 19

**File:** `src/Items/Items2.c`  
**Line:** 886  
```c
//	gNewObjectDefinition.coord.y 	= GetTerrainHeightAtCoord(x,z,FLOOR) + 50.0f + ((float)itemPtr->parm[1] * 4.0f);
```

### Usage 20

**File:** `src/Items/Triggers.c`  
**Line:** 220  
```c
// parm[1] = other parms for specific nut contents (key ID, etc)
```

### Usage 21

**File:** `src/Items/Triggers.c`  
**Line:** 278  
```c
newObj->NutParm1 		= itemPtr->parm[1];
```

### Usage 22

**File:** `src/Items/Triggers.c`  
**Line:** 434  
```c
// parm[1] = elevation
```

### Usage 23

**File:** `src/Items/Triggers.c`  
**Line:** 451  
```c
if (itemPtr->parm[1] == 0)
```

### Usage 24

**File:** `src/Items/Triggers.c`  
**Line:** 454  
```c
h = itemPtr->parm[1];
```

### Usage 25

**File:** `src/Items/Triggers.c`  
**Line:** 601  
```c
// parm[1] = color
```

### Usage 26

**File:** `src/Items/Triggers.c`  
**Line:** 626  
```c
gNewObjectDefinition.type 		= HIVE_MObjType_DetonatorGreen + itemPtr->parm[1];
```

### Usage 27

**File:** `src/Items/Triggers.c`  
**Line:** 751  
```c
// parm[1] = orientation 0..3
```

### Usage 28

**File:** `src/Items/Triggers.c`  
**Line:** 764  
```c
aim = itemPtr->parm[1];
```

### Usage 29

**File:** `src/Items/Liquids.c`  
**Line:** 258  
```c
// parm[1] = # tiles deep
```

### Usage 30

**File:** `src/Items/Liquids.c`  
**Line:** 340  
```c
depth = itemPtr->parm[1];
```

### Usage 31

**File:** `src/Items/Liquids.c`  
**Line:** 806  
```c
// parm[1] = # tiles deep
```

### Usage 32

**File:** `src/Items/Liquids.c`  
**Line:** 840  
```c
depth = itemPtr->parm[1];
```

## Parameter 2

Found 20 usage(s):

### Usage 1

**File:** `src/Items/Traps.c`  
**Line:** 734  
```c
// parm[2] = width (in tiles) 0 == default
```

### Usage 2

**File:** `src/Items/Traps.c`  
**Line:** 743  
```c
l = itemPtr->parm[2];						// get length of wall
```

### Usage 3

**File:** `src/Items/Items.c`  
**Line:** 1090  
```c
// parm[2] = valve ID#
```

### Usage 4

**File:** `src/Items/Items.c`  
**Line:** 1133  
```c
newObj->ValveID = itemPtr->parm[2];
```

### Usage 5

**File:** `src/Items/Items2.c`  
**Line:** 272  
```c
color = itemPtr->parm[2];
```

### Usage 6

**File:** `src/Items/Items2.c`  
**Line:** 530  
```c
// parm[2] = scale factor
```

### Usage 7

**File:** `src/Items/Items2.c`  
**Line:** 536  
```c
float	scaleFactor = itemPtr->parm[2];
```

### Usage 8

**File:** `src/Items/Items2.c`  
**Line:** 766  
```c
// parm[2] = scale
```

### Usage 9

**File:** `src/Items/Items2.c`  
**Line:** 781  
```c
s = ((float)itemPtr->parm[2] * .5f) + 1.0f;
```

### Usage 10

**File:** `src/Items/Triggers.c`  
**Line:** 222  
```c
// parm[2] = detonator ID on hive level.
```

### Usage 11

**File:** `src/Items/Triggers.c`  
**Line:** 236  
```c
id = itemPtr->parm[2];					// get detonator id
```

### Usage 12

**File:** `src/Items/Liquids.c`  
**Line:** 259  
```c
// parm[2] = depth of water or ID# for anthill or index
```

### Usage 13

**File:** `src/Items/Liquids.c`  
**Line:** 306  
```c
y = yTable2[itemPtr->parm[2]];						// get underground y from table2
```

### Usage 14

**File:** `src/Items/Liquids.c`  
**Line:** 307  
```c
id = itemPtr->parm[2];								// get valve ID#
```

### Usage 15

**File:** `src/Items/Liquids.c`  
**Line:** 321  
```c
y = yTable[itemPtr->parm[2]];					// get y from table
```

### Usage 16

**File:** `src/Items/Liquids.c`  
**Line:** 328  
```c
yOff = itemPtr->parm[2];							// get y offset
```

### Usage 17

**File:** `src/Items/Liquids.c`  
**Line:** 807  
```c
// parm[2] = y off or y coord index
```

### Usage 18

**File:** `src/Items/Liquids.c`  
**Line:** 827  
```c
GAME_ASSERT(itemPtr->parm[2] < 6);
```

### Usage 19

**File:** `src/Items/Liquids.c`  
**Line:** 828  
```c
y = gLiquidYTable[kind][itemPtr->parm[2]];			// get y from table
```

### Usage 20

**File:** `src/Items/Liquids.c`  
**Line:** 832  
```c
yOff = itemPtr->parm[2];							// get y offset
```

## Parameter 3

Found 34 usage(s):

### Usage 1

**File:** `src/Enemies/Enemy_FireAnt.c`  
**Line:** 84  
```c
// parm[3]:bit0 = always add
```

### Usage 2

**File:** `src/Enemies/Enemy_FireAnt.c`  
**Line:** 96  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 3

**File:** `src/Enemies/Enemy_Ant.c`  
**Line:** 133  
```c
// parm[3]: bit0 = aggressive, walk after player
```

### Usage 4

**File:** `src/Enemies/Enemy_Ant.c`  
**Line:** 155  
```c
newObj->Aggressive = itemPtr->parm[3] & 1;					// see if aggressive
```

### Usage 5

**File:** `src/Enemies/Enemy_KingAnt.c`  
**Line:** 106  
```c
if (itemPtr->parm[3])			// if any bits set then this isnt the real Queen
```

### Usage 6

**File:** `src/Enemies/Enemy_Bee_Flying.c`  
**Line:** 97  
```c
if (itemPtr->parm[3] & 1)										// see if we care
```

### Usage 7

**File:** `src/Enemies/Enemy_WorkerBee.c`  
**Line:** 103  
```c
if (itemPtr->parm[3] & 1)										// see if we care
```

### Usage 8

**File:** `src/Enemies/Enemy_Roach.c`  
**Line:** 90  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 9

**File:** `src/Enemies/Enemy_QueenBee.c`  
**Line:** 107  
```c
// NOTE: the parm[3] bits are used as special Queen Bee flags
```

### Usage 10

**File:** `src/Items/Traps.c`  
**Line:** 519  
```c
// parm[3]:bit0 = random rotate
```

### Usage 11

**File:** `src/Items/Traps.c`  
**Line:** 531  
```c
if (itemPtr->parm[3] & 1)										// get rotation
```

### Usage 12

**File:** `src/Items/Items.c`  
**Line:** 1033  
```c
// parm[3]:bit0 = spew water if valve open
```

### Usage 13

**File:** `src/Items/Items.c`  
**Line:** 1034  
```c
// parm[3]:bit1 = spew water always
```

### Usage 14

**File:** `src/Items/Items.c`  
**Line:** 1070  
```c
newObj->ValvePipe = itemPtr->parm[3] & 1;
```

### Usage 15

**File:** `src/Items/Items.c`  
**Line:** 1071  
```c
newObj->SpewWater = itemPtr->parm[3] & (1<<1);
```

### Usage 16

**File:** `src/Items/Items.c`  
**Line:** 1091  
```c
// parm[3]:bit0 = spew water if valve open
```

### Usage 17

**File:** `src/Items/Items.c`  
**Line:** 1092  
```c
// parm[3]:bit1 = spew water always
```

### Usage 18

**File:** `src/Items/Items.c`  
**Line:** 1134  
```c
newObj->ValvePipe = itemPtr->parm[3] & 1;
```

### Usage 19

**File:** `src/Items/Items.c`  
**Line:** 1135  
```c
newObj->SpewWater = itemPtr->parm[3] & (1<<1);
```

### Usage 20

**File:** `src/Items/Items2.c`  
**Line:** 860  
```c
// parm[3]: bit 1 = small
```

### Usage 21

**File:** `src/Items/Items2.c`  
**Line:** 867  
```c
Boolean			isSmall = itemPtr->parm[3] & (1<<1);
```

### Usage 22

**File:** `src/Items/Items2.c`  
**Line:** 868  
```c
Boolean			zigzag = itemPtr->parm[3] & (1<<2);
```

### Usage 23

**File:** `src/Items/Triggers.c`  
**Line:** 224  
```c
// parm[3]: bit 0 = always regenerate powerup
```

### Usage 24

**File:** `src/Items/Triggers.c`  
**Line:** 237  
```c
canBlow = itemPtr->parm[3] & (1<<1);	// see if can blow
```

### Usage 25

**File:** `src/Items/Triggers.c`  
**Line:** 276  
```c
newObj->RegenerateNut 	= itemPtr->parm[3] & 1;		// see if regenerate this
```

### Usage 26

**File:** `src/Items/Triggers.c`  
**Line:** 436  
```c
// parm[3]:	bit0 = resurface falling
```

### Usage 27

**File:** `src/Items/Triggers.c`  
**Line:** 444  
```c
Boolean	isSmall = itemPtr->parm[3] & (1<<1);
```

### Usage 28

**File:** `src/Items/Triggers.c`  
**Line:** 483  
```c
newObj->ResurfacePlatform = itemPtr->parm[3] & 1;		// see if resurface
```

### Usage 29

**File:** `src/Items/Liquids.c`  
**Line:** 260  
```c
// parm[3]:bit0 = tesselate flag
```

### Usage 30

**File:** `src/Items/Liquids.c`  
**Line:** 284  
```c
tesselateFlag = itemPtr->parm[3] & 1;					// get tesselate flag
```

### Usage 31

**File:** `src/Items/Liquids.c`  
**Line:** 285  
```c
putUnderGround = itemPtr->parm[3] & (1<<1);				// get underground flag
```

### Usage 32

**File:** `src/Items/Liquids.c`  
**Line:** 319  
```c
if (itemPtr->parm[3]  & (1<<2))						// see if used table index y coord
```

### Usage 33

**File:** `src/Items/Liquids.c`  
**Line:** 808  
```c
// parm[3]: bit 0 = use y coord index for fixed ht.
```

### Usage 34

**File:** `src/Items/Liquids.c`  
**Line:** 825  
```c
if (itemPtr->parm[3]&1)									// see if use indexed y
```

## Parameter 4

Found 2 usage(s):

### Usage 1

**File:** `src/Headers/structs.h`  
**Line:** 40  
```c
Byte			parm[4];
```

### Usage 2

**File:** `src/Headers/structs.h`  
**Line:** 219  
```c
Byte							parm[4];
```

