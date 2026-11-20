# Script execution scope

New files created in **Lua source** are helper modules. Their code loads only
when another script requires them, and their exported callbacks are never
automatically registered with the game.

Use the source toolbar's **Game-wide callbacks** scope to explicitly register
an independent file's callbacks in every level. Use **Level events** instead
when callbacks belong to one level. Object behaviors run through their custom
object definitions. The source toolbar identifies assigned object and level
files and keeps their assignments as the authority for execution.

Requiring a helper evaluates its module once through Lua's normal require
cache; it does not register callbacks on the returned table. A caller can use
the helper's exported functions explicitly. Keep native mutations inside
callbacks: runtime module validation still rejects top-level native API calls.

Full script packages and shared libraries preserve helper/game scope metadata.
Older packages and existing workspaces without this metadata keep their prior
game-wide callback behavior for unassigned source files. Their next export
records that scope explicitly. Assigned object and level modules keep their
existing routing regardless of their legacy source metadata.
