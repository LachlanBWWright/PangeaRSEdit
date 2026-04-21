// NANOSAUR 2 WEB COMMANDS
// JavaScript <-> C interop for WebAssembly builds.
// Exposes cheat/debug commands callable from the browser console or level editor.

#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include "game.h"

/****************************/
/*   FENCE COLLISION CHEAT  */
/****************************/

// Called from JavaScript: Module.ccall('Nanosaur2_SetFenceCollisionsEnabled', null, ['number'], [0]);
EMSCRIPTEN_KEEPALIVE void Nanosaur2_SetFenceCollisionsEnabled(int enabled)
{
	gFenceCollisionsDisabled = !enabled;
	SDL_Log("Fence collisions %s", enabled ? "enabled" : "disabled");
}

EMSCRIPTEN_KEEPALIVE int Nanosaur2_GetFenceCollisionsEnabled(void)
{
	return gFenceCollisionsDisabled ? 0 : 1;
}

/****************************/
/*   LEVEL MANAGEMENT       */
/****************************/

// Returns the current level number (0-based)
EMSCRIPTEN_KEEPALIVE int Nanosaur2_GetCurrentLevel(void)
{
	return (int)gLevelNum;
}

// Set a terrain override file path for the next level load.
// Call this before the level loads (e.g., before clicking "Play" in a wrapper page).
// The path should point to a .ter file that has already been written into the
// Emscripten virtual filesystem (e.g., via FS.writeFile).
EMSCRIPTEN_KEEPALIVE void Nanosaur2_SetTerrainOverridePath(const char* path)
{
	if (path && path[0] != '\0')
	{
		SDL_strlcpy(gCmdTerrainOverridePath, path, sizeof(gCmdTerrainOverridePath));
		// Note: gCmdTerrainOverrideSpec will be set when LoadLevelArt() is called
		// because Pomme::Files::HostPathToFSSpec is C++ and not directly callable here.
		// We defer conversion to the C++ side in LoadLevelArt via a wrapper.
		SDL_Log("Terrain override path set: %s", gCmdTerrainOverridePath);
	}
	else
	{
		gCmdTerrainOverridePath[0] = '\0';
		SDL_memset(&gCmdTerrainOverrideSpec, 0, sizeof(gCmdTerrainOverrideSpec));
	}
}

#endif // __EMSCRIPTEN__
