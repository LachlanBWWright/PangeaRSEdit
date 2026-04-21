// WebAPI.c - JavaScript/WebAssembly external command interface
// This file provides an API for external JavaScript code to interact with the game.
// Functions marked EMSCRIPTEN_KEEPALIVE are exported and callable from JavaScript.

#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include "game.h"


/************************************************************/
/* FENCE COLLISION CONTROL                                  */
/************************************************************/
//
// Enables or disables background (fence/wall) collision detection.
// When disabled, the player can pass through terrain walls.
//
// JavaScript usage:
//   Module._SetFenceCollisionsEnabled(0);  // disable fences
//   Module._SetFenceCollisionsEnabled(1);  // enable fences
//

EMSCRIPTEN_KEEPALIVE void SetFenceCollisionsEnabled(int enabled)
{
	gFenceCollisionsDisabled = (enabled == 0);
}


/************************************************************/
/* FENCE COLLISION QUERY                                    */
/************************************************************/

EMSCRIPTEN_KEEPALIVE int GetFenceCollisionsEnabled(void)
{
	return gFenceCollisionsDisabled ? 0 : 1;
}


/************************************************************/
/* HEALTH CHEAT                                             */
/************************************************************/
//
// Restores the player's health to full.
//

EMSCRIPTEN_KEEPALIVE void CheatRestoreHealth(void)
{
	GetHealth(1);
}


/************************************************************/
/* FUEL CHEAT                                               */
/************************************************************/
//
// Fills the player's jetpack fuel to maximum.
//

EMSCRIPTEN_KEEPALIVE void CheatFillFuel(void)
{
	gFuel = MAX_FUEL_CAPACITY;
	gInfobarUpdateBits |= UPDATE_FUEL;
}


/************************************************************/
/* WEAPONS CHEAT                                            */
/************************************************************/
//
// Gives the player all weapons.
//

EMSCRIPTEN_KEEPALIVE void CheatGetWeapons(void)
{
	GetCheatWeapons();
}


/************************************************************/
/* EGGS CHEAT                                               */
/************************************************************/
//
// Recovers all eggs.
//

EMSCRIPTEN_KEEPALIVE void CheatGetAllEggs(void)
{
	GetAllEggsCheat();
}


/************************************************************/
/* SCORE QUERY                                              */
/************************************************************/
//
// Returns the current game score.
//

EMSCRIPTEN_KEEPALIVE uint32_t GetGameScore(void)
{
	return gScore;
}


/************************************************************/
/* CUSTOM TERRAIN FILE                                      */
/************************************************************/
//
// Sets a custom terrain (.ter) file path in the Emscripten VFS and
// triggers a level restart.  Call this after writing the file to the
// Emscripten virtual filesystem via FS.writeFile().
//
// JavaScript usage:
//   // First write the file to the VFS:
//   FS.writeFile('/Data/Terrain/custom.ter', uint8ArrayData);
//   // Then call this to use it:
//   Module._SetCustomTerrainFile('/Data/Terrain/custom.ter');
//

EMSCRIPTEN_KEEPALIVE void SetCustomTerrainFile(const char* path)
{
	SDL_strlcpy(gCustomTerrainFile, path ? path : "", sizeof(gCustomTerrainFile));
	// Trigger level restart so the new terrain is loaded
	gGameOverFlag = true;
}


/************************************************************/
/* CLEAR CUSTOM TERRAIN FILE                                */
/************************************************************/
//
// Clears the custom terrain override, reverting to the default terrain.
//

EMSCRIPTEN_KEEPALIVE void ClearCustomTerrainFile(void)
{
	gCustomTerrainFile[0] = '\0';
	// Trigger level restart
	gGameOverFlag = true;
}


#endif /* __EMSCRIPTEN__ */
