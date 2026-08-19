# Billy Frontier spline item param/model mapping

## Coverage

- Spline item record: `games/billyfrontier/Source/Headers/structs.h:41-67`
- Authoritative routing: `games/billyfrontier/Source/Terrain/SplineItems.c:43-80`
- Spline ID span: `0..34`
- Coverage proof: the table below addresses all 35 spline item IDs from the authoritative spline dispatch table, including `NilPrime` placeholder ranges.

## Spline items

| ID | Item | Prime routine / behavior entrypoint | Model behavior | p0-p3 / flags | Citations |
|---|---|---|---|---|---|
| 0 | My Start Coords | `NilPrime`; actual handling is `FindPlayerStartCoordItems` spline scan | No spline object; sets start position from `placement`, then faces toward next point (using `GetCoordOnSpline2`) | placement used; p0-p3 unused; flags not set because `NilPrime` returns false | `games/billyfrontier/Source/Terrain/SplineItems.c:45,141-152`; `games/billyfrontier/Source/Terrain/Terrain2.c:217-244` |
| 1-19 | Blank / terrain-only spline placeholders | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/billyfrontier/Source/Terrain/SplineItems.c:46-64,141-152` |
| 20 | Stampede Kanga Cow | `PrimeStampedeKangaCow` -> `MoveStampedeKangaOnSpline` | Skeleton `SKELETON_TYPE_KANGACOW`, stampede anim, scale 2.1, enemy collider, shadow | placement used; p0-p3 unused; moves at 490 along spline, can trigger finish if it crosses line first; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:65,125-135`; `games/billyfrontier/Source/System/Areas/Stampede.c:813-957` |
| 21 | Boost placeholder | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/billyfrontier/Source/Terrain/SplineItems.c:66,141-152` |
| 22 | Stampede Camera | `PrimeStampedeCamera` -> `MoveStampedeCameraOnSpline` | Event object only; no render model; camera-from tracks spline position and looks 600 units along spline | placement used; p0-p3 unused; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:67,125-135`; `games/billyfrontier/Source/3D/Camera.c:807-877` |
| 23 | Walker | `PrimeWalker` -> `MoveWalkerOnSpline` | Walker skeleton plus left/right pod display-group attachments; shadow | placement used; p1 = stop point; p0/p2/p3 unused; active only when stop point matches, walks ±200 on spline, occasionally turns or shoots if LOS clear; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:68,125-135`; `games/billyfrontier/Source/Enemy/Enemy_Walker.c:75-280` |
| 24-26 | Blank placeholders | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/billyfrontier/Source/Terrain/SplineItems.c:69-71,141-152` |
| 27 | Tumbleweed | `PrimeTumbleweed` -> `MoveTumbleweedOnSpline` | `MODEL_GROUP_GLOBAL`, `GLOBAL_ObjType_Tumbleweed`, scale .6, terrain-following rolling spline prop | placement used; p0-p3 unused; moves at 110 along spline; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:72,125-135`; `games/billyfrontier/Source/Items/Items.c:1323-1399` |
| 28-30 | Blank placeholders | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/billyfrontier/Source/Terrain/SplineItems.c:73-75,141-152` |
| 31 | Tremor Alien | `PrimeTremorAlien` -> `MoveTremorAlienOnSpline` | Skeletal TremorAlien via `MakeTremorAlien`; tomahawk attached; shadow | placement used; p0 = stop point; p1-p3 unused; only shows/acts at matching stop point in battle, moves at 150 and throws at spline end; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:76,125-135`; `games/billyfrontier/Source/Enemy/Enemy_TremorAlien.c:425-560` |
| 32-33 | Blank placeholders | `NilPrime` | No spline object | placement/p0-p3 unused; flags not set | `games/billyfrontier/Source/Terrain/SplineItems.c:77-78,141-152` |
| 34 | Stampede KangaRex | `PrimeStampedeKangaRex` -> `MoveStampedeKangaRexOnSpline` | Skeleton `SKELETON_TYPE_KANGAREX`, stampede anim, scale 2.1, enemy collider, shadow | placement used; p0-p3 unused; moves at 450 along spline, can finish race before player; flags std | `games/billyfrontier/Source/Terrain/SplineItems.c:79,125-135`; `games/billyfrontier/Source/System/Areas/Stampede.c:1018-1143` |

## Notes

1. Billy spline items rely on normalized `placement` rather than terrain X/Z.
2. The spline start-coordinate facing logic uses `GetCoordOnSpline2(&(*gSplineList)[0], ...)` instead of the matched spline variable, so multi-spline intent is unclear. Source: `games/billyfrontier/Source/Terrain/Terrain2.c:229-243`.
