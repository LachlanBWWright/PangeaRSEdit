/****************************/
/*   WEB INTERFACE          */
/*   Emscripten/WASM only   */
/****************************/
//
// Exposes C functions to JavaScript for the level editor
// and developer cheat interface.
//
// JavaScript usage (open browser dev console while the game is running):
//
//   // Fence collision cheat
//   Module.ccall('SetFenceCollisionEnabled', null, ['number'], [0]); // disable
//   Module.ccall('SetFenceCollisionEnabled', null, ['number'], [1]); // enable
//   Module.ccall('GetFenceCollisionEnabled', 'number', [], []);       // query
//
//   // Player health/lives
//   Module.ccall('SetPlayerHealth', null, ['number'], [1.0]);         // full health
//   Module.ccall('SetPlayerLives', null, ['number'], [9]);            // 9 lives
//   Module.ccall('FullHeal', null, [], []);                           // max health + lives + glide
//
//   // Level control
//   Module.ccall('WinLevel', null, [], []);                           // complete current level
//   Module.ccall('SetStartLevel', null, ['number'], [3]);             // queue level jump
//
// Level file override (replace a Data/ file before the level loads):
//   Module.FS.writeFile('Data/Terrain/Level1_Garden.ter', byteArray);
//

#ifdef __EMSCRIPTEN__

#include "game.h"
#include <emscripten.h>

extern Boolean gDisableFenceCollision;
extern int gStartLevel;


/************** SET FENCE COLLISION ENABLED **************/
//
// enabled = 0 to disable fence collision, 1 to enable
//
EMSCRIPTEN_KEEPALIVE void SetFenceCollisionEnabled(int enabled)
{
	gDisableFenceCollision = !enabled;
	SDL_Log("Fence collision %s via web interface", enabled ? "enabled" : "disabled");
}


/************** GET FENCE COLLISION ENABLED **************/
//
// Returns 1 if fence collision is active, 0 if disabled
//
EMSCRIPTEN_KEEPALIVE int GetFenceCollisionEnabled(void)
{
	return gDisableFenceCollision ? 0 : 1;
}


/************** SET PLAYER HEALTH **************/
//
// health: 0.0 (dead) to 1.0 (full health)
//
EMSCRIPTEN_KEEPALIVE void SetPlayerHealth(float health)
{
	if (!gInGameNow)
		return;
	if (health < 0.0f) health = 0.0f;
	if (health > 1.0f) health = 1.0f;
	gPlayerInfo.health = health;
}


/************** SET PLAYER LIVES **************/
//
// lives: number of extra lives (1-99)
//
EMSCRIPTEN_KEEPALIVE void SetPlayerLives(int lives)
{
	if (!gInGameNow)
		return;
	if (lives < 1) lives = 1;
	if (lives > 99) lives = 99;
	gPlayerInfo.lives = (Byte)lives;
}


/************** FULL HEAL **************/
//
// Restores player to full health, glide power, at least 3 lives, and reveals map.
//
EMSCRIPTEN_KEEPALIVE void FullHeal(void)
{
	if (!gInGameNow)
		return;
	gPlayerInfo.health = 1.0f;
	gPlayerInfo.glidePower = 1.0f;
	if (gPlayerInfo.lives < 3)
		gPlayerInfo.lives = 3;
	gPlayerInfo.hasMap = true;
	SDL_Log("Full heal applied via web interface");
}


/************** WIN LEVEL **************/
//
// Immediately triggers level completion (same as reaching the goal).
//
EMSCRIPTEN_KEEPALIVE void WinLevel(void)
{
	if (!gInGameNow)
		return;
	StartLevelCompletion(0.1f);
	SDL_Log("Level completion triggered via web interface");
}


/************** SET START LEVEL **************/
//
// Queues a direct level start (skipping menus).
// Takes effect on the next call to GameMain() – call before the game loop starts.
// level: 0-9 (see LEVEL_NUM_* constants in main.h)
//
EMSCRIPTEN_KEEPALIVE void SetStartLevel(int level)
{
	if (level >= 0 && level < NUM_LEVELS)
	{
		gStartLevel = level;
		SDL_Log("Start level set to %d via web interface", level);
	}
}

#endif	// __EMSCRIPTEN__
