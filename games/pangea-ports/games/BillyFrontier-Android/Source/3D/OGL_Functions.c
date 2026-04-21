#include <SDL3/SDL.h>
#include <SDL3/SDL_opengl.h>

#include "game.h"

#ifndef __EMSCRIPTEN__
// On Emscripten/WebGL, glActiveTexture and glClientActiveTexture are available
// as core GLES2 functions.  See ogl_functions.h for the Emscripten definitions.

PFNGLACTIVETEXTUREARBPROC			procptr_glActiveTextureARB			= NULL;
PFNGLCLIENTACTIVETEXTUREARBPROC		procptr_glClientActiveTextureARB	= NULL;

void OGL_InitFunctions(void)
{
	procptr_glActiveTextureARB			= (PFNGLACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glActiveTextureARB");
	procptr_glClientActiveTextureARB	= (PFNGLCLIENTACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glClientActiveTextureARB");

	GAME_ASSERT(procptr_glActiveTextureARB);
	GAME_ASSERT(procptr_glClientActiveTextureARB);
}

#else /* __EMSCRIPTEN__ */

// On Emscripten, glActiveTexture is a core GLES2 function.
// state_compat.c references procptr_glActiveTextureARB directly (extern),
// so we must provide a definition here, pointing to the real function.
//
// IMPORTANT: game.h -> gl_compat.h -> state_compat.h defines
//   #define glActiveTexture CompatGL_ActiveTexture
// which would make the initialiser below assign CompatGL_ActiveTexture to
// the pointer, causing CompatGL_ActiveTexture to call itself infinitely.
// Undef the macro first so we capture the real GLES2 entry point.
#undef glActiveTexture
PFNGLACTIVETEXTUREARBPROC procptr_glActiveTextureARB =
    (PFNGLACTIVETEXTUREARBPROC) glActiveTexture;

// OGL_InitFunctions is called unconditionally by OGL_Support.c.
// On Emscripten, we use it to initialise the custom GLES2 compatibility layer.
extern void ModernGL_Init(void);

void OGL_InitFunctions(void)
{
    ModernGL_Init();
}

#endif /* !__EMSCRIPTEN__ */
