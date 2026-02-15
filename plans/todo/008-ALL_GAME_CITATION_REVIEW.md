# All-Game Item Parameter Citation Review

Session start: 2026-02-15T07:31:30Z  
Manual relevance review pass: 2026-02-15T08:51:58Z → in progress  
Repository: `LachlanBWWright/PangeaRSEdit`  
Source review basis: local game submodules in `games/*`

## Scope

- Reviewed citation extraction coverage for all game item-parameter definition files.
- Verified citations against source repositories/submodules using the existing verification pipeline.
- Corrected missing/invalid citation paths and repository mapping issues.

## Coverage Status (8 games)

- [x] Otto Matic (`ottomatic`)
- [x] Bugdom (`bugdom`)
- [x] Bugdom 2 (`bugdom2`)
- [x] Nanosaur (`nanosaur`)
- [x] Nanosaur 2 (`nanosaur2`)
- [x] Cro-Mag Rally (`cromag`)
- [x] Billy Frontier (`billyfrontier`)
- [x] Mighty Mike (`mightymike`) — currently no structured item parameter descriptions to extract

## Verification Summary

Run performed with citation verifier after path/repo fixes and manual relevance edits:

- Total citations extracted: **315**
- Verified: **190**
- Partial match (line drift / nearby code): **125**
- Code changed: **0**
- File not found: **0**
- Line not found: **0**

### Per-Game Verifier Breakdown (post-manual fixes)

| Game | Total | Verified | Partial | Code Changed | File Not Found |
|---|---:|---:|---:|---:|---:|
| Otto Matic | 93 | 68 | 25 | 0 | 0 |
| Bugdom | 44 | 15 | 29 | 0 | 0 |
| Bugdom 2 | 80 | 43 | 37 | 0 | 0 |
| Nanosaur | 15 | 5 | 10 | 0 | 0 |
| Nanosaur 2 | 32 | 28 | 4 | 0 | 0 |
| Cro-Mag Rally | 20 | 14 | 6 | 0 | 0 |
| Billy Frontier | 31 | 17 | 14 | 0 | 0 |
| Mighty Mike | 0 | 0 | 0 | 0 | 0 |

## Changes Applied During Review

1. Added missing-citation detection helpers to the extractor to enforce parameter coverage.
2. Included Mighty Mike in game enumeration for complete 8-game accounting.
3. Fixed Cro-Mag repository mapping (`CroMagRally`) for citation fetch/verification.
4. Added robust fallback path resolution for source file lookup in verifier fetch logic.
5. Performed manual source-reading pass for previously mismatched citations and corrected references/snippets where semantics were wrong:
   - Otto Matic:
     - WoodenGate + MetalGate rotation citations now match actual `if (parm[0] == 1)` branch logic in `Items/Triggers.c`.
     - Windmill citation corrected to `Items/Items.c` (`rot = parm[0] * PI/2`) instead of incorrect trap reference.
      - Outhouse rotation citation normalized to exact source expression.
      - TireBumperStrip p0/p1 citations corrected to current `numTires` and `aim` assignments in `Items/BumperCar.c`.
      - SlimePipe p0/p1 citations corrected to real `type` and rotation assignments.
      - Snowball p0 changed to reflect current behavior (type fixed in source; parm not used for variant selection).
   - Bugdom 2:
     - SnailShell p0 corrected to reflect randomized rotation (not parm-driven rotation).
   - Bugdom:
     - Liquid p2 citations corrected to match two-step `yOff` calculation/multiply flow (`*4` and `*10` paths).
   - Billy Frontier:
     - Dueler p0 corrected from “type” to dueler index (`duelerNum = parm[0]`).
6. Added/expanded tests for:
   - 8-game citation coverage
   - no missing parameter citations
   - path-qualified citation filenames

## Notes

- `code_changed = 0` and `file_not_found = 0` after manual relevance pass.
- Remaining `partial_match` results are line-drift/formatting deltas where snippets are present but not byte-identical at the exact line range.
- Citation completeness for structured item parameters is enforced by tests (`getAllMissingCitations()` expected empty).

## Manual Citation Corrections Applied This Pass

- Updated Otto Matic citations in:
  - `WoodenGate` (`Items/Triggers.c`, branch-based rotation assignment)
  - `MetalGate` (`Items/Triggers.c`, branch-based rotation assignment)
  - `Windmill` (`Items/Items.c`, corrected source file + rotation expression)
  - `OutHouse` (`Items/Items.c`, corrected exact expression)
  - `TireBumperStrip` p0/p1 (`Items/BumperCar.c`, corrected `numTires`/`aim` usage)
  - `SlimePipe` p0/p1 (`Items/Items.c`, corrected `type` + `rot` parameter usage)
  - `Snowball` p0 (changed semantics to “unused in current source”, fixed citation to fixed object type)
- Updated Bugdom 2 citation:
  - `SnailShell` p0 now reflects randomized rotation (`RandomFloat() * PI2`)
  - `Scarecrow` p0 line reference corrected to the actual `parm[0] == 0` branch line
  - `Door` p0 line reference corrected to the full `if (isOpen) ... else ...` rotation branch
  - `Brick` p0 line reference corrected to the active rotation assignment line
- Updated Bugdom citations:
  - Liquid p2 entries now match actual two-step `yOff` flow for `*4` and `*10` variants
- Updated Billy Frontier citation:
  - `Dueler` p0 from `duelerType` to actual `duelerNum = parm[0]` behavior
  - `MyStartCoords` p0 line reference corrected to actual start-rotation assignment line in `Terrain2.c`
- Updated Nanosaur 2 citation:
  - `DesertTree` p0 snippet corrected to current guard behavior (`DoFatalAlert` on illegal subtype)
  - `DesertTree` p0 line/snippet made more specific to avoid false partial matches
