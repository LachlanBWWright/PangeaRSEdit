#pragma once

#ifdef __EMSCRIPTEN__
// WebGL/Emscripten path: glActiveTexture is a core GLES2 function.
// glClientActiveTexture is provided by our gl_compat layer.
// ModernGL_Init() must be called once after context creation to initialize
// the shader-based fixed-function emulation layer.
extern void ModernGL_Init(void);
static inline void OGL_InitFunctions(void) { ModernGL_Init(); }
// Redirect ARB-suffixed variants through the compat layer's ActiveTexture.
#define glActiveTextureARB CompatGL_ActiveTexture
#define glClientActiveTextureARB CompatGL_ClientActiveTexture
#else
extern PFNGLACTIVETEXTUREARBPROC			procptr_glActiveTextureARB;
extern PFNGLCLIENTACTIVETEXTUREARBPROC		procptr_glClientActiveTextureARB;

#define glActiveTextureARB					procptr_glActiveTextureARB
#define glClientActiveTextureARB			procptr_glClientActiveTextureARB

void OGL_InitFunctions(void);
#endif
