// WebAssembly external command interface for Mighty Mike
// Exposes C functions to JavaScript via Emscripten's EMSCRIPTEN_KEEPALIVE
// so a level editor or testing harness can drive game state at runtime.
//
// The global variables declared here are available on ALL platforms so
// that other translation units (e.g. Collision.c) can reference them.
//
// WebAssembly/JavaScript usage:
//   Module.ccall('Cheat_SetFenceCollision', null, ['number'], [0]);  // disable
//   Module.ccall('Cheat_SetFenceCollision', null, ['number'], [1]);  // enable

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

#include "Pomme.h"
#include <SDL3/SDL.h>

extern "C"
{
	// Master toggle: when true, solid-tile (fence) collisions are ignored.
	// Collision.c checks this flag in AddBGCollisions().
	Boolean gDisableFenceCollision = false;

#ifdef __EMSCRIPTEN__
	// ---------------------------------------------------------------------------
	// Cheat_SetFenceCollision(int enabled)
	//   enabled == 0  →  disable fence/solid-tile collisions
	//   enabled != 0  →  enable  fence/solid-tile collisions (default)
	// ---------------------------------------------------------------------------
	EMSCRIPTEN_KEEPALIVE void Cheat_SetFenceCollision(int enabled)
	{
		gDisableFenceCollision = (enabled == 0);
		SDL_Log("Cheat_SetFenceCollision: fence collisions %s",
			gDisableFenceCollision ? "DISABLED" : "ENABLED");
	}

	// ---------------------------------------------------------------------------
	// Cheat_GetFenceCollision()  →  returns 1 if enabled, 0 if disabled
	// ---------------------------------------------------------------------------
	EMSCRIPTEN_KEEPALIVE int Cheat_GetFenceCollision(void)
	{
		return gDisableFenceCollision ? 0 : 1;
	}
#endif // __EMSCRIPTEN__
}
