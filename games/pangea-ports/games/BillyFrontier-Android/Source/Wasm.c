// BILLY FRONTIER - WebAssembly / Emscripten interface
// Exported C functions callable from JavaScript for the level editor and cheat menu.

#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include "game.h"

// -------------------------------------------------------------------------
// LEGACY OPENGL STUBS
// Emscripten's LEGACY_GL_EMULATION does not implement every fixed-function
// GL 1.x entry point.  Provide no-op stubs so the linker is satisfied.
// -------------------------------------------------------------------------

// glColorMaterial: tells GL to track current vertex color as material color.
// Emscripten's GL emulation handles material/color differently; a no-op is fine.
void glColorMaterial(unsigned int face, unsigned int mode) { (void)face; (void)mode; }

// glLightModeli: sets integer light-model parameters (e.g. two-sided lighting).
// Not emulated by Emscripten; a no-op has negligible visual impact for this game.
void glLightModeli(unsigned int pname, int param) { (void)pname; (void)param; }

// -------------------------------------------------------------------------
// CHEAT / DEBUG COMMANDS
// -------------------------------------------------------------------------

/**
 * Enable or disable fence collisions.
 *
 * Call from JavaScript:
 *   Module.ccall('BF_SetFenceCollision', null, ['number'], [0]); // disable
 *   Module.ccall('BF_SetFenceCollision', null, ['number'], [1]); // enable
 */
EMSCRIPTEN_KEEPALIVE
void BF_SetFenceCollision(int enabled)
{
	gFenceCollisionDisabled = (enabled == 0);
}

/**
 * Return 1 if fence collision is currently enabled, 0 if disabled.
 */
EMSCRIPTEN_KEEPALIVE
int BF_GetFenceCollision(void)
{
	return gFenceCollisionDisabled ? 0 : 1;
}

// -------------------------------------------------------------------------
// LEVEL EDITOR INTEGRATION
// -------------------------------------------------------------------------

/**
 * Set which area/level to jump to directly on game start, skipping
 * title and menu screens.  Pass -1 to restore normal startup behaviour.
 *
 * Area constants (see main.h):
 *   0  AREA_TOWN_DUEL1        6  AREA_SWAMP_DUEL1
 *   1  AREA_TOWN_SHOOTOUT     7  AREA_SWAMP_SHOOTOUT
 *   2  AREA_TOWN_DUEL2        8  AREA_SWAMP_DUEL2
 *   3  AREA_TOWN_STAMPEDE     9  AREA_SWAMP_STAMPEDE
 *   4  AREA_TOWN_DUEL3       10  AREA_SWAMP_DUEL3
 *   5  AREA_TARGETPRACTICE1  11  AREA_TARGETPRACTICE2
 */
EMSCRIPTEN_KEEPALIVE
void BF_SetDirectLaunchLevel(int area)
{
	gDirectLaunchLevel = area;
}

/**
 * Override the terrain file used for the next level load.
 * The path must be a Pomme-style colon-separated path relative to the Data
 * directory, e.g. ":Terrain:town_duel.ter".  Pass an empty string "" to clear
 * the override and use the bundled files.
 *
 * Use BF_LoadTerrainData() to upload a custom .ter file into the virtual
 * filesystem, which automatically sets this override to the correct format.
 * If you are writing the file manually via Module.FS, write it to
 * "Data/Terrain/custom_level.ter" and call
 * BF_SetTerrainFile(":Terrain:custom_level.ter").
 */
EMSCRIPTEN_KEEPALIVE
void BF_SetTerrainFile(const char *path)
{
	if (path && path[0] != '\0')
	{
		SDL_strlcpy(gDirectTerrainPath, path, sizeof(gDirectTerrainPath));
	}
	else
	{
		gDirectTerrainPath[0] = '\0';
	}
}

/**
 * Write raw terrain file bytes into the Emscripten virtual filesystem and
 * register it as the active terrain override.  The file will be placed at
 * Data/Terrain/custom_level.ter (the same directory as the bundled .ter files).
 *
 * @param data   Pointer to .ter file bytes (passed from JavaScript as a typed array)
 * @param length Number of bytes
 */
EMSCRIPTEN_KEEPALIVE
void BF_LoadTerrainData(const void *data, int length)
{
	// Write to the same directory that holds the bundled terrain files.
	// This path must be writable in Emscripten's MEMFS.
	static const char kTmpRelPath[]  = ":Terrain:custom_level.ter";
	static const char kTmpHostPath[] = "Data/Terrain/custom_level.ter";

	SDL_IOStream *io = SDL_IOFromFile(kTmpHostPath, "wb");
	if (!io)
	{
		SDL_LogError(SDL_LOG_CATEGORY_APPLICATION,
					 "BF_LoadTerrainData: couldn't open %s for writing", kTmpHostPath);
		return;
	}
	SDL_WriteIO(io, data, (size_t) length);
	SDL_CloseIO(io);

	// Store the Pomme colon-path so MakeTerrainSpec picks it up.
	SDL_strlcpy(gDirectTerrainPath, kTmpRelPath, sizeof(gDirectTerrainPath));
}

#endif /* __EMSCRIPTEN__ */
