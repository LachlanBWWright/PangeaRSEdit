// gl_compat.h – OpenGL fixed-function compatibility layer for Emscripten/WebGL.
//
// This file provides software implementations of the OpenGL 1.x/2.x
// fixed-function pipeline API that does not exist in OpenGL ES 2.0 / WebGL.
// It is included ONLY for __EMSCRIPTEN__ builds.
//
// Approach: a single GLSL ES 1.00 shader program implements the fixed-function
// pipeline (lighting, fog, texenv, alpha-test).  The classic client-state
// vertex-array calls (glVertexPointer, glNormalPointer, …, glDrawElements)
// are intercepted and redirected through VBOs + vertex attributes.  Immediate-
// mode (glBegin/glEnd) is emulated by buffering vertices and flushing on glEnd.

#pragma once

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include <SDL3/SDL_opengles2.h>   // GLES2 types and real function declarations
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

// ── Missing GL 1.x constants ─────────────────────────────────────────────────
#define GL_MODELVIEW                    0x1700
#define GL_PROJECTION                   0x1701
#define GL_TEXTURE                      0x1702

#define GL_MODELVIEW_MATRIX             0x0BA6
#define GL_PROJECTION_MATRIX            0x0BA7

#define GL_LIGHTING                     0x0B50
#define GL_LIGHT0                       0x4000
#define GL_LIGHT1                       0x4001
#define GL_LIGHT2                       0x4002
#define GL_LIGHT3                       0x4003

#define GL_AMBIENT                      0x1200
#define GL_DIFFUSE                      0x1201
#define GL_SPECULAR                     0x1202
#define GL_POSITION                     0x1203
#define GL_LIGHT_MODEL_AMBIENT          0x0B53
#define GL_LIGHT_MODEL_TWO_SIDE         0x0B52

#define GL_FOG                          0x0B60
#define GL_FOG_MODE                     0x0B65
#define GL_FOG_DENSITY                  0x0B62
#define GL_FOG_START                    0x0B63
#define GL_FOG_END                      0x0B64
#define GL_FOG_COLOR                    0x0B66
#define GL_EXP                          0x0800
#define GL_EXP2                         0x0801
#define GL_LINEAR                       0x2601

#define GL_NORMALIZE                    0x0BA1
#define GL_ALPHA_TEST                   0x0BC0
#define GL_ALPHA_TEST_FUNC              0x0BC1
#define GL_ALPHA_TEST_REF               0x0BC2
#define GL_NEVER                        0x0200
#define GL_LESS                         0x0201
#define GL_EQUAL                        0x0202
#define GL_LEQUAL                       0x0203
#define GL_GREATER                      0x0204
#define GL_NOTEQUAL                     0x0205
#define GL_GEQUAL                       0x0206
#define GL_ALWAYS                       0x0207

#define GL_TEXTURE_ENV                  0x2300
#define GL_TEXTURE_ENV_MODE             0x2200
#define GL_MODULATE                     0x2100
#define GL_COMBINE                      0x8570
#define GL_COMBINE_RGB                  0x8571
#define GL_COMBINE_ALPHA                0x8572
#define GL_ADD                          0x0104
#define GL_REPLACE                      0x1E01

#define GL_TEXTURE_GEN_MODE             0x2500
#define GL_TEXTURE_GEN_S                0x0C60
#define GL_TEXTURE_GEN_T                0x0C61
#define GL_SPHERE_MAP                   0x2402
#define GL_S                            0x2000
#define GL_T                            0x2001

#define GL_COLOR_MATERIAL               0x0B57
#define GL_VERTEX_ARRAY                 0x8074
#define GL_NORMAL_ARRAY                 0x8075
#define GL_COLOR_ARRAY                  0x8076
#define GL_TEXTURE_COORD_ARRAY          0x8078

// ARB texture-unit aliases (same values as GLES2 GL_TEXTURE0/GL_TEXTURE1)
#define GL_TEXTURE0_ARB                 0x84C0
#define GL_TEXTURE1_ARB                 0x84C1

#define GL_QUADS                        0x0007
#define GL_POLYGON                      0x0009
#define GL_QUAD_STRIP                   0x0008

// Pixel format constants (GL 1.x, not in GLES2)
#define GL_BGRA                         0x80E1
#define GL_UNSIGNED_INT_8_8_8_8         0x8035
#define GL_UNSIGNED_INT_8_8_8_8_REV     0x8367
#define GL_UNSIGNED_SHORT_1_5_5_5_REV   0x8366

// Pixel store parameters (available in WebGL 2.0 / OpenGL ES 3.0)
#define GL_UNPACK_ROW_LENGTH            0x0CF2

// Material
#define GL_AMBIENT_AND_DIFFUSE          0x1602

// State query
#define GL_MATRIX_MODE                  0x0BA0
#define GL_STACK_OVERFLOW               0x0503
#define GL_STACK_UNDERFLOW              0x0504

// Hint targets
#define GL_FOG_HINT                     0x0C54

// Enable caps (GL 1.x only, not GLES2)
#define GL_RESCALE_NORMAL               0x803A
#define GL_COLOR_LOGIC_OP              0x0BF2
#define GL_LINE_SMOOTH                  0x0B20
#define GL_LINE_STIPPLE                 0x0B24
#define GL_TEXTURE_1D                   0x0DE0
#define GL_ALL_ATTRIB_BITS              0xFFFFFFFF

#define GL_BACK_LEFT                    0x0402
#define GL_BACK_RIGHT                   0x0403
#define GL_FRONT_LEFT                   0x0400
#define GL_FRONT_RIGHT                  0x0401
#define GL_BACK                         0x0405
#define GL_FRONT                        0x0404

#define GL_FILL                         0x1B02
#define GL_LINE                         0x1B01
#define GL_POINT                        0x1B00
#define GL_FRONT_AND_BACK               0x0408

#define GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT 0x84FF

#define GL_DOUBLE                       0x140A
#define GL_INT                          0x1404

// Disable GLES2 functions we intercept so we can redefine them
#undef glEnable
#undef glDisable
#undef glGetFloatv
#undef glGetDoublev
#undef glDrawElements
#undef glDrawArrays
#undef glHint
#undef glIsEnabled

// ── Compatibility function declarations ──────────────────────────────────────

// Init – must be called once after OpenGL context creation
void COMPAT_GL_Init(void);

// Matrix stack
void glMatrixMode(GLenum mode);
void glLoadIdentity(void);
void glLoadMatrixf(const GLfloat *m);
void glMultMatrixf(const GLfloat *m);
void glPushMatrix(void);
void glPopMatrix(void);
void glTranslatef(GLfloat x, GLfloat y, GLfloat z);
void glRotatef(GLfloat angle, GLfloat x, GLfloat y, GLfloat z);
void glScalef(GLfloat x, GLfloat y, GLfloat z);
void glOrtho(GLdouble l, GLdouble r, GLdouble b, GLdouble t, GLdouble n, GLdouble f);
void glFrustum(GLdouble l, GLdouble r, GLdouble b, GLdouble t, GLdouble n, GLdouble f);

// Lighting
void glLightfv(GLenum light, GLenum pname, const GLfloat *params);
void glLightModelfv(GLenum pname, const GLfloat *params);
void glLightModeli(GLenum pname, GLint param);
void glMaterialfv(GLenum face, GLenum pname, const GLfloat *params);
void glColorMaterial(GLenum face, GLenum mode);

// Fog
void glFogi(GLenum pname, GLint param);
void glFogf(GLenum pname, GLfloat param);
void glFogfv(GLenum pname, const GLfloat *params);

// Alpha test
void glAlphaFunc(GLenum func, GLclampf ref);

// Texture env
void glTexEnvi(GLenum target, GLenum pname, GLint param);
void glTexGeni(GLenum coord, GLenum pname, GLint param);

// Client state / vertex arrays
void glEnableClientState(GLenum array);
void glDisableClientState(GLenum array);
void glClientActiveTexture(GLenum texture);
void glVertexPointer(GLint size, GLenum type, GLsizei stride, const void *ptr);
void glNormalPointer(GLenum type, GLsizei stride, const void *ptr);
void glColorPointer(GLint size, GLenum type, GLsizei stride, const void *ptr);
void glTexCoordPointer(GLint size, GLenum type, GLsizei stride, const void *ptr);

// Colors (current vertex color)
void glColor4f(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
void glColor4fv(const GLfloat *v);
void glNormal3f(GLfloat nx, GLfloat ny, GLfloat nz);

// Immediate mode
void glBegin(GLenum mode);
void glEnd(void);
void glVertex2f(GLfloat x, GLfloat y);
void glVertex3f(GLfloat x, GLfloat y, GLfloat z);
void glVertex3fv(const GLfloat *v);
void glTexCoord2f(GLfloat s, GLfloat t);
void glTexCoord2fv(const GLfloat *v);

// Draw call intercepts (set up shader + VBOs, then call real glDrawElements/Arrays)
void glDrawElements(GLenum mode, GLsizei count, GLenum type, const void *indices);
void glDrawArrays(GLenum mode, GLint first, GLsizei count);

// Enable/Disable intercepted for lighting/fog/alpha-test/texgen state tracking
void glEnable(GLenum cap);
void glDisable(GLenum cap);

// GetFloatv intercepted for GL_MODELVIEW_MATRIX / GL_PROJECTION_MATRIX
void glGetFloatv(GLenum pname, GLfloat *data);
void glGetDoublev(GLenum pname, GLdouble *data);

// Stubs (no-ops or handled specially)
void glPolygonMode(GLenum face, GLenum mode);
void glHint(GLenum target, GLenum mode);
GLboolean glIsEnabled(GLenum cap);
void glPushAttrib(GLbitfield mask);
void glPopAttrib(void);
void glDrawBuffer(GLenum buf);

// Apple-extension stubs (not needed on Emscripten)
typedef void *GLfenceAPPLE;
void glGenFencesAPPLE(GLsizei n, GLuint *fences);
void glDeleteFencesAPPLE(GLsizei n, const GLuint *fences);
void glSetFenceAPPLE(GLuint fence);
void glFinishFenceAPPLE(GLuint fence);
GLboolean glTestFenceAPPLE(GLuint fence);
GLboolean glIsFenceNV(GLuint fence);
void glGenVertexArraysAPPLE(GLsizei n, GLuint *arrays);
void glBindVertexArrayAPPLE(GLuint array);
void glFlushVertexArrayRangeAPPLE(GLsizei length, void *ptr);
void glVertexArrayRangeAPPLE(GLsizei length, void *ptr);
void glVertexArrayParameteriAPPLE(GLenum pname, GLint param);
void glGetDoublev_stub(GLenum pname, GLdouble *params);

#ifdef __cplusplus
} // extern "C"
#endif

#endif // __EMSCRIPTEN__ || __ANDROID__
