//
// gl_compat.h
// OpenGL compatibility layer - wraps legacy OpenGL calls for WebGL
//

#pragma once

// Always include the desktop GL headers for constant definitions
// (GL_MODELVIEW, GL_PROJECTION, GL_BGRA, etc.)
#include <SDL3/SDL_opengl.h>

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)
#include "modern_gl.h"
#include "vertex_array_compat.h"
#include "state_compat.h"

// Immediate mode emulation
#define glBegin(mode) ModernGL_BeginImmediateMode(mode)
#define glEnd() ModernGL_EndImmediateMode()
#define glColor3f(r,g,b) ModernGL_ImmediateColor(r,g,b,1.0f)
#define glColor4f(r,g,b,a) ModernGL_ImmediateColor(r,g,b,a)
#define glColor4fv(v) ModernGL_ImmediateColor((v)[0],(v)[1],(v)[2],(v)[3])
#define glNormal3f(x,y,z) ModernGL_ImmediateNormal(x,y,z)
#define glTexCoord2f(u,v) ModernGL_ImmediateTexCoord(u,v)
#define glTexCoord2fv(v) ModernGL_ImmediateTexCoord((v)[0],(v)[1])
#define glVertex2f(x,y) ModernGL_ImmediateVertex(x,y,0.0f)
#define glVertex3f(x,y,z) ModernGL_ImmediateVertex(x,y,z)
#define glVertex3fv(v) ModernGL_ImmediateVertex((v)[0],(v)[1],(v)[2])

// GL_QUADS not supported natively in WebGL/GLES2; handled by converting
// quads to triangles in the immediate mode implementation.
// The constant is not defined in SDL_opengles2.h, so define it here.
#ifndef GL_QUADS
#define GL_QUADS 0x0007
#endif

// Client-side vertex arrays
// Redirected via vertex_array_compat.h: glEnableClientState, glDisableClientState,
// glVertexPointer, glNormalPointer, glColorPointer, glTexCoordPointer,
// glDrawElements, glDrawArrays

// State management
// Redirected via state_compat.h: glEnable, glDisable, glAlphaFunc, glFog*,
// glLight*, glMaterial*, glTexEnvi, glTexGeni, glActiveTexture,
// glMatrixMode, glLoadMatrix*, glMultMatrix*, glPushMatrix, glPopMatrix,
// glTranslate*, glRotate*, glScale*, glFrustum, glOrtho

// Functions that don't exist in WebGL/GLES2 — no-op
#define glPolygonMode(face, mode) ((void)0)

// Note: glHint IS a valid GLES2 function but only for GL_GENERATE_MIPMAP_HINT.
// GL_FOG_HINT calls are guarded with #ifndef __EMSCRIPTEN__ in the source code
// instead of a macro, to avoid conflicting with the GLES2/gl2.h declaration.

#endif // __EMSCRIPTEN__ || __ANDROID__
