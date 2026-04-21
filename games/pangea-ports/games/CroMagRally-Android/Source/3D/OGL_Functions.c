// OGL_Functions.c
// OpenGL extension function pointer initialisation for CroMag Rally.
// On desktop, loads ARB extension functions at runtime.
// On Emscripten/WebGL, glActiveTexture is a core GLES2 function; no lookup needed.
//
// (C) 2022-2025 Pangea Ports contributors.

#include <SDL3/SDL.h>
#include <SDL3/SDL_opengl.h>
#include <SDL3/SDL_opengl_glext.h>

#include "game.h"

#ifndef __EMSCRIPTEN__

PFNGLACTIVETEXTUREARBPROC       procptr_glActiveTextureARB      = NULL;
PFNGLCLIENTACTIVETEXTUREARBPROC procptr_glClientActiveTextureARB = NULL;

void OGL_InitFunctions(void)
{
    procptr_glActiveTextureARB = (PFNGLACTIVETEXTUREARBPROC)
        SDL_GL_GetProcAddress("glActiveTextureARB");
    if (!procptr_glActiveTextureARB)
        procptr_glActiveTextureARB = (PFNGLACTIVETEXTUREARBPROC)
            SDL_GL_GetProcAddress("glActiveTexture");

    procptr_glClientActiveTextureARB = (PFNGLCLIENTACTIVETEXTUREARBPROC)
        SDL_GL_GetProcAddress("glClientActiveTextureARB");
    if (!procptr_glClientActiveTextureARB)
        procptr_glClientActiveTextureARB = (PFNGLCLIENTACTIVETEXTUREARBPROC)
            SDL_GL_GetProcAddress("glClientActiveTexture");

    SDL_assert(procptr_glActiveTextureARB);
    SDL_assert(procptr_glClientActiveTextureARB);
}

#else  /* __EMSCRIPTEN__ */

// On Emscripten/WebGL, glActiveTexture is a core GLES2 function available via
// the GLES2 header (SDL_opengles2.h). The gl_compat layer's CompatGL_ActiveTexture
// calls glActiveTexture directly — no function-pointer lookup is needed.

// procptr_glActiveTextureARB must be defined because state_compat.c
// has an extern declaration for it.  We just provide a non-null pointer
// to the real GLES2 glActiveTexture so CompatGL_ActiveTexture works.
// PFNGLACTIVETEXTUREARBPROC is only in SDL_opengl.h; define the typedef manually.
typedef void (*PFNGLACTIVETEXTUREARBPROC)(GLenum texture);
PFNGLACTIVETEXTUREARBPROC procptr_glActiveTextureARB = (PFNGLACTIVETEXTUREARBPROC) glActiveTexture;

void OGL_InitFunctions(void)
{
    // ModernGL_Init() is already called in OGL_CreateDrawContext before this.
    // Nothing more needed here on Emscripten.
}

#endif /* __EMSCRIPTEN__ */
