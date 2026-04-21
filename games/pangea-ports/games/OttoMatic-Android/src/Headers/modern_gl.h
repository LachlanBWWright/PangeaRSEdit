//
// modern_gl.h
// Modern OpenGL/WebGL abstraction layer for Emscripten
//

#pragma once

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include <SDL3/SDL_opengl.h>

/****************************/
/*    CONSTANTS             */
/****************************/

#define MAX_LIGHTS 4
#define MAX_VERTEX_ATTRIBUTES 6

// Vertex attribute locations
#define ATTRIB_LOCATION_POSITION  0
#define ATTRIB_LOCATION_NORMAL    1
#define ATTRIB_LOCATION_COLOR     2
#define ATTRIB_LOCATION_TEXCOORD0 3
#define ATTRIB_LOCATION_TEXCOORD1 4

// Alpha test functions
#define MODERN_GL_ALPHA_NEVER    0
#define MODERN_GL_ALPHA_LESS     1
#define MODERN_GL_ALPHA_EQUAL    2
#define MODERN_GL_ALPHA_LEQUAL   3
#define MODERN_GL_ALPHA_GREATER  4
#define MODERN_GL_ALPHA_NOTEQUAL 5
#define MODERN_GL_ALPHA_GEQUAL   6
#define MODERN_GL_ALPHA_ALWAYS   7

// Fog modes
#define MODERN_GL_FOG_LINEAR 0
#define MODERN_GL_FOG_EXP    1
#define MODERN_GL_FOG_EXP2   2

/****************************/
/*    TYPES                 */
/****************************/

typedef struct
{
    GLuint program;

    // Attribute locations
    GLint aPosition;
    GLint aNormal;
    GLint aColor;
    GLint aTexCoord0;
    GLint aTexCoord1;

    // Uniform locations
    GLint uMVPMatrix;
    GLint uModelViewMatrix;
    GLint uNormalMatrix;
    GLint uAmbientLight;
    GLint uLightDirection;
    GLint uLightColor;
    GLint uNumLights;
    GLint uFogEnabled;
    GLint uFogStart;
    GLint uFogEnd;
    GLint uFogDensity;
    GLint uFogMode;
    GLint uFogColor;
    GLint uMaterialColor;
    GLint uUseLighting;
    GLint uUseVertexColor;
    GLint uUseTexture0;
    GLint uUseTexture1;
    GLint uTextureMatrix;
    GLint uTexture0;
    GLint uTexture1;
    GLint uMultiTextureMode;
    GLint uMultiTextureCombine;
    GLint uUseSphereMap;
    GLint uAlphaTestEnabled;
    GLint uAlphaFunc;
    GLint uAlphaRef;
    GLint uGlobalTransparency;
    GLint uGlobalColorFilter;
} ModernGLShaderProgram;

typedef struct
{
    GLuint vbo;
    GLuint ibo;
    GLuint vao; // Not used in WebGL 1.0, but kept for future WebGL 2.0 support

    int numVertices;
    int numIndices;

    GLfloat* positions;
    GLfloat* normals;
    GLfloat* colors;
    GLfloat* texCoords0;
    GLfloat* texCoords1;
    GLuint* indices;

    Boolean needsUpload;
    Boolean dynamic;
} ModernGLGeometry;

typedef struct
{
    // Current shader state
    Boolean useLighting;
    Boolean useVertexColor;
    Boolean useTexture0;
    Boolean useTexture1;
    Boolean useSphereMap;

    // Current material
    float materialColor[4];

    // Lighting state
    float ambientLight[3];
    float lightDirection[MAX_LIGHTS][3];
    float lightColor[MAX_LIGHTS][3];
    int numLights;

    // Fog state
    Boolean fogEnabled;
    int fogMode;
    float fogStart;
    float fogEnd;
    float fogDensity;
    float fogColor[3];

    // Alpha test state
    Boolean alphaTestEnabled;
    int alphaFunc;
    float alphaRef;

    // Multi-texture state
    int multiTextureMode;
    int multiTextureCombine;

    // Current matrices
    float mvpMatrix[16];
    float modelViewMatrix[16];
    float normalMatrix[9];
    float textureMatrix[16];

    // Global state
    float globalTransparency;
    float globalColorFilter[3];

    // Dirty flags — each bit marks a group of uniforms that needs re-upload.
    // This avoids redundant glUniform* calls across draw calls when only a
    // subset of the state has actually changed.
    uint32_t dirtyFlags;

} ModernGLState;

// Dirty flag bits for ModernGLState.dirtyFlags
#define MODERNGL_DIRTY_MATRICES     (1u << 0)
#define MODERNGL_DIRTY_LIGHTING     (1u << 1)
#define MODERNGL_DIRTY_FOG          (1u << 2)
#define MODERNGL_DIRTY_MATERIAL     (1u << 3)
#define MODERNGL_DIRTY_TEXTURES     (1u << 4)
#define MODERNGL_DIRTY_ALPHA        (1u << 5)
#define MODERNGL_DIRTY_GLOBALS      (1u << 6)
#define MODERNGL_DIRTY_ALL          0xFFFFFFFFu

/****************************/
/*    GLOBALS               */
/****************************/

extern ModernGLShaderProgram gModernGLShader;
extern ModernGLState gModernGLState;

/****************************/
/*    PROTOTYPES            */
/****************************/

// Initialization
void ModernGL_Init(void);
void ModernGL_Shutdown(void);

// Shader management
Boolean ModernGL_LoadShaders(void);
void ModernGL_UseShader(void);
void ModernGL_UpdateUniforms(void);

// Geometry management
ModernGLGeometry* ModernGL_CreateGeometry(int numVertices, int numIndices, Boolean dynamic);
void ModernGL_UploadGeometry(ModernGLGeometry* geom);
void ModernGL_DrawGeometry(ModernGLGeometry* geom, GLenum mode);
void ModernGL_FreeGeometry(ModernGLGeometry* geom);

// State management
void ModernGL_SetMaterial(float r, float g, float b, float a);
void ModernGL_SetLighting(Boolean enabled);
void ModernGL_SetAmbientLight(float r, float g, float b);
void ModernGL_SetLight(int lightIndex, float dirX, float dirY, float dirZ, float r, float g, float b);
void ModernGL_SetFog(Boolean enabled, int mode, float start, float end, float density, float r, float g, float b);
void ModernGL_SetAlphaTest(Boolean enabled, int func, float ref);
void ModernGL_SetMatrices(const float* mvp, const float* modelView, const float* normal);
void ModernGL_SetTextureMatrix(const float* texMatrix);
void ModernGL_SetTextures(Boolean tex0, Boolean tex1, Boolean sphereMap);
void ModernGL_SetMultiTexture(int mode, int combine);

// Immediate mode emulation helpers
typedef struct
{
    GLfloat* positions;
    GLfloat* normals;
    GLfloat* colors;
    GLfloat* texCoords;
    int vertexCount;
    int capacity;
    GLenum mode;

    GLfloat currentColor[4];
    GLfloat currentNormal[3];
    GLfloat currentTexCoord[2];
} ImmediateModeBuffer;

extern ImmediateModeBuffer gImmediateModeBuffer;

void ModernGL_BeginImmediateMode(GLenum mode);
void ModernGL_EndImmediateMode(void);
void ModernGL_ImmediateColor(float r, float g, float b, float a);
void ModernGL_ImmediateNormal(float x, float y, float z);
void ModernGL_ImmediateTexCoord(float u, float v);
void ModernGL_ImmediateVertex(float x, float y, float z);

// Matrix helpers
void ModernGL_Matrix4x4ToFloat16(const OGLMatrix4x4* in, float* out);
void ModernGL_Matrix3x3FromMatrix4x4(const OGLMatrix4x4* in, float* out);

#endif // __EMSCRIPTEN__ || __ANDROID__
