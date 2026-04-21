//
// state_compat.h
// OpenGL state management compatibility for WebGL
//

#pragma once

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include "modern_gl.h"

// State compatibility functions
void CompatGL_Enable(GLenum cap);
void CompatGL_Disable(GLenum cap);
void CompatGL_AlphaFunc(GLenum func, GLfloat ref);
void CompatGL_Fog(GLenum pname, GLfloat param);
void CompatGL_Fogfv(GLenum pname, const GLfloat* params);
void CompatGL_Fogi(GLenum pname, GLint param);
void CompatGL_Light(GLenum light, GLenum pname, const GLfloat* params);
void CompatGL_LightModelfv(GLenum pname, const GLfloat* params);
void CompatGL_Material(GLenum face, GLenum pname, const GLfloat* params);
void CompatGL_TexEnvi(GLenum target, GLenum pname, GLint param);
void CompatGL_TexGeni(GLenum coord, GLenum pname, GLint param);
void CompatGL_ActiveTexture(GLenum texture);
void CompatGL_MatrixMode(GLenum mode);
void CompatGL_LoadMatrix(const GLfloat* m);
void CompatGL_LoadIdentity(void);
void CompatGL_MultMatrix(const GLfloat* m);
void CompatGL_PushMatrix(void);
void CompatGL_PopMatrix(void);
void CompatGL_Translate(GLfloat x, GLfloat y, GLfloat z);
void CompatGL_Rotate(GLfloat angle, GLfloat x, GLfloat y, GLfloat z);
void CompatGL_Scale(GLfloat x, GLfloat y, GLfloat z);
void CompatGL_Frustum(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble near, GLdouble far);
void CompatGL_Ortho(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble near, GLdouble far);
void CompatGL_BlendFunc(GLenum sfactor, GLenum dfactor);
void CompatGL_DepthMask(GLboolean flag);

// Update shader uniforms before drawing
void CompatGL_UpdateShaderState(void);

// State queries for emulated GL states
GLboolean CompatGL_IsEnabled(GLenum cap);
void CompatGL_GetFloatv(GLenum pname, GLfloat* params);
void CompatGL_GetIntegerv(GLenum pname, GLint* params);
void CompatGL_GetBooleanv(GLenum pname, GLboolean* params);

// Macro redirects for state functions
#define glEnable CompatGL_Enable
#define glDisable CompatGL_Disable
#define glAlphaFunc CompatGL_AlphaFunc
#define glFogf CompatGL_Fog
#define glFogfv CompatGL_Fogfv
#define glFogi CompatGL_Fogi
#define glLightfv CompatGL_Light
#define glLightModelfv CompatGL_LightModelfv
#define glMaterialfv CompatGL_Material
#define glTexEnvi CompatGL_TexEnvi
#define glTexGeni CompatGL_TexGeni
#define glActiveTexture CompatGL_ActiveTexture
#define glMatrixMode CompatGL_MatrixMode
#define glLoadMatrixf CompatGL_LoadMatrix
#define glLoadIdentity CompatGL_LoadIdentity
#define glMultMatrixf CompatGL_MultMatrix
#define glPushMatrix CompatGL_PushMatrix
#define glPopMatrix CompatGL_PopMatrix
#define glTranslatef CompatGL_Translate
#define glRotatef CompatGL_Rotate
#define glScalef CompatGL_Scale
#define glFrustum CompatGL_Frustum
#define glOrtho CompatGL_Ortho
#define glIsEnabled CompatGL_IsEnabled
#define glGetFloatv CompatGL_GetFloatv
#define glGetIntegerv CompatGL_GetIntegerv
#define glGetBooleanv CompatGL_GetBooleanv
#define glBlendFunc CompatGL_BlendFunc
#define glDepthMask CompatGL_DepthMask

// Also redirect the ARB suffixed variants that the game uses via function
// pointers (defined in ogl_functions.h as procptr_glActiveTextureARB etc.)
// so that they go through the compat layer's texture-unit tracking instead
// of bypassing it.
#undef glActiveTextureARB
#define glActiveTextureARB CompatGL_ActiveTexture

// GLES2 lacks glColorMaterial; provide a no-op on Android so the linker is
// satisfied (the call-site comment "provided by our gl_compat.h layer" refers
// to this definition).
#ifdef __ANDROID__
#define glColorMaterial(face, mode) ((void)0)
#endif

#endif // __EMSCRIPTEN__ || __ANDROID__
