# Animation Event Types

This page documents the skeleton animation event types used by the Pangea-era games in this repo. The important point is that these events are runtime instructions, not timeline keyframes:

- Keyframes move joints.
- Animation events change playback, set object flags, trigger sounds, or pause playback.

The source runtime uses a 30 Hz tick scale for animation event times and pauses.

## Summary

| Type | Meaning | Implemented? |
| --- | --- | --- |
| `STOP` | Stop the animation. | Yes |
| `LOOP` | Loop back to the start or the last marker. | Yes |
| `ZIGZAG` | Reverse direction and play backward. | Yes |
| `GOTOMARKER` | Declared in the enum, but not handled in the runtimes checked here. | No, appears reserved/unimplemented |
| `SETMARKER` | Set the loopback marker used by `LOOP` and `ZIGZAG`. | Yes |
| `PLAYSOUND` | Trigger a game-specific sound effect. | Yes, but mapping differs by game |
| `SETFLAG` | Set `theNode->Flag[n] = true`. | Yes |
| `CLEARFLAG` | Set `theNode->Flag[n] = false`. | Yes |
| `PAUSE` | Pause the animation for a number of ticks. | Yes in later games only |

## What Each Type Does

### `STOP`

Stops the animation as soon as the event is reached.

Relevant runtime examples:

- `games/bugdom/src/Skeleton/SkeletonAnim.c:194-197`
- `games/nanosaur/src/Skeleton/SkeletonAnim.c:197-200`
- `games/bugdom2/Source/Skeleton/SkeletonAnim.c:235-238`
- `games/nanosaur2/Source/Skeleton/SkeletonAnim.c:235-238`
- `games/ottomatic/src/Skeleton/SkeletonAnim.c:240-243`
- `games/cromagrally/Source/Skeleton/SkeletonAnim.c:195-198`
- `games/billyfrontier/Source/Skeleton/SkeletonAnim.c:238-240`

### `LOOP`

Loops the animation.

Behavior:

- If a `SETMARKER` event has already set `LoopBackTime`, the animation jumps back to that marker time.
- Otherwise it loops to time `0`.
- If the loop would be zero-length, the runtime treats it like a stop.

This is handled in the runtime switch for every game checked.

### `ZIGZAG`

Reverses playback direction and makes the animation run backward. When the animation reaches the beginning, the runtime flips direction back to forward.

The exact rewind behavior is coupled with `LoopBackTime`, so `SETMARKER` matters here too.

### `GOTOMARKER`

This enum value exists in the headers for the game family, for example:

- `games/bugdom/src/Headers/skeletonanim.h:14-24`
- `games/nanosaur/src/Headers/skeletonanim.h:14-22`
- `games/bugdom2/Source/Headers/skeletonanim.h:18-29`
- `games/ottomatic/src/Headers/skeletonanim.h:14-23`
- `games/cromagrally/Source/Headers/skeletonanim.h:14-22`
- `games/billyfrontier/Source/Headers/skeletonanim.h:20-31`
- `games/nanosaur2/Source/Headers/skeleton.h:38-47`

However, in the runtime source checked for Bugdom, Nanosaur, Bugdom 2, Nanosaur 2, Otto Matic, Cro-Mag Rally, and Billy Frontier, I did not find a switch case that handles `ANIMEVENT_TYPE_GOTOMARKER`.

Practical conclusion:

- It should be treated as reserved or unimplemented in the current codebase.
- If the editor shows it, it should be labeled clearly as unsupported unless more runtime code is found elsewhere.

### `SETMARKER`

Sets `skeleton->LoopBackTime` to the current event time.

This is the marker that `LOOP` and `ZIGZAG` use as their rewind point.

Relevant code:

- `games/bugdom/src/Skeleton/SkeletonAnim.c:199-202`
- `games/nanosaur/src/Skeleton/SkeletonAnim.c:203-206`
- `games/bugdom2/Source/Skeleton/SkeletonAnim.c:241-244`
- `games/nanosaur2/Source/Skeleton/SkeletonAnim.c:241-244`
- `games/ottomatic/src/Skeleton/SkeletonAnim.c:245-248`
- `games/cromagrally/Source/Skeleton/SkeletonAnim.c:200-203`
- `games/billyfrontier/Source/Skeleton/SkeletonAnim.c:241-244`

In other words:

- `SETMARKER` does not jump by itself.
- It only records the rewind point.
- `LOOP` and `ZIGZAG` later consume that rewind point.

### `PLAYSOUND`

Triggers a sound effect, but the value-to-sound mapping is game-specific.

The event `value` is not a generic sound ID across all games. It is a per-game selector that the runtime maps to a concrete effect.

#### Bugdom

- `0` -> `EFFECT_KICK`
- `1` -> `EFFECT_WATERBUG`

Source:

- `games/bugdom/src/Skeleton/SkeletonAnim.c:248-266`

#### Nanosaur

- `0` -> `EFFECT_CRUNCH`
- `1` -> `EFFECT_FOOTSTEP`
- `2` -> `EFFECT_DILOATTACK`
- `3` -> `EFFECT_WINGFLAP`
- `4` -> `EFFECT_FOOTSTEP`

Source:

- `games/nanosaur/src/Skeleton/SkeletonAnim.c:254-303`

#### Cro-Mag Rally

- `0` is present in the switch, but the case body is empty, so no sound is played in the checked source.

Source:

- `games/cromagrally/Source/Skeleton/SkeletonAnim.c:251-262`

#### Bugdom 2

- `0` -> `EFFECT_GNOMESTEP`
- `1` -> `EFFECT_GNOMESTEP` at a lower pitch
- `2` -> `EFFECT_TICKSTEP`
- `3` -> `EFFECT_STOMP` plus rumble
- `4` -> `EFFECT_SERVO`
- `5` -> `EFFECT_SERVO` at a lower pitch
- `6` -> `EFFECT_ANTBITE`
- `7` -> `EFFECT_SNAPTRAP` plus rumble
- `8` -> `EFFECT_OTTOFALL`
- `9` -> `EFFECT_FOOTSTEP`

Source:

- `games/bugdom2/Source/Skeleton/SkeletonAnim.c:292-359`

#### Nanosaur 2

- `0` exists, but the actual sound call is commented out in the checked source, so this behaves like a no-op here.

Source:

- `games/nanosaur2/Source/Skeleton/SkeletonAnim.c:292-305`

#### Otto Matic

- `0` -> `EFFECT_ONIONSWOOSH`
- `3` and `4` -> player footstep sound
  - if the player is scaled up, the runtime plays `EFFECT_GIANTFOOTSTEP` and creates a deformation wave
  - otherwise it plays `EFFECT_LEFTFOOT + (eventValue - 3)`
- `5` -> `EFFECT_PITCHERPUKE`
- `6` -> `EFFECT_FLYTRAP`

Source:

- `games/ottomatic/src/Skeleton/SkeletonAnim.c:296-348`

#### Billy Frontier

- `0` -> `EFFECT_SPURS2`
- `1` -> `EFFECT_WALKERCRASH`
- `2` -> `EFFECT_WALKERFOOTSTEP`

Source:

- `games/billyfrontier/Source/Skeleton/SkeletonAnim.c:292-312`

Editor implications:

- The UI can show a resolved sound name when the loaded model carries a game hint.
- For first-gen `3DMF` models, the best the editor can do without a game hint is show the first-gen variants, because Bugdom 1 and Nanosaur 1 do not share the same sound mapping.
- For plain `GLB` imports, the editor should still show the raw numeric value, but the exact runtime effect name is only known if the file was imported from a game-specific model.
- A real preview button would need access to the actual game audio assets. The current frontend does not expose those assets, so a name-only preview or a timed marker preview is the practical option unless the editor adds audio extraction later.

### `SETFLAG`

Sets one boolean flag on the owning object:

```c
theNode->Flag[eventValue] = true;
```

This is a runtime object flag, not a skeleton-specific flag. The skeleton event system does not define the semantic meaning of each flag index; the owning object code decides what a given flag means.

The runtime validates that the flag index fits inside `MAX_FLAGS_IN_OBJNODE`.

Why this matters:

- Animation events can turn gameplay state on at exact frames.
- Other systems can inspect these flags later in the object update or rendering path.
- In some helper code, the engine uses the first `SETFLAG` event time as a reference point for sampling the skeleton at the moment the flag occurs.

Relevant helper examples:

- `games/nanosaur2/Source/Skeleton/SkeletonJoints.c:133-165`
- `games/bugdom2/Source/Skeleton/SkeletonJoints.c:133-165`
- `games/ottomatic/src/Skeleton/SkeletonJoints.c:118-154`

### `CLEARFLAG`

Clears one boolean flag on the owning object:

```c
theNode->Flag[eventValue] = false;
```

This is the inverse of `SETFLAG` and uses the same object-flag array.

## ObjNode Flags

`ObjNode` carries a small `Flag[]` array that gameplay code reuses for per-object state. The array is always present, but the meaning of each slot is local to the object type that uses it.

Important distinction:

- `Flag[]` is storage on the object.
- `MAX_FLAGS_IN_OBJNODE` is the animation-event cap for what `SETFLAG` and `CLEARFLAG` may touch.
- The array is larger than the animation cap in all checked branches.

Observed sizes and caps:

- `Flag[6]` storage in the checked branches
- `MAX_FLAGS_IN_OBJNODE = 4` in Bugdom and Nanosaur
- `MAX_FLAGS_IN_OBJNODE = 5` in Bugdom 2, Nanosaur 2, Otto Matic, Cro-Mag Rally, and Billy Frontier

That means:

- early-game animation events can only target `Flag[0]` through `Flag[3]`
- later-game animation events can target `Flag[0]` through `Flag[4]`
- code outside the animation system may still use `Flag[5]` directly

Common aliases found in the codebase include:

| Flag slot | Examples seen in code | Notes |
| --- | --- | --- |
| `Flag[0]` | `KickNow`, `ThrowNow`, `ShootNow`, `CheckForBlockers`, `TreeIsBurnt`, `BreatheFire` | Most common anim-driven state bit |
| `Flag[1]` | `HasSpear`, `IsJumping`, `ShootNow`, `GrippingPlayer`, `HasEgg` | Often used for a secondary state or branch |
| `Flag[2]` | `Dying`, `RockDropper`, `WallRot`, `EatPlayer` | Less common but still used in gameplay logic |
| `Flag[3]` | `Aggressive`, `EnemyRegenerate`, `ReverseSpline`, `InBush` | More often used in later titles |
| `Flag[4]` | `MadeGhost`, `EnemyIsDead` | Available in gameplay code, but not anim-toggleable in early games |
| `Flag[5]` | `TriggerType` in Nanosaur triggers | Gameplay-only slot in the checked sources |

The editor should not treat these as global semantic names. The same slot means different things in different object classes.

Useful runtime example:

- `SETFLAG` and `CLEARFLAG` only touch the slots the animation system is allowed to address.
- In Bugdom 1 and Nanosaur 1, that means `Flag[0]` through `Flag[3]`.
- In the later games, that expands to `Flag[0]` through `Flag[4]`.
- `Flag[5]` still exists in the object data, but it is not animation-addressable in the runtimes checked here.

That is why the editor should cap the flag selector instead of allowing any raw number.

### `PAUSE`

Only later games include this event type in the runtime switch.

Behavior:

- Sets `skeleton->PauseTimer = eventValue / 30.0f`
- Freezes time at the event moment until the timer runs down

This means the event value is in 30 Hz ticks, not seconds.

Relevant code:

- `games/bugdom2/Source/Skeleton/SkeletonAnim.c:367-370`
- `games/nanosaur2/Source/Skeleton/SkeletonAnim.c:310-313`
- `games/ottomatic/src/Skeleton/SkeletonAnim.c:355-358`
- `games/billyfrontier/Source/Skeleton/SkeletonAnim.c:316-319`

## Sound Names In The Editor

Yes, the UI can show human-readable names for `PLAYSOUND`.

The source of truth is the per-game sound header:

- `games/bugdom/src/Headers/sound2.h`
- `games/nanosaur/src/Headers/sound2.h`
- `games/bugdom2/Source/Headers/sound2.h`
- `games/nanosaur2/Source/Headers/sound2.h`
- `games/ottomatic/src/Headers/sound2.h`
- `games/cromagrally/Source/Headers/sound2.h`
- `games/billyfrontier/Source/Headers/sound2.h`

These headers already give the effect enum names the runtime uses, for example:

- `EFFECT_KICK`
- `EFFECT_WATERBUG`
- `EFFECT_CRUNCH`
- `EFFECT_FOOTSTEP`
- `EFFECT_GNOMESTEP`
- `EFFECT_SPURS2`

Recommended editor behavior:

- show the resolved effect enum name next to the raw event value
- show a friendly label by stripping the `EFFECT_` prefix
- show a tooltip with the actual runtime mapping for the current game
- gray out event values that do nothing in the selected game

This is feasible because the animation viewer already knows the active game context and already displays per-game event metadata.

## Sound Preview

It is also feasible to preview `PLAYSOUND` events in time with animation playback.

Practical approach:

- keep the current animation timeline as the source of truth
- when playback advances, detect event crossings and dispatch only newly crossed `PLAYSOUND` events
- reset the "already played" state when the user seeks or changes animations
- route playback through the same effect helpers the runtime uses, such as `PlayEffect`, `PlayEffect3D`, or `PlayEffect_Parms3D`, depending on the game

Things to watch:

- some sound events are 2D and some are positional/3D
- some events are no-op or partially stubbed in certain games
- preview playback should probably be opt-in so scrubbing the timeline does not spam audio

For editor UX, a simple `Preview` button beside the selected sound value would be enough to start with. A more advanced version could play events automatically during animation playback.

## Editor Guidance

This can be shown in the editor without changing the data model.

Suggested UI labels:

- `SETMARKER` -> `Set loop marker`
- `LOOP` -> `Loop to marker / start`
- `ZIGZAG` -> `Reverse playback`
- `GOTOMARKER` -> `Reserved / not implemented`
- `SETFLAG` -> `Set object flag #N`
- `CLEARFLAG` -> `Clear object flag #N`
- `PAUSE` -> `Pause for N ticks`

For `PLAYSOUND`, the editor can show:

- the selected sound name
- the internal effect name
- a game-specific tooltip
- a fallback note such as `unused in this game` when the selected value does nothing

That is enough to make the event list readable without altering the underlying serialization.

## Bottom Line

The event system is mostly simple:

- `SETMARKER` defines a loopback point.
- `LOOP` and `ZIGZAG` use that loopback point.
- `SETFLAG` / `CLEARFLAG` toggle object state.
- `PLAYSOUND` maps to game-specific effects.
- `PAUSE` exists in later titles and pauses for a tick count.
- `GOTOMARKER` is not currently implemented in the checked runtime source.
