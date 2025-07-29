# Nanosaur - Parameter Usage

This document lists all parameter usage instances found in the game's source code.

## Parameter 0

Found 9 usage(s):

### Usage 1

**File:** `src/Terrain/Terrain2.c`  
**Line:** 178  
```c
gMyStartAim = gMasterItemList[i].parm[0];							// get aim 0..7
```

### Usage 2

**File:** `src/Enemies/Enemy.c`  
**Line:** 221  
```c
// INPUT:	itemPtr->parm[0] = skeleton type 0..n
```

### Usage 3

**File:** `src/Items/TimePortal.c`  
**Line:** 69  
```c
n = gMasterItemList[i].parm[0];										// parm0 = portal #
```

### Usage 4

**File:** `src/Items/Items.c`  
**Line:** 410  
```c
i =  itemPtr->parm[0];											// get tree type
```

### Usage 5

**File:** `src/Items/Triggers.c`  
**Line:** 242  
```c
n = itemPtr->parm[0];												// parm0 = powerup type
```

### Usage 6

**File:** `src/Items/Triggers.c`  
**Line:** 373  
```c
n = itemPtr->parm[0];												// parm0 = crystal type
```

### Usage 7

**File:** `src/Items/Pickups.c`  
**Line:** 54  
```c
if (itemPtr->parm[0] >= NUM_EGG_SPECIES)				// make sure egg type is legal
```

### Usage 8

**File:** `src/Items/Pickups.c`  
**Line:** 62  
```c
gNewObjectDefinition.type = LEVEL0_MObjType_Egg1 + itemPtr->parm[0];
```

### Usage 9

**File:** `src/Items/Pickups.c`  
**Line:** 88  
```c
newObj->Kind = itemPtr->parm[0];			// remember species of egg
```

## Parameter 1

Found 1 usage(s):

### Usage 1

**File:** `src/Items/Triggers.c`  
**Line:** 270  
```c
newObj->PowerUpQuan = itemPtr->parm[1];		// remember quantity
```

## Parameter 3

Found 16 usage(s):

### Usage 1

**File:** `src/Enemies/Enemy_TriCer.c`  
**Line:** 93  
```c
if (!(itemPtr->parm[3] & 1))				// see if always add
```

### Usage 2

**File:** `src/Enemies/Enemy_Rex.c`  
**Line:** 83  
```c
if (!(itemPtr->parm[3] & 1))				// see if always add
```

### Usage 3

**File:** `src/Enemies/Enemy_Spitter.c`  
**Line:** 78  
```c
if (!(itemPtr->parm[3] & 1))				// see if always add
```

### Usage 4

**File:** `src/Enemies/Enemy_Ptera.c`  
**Line:** 69  
```c
// parm[3]: b0 = always add
```

### Usage 5

**File:** `src/Enemies/Enemy_Ptera.c`  
**Line:** 80  
```c
if (!(itemPtr->parm[3] & 1))				// see if always add
```

### Usage 6

**File:** `src/Enemies/Enemy_Ptera.c`  
**Line:** 97  
```c
newObj->RockDropper = itemPtr->parm[3] & (1<<1);
```

### Usage 7

**File:** `src/Enemies/Enemy_Stego.c`  
**Line:** 70  
```c
if (!(itemPtr->parm[3] & 1))				// see if always add
```

### Usage 8

**File:** `src/Items/Items.c`  
**Line:** 98  
```c
if (itemPtr->parm[3] & 1)
```

### Usage 9

**File:** `src/Items/Items.c`  
**Line:** 115  
```c
if (itemPtr->parm[3] & (1<<2))									// see if to 1/2 size
```

### Usage 10

**File:** `src/Items/Items.c`  
**Line:** 128  
```c
newObj->ShootFireballs = itemPtr->parm[3] & (1<<1);				// see if shoot fireballs
```

### Usage 11

**File:** `src/Items/Items.c`  
**Line:** 129  
```c
newObj->LavaAutoY = itemPtr->parm[3] & 1;						// remember if auto-y
```

### Usage 12

**File:** `src/Items/Items.c`  
**Line:** 316  
```c
if (itemPtr->parm[3] & 1)
```

### Usage 13

**File:** `src/Items/Items.c`  
**Line:** 591  
```c
if (itemPtr->parm[3] & 1)
```

### Usage 14

**File:** `src/Items/Items.c`  
**Line:** 649  
```c
newObj->VentHasLimit = itemPtr->parm[3] & 1;		// get flag if has limit
```

### Usage 15

**File:** `src/Items/Triggers.c`  
**Line:** 495  
```c
newObj->StepStoneReincarnate = itemPtr->parm[3] & 1;	// see if reincarnate
```

### Usage 16

**File:** `src/Items/Pickups.c`  
**Line:** 94  
```c
if (itemPtr->parm[3] & 1)
```

## Parameter 4

Found 1 usage(s):

### Usage 1

**File:** `src/Headers/structs.h`  
**Line:** 191  
```c
Byte	parm[4];
```

