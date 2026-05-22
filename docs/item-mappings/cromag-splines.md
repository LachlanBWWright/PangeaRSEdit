# Cro-Mag Rally spline item param/model mapping

## Coverage

- Spline item record: `games/cromagrally/Source/Headers/structs.h:43-49`
- Authoritative routing: `games/cromagrally/Source/Terrain/SplineItems.c:44-114`
- Spline ID span: `0..66`
- Coverage proof: the table below addresses all 67 spline item IDs from the authoritative spline dispatch table, including all terrain-only `NilPrime` placeholder ranges.

## Spline items

| ID | Item | Prime routine / behavior entrypoint | Model behavior | p0-p3 / flags | Citations |
|---|---|---|---|---|---|
| 0 | My Start Coords (spline) | `NilPrime` | No spline start handler found; CMR start search only scans terrain items | placement exists in struct but not used here; p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:46,174-184`; `games/cromagrally/Source/Terrain/Terrain2.c:214-262` |
| 1-17 | Terrain-only placeholders (`Cactus`..`CampFire`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:47-63,174-184` |
| 18 | Yeti | `PrimeYeti` -> `MoveYeti` | Skeleton `SKELETON_TYPE_YETI`, `YETI_YOFF`, scale `YETI_SCALE`, misc/avoid collider | placement used; p0-p3 unused; moves at 25 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:64,158-168`; `games/cromagrally/Source/Items/Traps.c:308-396` |
| 19-22 | Terrain-only placeholders (`Lava Generator`, `Pillar`, `Pylon`, `Boat`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:65-68,174-184` |
| 23 | Camel | `PrimeCamel` -> `MoveCamel` | Skeleton `SKELETON_TYPE_CAMEL`, scale `CAMEL_SCALE`, anim speed 1.6 | placement used; p0-p3 unused; moves at 32 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:69,158-168`; `games/cromagrally/Source/Items/Traps.c:499-589` |
| 24-34 | Terrain-only placeholders (`Statue`..`Aztec Head`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:70-80,174-184` |
| 35 | Beetle | `PrimeBeetle` -> `MoveBeetle` | Skeleton `SKELETON_TYPE_BEETLE`, `BEETLE_YOFF`, scale `BEETLE_SCALE` | placement used; p0-p3 unused; moves at 25 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:81,158-168`; `games/cromagrally/Source/Items/Traps.c:403-491` |
| 36-52 | Terrain-only placeholders (`Castle Tower`..`Clam`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:82-98,174-184` |
| 53 | Shark | `PrimeShark` -> `MoveShark` | Skeleton `SKELETON_TYPE_SHARK`, `SHARK_YOFF`, scale `SHARK_SCALE` | placement used; p0-p3 unused; moves at 200 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:99,158-168`; `games/cromagrally/Source/Items/Traps.c:1293-1380` |
| 54 | Troll | `PrimeTroll` -> `MoveTroll` | Skeleton `SKELETON_TYPE_TROLL`, scale `TROLL_SCALE`, anim speed 1.5 | placement used; p0-p3 unused; moves at 55 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:100,158-168`; `games/cromagrally/Source/Items/Traps.c:2230-2320` |
| 55-57 | Terrain-only placeholders (`Weapons Rack`, `Capsule`, `Sea Mine`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:101-103,174-184` |
| 58 | Pteradactyl | `PrimePteradactyl` -> `MovePteradactyl` / `PteradactylAttack` | Skeleton `SKELETON_TYPE_PTERADACTYL`, `PTERADACTYL_YOFF`, scale `PTERADACTYL_SCALE` | placement used; p0-p3 unused; moves at 200 along spline and, on >easy, drops rock bombs every 3s when players are within 3500; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:104,158-168`; `games/cromagrally/Source/Items/Traps.c:1644-1826` |
| 59-60 | Terrain-only placeholders (`Dragon`, `Tar Patch`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:105-106,174-184` |
| 61 | Mummy | `PrimeMummy` -> `MoveMummy` | Skeleton `SKELETON_TYPE_MUMMY`, scale `MUMMY_SCALE` | placement used; p0-p3 unused; moves at 25 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:107,158-168`; `games/cromagrally/Source/Items/Traps.c:1961-2049` |
| 62-63 | Terrain-only placeholders (`Totem Pole`, `Druid`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:108-109,174-184` |
| 64 | Polar Bear | `PrimePolarBear` -> `MovePolarBear` | Skeleton `SKELETON_TYPE_POLARBEAR`, scale `BEAR_SCALE`, anim speed 1.5 | placement used; p0-p3 unused; moves at 55 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:110,158-168`; `games/cromagrally/Source/Items/Items.c:1785-1876` |
| 65 | Terrain-only placeholder (`Flower`) | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/cromagrally/Source/Terrain/SplineItems.c:111,174-184` |
| 66 | Viking | `PrimeViking` -> `MoveViking` | Skeleton `SKELETON_TYPE_VIKING`, scale `VIKING_SCALE`, anim speed 1.5 | placement used; p0-p3 unused; moves at 50 along spline; flags std | `games/cromagrally/Source/Terrain/SplineItems.c:112,158-168`; `games/cromagrally/Source/Items/Items.c:1922-2007` |

## Notes

1. Cro-Mag’s spline system uses normalized `placement` with wrap-around behavior and direct point lookup.
2. The spline table contains multiple wildlife/hazard families that are `NilAdd` in the terrain table and only exist through spline priming.
