# Nanosaur 2 spline item param/model mapping

Legend: `pN=parm[N]`, `UF1=ITEM_FLAGS_USER1`.

## Coverage

- Authoritative routing: `games/nanosaur2/Source/Terrain/SplineItems.c:42-97,107-149`
- Spline item ID span: `0..49` (`MAX_SPLINE_ITEM_NUM=49`)
- Coverage proof: the table below covers all 50 spline item IDs from the authoritative prime table.

## Spline items

| ID | Name | Prime routine / behavior entrypoint | Model behavior | Params / flags semantics | Citations |
|---:|---|---|---|---|---|
| 0 | My Start Coords | `NilPrime` | No spline object | No source-side spline behavior | `games/nanosaur2/Source/Terrain/SplineItems.c:46,165-169` |
| 1 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:47,165-169` |
| 2 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:48,165-169` |
| 3 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:49,165-169` |
| 4 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:50,165-169` |
| 5 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:51,165-169` |
| 6 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:52,165-169` |
| 7 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:53,165-169` |
| 8 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:54,165-169` |
| 9 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:55,165-169` |
| 10 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:56,165-169` |
| 11 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:57,165-169` |
| 12 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:58,165-169` |
| 13 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:59,165-169` |
| 14 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:60,165-169` |
| 15 | Raptor enemy | `PrimeEnemy_Raptor -> MoveRaptorOnSpline` | Skeleton `SKELETON_TYPE_RAPTOR`; uses same `MakeRaptor` setup as terrain raptor | Uses `placement`; no spline param use in prime routine; still creates harmless raptors in kiddie mode because `MakeRaptor` zeroes damage there | `games/nanosaur2/Source/Terrain/SplineItems.c:61`; `games/nanosaur2/Source/Enemies/Enemy_Raptor.c:144-158,600-655` |
| 16 | Dust devil | `PrimeDustDevil -> MoveDustDevilOnSpline` | Hidden particle driver, same `MakeDustDevil` object as terrain item | Uses `placement`; no spline param use in prime routine | `games/nanosaur2/Source/Terrain/SplineItems.c:62`; `games/nanosaur2/Source/Items/DustDevil.c:340-375,602-660` |
| 17 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:63,165-169` |
| 18 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:64,165-169` |
| 19 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:65,165-169` |
| 20 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:66,165-169` |
| 21 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:67,165-169` |
| 22 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:68,165-169` |
| 23 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:69,165-169` |
| 24 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:70,165-169` |
| 25 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:71,165-169` |
| 26 | Brach enemy | `PrimeEnemy_Brach -> MoveBrachOnSpline` | Skeleton `SKELETON_TYPE_BRACH`; uses walking anim and sets `AnimSpeed=.5` | Uses `placement`; no spline param use in prime routine | `games/nanosaur2/Source/Terrain/SplineItems.c:72`; `games/nanosaur2/Source/Enemies/Enemy_Brach.c:112-149,379-414` |
| 27 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:73,165-169` |
| 28 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:74,165-169` |
| 29 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:75,165-169` |
| 30 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:76,165-169` |
| 31 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:77,165-169` |
| 32 | Laser orb | `PrimeLaserOrb -> MoveLaserOrbOnSpline` | Same orb/green-shell/beam setup as terrain laser orb | Uses `placement`; prime routine keeps orb always active and does **not** detach it from the main list | `games/nanosaur2/Source/Terrain/SplineItems.c:78`; `games/nanosaur2/Source/Items/LaserOrbs.c:80-159,750-810` |
| 33 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:79,165-169` |
| 34 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:80,165-169` |
| 35 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:81,165-169` |
| 36 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:82,165-169` |
| 37 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:83,165-169` |
| 38 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:84,165-169` |
| 39 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:85,165-169` |
| 40 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:86,165-169` |
| 41 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:87,165-169` |
| 42 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:88,165-169` |
| 43 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:89,165-169` |
| 44 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:90,165-169` |
| 45 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:91,165-169` |
| 46 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:92,165-169` |
| 47 | Unknown / unused | `NilPrime` | None | No source-side name or param use | `games/nanosaur2/Source/Terrain/SplineItems.c:93,165-169` |
| 48 | Ramphor enemy | `PrimeEnemy_Ramphor -> MoveRamphorOnSpline` | Skeleton `SKELETON_TYPE_RAMPHOR`; flying enemy | `placement` used; `p0` = flight-height tier; `p1` = spline speed tier (`SplineSpeed = 180 + p1*30`) | `games/nanosaur2/Source/Terrain/SplineItems.c:94`; `games/nanosaur2/Source/Enemies/Enemy_Ramphor.c:81-118,123-170` |
| 49 | Time demo spline | `PrimeTimeDemoSpline -> MoveTimeDemoOnSpline` | Dummy `CUSTOM_GENRE` spline tracker only; no visible model | Only active when `gTimeDemo` is true; otherwise returns false | `games/nanosaur2/Source/Terrain/SplineItems.c:95`; `games/nanosaur2/Source/System/Main.c:852-896` |

## Notes

1. Spline item struct fields are `placement`, `type`, `parm[4]`, and `flags`. Source: `games/nanosaur2/Source/Headers/structs.h:47-53`.
2. Spline IDs `1-14, 17-25, 27-31, 33-47` have no source-side names or behavior beyond `NilPrime`; they are documented here as unknown/unused because the authoritative table still reserves those slots. Source: `games/nanosaur2/Source/Terrain/SplineItems.c:47-60,63-77,79-93,165-169`.
