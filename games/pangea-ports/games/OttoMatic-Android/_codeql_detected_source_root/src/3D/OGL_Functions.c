#include <SDL3/SDL.h>
#include <SDL3/SDL_opengl.h>

#include "game.h"

PFNGLACTIVETEXTUREARBPROC			procptr_glActiveTextureARB			= NULL;
PFNGLCLIENTACTIVETEXTUREARBPROC		procptr_glClientActiveTextureARB	= NULL;

#ifdef __EMSCRIPTEN__
// WebGL doesn't support glClientActiveTexture because it's part of the legacy
// fixed-function pipeline. However, we need to route it to the vertex array
// compat layer so it tracks which texture unit is active for tex coord pointers.
static void glClientActiveTexture_compat(GLenum texture)
{
	extern void CompatGL_ClientActiveTexture(GLenum texture);
	CompatGL_ClientActiveTexture(texture);
}
#endif

void OGL_InitFunctions(void)
{
#ifdef __EMSCRIPTEN__
	// Initialize modern GL subsystem for WebAssembly
	SDL_Log("OGL_InitFunctions: Initializing ModernGL subsystem for WebAssembly...");
	extern void ModernGL_Init(void);
	ModernGL_Init();
	SDL_Log("OGL_InitFunctions: ModernGL subsystem initialized");
#endif

	procptr_glActiveTextureARB = (PFNGLACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glActiveTextureARB");
	if (!procptr_glActiveTextureARB)
		procptr_glActiveTextureARB = (PFNGLACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glActiveTexture");

	GAME_ASSERT(procptr_glActiveTextureARB);
#ifdef __EMSCRIPTEN__
	SDL_Log("OGL_InitFunctions: glActiveTexture resolved successfully");
#endif

#ifdef __EMSCRIPTEN__
	// WebGL/Emscripten doesn't provide glClientActiveTexture
	// Modern GL rendering path doesn't need this function
	procptr_glClientActiveTextureARB = (PFNGLCLIENTACTIVETEXTUREARBPROC) glClientActiveTexture_compat;
	SDL_Log("OGL_InitFunctions: Using compat glClientActiveTexture for WebGL");
#else
	procptr_glClientActiveTextureARB = (PFNGLCLIENTACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glClientActiveTextureARB");
	if (!procptr_glClientActiveTextureARB)
		procptr_glClientActiveTextureARB = (PFNGLCLIENTACTIVETEXTUREARBPROC) SDL_GL_GetProcAddress("glClientActiveTexture");

	GAME_ASSERT(procptr_glClientActiveTextureARB);
#endif
}
