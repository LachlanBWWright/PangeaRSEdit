# Billy Frontier Model Loading

## Model Files

Billy Frontier uses **BG3D format** files located in `/games/billyfrontier/models/`.

### Global Models (global.bg3d)
Common objects used across all levels:
- Pickups and powerups
- UI elements
- Shared environmental objects

### Level Model Files

| File | Level | Description |
|------|-------|-------------|
| town.bg3d | Town | Western town environment |
| swamp.bg3d | Swamp | Swamp/bayou environment |
| buildings.bg3d | Buildings | Building structures |
| targetpractice.bg3d | Target Practice | Shooting gallery objects |

## Skeleton Characters

Located in `/games/billyfrontier/skeletons/`:

| File | Character | Description |
|------|-----------|-------------|
| Billy.bg3d | Billy | Main character (cowboy) |
| Bandito.bg3d | Bandito | Outlaw enemy |
| FrogMan.bg3d | Frog Man | Swamp creature |
| KangaCow.bg3d | Kanga-Cow | Kangaroo-cow hybrid |
| KangaRex.bg3d | Kanga-Rex | Kangaroo-rex boss |
| Rygar.bg3d | Rygar | Enemy character |
| Shorty.bg3d | Shorty | Small outlaw |
| TremorAlien.bg3d | Tremor Alien | Alien from underground |
| TremorGhost.bg3d | Tremor Ghost | Ghost enemy |
| Walker.bg3d | Walker | Walking enemy |

Each skeleton file has a corresponding `.skeleton.rsrc` file containing animation data.

## Game Modes

Billy Frontier has different game modes, each with specific model requirements:

### Shootout Mode
- Town level buildings
- Bandito enemies
- Cover objects

### Stampede Mode
- Open terrain
- Kanga-Cow herds
- Obstacles

### Swamp Mode
- Swamp environment
- Frog Man enemies
- Water hazards

### Target Practice
- Shooting gallery setup
- Various targets
- Score displays

## Item Types

| ItemType | Name | Description |
|----------|------|-------------|
| 0 | StartCoords | Player start |
| 1 | Enemy_Bandito | Bandito spawn |
| 2 | Enemy_Shorty | Shorty spawn |
| 3 | KangaCow | Stampede animal |
| 4-10 | Pickups | Various pickups |
| 11+ | Level objects | Environmental items |

## Notes

- Billy Frontier is a more casual game than other Pangea titles
- Uses simpler level geometry
- Characters have cartoon-style animations
- Includes mini-games with different model sets
