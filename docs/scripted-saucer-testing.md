# Scripted arrivals and saucer deployments

Enable **Settings → Sample scripting levels**. Otto Matic offers two editable
Earth Farm variants:

- **Brain Alien spawner**: a port with health, weapon collision and a configurable
  arrival duration. Aliens fade in and walk outward under script control, then
  resume native AI. Removing the port cleans up its owned aliens.
- **Scripted saucer deployments**: a level script flies custom display objects
  over a candidate landing point, shows a beam and lowers a fading native alien
  to the ground. Native human-abduction saucers keep their normal behavior.

The transport encounter is in
`Data/Scripts/src/levels/earth-farm-transports.lua`. Its settings table controls
the native actor, living limit, cooldown, flight and arrival times, altitude and
search budget. Level events assign its callbacks only to level 0. The package
contains reusable `helpers/landing-search.lua` and `helpers/actor-arrival.lua`.
There is no native encounter implementation or special Earth Farm engine rule.

Landing checks reject water, steep ground, blocked sight lines and a blocked
body-width route toward the player. They use the normal terrain, raycast and
box-sweep APIs and reject failed/incomplete queries. The script retries later
when its bounded candidate search finds no safe point, and checks again after
the approach. This conservative straight-route check is not pathfinding.

The reusable `pangea.object.setOpacity` / `setOpacityResult` API changes only
render opacity; collision and controller ownership remain explicit. All seven
3D adapters implement it; Mighty Mike reports unsupported. Arrival helpers use
exclusive control tokens and restore the previous opacity and controller state
after arrival or a movement failure. They distinguish blocked motion from a
completed arrival and align the actor using its actual collision geometry.
Transport resources are managed by a bounded resource group
and cleaned on level unload, restart and player respawn.

Existing saved objects retain their authored source and collision definitions.
Open a fresh sample or create a new starter to try these changes.

Verification includes actual Lua tests for landing rejection, resource ownership, bounded spawning,
arrival handoff, replenishment and cleanup; package round-trip checks; the shared
C runtime suite; Otto WASM engine tests for transports and weapon damage; and
Electron sample-opening tests. The local scripting-enabled Otto binary must be
rebuilt when changing the native opacity adapter.
