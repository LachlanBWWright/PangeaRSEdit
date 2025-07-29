# Ottomatic - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 86 usage(s):

### Usage 1

**File:** `src/Effects/Sparkle.c`  
**Line:** 490  
```c
r = (float)itemPtr->parm[0] * (PI/8);
```

### Usage 2

**File:** `src/Effects/Effects.c`  
**Line:** 1686  
```c
newObj->Kind = itemPtr->parm[0];								// save smoke kind
```

### Usage 3

**File:** `src/Terrain/Terrain2.c`  
**Line:** 282  
```c
gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f);	// calc starting rotation aim
```

### Usage 4

**File:** `src/Enemies/Jungle/Enemy_Flytrap.c`  
**Line:** 91  
```c
newObj = MakeEnemySkeleton(SKELETON_TYPE_FLYTRAP,x,z, FLYTRAP_SCALE, (float)itemPtr->parm[0] * PI2/8, MoveFlyTrap);
```

### Usage 5

**File:** `src/Enemies/Enemy.c`  
**Line:** 194  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 6

**File:** `src/Enemies/Enemy_BrainBoss.c`  
**Line:** 133  
```c
id = itemPtr[i].parm[0];								// get generator ID
```

### Usage 7

**File:** `src/Enemies/Enemy_BrainBoss.c`  
**Line:** 982  
```c
id = itemPtr->parm[0];
```

### Usage 8

**File:** `src/Enemies/Slime/Enemy_Blob.c`  
**Line:** 94  
```c
newObj->BlobColorType = itemPtr->parm[0];					// save color type
```

### Usage 9

**File:** `src/Screens/WarpCheat.c`  
**Line:** 28  
```c
if (itemA->parm[0] != itemB->parm[0])
```

### Usage 10

**File:** `src/Screens/WarpCheat.c`  
**Line:** 28  
```c
if (itemA->parm[0] != itemB->parm[0])
```

### Usage 11

**File:** `src/Screens/WarpCheat.c`  
**Line:** 29  
```c
return ((int)itemA->parm[0]) - ((int)itemB->parm[0]);
```

### Usage 12

**File:** `src/Screens/WarpCheat.c`  
**Line:** 29  
```c
return ((int)itemA->parm[0]) - ((int)itemB->parm[0]);
```

### Usage 13

**File:** `src/Screens/WarpCheat.c`  
**Line:** 64  
```c
SDL_snprintf(name, sizeof(name), "Teleporter %d > %d", item->parm[0], item->parm[1]);
```

### Usage 14

**File:** `src/Screens/WarpCheat.c`  
**Line:** 68  
```c
SDL_snprintf(name, sizeof(name), "Checkpoint %d", item->parm[0]);
```

### Usage 15

**File:** `src/Screens/WarpCheat.c`  
**Line:** 82  
```c
SDL_snprintf(name, sizeof(name), "ZipLine %d", item->parm[0]);
```

### Usage 16

**File:** `src/Screens/WarpCheat.c`  
**Line:** 97  
```c
item->parm[0],
```

### Usage 17

**File:** `src/Screens/Infobar.c`  
**Line:** 1204  
```c
newObj->MessageNum = itemPtr->parm[0];
```

### Usage 18

**File:** `src/System/File.c`  
**Line:** 1147  
```c
item->parm[0],
```

### Usage 19

**File:** `src/Items/Volcano.c`  
**Line:** 67  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0f);			// use given rot
```

### Usage 20

**File:** `src/Items/Triggers2.c`  
**Line:** 72  
```c
if (itemPtr->parm[0] == 1)
```

### Usage 21

**File:** `src/Items/Triggers2.c`  
**Line:** 265  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0f);
```

### Usage 22

**File:** `src/Items/Triggers2.c`  
**Line:** 278  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 23

**File:** `src/Items/Triggers2.c`  
**Line:** 354  
```c
short	type = itemPtr->parm[0];
```

### Usage 24

**File:** `src/Items/Triggers2.c`  
**Line:** 423  
```c
gNewObjectDefinition.type 		= JUNGLE_ObjType_LeafPlatform0 + itemPtr->parm[0];
```

### Usage 25

**File:** `src/Items/Triggers2.c`  
**Line:** 583  
```c
short	type = itemPtr->parm[0];		// 0=open, 1=blocked with debris
```

### Usage 26

**File:** `src/Items/Teleporter.c`  
**Line:** 75  
```c
id = itemPtr[i].parm[0];								// get teleporter ID
```

### Usage 27

**File:** `src/Items/Teleporter.c`  
**Line:** 96  
```c
int id = itemPtr->parm[0];
```

### Usage 28

**File:** `src/Items/items2.c`  
**Line:** 67  
```c
gNewObjectDefinition.type 		= CLOUD_ObjType_ZigZag_Blue + itemPtr->parm[0];	// blue or red?
```

### Usage 29

**File:** `src/Items/items2.c`  
**Line:** 74  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * PI/2;
```

### Usage 30

**File:** `src/Items/items2.c`  
**Line:** 270  
```c
short	type = itemPtr->parm[0];
```

### Usage 31

**File:** `src/Items/items2.c`  
**Line:** 443  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 32

**File:** `src/Items/Humans.c`  
**Line:** 110  
```c
if (item->parm[0] == 0)												// see if random #
```

### Usage 33

**File:** `src/Items/Humans.c`  
**Line:** 112  
```c
item->parm[0] = 1 + (MyRandomLong() & 7);
```

### Usage 34

**File:** `src/Items/Humans.c`  
**Line:** 114  
```c
gNumHumansInLevel += item->parm[0];
```

### Usage 35

**File:** `src/Items/Humans.c`  
**Line:** 224  
```c
Byte humanType = itemPtr->parm[0];
```

### Usage 36

**File:** `src/Items/Humans.c`  
**Line:** 250  
```c
Byte humanType = itemPtr->parm[0];
```

### Usage 37

**File:** `src/Items/Humans.c`  
**Line:** 1065  
```c
short	numHumans = itemPtr->parm[0];
```

### Usage 38

**File:** `src/Items/Humans.c`  
**Line:** 1170  
```c
itemPtr->parm[0] = HUMAN_TYPE_SCIENTIST;
```

### Usage 39

**File:** `src/Items/Humans.c`  
**Line:** 1176  
```c
itemPtr->parm[0] = HUMAN_TYPE_SCIENTIST;
```

### Usage 40

**File:** `src/Items/Powerups.c`  
**Line:** 133  
```c
newObj = MakeAtom(x,ty + yoff,z, itemPtr->parm[0]);
```

### Usage 41

**File:** `src/Items/Powerups.c`  
**Line:** 626  
```c
newObj->POWType = itemPtr->parm[0];					// set powerup type
```

### Usage 42

**File:** `src/Items/Powerups.c`  
**Line:** 1672  
```c
balloon->POWType = itemPtr->parm[0];					// set powerup type
```

### Usage 43

**File:** `src/Items/Traps.c`  
**Line:** 124  
```c
gNewObjectDefinition.rot 	= (float)itemPtr->parm[0] * (PI2/8.0f);			// use given rot
```

### Usage 44

**File:** `src/Items/Traps.c`  
**Line:** 425  
```c
float	r = (float)itemPtr->parm[0] * (PI2/4.0f);
```

### Usage 45

**File:** `src/Items/Traps.c`  
**Line:** 880  
```c
newObj->MagnetMonsterID = itemPtr->parm[0];					// remember ID#
```

### Usage 46

**File:** `src/Items/Traps.c`  
**Line:** 1203  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/4.0f);
```

### Usage 47

**File:** `src/Items/Items.c`  
**Line:** 145  
```c
gNewObjectDefinition.rot 		= itemPtr->parm[0] * (PI/2);
```

### Usage 48

**File:** `src/Items/Items.c`  
**Line:** 207  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * PI;
```

### Usage 49

**File:** `src/Items/Items.c`  
**Line:** 235  
```c
int		type = itemPtr->parm[0];			// get sprout type
```

### Usage 50

**File:** `src/Items/Items.c`  
**Line:** 394  
```c
int		type = itemPtr->parm[0];
```

### Usage 51

**File:** `src/Items/Items.c`  
**Line:** 545  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 52

**File:** `src/Items/Items.c`  
**Line:** 566  
```c
int		type = itemPtr->parm[0];			// get sprout type
```

### Usage 53

**File:** `src/Items/Items.c`  
**Line:** 596  
```c
int		type = itemPtr->parm[0];			// get sprout type
```

### Usage 54

**File:** `src/Items/Items.c`  
**Line:** 629  
```c
int		type = itemPtr->parm[0];			// get post type
```

### Usage 55

**File:** `src/Items/Items.c`  
**Line:** 708  
```c
gNewObjectDefinition.rot 		= r = (float)itemPtr->parm[0] * (PI/2);
```

### Usage 56

**File:** `src/Items/Items.c`  
**Line:** 766  
```c
int		type = itemPtr->parm[0];
```

### Usage 57

**File:** `src/Items/Items.c`  
**Line:** 1139  
```c
int		type = itemPtr->parm[0];
```

### Usage 58

**File:** `src/Items/Items.c`  
**Line:** 1330  
```c
int		type = itemPtr->parm[0];
```

### Usage 59

**File:** `src/Items/Items.c`  
**Line:** 1344  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0f);
```

### Usage 60

**File:** `src/Items/Items.c`  
**Line:** 1386  
```c
switch(itemPtr->parm[0])
```

### Usage 61

**File:** `src/Items/Items.c`  
**Line:** 1581  
```c
int				type = itemPtr->parm[0];
```

### Usage 62

**File:** `src/Items/Items.c`  
**Line:** 1671  
```c
int		type = itemPtr->parm[0];
```

### Usage 63

**File:** `src/Items/Items.c`  
**Line:** 1707  
```c
short	type = itemPtr->parm[0];
```

### Usage 64

**File:** `src/Items/Items.c`  
**Line:** 1777  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI/2);
```

### Usage 65

**File:** `src/Items/Items.c`  
**Line:** 1818  
```c
int		type = itemPtr->parm[0];
```

### Usage 66

**File:** `src/Items/Items.c`  
**Line:** 1832  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4.0f);
```

### Usage 67

**File:** `src/Items/Items.c`  
**Line:** 1858  
```c
int		type = itemPtr->parm[0];
```

### Usage 68

**File:** `src/Items/Items.c`  
**Line:** 1872  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/4.0f);
```

### Usage 69

**File:** `src/Items/Items.c`  
**Line:** 1889  
```c
if (itemPtr->parm[0] & 1)
```

### Usage 70

**File:** `src/Items/Items.c`  
**Line:** 1904  
```c
int		type = itemPtr->parm[0];
```

### Usage 71

**File:** `src/Items/Items.c`  
**Line:** 1940  
```c
int		type = itemPtr->parm[0];
```

### Usage 72

**File:** `src/Items/Items.c`  
**Line:** 2092  
```c
int		type = itemPtr->parm[0];
```

### Usage 73

**File:** `src/Items/Triggers.c`  
**Line:** 201  
```c
if (itemPtr->parm[0] == 1)
```

### Usage 74

**File:** `src/Items/Triggers.c`  
**Line:** 439  
```c
if (itemPtr->parm[0] == 1)
```

### Usage 75

**File:** `src/Items/Triggers.c`  
**Line:** 705  
```c
base->CheckpointNum = itemPtr->parm[0];						// remember checkpoint # 0..n
```

### Usage 76

**File:** `src/Items/Triggers.c`  
**Line:** 1077  
```c
short	type = itemPtr->parm[0];
```

### Usage 77

**File:** `src/Items/Triggers.c`  
**Line:** 1321  
```c
int		type = itemPtr->parm[0];
```

### Usage 78

**File:** `src/Items/BumperCar.c`  
**Line:** 127  
```c
id = itemPtr[i].parm[0];								// get generator ID
```

### Usage 79

**File:** `src/Items/BumperCar.c`  
**Line:** 167  
```c
id = itemPtr->parm[0];											// get car ID #
```

### Usage 80

**File:** `src/Items/BumperCar.c`  
**Line:** 825  
```c
short	numTires = itemPtr->parm[0];
```

### Usage 81

**File:** `src/Items/BumperCar.c`  
**Line:** 920  
```c
short	id = itemPtr->parm[0];
```

### Usage 82

**File:** `src/Items/ZipLine.c`  
**Line:** 105  
```c
id = itemPtr[i].parm[0];								// get zip ID
```

### Usage 83

**File:** `src/Items/ZipLine.c`  
**Line:** 214  
```c
newObj->ZipID = itemPtr->parm[0];						// get id#
```

### Usage 84

**File:** `src/Items/RocketSled.c`  
**Line:** 67  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8);
```

### Usage 85

**File:** `src/Items/HumanCannonball.c`  
**Line:** 55  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2 / 4.0f);
```

### Usage 86

**File:** `src/Player/Player.c`  
**Line:** 529  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[0] * (PI2/8.0f);
```

## Parameter 1

Found 31 usage(s):

### Usage 1

**File:** `src/Effects/Sparkle.c`  
**Line:** 464  
```c
numSparkles = itemPtr->parm[1];
```

### Usage 2

**File:** `src/Screens/WarpCheat.c`  
**Line:** 64  
```c
SDL_snprintf(name, sizeof(name), "Teleporter %d > %d", item->parm[0], item->parm[1]);
```

### Usage 3

**File:** `src/Screens/WarpCheat.c`  
**Line:** 80  
```c
if (item->parm[1] != 0)		// only show posts at start of zipline
```

### Usage 4

**File:** `src/Screens/WarpCheat.c`  
**Line:** 98  
```c
item->parm[1],
```

### Usage 5

**File:** `src/System/File.c`  
**Line:** 1148  
```c
item->parm[1],
```

### Usage 6

**File:** `src/Items/Triggers2.c`  
**Line:** 364  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/8.0f);
```

### Usage 7

**File:** `src/Items/Triggers2.c`  
**Line:** 430  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2 / 4.0f);
```

### Usage 8

**File:** `src/Items/Triggers2.c`  
**Line:** 445  
```c
switch(itemPtr->parm[1])
```

### Usage 9

**File:** `src/Items/Triggers2.c`  
**Line:** 594  
```c
if (itemPtr->parm[1] == 1)
```

### Usage 10

**File:** `src/Items/Teleporter.c`  
**Line:** 97  
```c
int destinationID = itemPtr->parm[1];
```

### Usage 11

**File:** `src/Items/items2.c`  
**Line:** 89  
```c
newObj->ZigOrZag = itemPtr->parm[1];
```

### Usage 12

**File:** `src/Items/items2.c`  
**Line:** 271  
```c
float	rot = (float)itemPtr->parm[1] * (PI2/16);
```

### Usage 13

**File:** `src/Items/Humans.c`  
**Line:** 1064  
```c
short	humanType = itemPtr->parm[1];
```

### Usage 14

**File:** `src/Items/Powerups.c`  
**Line:** 628  
```c
newObj->AtomQuantity = itemPtr->parm[1];			// set # atoms (if atom type)
```

### Usage 15

**File:** `src/Items/Powerups.c`  
**Line:** 1674  
```c
balloon->AtomQuantity = itemPtr->parm[1];			// set # atoms (if atom type)
```

### Usage 16

**File:** `src/Items/Traps.c`  
**Line:** 117  
```c
gNewObjectDefinition.type 		= SLIME_ObjType_FallingCrystal_Blue + itemPtr->parm[1];
```

### Usage 17

**File:** `src/Items/Items.c`  
**Line:** 606  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI/2);
```

### Usage 18

**File:** `src/Items/Items.c`  
**Line:** 782  
```c
gNewObjectDefinition.rot 		= r = (float)itemPtr->parm[1] * (PI2/8);
```

### Usage 19

**File:** `src/Items/Items.c`  
**Line:** 1682  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * PI/2;
```

### Usage 20

**File:** `src/Items/Items.c`  
**Line:** 1919  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4.0f);
```

### Usage 21

**File:** `src/Items/Items.c`  
**Line:** 1954  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4.0f);
```

### Usage 22

**File:** `src/Items/Items.c`  
**Line:** 2109  
```c
gNewObjectDefinition.rot 		= (float)itemPtr->parm[1] * (PI2/4.0f);
```

### Usage 23

**File:** `src/Items/Triggers.c`  
**Line:** 696  
```c
base->ReincarnationAim = (float)itemPtr->parm[1] * (PI2/8.0f);
```

### Usage 24

**File:** `src/Items/Triggers.c`  
**Line:** 1389  
```c
newObj->SpinOffset = (float)itemPtr->parm[1] * (PI2 / 8.0f);
```

### Usage 25

**File:** `src/Items/BumperCar.c`  
**Line:** 131  
```c
area = itemPtr[i].parm[1];								// get area #
```

### Usage 26

**File:** `src/Items/BumperCar.c`  
**Line:** 178  
```c
area = itemPtr->parm[1];										// get area #
```

### Usage 27

**File:** `src/Items/BumperCar.c`  
**Line:** 826  
```c
float	aim = (float)itemPtr->parm[1] * (PI2/4.0f);
```

### Usage 28

**File:** `src/Items/BumperCar.c`  
**Line:** 864  
```c
switch(itemPtr->parm[1])
```

### Usage 29

**File:** `src/Items/BumperCar.c`  
**Line:** 919  
```c
short	area = itemPtr->parm[1];
```

### Usage 30

**File:** `src/Items/BumperCar.c`  
**Line:** 1210  
```c
short	area = itemPtr->parm[1];
```

### Usage 31

**File:** `src/Items/ZipLine.c`  
**Line:** 113  
```c
if (itemPtr[i].parm[1] == 0)							// see if start or end pt
```

## Parameter 2

Found 13 usage(s):

### Usage 1

**File:** `src/Effects/Sparkle.c`  
**Line:** 461  
```c
t = itemPtr->parm[2];									// get texture #
```

### Usage 2

**File:** `src/Screens/WarpCheat.c`  
**Line:** 99  
```c
item->parm[2],
```

### Usage 3

**File:** `src/System/File.c`  
**Line:** 1149  
```c
item->parm[2],
```

### Usage 4

**File:** `src/Items/Teleporter.c`  
**Line:** 79  
```c
rot = gTeleporterRot[id] = itemPtr[i].parm[2] * (PI2/8.0f) + PI;			// get rot
```

### Usage 5

**File:** `src/Items/Teleporter.c`  
**Line:** 99  
```c
float rotation = itemPtr->parm[2] * (PI2/8.0f);
```

### Usage 6

**File:** `src/Items/Powerups.c`  
**Line:** 632  
```c
newObj->PowerupParm2 = itemPtr->parm[2];			// keep parm2 for special uses
```

### Usage 7

**File:** `src/Items/Powerups.c`  
**Line:** 1045  
```c
newObj->MagnetMonsterID = pod->PowerupParm2;			// get monster ID from pod parm[2]
```

### Usage 8

**File:** `src/Items/Powerups.c`  
**Line:** 1678  
```c
balloon->PowerupParm2 = itemPtr->parm[2];			// keep parm2 for special uses
```

### Usage 9

**File:** `src/Items/Items.c`  
**Line:** 885  
```c
slime->OozeColor = itemPtr->parm[2];	// save ooze color
```

### Usage 10

**File:** `src/Items/Items.c`  
**Line:** 896  
```c
slime2->OozeColor = itemPtr->parm[2];	// save ooze color
```

### Usage 11

**File:** `src/Items/Items.c`  
**Line:** 945  
```c
slime->OozeColor = itemPtr->parm[2];	// save ooze color
```

### Usage 12

**File:** `src/Items/Triggers.c`  
**Line:** 1351  
```c
gNewObjectDefinition.coord.y 	= y = GetTerrainY_Undeformed(x,z) + 550.0f + ((float)itemPtr->parm[2] * 10.0f);
```

### Usage 13

**File:** `src/Headers/terrain.h`  
**Line:** 108  
```c
Byte			parm[2];
```

## Parameter 3

Found 50 usage(s):

### Usage 1

**File:** `src/Effects/Sparkle.c`  
**Line:** 444  
```c
uint8_t	flicker = itemPtr->parm[3] & 1;						// see if flicker
```

### Usage 2

**File:** `src/Enemies/Jungle/Enemy_Mantis.c`  
**Line:** 96  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 3

**File:** `src/Enemies/Jungle/Enemy_Mantis.c`  
**Line:** 110  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 4

**File:** `src/Enemies/Jungle/Enemy_Flytrap.c`  
**Line:** 78  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 5

**File:** `src/Enemies/Jungle/Enemy_GiantLizard.c`  
**Line:** 120  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 6

**File:** `src/Enemies/Jungle/Enemy_GiantLizard.c`  
**Line:** 135  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 7

**File:** `src/Enemies/Enemy_BrainAlien.c`  
**Line:** 108  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 8

**File:** `src/Enemies/Farm/Enemy_Onion.c`  
**Line:** 100  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 9

**File:** `src/Enemies/Farm/Enemy_Onion.c`  
**Line:** 108  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 10

**File:** `src/Enemies/Farm/Enemy_Tomato.c`  
**Line:** 100  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 11

**File:** `src/Enemies/Farm/Enemy_Tomato.c`  
**Line:** 109  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 12

**File:** `src/Enemies/Farm/Enemy_Corn.c`  
**Line:** 98  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 13

**File:** `src/Enemies/Farm/Enemy_Corn.c`  
**Line:** 107  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 14

**File:** `src/Enemies/Cloud/Enemy_StrongMan.c`  
**Line:** 110  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 15

**File:** `src/Enemies/Cloud/Enemy_StrongMan.c`  
**Line:** 118  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 16

**File:** `src/Enemies/Cloud/Enemy_Clown.c`  
**Line:** 118  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 17

**File:** `src/Enemies/Cloud/Enemy_Clown.c`  
**Line:** 126  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 18

**File:** `src/Enemies/FireIce/Enemy_IceCube.c`  
**Line:** 124  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 19

**File:** `src/Enemies/FireIce/Enemy_IceCube.c`  
**Line:** 132  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 20

**File:** `src/Enemies/FireIce/Enemy_SwingerBot.c`  
**Line:** 85  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 21

**File:** `src/Enemies/FireIce/Enemy_SwingerBot.c`  
**Line:** 95  
```c
body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 22

**File:** `src/Enemies/FireIce/Enemy_Flamester.c`  
**Line:** 90  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 23

**File:** `src/Enemies/FireIce/Enemy_Flamester.c`  
**Line:** 99  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 24

**File:** `src/Enemies/FireIce/Enemy_DrillBot.c`  
**Line:** 90  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 25

**File:** `src/Enemies/FireIce/Enemy_DrillBot.c`  
**Line:** 99  
```c
body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 26

**File:** `src/Enemies/FireIce/Enemy_Squooshy.c`  
**Line:** 95  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 27

**File:** `src/Enemies/FireIce/Enemy_Squooshy.c`  
**Line:** 104  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 28

**File:** `src/Enemies/FireIce/Enemy_HammerBot.c`  
**Line:** 81  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 29

**File:** `src/Enemies/FireIce/Enemy_HammerBot.c`  
**Line:** 90  
```c
body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 30

**File:** `src/Enemies/FireIce/Enemy_JawsBot.c`  
**Line:** 77  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 31

**File:** `src/Enemies/FireIce/Enemy_JawsBot.c`  
**Line:** 87  
```c
body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 32

**File:** `src/Enemies/Apocalypse/Enemy_Mutant.c`  
**Line:** 104  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 33

**File:** `src/Enemies/Apocalypse/Enemy_Mutant.c`  
**Line:** 112  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 34

**File:** `src/Enemies/Apocalypse/Enemy_MutantRobot.c`  
**Line:** 112  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 35

**File:** `src/Enemies/Apocalypse/Enemy_MutantRobot.c`  
**Line:** 126  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 36

**File:** `src/Enemies/Slime/Enemy_Blob.c`  
**Line:** 83  
```c
if (!(itemPtr->parm[3] & 1))								// see if always add
```

### Usage 37

**File:** `src/Enemies/Slime/Enemy_Blob.c`  
**Line:** 92  
```c
newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);
```

### Usage 38

**File:** `src/Screens/WarpCheat.c`  
**Line:** 100  
```c
item->parm[3],
```

### Usage 39

**File:** `src/System/File.c`  
**Line:** 1150  
```c
item->parm[3],
```

### Usage 40

**File:** `src/Items/Humans.c`  
**Line:** 234  
```c
if (itemPtr->parm[3] & 1)
```

### Usage 41

**File:** `src/Items/Powerups.c`  
**Line:** 128  
```c
if (itemPtr->parm[3] & (1<<1))							// see if put on terrain only
```

### Usage 42

**File:** `src/Items/Powerups.c`  
**Line:** 136  
```c
newObj->POWRegenerate = itemPtr->parm[3] & 1;			// see if auto-regen
```

### Usage 43

**File:** `src/Items/Powerups.c`  
**Line:** 593  
```c
if (itemPtr->parm[3] & (1<<1))							// see if put on terrain only
```

### Usage 44

**File:** `src/Items/Powerups.c`  
**Line:** 601  
```c
if (itemPtr->parm[3] & (1<<2))
```

### Usage 45

**File:** `src/Items/Powerups.c`  
**Line:** 634  
```c
newObj->POWRegenerate = itemPtr->parm[3] & 1;		// remember if let this POW regenerate
```

### Usage 46

**File:** `src/Items/Powerups.c`  
**Line:** 1680  
```c
balloon->POWRegenerate = itemPtr->parm[3] & 1;		// remember if let this POW regenerate
```

### Usage 47

**File:** `src/Items/Traps.c`  
**Line:** 130  
```c
newObj->Flag[0] = itemPtr->parm[3] & 1;						// remember if aim at player when grow
```

### Usage 48

**File:** `src/Items/Traps.c`  
**Line:** 1213  
```c
bottom->OneWay = (itemPtr->parm[3] & 1);					// see if its a 1-way door
```

### Usage 49

**File:** `src/Items/Triggers.c`  
**Line:** 1378  
```c
if (itemPtr->parm[3] & 1)							// see if CW or CCW
```

### Usage 50

**File:** `src/Items/BumperCar.c`  
**Line:** 165  
```c
int		playerCar = itemPtr->parm[3] & 1;
```

## Parameter 4

Found 2 usage(s):

### Usage 1

**File:** `src/Headers/structs.h`  
**Line:** 50  
```c
Byte			parm[4];
```

### Usage 2

**File:** `src/Headers/structs.h`  
**Line:** 233  
```c
Byte							parm[4];
```

