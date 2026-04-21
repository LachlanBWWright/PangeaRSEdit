//
// gles3compat.h
// GLES3/WebGL2 compatibility layer for legacy OpenGL 1.x calls.
// Included for Emscripten and Android GLES builds.
//

#pragma once

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include <GLES3/gl3.h>
#include <stdlib.h>   // malloc/free for texture conversion

//------------------------------------------------------------
// GL constants not defined in GLES3 / SDL_opengles2.h
//------------------------------------------------------------

// Matrix modes
#define GL_MODELVIEW              0x1700
#define GL_PROJECTION             0x1701
#define GL_TEXTURE                0x1702

// Legacy primitive types
#define GL_QUADS                  0x0007
#define GL_QUAD_STRIP             0x0008
#define GL_POLYGON                0x0009

// Fixed-function caps (not valid in GLES3 glEnable/glDisable)
#define GL_LIGHTING               0x0B50
#define GL_LIGHT0                 0x4000
#define GL_LIGHT1                 0x4001
#define GL_LIGHT2                 0x4002
#define GL_LIGHT3                 0x4003
#define GL_FOG                    0x0B60
#define GL_NORMALIZE              0x0BA1
#define GL_COLOR_MATERIAL         0x0B57
#define GL_TEXTURE_GEN_S          0x0C60
#define GL_TEXTURE_GEN_T          0x0C61
#define GL_RESCALE_NORMAL         0x803A
#define GL_ALPHA_TEST             0x0BC0

// glEnableClientState caps
#define GL_VERTEX_ARRAY           0x8074
#define GL_NORMAL_ARRAY           0x8075
#define GL_COLOR_ARRAY            0x8076
#define GL_TEXTURE_COORD_ARRAY    0x8078

// Light params
#define GL_POSITION               0x1203
#define GL_AMBIENT                0x1200
#define GL_DIFFUSE                0x1201
#define GL_SPECULAR               0x1202

// Light model
#define GL_LIGHT_MODEL_AMBIENT    0x0B53

// Color material mode
#define GL_FRONT_AND_BACK         0x0408
#define GL_AMBIENT_AND_DIFFUSE    0x1602

// Fog params
#define GL_FOG_MODE               0x0B65
#define GL_FOG_DENSITY            0x0B62
#define GL_FOG_START              0x0B63
#define GL_FOG_END                0x0B64
#define GL_FOG_COLOR              0x0B66
#define GL_LINEAR                 0x2601
#define GL_EXP                    0x0800
#define GL_EXP2                   0x0801
#define GL_FOG_HINT               0x0C54

// Alpha test
#define GL_NOTEQUAL               0x0205
#define GL_EQUAL                  0x0202

// Texture env
#define GL_TEXTURE_ENV            0x2300
#define GL_TEXTURE_ENV_MODE       0x2200
#define GL_MODULATE               0x2100
#define GL_TEXTURE_GEN_MODE       0x2500
#define GL_SPHERE_MAP             0x2402
#define GL_COMBINE                0x8570
#define GL_COMBINE_RGB            0x8571
#define GL_COMBINE_ALPHA          0x8572
#define GL_ADD                    0x0104
#define GL_S                      0x2000
#define GL_T                      0x2001

// Multitexture
#define GL_TEXTURE0_ARB           0x84C0
#define GL_TEXTURE1_ARB           0x84C1

// Material
#define GL_FRONT                  0x0404

// Polygon mode (not in GLES3)
#define GL_FILL                   0x1B02
#define GL_LINE                   0x1B01

// Matrix query (not in GLES3)
#define GL_PROJECTION_MATRIX      0x0BA7
#define GL_MODELVIEW_MATRIX       0x0BA6
#define GL_CURRENT_COLOR          0x0B00

// Blend query (old constants not in GLES3)
#define GL_BLEND_SRC              0x0BE1
#define GL_BLEND_DST              0x0BE0

// Error codes not in GLES3
#define GL_STACK_OVERFLOW         0x0503
#define GL_STACK_UNDERFLOW        0x0504

// GL_FASTEST (for hints)
#define GL_FASTEST                0x1101

// Pixel format constants not in GLES3
#define GL_BGRA_EXT                     0x80E1
#define GL_UNSIGNED_SHORT_1_5_5_5_REV  0x8366
#define GL_UNSIGNED_INT_8_8_8_8_REV    0x8367

//------------------------------------------------------------
// Type for ClientActiveTexture callback
//------------------------------------------------------------
typedef void (*PFNGLCLIENTACTIVETEXTUREARBPROC)(GLenum);

// Stub for glClientActiveTexture (tracks active unit, no-op otherwise)
void glClientActiveTexture(GLenum texture);

//------------------------------------------------------------
// Declarations for legacy GL functions we provide
// (undefined in GLES3/WebGL2 headers)
//------------------------------------------------------------

// Immediate mode
void glBegin(GLenum mode);
void glEnd(void);
void glVertex2f(GLfloat x, GLfloat y);
void glVertex3f(GLfloat x, GLfloat y, GLfloat z);
void glVertex3fv(const GLfloat* v);
void glTexCoord2f(GLfloat s, GLfloat t);
void glTexCoord2fv(const GLfloat* v);
void glNormal3f(GLfloat nx, GLfloat ny, GLfloat nz);
void glNormal3fv(const GLfloat* v);
void glColor3f(GLfloat r, GLfloat g, GLfloat b);
void glColor4f(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
void glColor4fv(const GLfloat* v);

// Client arrays
void glEnableClientState(GLenum array);
void glDisableClientState(GLenum array);
void glVertexPointer(GLint size, GLenum type, GLsizei stride, const void* ptr);
void glNormalPointer(GLenum type, GLsizei stride, const void* ptr);
void glColorPointer(GLint size, GLenum type, GLsizei stride, const void* ptr);
void glTexCoordPointer(GLint size, GLenum type, GLsizei stride, const void* ptr);

// Matrix stack
void glMatrixMode(GLenum mode);
void glLoadIdentity(void);
void glPushMatrix(void);
void glPopMatrix(void);
void glLoadMatrixf(const GLfloat* m);
void glMultMatrixf(const GLfloat* m);
void glFrustum(double left, double right, double bottom, double top, double near, double far);
void glOrtho(double left, double right, double bottom, double top, double near, double far);
void glRotatef(GLfloat angle, GLfloat x, GLfloat y, GLfloat z);
void glTranslatef(GLfloat x, GLfloat y, GLfloat z);
void glScalef(GLfloat x, GLfloat y, GLfloat z);

// Fixed-function lighting
void glLightfv(GLenum light, GLenum pname, const GLfloat* params);
void glLightModelfv(GLenum pname, const GLfloat* params);
void glColorMaterial(GLenum face, GLenum mode);
void glMaterialfv(GLenum face, GLenum pname, const GLfloat* params);

// Fog
void glFogi(GLenum pname, GLint param);
void glFogf(GLenum pname, GLfloat param);
void glFogfv(GLenum pname, const GLfloat* params);

// Texture env / gen (stubs)
void glTexEnvi(GLenum target, GLenum pname, GLint param);
void glTexGeni(GLenum coord, GLenum pname, GLint param);

// Alpha func (stub - alpha discard handled in shader)
void glAlphaFunc(GLenum func, GLclampf ref);

// Polygon mode (stub)
void glPolygonMode(GLenum face, GLenum mode);

//------------------------------------------------------------
// GLES3Compat wrapper functions (override valid GLES3 calls
// that receive legacy caps the native driver would reject)
//------------------------------------------------------------

void GLES3_Enable(GLenum cap);
void GLES3_Disable(GLenum cap);
GLboolean GLES3_IsEnabled(GLenum cap);
void GLES3_DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices);
void GLES3_InvalidateCachePtr(const void *ptr);
void GLES3_SetVertexCount(GLsizei n);
void GLES3_GetFloatv(GLenum pname, GLfloat* params);
void GLES3_GetIntegerv(GLenum pname, GLint* params);
void GLES3_GetBooleanv(GLenum pname, GLboolean* params);
void GLES3_Hint(GLenum target, GLenum mode);
void GLES3_BlendFunc(GLenum sfactor, GLenum dfactor);
void GLES3_DepthMask(GLboolean flag);

// Redirect valid-GLES3 calls that need our interception
#define glEnable        GLES3_Enable
#define glDisable       GLES3_Disable
#define glIsEnabled     GLES3_IsEnabled
#define glBlendFunc     GLES3_BlendFunc
#define glDepthMask     GLES3_DepthMask
#define glDrawElements  GLES3_DrawElements
#define glGetBooleanv   GLES3_GetBooleanv
#define glGetFloatv     GLES3_GetFloatv
#define glGetIntegerv   GLES3_GetIntegerv
#define glHint          GLES3_Hint

//------------------------------------------------------------
// Init function – call from OGL_Boot
//------------------------------------------------------------
void GLES3Compat_Init(void);

#endif // __EMSCRIPTEN__
