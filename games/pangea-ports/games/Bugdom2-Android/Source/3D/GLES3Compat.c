// GLES3Compat.c
// GLES3/WebGL2 compatibility layer – replaces legacy OpenGL 1.x calls.
// Compiled for Emscripten/WebAssembly and Android GLES builds.

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

// Include the native GLES3 headers BEFORE gles3compat.h so that our
// GLES3_* wrapper functions can call the real GL entry points without
// being caught by the macros we define in gles3compat.h.
#include <GLES3/gl3.h>

#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>
#include <stdint.h>

// Ensure M_PI is available (not guaranteed by all compilers/platforms)
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#include <stddef.h>   // offsetof
#include <stdio.h>    // printf fallback

// Pull in our own constant/type definitions without the macros
// (gles3compat.h is NOT included here; this file is the implementation
//  and needs direct access to native GL names).
#define GL_MODELVIEW              0x1700
#define GL_PROJECTION             0x1701
#define GL_QUADS                  0x0007
#define GL_QUAD_STRIP             0x0008
#define GL_POLYGON                0x0009
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
#define GL_NEVER                  0x0200
#define GL_LESS                   0x0201
#define GL_EQUAL                  0x0202
#define GL_LEQUAL                 0x0203
#define GL_GREATER                0x0204
#define GL_NOTEQUAL               0x0205
#define GL_GEQUAL                 0x0206
#define GL_ALWAYS                 0x0207
#define GL_VERTEX_ARRAY           0x8074
#define GL_NORMAL_ARRAY           0x8075
#define GL_COLOR_ARRAY            0x8076
#define GL_TEXTURE_COORD_ARRAY    0x8078
#define GL_POSITION               0x1203
#define GL_AMBIENT                0x1200
#define GL_DIFFUSE                0x1201
#define GL_LIGHT_MODEL_AMBIENT    0x0B53
#define GL_FOG_MODE               0x0B65
#define GL_FOG_DENSITY            0x0B62
#define GL_FOG_START              0x0B63
#define GL_FOG_END                0x0B64
#define GL_FOG_COLOR              0x0B66
#define GL_LINEAR                 0x2601
#define GL_EXP                    0x0800
#define GL_EXP2                   0x0801
#define GL_FOG_HINT               0x0C54
#define GL_PROJECTION_MATRIX      0x0BA7
#define GL_MODELVIEW_MATRIX       0x0BA6
#define GL_CURRENT_COLOR          0x0B00
#define GL_BLEND_SRC_COMPAT       0x0BE1
#define GL_BLEND_DST_COMPAT       0x0BE0
#define GL_TEXTURE_2D_COMPAT      0x0DE1  // same value as GL_TEXTURE_2D; used as a legacy enable cap

//=============================================================
// GLSL ES 3.00 shaders
//=============================================================

static const char* kVertSrc =
"#version 300 es\n"
"uniform mat4 u_proj;\n"
"uniform mat4 u_mv;\n"
"uniform mat4 u_texMatrix;\n"
"uniform bool u_lighting;\n"
"uniform vec4 u_ambient;\n"
"uniform int  u_nLights;\n"
"uniform vec3 u_lightDir[4];\n"
"uniform vec4 u_lightDiff[4];\n"
"uniform bool u_fog;\n"
"uniform int  u_fogMode;\n"
"uniform float u_fogDensity;\n"
"uniform float u_fogStart;\n"
"uniform float u_fogEnd;\n"
"layout(location=0) in vec3 a_pos;\n"
"layout(location=1) in vec3 a_norm;\n"
"layout(location=2) in vec4 a_color;\n"
"layout(location=3) in vec2 a_uv;\n"
"out vec4 v_color;\n"
"out vec2 v_uv;\n"
"out float v_fog;\n"
"void main(){\n"
"  vec4 ep = u_mv * vec4(a_pos,1.0);\n"
"  gl_Position = u_proj * ep;\n"
"  vec4 base = a_color;\n"
"  if(u_lighting){\n"
"    vec3 n = normalize(mat3(u_mv) * a_norm);\n"
"    vec4 lit = u_ambient * base;\n"
"    for(int i=0;i<4;i++){\n"
"      if(i<u_nLights){\n"
"        float d=max(dot(n,normalize(u_lightDir[i])),0.0);\n"
"        lit+=vec4(d*u_lightDiff[i].rgb*base.rgb,0.0);\n"
"      }\n"
"    }\n"
"    v_color=vec4(clamp(lit.rgb,0.0,1.0),base.a);\n"
"  } else {\n"
"    v_color=base;\n"
"  }\n"
"  v_uv=(u_texMatrix*vec4(a_uv,0.0,1.0)).xy;\n"
"  if(u_fog){\n"
"    float dist=abs(ep.z);\n"
"    if(u_fogMode==1){\n"   // GL_LINEAR
"      v_fog=clamp((u_fogEnd-dist)/max(u_fogEnd-u_fogStart,0.0001),0.0,1.0);\n"
"    } else if(u_fogMode==2){\n"  // GL_EXP
"      v_fog=exp(-u_fogDensity*dist);\n"
"    } else {\n"            // GL_EXP2
"      float fd=u_fogDensity*dist;\n"
"      v_fog=exp(-fd*fd);\n"
"    }\n"
"  } else {\n"
"    v_fog=1.0;\n"
"  }\n"
"}\n";

static const char* kFragSrc =
"#version 300 es\n"
"precision mediump float;\n"
"uniform sampler2D u_tex;\n"
"uniform bool u_useTex;\n"
"uniform vec4 u_fogColor;\n"
"uniform bool u_alphaTest;\n"
"uniform int u_alphaFunc;\n"
"uniform float u_alphaRef;\n"
"in vec4 v_color;\n"
"in vec2 v_uv;\n"
"in float v_fog;\n"
"out vec4 fragColor;\n"
"void main(){\n"
"  vec4 c;\n"
"  if(u_useTex){\n"
"    c=v_color*texture(u_tex,v_uv);\n"
"  } else {\n"
"    c=v_color;\n"
"  }\n"
"  if(u_alphaTest){\n"
"    float a = c.a;\n"
"    if      (u_alphaFunc == 0) discard; // NEVER\n"
"    else if (u_alphaFunc == 1 && a >= u_alphaRef) discard; // LESS\n"
"    else if (u_alphaFunc == 2 && a != u_alphaRef) discard; // EQUAL\n"
"    else if (u_alphaFunc == 3 && a >  u_alphaRef) discard; // LEQUAL\n"
"    else if (u_alphaFunc == 4 && a <= u_alphaRef) discard; // GREATER\n"
"    else if (u_alphaFunc == 5 && a == u_alphaRef) discard; // NOTEQUAL\n"
"    else if (u_alphaFunc == 6 && a <  u_alphaRef) discard; // GEQUAL\n"
"    else if (u_alphaFunc == 7) {} // ALWAYS\n"
"  } else {\n"
"    if(c.a==0.0) discard;\n"
"  }\n"
"  c.rgb=mix(u_fogColor.rgb,c.rgb,v_fog);\n"
"  fragColor=c;\n"
"}\n";

//=============================================================
// GL objects
//=============================================================

static GLuint gProgram   = 0;
static GLuint gVAO       = 0;
static GLuint gImmVBO    = 0;   // VBO for immediate mode vertex data
static GLuint gArrayVBO  = 0;   // reserved (was streaming draw path, now unused)
static GLuint gArrayEBO  = 0;   // reserved (was streaming draw path, now unused)
static size_t gImmVBOSize   = 0;
static size_t gArrayVBOSize = 0;
static size_t gArrayEBOSize = 0;

// Uniform locations
static GLint uProj, uMV, uTexMatrix, uLighting, uAmbient, uNLights;
static GLint uLightDir[4], uLightDiff[4];
static GLint uFog, uFogMode, uFogDensity, uFogStart, uFogEnd, uFogColor;
static GLint uUseTex, uTex;
static GLint uAlphaTest, uAlphaFunc, uAlphaRef;

//=============================================================
// Draw cache – 128-entry LRU, keyed by client-array pointers
//=============================================================
// Static geometry (models, tiles) that never changes after loading can be
// cached on the GPU indefinitely.  Dynamic geometry (skeletons, terrain,
// water, fences, snake) must call GLES3_InvalidateCachePtr() before each
// draw to evict stale entries and force a fresh upload.

#define B2_DRAW_CACHE_SIZE 128

typedef struct {
    const void *vert_ptr;   // gVertArrayPtr   (NULL if disabled)
    const void *norm_ptr;   // gNormArrayPtr   (NULL if disabled)
    const void *color_ptr;  // gColorArrayPtr  (NULL if disabled)
    const void *texc_ptr;   // gTexcArrayPtr   (NULL if disabled)
    const void *idx_ptr;    // indices pointer
    int         nVerts;
    int         nIdx;
    GLenum      idx_type;   // GL_UNSIGNED_SHORT or GL_UNSIGNED_INT
    uint8_t     attrib_mask;  // bit0=vert,bit1=norm,bit2=color,bit3=texc
    GLenum      color_type;   // GL_FLOAT or GL_UNSIGNED_BYTE; 0 = no color
    GLint       color_size;
    uint8_t     valid;
    GLuint      vbo;        // packed attribute VBO (same interleaved layout)
    GLuint      ebo;        // index EBO
    size_t      offVert, offNorm, offColor, offTexc;  // byte offsets in vbo
    uint64_t    lru_tick;
} B2DrawCacheEntry;

static B2DrawCacheEntry sB2DC[B2_DRAW_CACHE_SIZE];
static uint64_t sB2DCTick = 0;

//=============================================================
// Matrix stack (software, column-major like OpenGL)
//=============================================================

#define MATRIX_STACK_DEPTH 32
typedef float Mat4[16];

static int   gMatMode        = GL_MODELVIEW;
static Mat4  gMVStack[MATRIX_STACK_DEPTH];
static int   gMVTop          = 0;
static Mat4  gProjStack[MATRIX_STACK_DEPTH];
static int   gProjTop        = 0;
static Mat4  gTexStack[MATRIX_STACK_DEPTH];
static int   gTexTop         = 0;

static inline Mat4* CurMat(void)
{
    if (gMatMode == GL_PROJECTION) return &gProjStack[gProjTop];
    if (gMatMode == GL_TEXTURE)    return &gTexStack[gTexTop];
    return &gMVStack[gMVTop];
}

static void MatIdentity(float* m)
{
    memset(m, 0, 16 * sizeof(float));
    m[0] = m[5] = m[10] = m[15] = 1.0f;
}

// C = A * B  (column-major 4x4)
static void MatMul(const float* A, const float* B, float* C)
{
    float tmp[16];
    for (int col = 0; col < 4; col++) {
        for (int row = 0; row < 4; row++) {
            float v = 0;
            for (int k = 0; k < 4; k++)
                v += A[k*4+row] * B[col*4+k];
            tmp[col*4+row] = v;
        }
    }
    memcpy(C, tmp, 16 * sizeof(float));
}

// Multiply current matrix by M in-place: cur = cur * M
static void MatMulCur(const float* M)
{
    float* c = *CurMat();
    float tmp[16];
    MatMul(c, M, tmp);
    memcpy(c, tmp, 16 * sizeof(float));
}

//=============================================================
// Lighting state
//=============================================================

static bool  gLightingEnabled    = false;
static bool  gLightEnabled[4]    = {false,false,false,false};
static float gLightDir[4][3];    // eye-space direction
static float gLightDiff[4][4];
static float gAmbientColor[4]    = {0.2f,0.2f,0.2f,1.0f};
// Number of active lights is computed dynamically in UploadUniforms()

//=============================================================
// Fog state
//=============================================================

static bool  gFogEnabled   = false;
static int   gFogMode      = GL_LINEAR;
static float gFogDensity   = 1.0f;
static float gFogStart     = 0.0f;
static float gFogEnd       = 1.0f;
static float gFogColorVal[4] = {0,0,0,0};

//=============================================================
// Miscellaneous state
//=============================================================

static bool  gNormalizeEnabled      = false;
static bool  gColorMaterialEnabled  = false;
static bool  gTexture2DEnabled      = false;
static bool  gTexGenSEnabled        = false;
static bool  gTexGenTEnabled        = false;
static bool  gBlendEnabled          = false;
static bool  gCullFaceEnabled       = false;
static bool  gDepthTestEnabled      = false;
static bool  gDepthWriteEnabled     = true;
static bool  gAlphaTestEnabled      = false;
static int   gAlphaFuncVal          = GL_ALWAYS;
static float gAlphaRefVal           = 0.0f;
static GLenum gBlendSrcFactor       = GL_ONE;
static GLenum gBlendDstFactor       = GL_ZERO;
static float gCurrentColor[4]       = {1,1,1,1};
static float gCurrentNormal[3]      = {0,0,1};
static float gCurrentTexCoord[2]    = {0,0};

//=============================================================
// Client array state
//=============================================================

static bool         gVertArrayEnabled   = false;
static bool         gNormArrayEnabled   = false;
static bool         gColorArrayEnabled  = false;
static bool         gTexcArrayEnabled   = false;
static const void*  gVertArrayPtr       = NULL;
static const void*  gNormArrayPtr       = NULL;
static const void*  gColorArrayPtr      = NULL;
static GLenum       gColorArrayType     = GL_FLOAT;
static GLint        gColorArraySize     = 4;
static const void*  gTexcArrayPtr       = NULL;
static int          gClientActiveUnit   = 0;  // texture unit for ClientActiveTexture
// Vertex count hint set by callers via GLES3_SetVertexCount() to avoid O(count)
// index scan in GLES3_DrawElements.
static GLsizei      gVertexCountHint    = 0;

//=============================================================
// Immediate mode
//=============================================================

#define IM_MAX_VERTS 8192

typedef struct {
    float x,  y,  z;
    float nx, ny, nz;
    float r,  g,  b,  a;
    float u,  v;
} IMVert;

static IMVert  gIMBuf[IM_MAX_VERTS];
static int     gIMCount  = 0;
static GLenum  gIMMode   = 0;

//=============================================================
// Helper: upload uniforms and set up vertex attribs before draw
//=============================================================

static void UploadUniforms(void)
{
    glUniformMatrix4fv(uMV,        1, GL_FALSE, gMVStack[gMVTop]);
    glUniformMatrix4fv(uProj,      1, GL_FALSE, gProjStack[gProjTop]);
    glUniformMatrix4fv(uTexMatrix, 1, GL_FALSE, gTexStack[gTexTop]);

    // Lighting
    glUniform1i(uLighting, gLightingEnabled ? 1 : 0);
    glUniform4fv(uAmbient, 1, gAmbientColor);

    int n = 0;
    for (int i = 0; i < 4; i++) {
        if (gLightEnabled[i]) {
            glUniform3fv(uLightDir[n],  1, gLightDir[i]);
            glUniform4fv(uLightDiff[n], 1, gLightDiff[i]);
            n++;
        }
    }
    glUniform1i(uNLights, n);

    // Fog
    glUniform1i(uFog, gFogEnabled ? 1 : 0);
    if (gFogEnabled) {
        int mappedMode = 1; // GL_LINEAR
        if (gFogMode == GL_EXP)  mappedMode = 2;
        if (gFogMode == GL_EXP2) mappedMode = 3;
        glUniform1i(uFogMode, mappedMode);
        glUniform1f(uFogDensity, gFogDensity);
        glUniform1f(uFogStart,   gFogStart);
        glUniform1f(uFogEnd,     gFogEnd);
        glUniform4fv(uFogColor, 1, gFogColorVal);
    }

    // Texture
    glUniform1i(uUseTex, gTexture2DEnabled ? 1 : 0);
    glUniform1i(uTex, 0);

    // Alpha test
    glUniform1i(uAlphaTest, gAlphaTestEnabled ? 1 : 0);
    if (gAlphaTestEnabled) {
        int af = 7; // ALWAYS
        if      (gAlphaFuncVal == GL_NEVER)    af = 0;
        else if (gAlphaFuncVal == GL_LESS)     af = 1;
        else if (gAlphaFuncVal == GL_EQUAL)    af = 2;
        else if (gAlphaFuncVal == GL_LEQUAL)   af = 3;
        else if (gAlphaFuncVal == GL_GREATER)  af = 4;
        else if (gAlphaFuncVal == GL_NOTEQUAL) af = 5;
        else if (gAlphaFuncVal == GL_GEQUAL)   af = 6;
        glUniform1i(uAlphaFunc, af);
        glUniform1f(uAlphaRef,  gAlphaRefVal);
    }
}

//=============================================================
// Shader compilation helper
//=============================================================

static GLuint CompileShader(GLenum type, const char* src)
{
    GLuint s = glCreateShader(type);
    glShaderSource(s, 1, &src, NULL);
    glCompileShader(s);
    GLint ok = 0;
    glGetShaderiv(s, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        char log[512];
        glGetShaderInfoLog(s, sizeof(log), NULL, log);
        // Can't call DoFatalAlert (circular dependency); emit to console via abort
        fprintf(stderr, "GLES3Compat shader error: %s\n", log);
        abort();
    }
    return s;
}

//=============================================================
// GLES3Compat_Init
//=============================================================

// Allow callers to provide the vertex count hint, avoiding the O(count)
// index scan in GLES3_DrawElements.  Call before glDrawElements.
void GLES3_SetVertexCount(GLsizei n)
{
    gVertexCountHint = n;
}

void GLES3Compat_Init(void)
{
    // Compile shaders
    GLuint vs = CompileShader(GL_VERTEX_SHADER,   kVertSrc);
    GLuint fs = CompileShader(GL_FRAGMENT_SHADER, kFragSrc);

    gProgram = glCreateProgram();
    glAttachShader(gProgram, vs);
    glAttachShader(gProgram, fs);
    glLinkProgram(gProgram);

    GLint ok = 0;
    glGetProgramiv(gProgram, GL_LINK_STATUS, &ok);
    if (!ok) {
        char log[512];
        glGetProgramInfoLog(gProgram, sizeof(log), NULL, log);
        fprintf(stderr, "GLES3Compat link error: %s\n", log);
        abort();
    }
    glDeleteShader(vs);
    glDeleteShader(fs);

    // Fetch uniform locations
    uProj        = glGetUniformLocation(gProgram, "u_proj");
    uMV          = glGetUniformLocation(gProgram, "u_mv");
    uTexMatrix   = glGetUniformLocation(gProgram, "u_texMatrix");
    uLighting    = glGetUniformLocation(gProgram, "u_lighting");
    uAmbient     = glGetUniformLocation(gProgram, "u_ambient");
    uNLights     = glGetUniformLocation(gProgram, "u_nLights");
    uLightDir[0] = glGetUniformLocation(gProgram, "u_lightDir[0]");
    uLightDir[1] = glGetUniformLocation(gProgram, "u_lightDir[1]");
    uLightDir[2] = glGetUniformLocation(gProgram, "u_lightDir[2]");
    uLightDir[3] = glGetUniformLocation(gProgram, "u_lightDir[3]");
    uLightDiff[0]= glGetUniformLocation(gProgram, "u_lightDiff[0]");
    uLightDiff[1]= glGetUniformLocation(gProgram, "u_lightDiff[1]");
    uLightDiff[2]= glGetUniformLocation(gProgram, "u_lightDiff[2]");
    uLightDiff[3]= glGetUniformLocation(gProgram, "u_lightDiff[3]");
    uFog         = glGetUniformLocation(gProgram, "u_fog");
    uFogMode     = glGetUniformLocation(gProgram, "u_fogMode");
    uFogDensity  = glGetUniformLocation(gProgram, "u_fogDensity");
    uFogStart    = glGetUniformLocation(gProgram, "u_fogStart");
    uFogEnd      = glGetUniformLocation(gProgram, "u_fogEnd");
    uFogColor    = glGetUniformLocation(gProgram, "u_fogColor");
    uUseTex      = glGetUniformLocation(gProgram, "u_useTex");
    uTex         = glGetUniformLocation(gProgram, "u_tex");
    uAlphaTest   = glGetUniformLocation(gProgram, "u_alphaTest");
    uAlphaFunc   = glGetUniformLocation(gProgram, "u_alphaFunc");
    uAlphaRef    = glGetUniformLocation(gProgram, "u_alphaRef");

    // Create VAO and immediate-mode VBO
    glGenVertexArrays(1, &gVAO);
    glGenBuffers(1, &gImmVBO);
    glGenBuffers(1, &gArrayVBO);
    glGenBuffers(1, &gArrayEBO);

    // Initialise matrix stacks to identity
    MatIdentity(gMVStack[0]);
    MatIdentity(gProjStack[0]);
    MatIdentity(gTexStack[0]);

    // Bind our program so the game can start calling legacy GL immediately
    glUseProgram(gProgram);
    glBindVertexArray(gVAO);
}

//=============================================================
// glEnable / glDisable / glIsEnabled overrides
//=============================================================

void GLES3_Enable(GLenum cap)
{
    switch (cap)
    {
        case GL_BLEND:          gBlendEnabled      = true; glEnable(cap); return;
        case GL_CULL_FACE:      gCullFaceEnabled   = true; glEnable(cap); return;
        case GL_DEPTH_TEST:     gDepthTestEnabled  = true; glEnable(cap); return;
        case GL_LIGHTING:       gLightingEnabled   = true; return;
        case GL_LIGHT0:         gLightEnabled[0]   = true; return;
        case GL_LIGHT1:         gLightEnabled[1]   = true; return;
        case GL_LIGHT2:         gLightEnabled[2]   = true; return;
        case GL_LIGHT3:         gLightEnabled[3]   = true; return;
        case GL_FOG:            gFogEnabled        = true; return;
        case GL_NORMALIZE:      gNormalizeEnabled  = true; return;
        case GL_COLOR_MATERIAL: gColorMaterialEnabled = true; return;
        case GL_TEXTURE_GEN_S:  gTexGenSEnabled    = true; return;
        case GL_TEXTURE_GEN_T:  gTexGenTEnabled    = true; return;
        case GL_RESCALE_NORMAL: return;  // no-op
        case GL_ALPHA_TEST:     gAlphaTestEnabled  = true; return;
        case GL_TEXTURE_2D_COMPAT: gTexture2DEnabled = true; return;
        default: glEnable(cap); break;
    }
}

void GLES3_Disable(GLenum cap)
{
    switch (cap)
    {
        case GL_BLEND:          gBlendEnabled      = false; glDisable(cap); return;
        case GL_CULL_FACE:      gCullFaceEnabled   = false; glDisable(cap); return;
        case GL_DEPTH_TEST:     gDepthTestEnabled  = false; glDisable(cap); return;
        case GL_LIGHTING:       gLightingEnabled   = false; return;
        case GL_LIGHT0:         gLightEnabled[0]   = false; return;
        case GL_LIGHT1:         gLightEnabled[1]   = false; return;
        case GL_LIGHT2:         gLightEnabled[2]   = false; return;
        case GL_LIGHT3:         gLightEnabled[3]   = false; return;
        case GL_FOG:            gFogEnabled        = false; return;
        case GL_NORMALIZE:      gNormalizeEnabled  = false; return;
        case GL_COLOR_MATERIAL: gColorMaterialEnabled = false; return;
        case GL_TEXTURE_GEN_S:  gTexGenSEnabled    = false; return;
        case GL_TEXTURE_GEN_T:  gTexGenTEnabled    = false; return;
        case GL_RESCALE_NORMAL: return;
        case GL_ALPHA_TEST:     gAlphaTestEnabled  = false; return;
        case GL_TEXTURE_2D_COMPAT: gTexture2DEnabled = false; return;
        default: glDisable(cap); break;
    }
}

GLboolean GLES3_IsEnabled(GLenum cap)
{
    switch (cap)
    {
        case GL_BLEND:          return gBlendEnabled      ? GL_TRUE : GL_FALSE;
        case GL_CULL_FACE:      return gCullFaceEnabled   ? GL_TRUE : GL_FALSE;
        case GL_DEPTH_TEST:     return gDepthTestEnabled  ? GL_TRUE : GL_FALSE;
        case GL_LIGHTING:       return gLightingEnabled   ? GL_TRUE : GL_FALSE;
        case GL_FOG:            return gFogEnabled        ? GL_TRUE : GL_FALSE;
        case GL_NORMALIZE:      return gNormalizeEnabled  ? GL_TRUE : GL_FALSE;
        case GL_ALPHA_TEST:     return gAlphaTestEnabled  ? GL_TRUE : GL_FALSE;
        case GL_TEXTURE_2D_COMPAT: return gTexture2DEnabled ? GL_TRUE : GL_FALSE;
        default: return glIsEnabled(cap);
    }
}

void GLES3_BlendFunc(GLenum sfactor, GLenum dfactor)
{
    gBlendSrcFactor = sfactor;
    gBlendDstFactor = dfactor;
    glBlendFunc(sfactor, dfactor);
}

void GLES3_DepthMask(GLboolean flag)
{
    gDepthWriteEnabled = flag ? true : false;
    glDepthMask(flag);
}

//=============================================================
// glHint override (ignore unsupported targets like GL_FOG_HINT)
//=============================================================

void GLES3_Hint(GLenum target, GLenum mode)
{
    if (target == GL_FOG_HINT)
        return;  // no-op – fog hints not meaningful in GLES3
    glHint(target, mode);
}

//=============================================================
// glGetFloatv / glGetIntegerv overrides
//=============================================================

void GLES3_GetFloatv(GLenum pname, GLfloat* p)
{
    switch (pname)
    {
        case GL_PROJECTION_MATRIX:
            memcpy(p, gProjStack[gProjTop], 16 * sizeof(float));
            return;
        case GL_MODELVIEW_MATRIX:
            memcpy(p, gMVStack[gMVTop], 16 * sizeof(float));
            return;
        case GL_CURRENT_COLOR:
            memcpy(p, gCurrentColor, 4 * sizeof(float));
            return;
        default:
            glGetFloatv(pname, p);
            break;
    }
}

void GLES3_GetIntegerv(GLenum pname, GLint* p)
{
    switch (pname)
    {
        case GL_BLEND_SRC_COMPAT:  // 0x0BE1
            *p = (GLint) gBlendSrcFactor;
            return;
        case GL_BLEND_DST_COMPAT:  // 0x0BE0
            *p = (GLint) gBlendDstFactor;
            return;
        default:
            glGetIntegerv(pname, p);
    }
}

void GLES3_GetBooleanv(GLenum pname, GLboolean* p)
{
    switch (pname)
    {
        case GL_DEPTH_WRITEMASK:
            *p = gDepthWriteEnabled ? GL_TRUE : GL_FALSE;
            return;
        default:
            glGetBooleanv(pname, p);
            break;
    }
}

//=============================================================
// Client array functions
//=============================================================

void glEnableClientState(GLenum array)
{
    switch (array) {
        case GL_VERTEX_ARRAY:        gVertArrayEnabled = true;  break;
        case GL_NORMAL_ARRAY:        gNormArrayEnabled = true;  break;
        case GL_COLOR_ARRAY:         gColorArrayEnabled = true; break;
        case GL_TEXTURE_COORD_ARRAY: gTexcArrayEnabled = true;  break;
        default: break;
    }
}

void glDisableClientState(GLenum array)
{
    switch (array) {
        case GL_VERTEX_ARRAY:        gVertArrayEnabled = false;  break;
        case GL_NORMAL_ARRAY:        gNormArrayEnabled = false;  break;
        case GL_COLOR_ARRAY:         gColorArrayEnabled = false; break;
        case GL_TEXTURE_COORD_ARRAY: gTexcArrayEnabled = false;  break;
        default: break;
    }
}

void glVertexPointer(GLint size, GLenum type, GLsizei stride, const void* ptr)
{
    (void)size; (void)type; (void)stride;
    gVertArrayPtr = ptr;
}

void glNormalPointer(GLenum type, GLsizei stride, const void* ptr)
{
    (void)type; (void)stride;
    gNormArrayPtr = ptr;
}

void glColorPointer(GLint size, GLenum type, GLsizei stride, const void* ptr)
{
    (void)stride;
    gColorArrayPtr  = ptr;
    gColorArrayType = type;
    gColorArraySize = size;
}

void glTexCoordPointer(GLint size, GLenum type, GLsizei stride, const void* ptr)
{
    (void)size; (void)type; (void)stride;
    // Only track unit 0
    if (gClientActiveUnit == 0)
        gTexcArrayPtr = ptr;
}

void glClientActiveTexture(GLenum texture)
{
    gClientActiveUnit = (texture == 0x84C0) ? 0 : 1;  // GL_TEXTURE0 = 0x84C0
}

// Evict all draw-cache entries whose key contains 'ptr'.
// Call after writing new data to any CPU-side vertex/index buffer.
void GLES3_InvalidateCachePtr(const void *ptr)
{
    for (int i = 0; i < B2_DRAW_CACHE_SIZE; i++)
    {
        if (sB2DC[i].valid && (
                sB2DC[i].vert_ptr  == ptr ||
                sB2DC[i].norm_ptr  == ptr ||
                sB2DC[i].color_ptr == ptr ||
                sB2DC[i].texc_ptr  == ptr ||
                sB2DC[i].idx_ptr   == ptr))
        {
            sB2DC[i].valid = 0;
        }
    }
}

//=============================================================
// glDrawElements override – bind attribs then draw
//=============================================================

void GLES3_DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices)
{
    glUseProgram(gProgram);
    glBindVertexArray(gVAO);

    // Determine vertex count from hint or by scanning the index buffer.
    int nVerts = 0;
    if (gVertexCountHint > 0) {
        nVerts = (int)gVertexCountHint;
        gVertexCountHint = 0;
    } else {
        if (type == GL_UNSIGNED_INT) {
            const GLuint* idx = (const GLuint*)indices;
            for (GLsizei i = 0; i < count; i++)
                if ((int)idx[i] + 1 > nVerts) nVerts = (int)idx[i] + 1;
        } else if (type == GL_UNSIGNED_SHORT) {
            const GLushort* idx = (const GLushort*)indices;
            for (GLsizei i = 0; i < count; i++)
                if ((int)idx[i] + 1 > nVerts) nVerts = (int)idx[i] + 1;
        }
    }
    if (nVerts == 0) return;

    // Build cache key fields
    uint8_t attribMask = 0;
    if (gVertArrayEnabled && gVertArrayPtr)   attribMask |= (1u << 0);
    if (gNormArrayEnabled && gNormArrayPtr)   attribMask |= (1u << 1);
    if (gColorArrayEnabled && gColorArrayPtr) attribMask |= (1u << 2);
    if (gTexcArrayEnabled  && gTexcArrayPtr)  attribMask |= (1u << 3);

    const void *vertPtr  = (attribMask & (1u<<0)) ? gVertArrayPtr  : NULL;
    const void *normPtr  = (attribMask & (1u<<1)) ? gNormArrayPtr  : NULL;
    const void *colorPtr = (attribMask & (1u<<2)) ? gColorArrayPtr : NULL;
    const void *texcPtr  = (attribMask & (1u<<3)) ? gTexcArrayPtr  : NULL;
    GLenum colorType = (attribMask & (1u<<2)) ? gColorArrayType : 0;
    GLint  colorSize = (attribMask & (1u<<2)) ? gColorArraySize : 0;

    // ── Draw-cache lookup ─────────────────────────────────────────────
    int cacheIdx = -1;
    for (int ci = 0; ci < B2_DRAW_CACHE_SIZE; ci++)
    {
        B2DrawCacheEntry *e = &sB2DC[ci];
        if (e->valid &&
            e->vert_ptr    == vertPtr   && e->norm_ptr   == normPtr  &&
            e->color_ptr   == colorPtr  && e->texc_ptr   == texcPtr  &&
            e->idx_ptr     == indices   &&
            e->nVerts      == nVerts    && e->nIdx       == (int)count &&
            e->idx_type    == type      &&
            e->attrib_mask == attribMask &&
            e->color_type  == colorType && e->color_size == colorSize)
        {
            cacheIdx = ci;
            break;
        }
    }

    size_t offVert, offNorm, offColor, offTexc;

    if (cacheIdx >= 0)
    {
        // ── Cache HIT: rebind cached VBO/EBO, skip all uploads ────────
        B2DrawCacheEntry *e = &sB2DC[cacheIdx];
        e->lru_tick = ++sB2DCTick;

        offVert  = e->offVert;
        offNorm  = e->offNorm;
        offColor = e->offColor;
        offTexc  = e->offTexc;

        glBindBuffer(GL_ARRAY_BUFFER, e->vbo);
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, e->ebo);
    }
    else
    {
        // ── Cache MISS: evict LRU slot and upload ─────────────────────
        int evict = 0;
        uint64_t oldest = UINT64_MAX;
        for (int ci = 0; ci < B2_DRAW_CACHE_SIZE; ci++)
        {
            if (!sB2DC[ci].valid) { evict = ci; oldest = 0; break; }
            if (sB2DC[ci].lru_tick < oldest)
            {
                oldest = sB2DC[ci].lru_tick;
                evict  = ci;
            }
        }
        B2DrawCacheEntry *e = &sB2DC[evict];

        if (!e->vbo) glGenBuffers(1, &e->vbo);
        if (!e->ebo) glGenBuffers(1, &e->ebo);

        // Calculate packed VBO layout (same interleaved-offsets approach)
        size_t vertBytes  = 0, normBytes = 0, colorBytes = 0, texcBytes = 0;
        if (attribMask & (1u<<0)) vertBytes  = (size_t)nVerts * 3 * sizeof(float);
        if (attribMask & (1u<<1)) normBytes  = (size_t)nVerts * 3 * sizeof(float);
        if (attribMask & (1u<<2)) {
            colorBytes = (colorType == GL_UNSIGNED_BYTE)
                ? (size_t)nVerts * (size_t)colorSize * sizeof(GLubyte)
                : (size_t)nVerts * (size_t)colorSize * sizeof(float);
        }
        if (attribMask & (1u<<3)) texcBytes  = (size_t)nVerts * 2 * sizeof(float);

        offVert  = 0;
        offNorm  = offVert  + vertBytes;
        offColor = offNorm  + normBytes;
        offTexc  = offColor + colorBytes;
        size_t totalSize = offTexc + texcBytes;

        glBindBuffer(GL_ARRAY_BUFFER, e->vbo);
        if (totalSize > 0)
        {
            glBufferData(GL_ARRAY_BUFFER, (GLsizeiptr)totalSize, NULL, GL_STATIC_DRAW);
            if (vertBytes)  glBufferSubData(GL_ARRAY_BUFFER, (GLintptr)offVert,  (GLsizeiptr)vertBytes,  vertPtr);
            if (normBytes)  glBufferSubData(GL_ARRAY_BUFFER, (GLintptr)offNorm,  (GLsizeiptr)normBytes,  normPtr);
            if (colorBytes) glBufferSubData(GL_ARRAY_BUFFER, (GLintptr)offColor, (GLsizeiptr)colorBytes, colorPtr);
            if (texcBytes)  glBufferSubData(GL_ARRAY_BUFFER, (GLintptr)offTexc,  (GLsizeiptr)texcBytes,  texcPtr);
        }

        size_t indexSize = (size_t)count * (type == GL_UNSIGNED_INT ? sizeof(GLuint) : sizeof(GLushort));
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, e->ebo);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)indexSize, indices, GL_STATIC_DRAW);

        // Store cache entry
        e->vert_ptr    = vertPtr;
        e->norm_ptr    = normPtr;
        e->color_ptr   = colorPtr;
        e->texc_ptr    = texcPtr;
        e->idx_ptr     = indices;
        e->nVerts      = nVerts;
        e->nIdx        = (int)count;
        e->idx_type    = type;
        e->attrib_mask = attribMask;
        e->color_type  = colorType;
        e->color_size  = colorSize;
        e->offVert     = offVert;
        e->offNorm     = offNorm;
        e->offColor    = offColor;
        e->offTexc     = offTexc;
        e->valid       = 1;
        e->lru_tick    = ++sB2DCTick;
    }

    // ── Set up vertex attribute pointers from cached/uploaded VBO ────
    if (attribMask & (1u<<0)) {
        glEnableVertexAttribArray(0);
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, (const void*)offVert);
    } else {
        glDisableVertexAttribArray(0);
        glVertexAttrib3f(0, 0, 0, 0);
    }

    if (attribMask & (1u<<1)) {
        glEnableVertexAttribArray(1);
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 0, (const void*)offNorm);
    } else {
        glDisableVertexAttribArray(1);
        glVertexAttrib3f(1, gCurrentNormal[0], gCurrentNormal[1], gCurrentNormal[2]);
    }

    if (attribMask & (1u<<2)) {
        glEnableVertexAttribArray(2);
        if (colorType == GL_UNSIGNED_BYTE)
            glVertexAttribPointer(2, colorSize, GL_UNSIGNED_BYTE, GL_TRUE, 0, (const void*)offColor);
        else
            glVertexAttribPointer(2, colorSize, GL_FLOAT, GL_FALSE, 0, (const void*)offColor);
    } else {
        glDisableVertexAttribArray(2);
        glVertexAttrib4f(2, gCurrentColor[0], gCurrentColor[1], gCurrentColor[2], gCurrentColor[3]);
    }

    if (attribMask & (1u<<3)) {
        glEnableVertexAttribArray(3);
        glVertexAttribPointer(3, 2, GL_FLOAT, GL_FALSE, 0, (const void*)offTexc);
    } else {
        glDisableVertexAttribArray(3);
        glVertexAttrib2f(3, gCurrentTexCoord[0], gCurrentTexCoord[1]);
    }

    UploadUniforms();

    glDrawElements(mode, count, type, 0);

    // Reset the client active texture unit to 0 after every draw.
    // Multi-texture (sphere-map) objects activate unit 1 at the end of their
    // setup loop and never restore unit 0 before returning.  If the next draw
    // call is a single-texture object it calls glTexCoordPointer without
    // first calling glClientActiveTexture(unit 0), so our override silently
    // ignores the UV pointer update – leaving gTexcArrayPtr pointing at the
    // previous object's UV array and causing garbled terrain / fence UVs.
    // Resetting here ensures every object's UV setup starts with unit 0 active.
    gClientActiveUnit = 0;
}

//=============================================================
// Matrix stack
//=============================================================

void glMatrixMode(GLenum mode)    { gMatMode = (int)mode; }
void glLoadIdentity(void)         { MatIdentity(*CurMat()); }
void glLoadMatrixf(const GLfloat* m) { memcpy(*CurMat(), m, 16*sizeof(float)); }
void glMultMatrixf(const GLfloat* m) { MatMulCur(m); }

void glPushMatrix(void)
{
    if (gMatMode == GL_PROJECTION) {
        if (gProjTop + 1 >= MATRIX_STACK_DEPTH) return;
        memcpy(gProjStack[gProjTop+1], gProjStack[gProjTop], 16*sizeof(float));
        gProjTop++;
    } else if (gMatMode == GL_TEXTURE) {
        if (gTexTop + 1 >= MATRIX_STACK_DEPTH) return;
        memcpy(gTexStack[gTexTop+1], gTexStack[gTexTop], 16*sizeof(float));
        gTexTop++;
    } else {
        if (gMVTop + 1 >= MATRIX_STACK_DEPTH) return;
        memcpy(gMVStack[gMVTop+1], gMVStack[gMVTop], 16*sizeof(float));
        gMVTop++;
    }
}

void glPopMatrix(void)
{
    if (gMatMode == GL_PROJECTION) {
        if (gProjTop > 0) gProjTop--;
    } else if (gMatMode == GL_TEXTURE) {
        if (gTexTop > 0) gTexTop--;
    } else {
        if (gMVTop > 0) gMVTop--;
    }
}

void glFrustum(double l, double r, double b, double t, double n, double f)
{
    float m[16];
    memset(m, 0, sizeof(m));
    float l_f=(float)l, r_f=(float)r, b_f=(float)b, t_f=(float)t;
    float n_f=(float)n, f_f=(float)f;
    m[0]  = 2.0f*n_f/(r_f-l_f);
    m[5]  = 2.0f*n_f/(t_f-b_f);
    m[8]  = (r_f+l_f)/(r_f-l_f);
    m[9]  = (t_f+b_f)/(t_f-b_f);
    m[10] = -(f_f+n_f)/(f_f-n_f);
    m[11] = -1.0f;
    m[14] = -2.0f*f_f*n_f/(f_f-n_f);
    MatMulCur(m);
}

void glOrtho(double l, double r, double b, double t, double n, double f)
{
    float m[16];
    memset(m, 0, sizeof(m));
    float l_f=(float)l, r_f=(float)r, b_f=(float)b, t_f=(float)t;
    float n_f=(float)n, f_f=(float)f;
    m[0]  =  2.0f/(r_f-l_f);
    m[5]  =  2.0f/(t_f-b_f);
    m[10] = -2.0f/(f_f-n_f);
    m[12] = -(r_f+l_f)/(r_f-l_f);
    m[13] = -(t_f+b_f)/(t_f-b_f);
    m[14] = -(f_f+n_f)/(f_f-n_f);
    m[15] =  1.0f;
    MatMulCur(m);
}

void glTranslatef(GLfloat x, GLfloat y, GLfloat z)
{
    float m[16];
    MatIdentity(m);
    m[12] = x; m[13] = y; m[14] = z;
    MatMulCur(m);
}

void glScalef(GLfloat x, GLfloat y, GLfloat z)
{
    float m[16];
    MatIdentity(m);
    m[0] = x; m[5] = y; m[10] = z;
    MatMulCur(m);
}

void glRotatef(GLfloat angleDeg, GLfloat ax, GLfloat ay, GLfloat az)
{
    float rad = angleDeg * ((float)M_PI / 180.0f);
    float c   = cosf(rad);
    float s   = sinf(rad);

    // Normalize axis
    float len = sqrtf(ax*ax + ay*ay + az*az);
    if (len < 1e-6f) return;
    ax /= len; ay /= len; az /= len;

    float m[16];
    m[0]  = c + ax*ax*(1-c);    m[4]  = ax*ay*(1-c) - az*s; m[8]  = ax*az*(1-c) + ay*s; m[12] = 0;
    m[1]  = ay*ax*(1-c) + az*s; m[5]  = c + ay*ay*(1-c);    m[9]  = ay*az*(1-c) - ax*s; m[13] = 0;
    m[2]  = az*ax*(1-c) - ay*s; m[6]  = az*ay*(1-c) + ax*s; m[10] = c + az*az*(1-c);    m[14] = 0;
    m[3]  = 0;                  m[7]  = 0;                  m[11] = 0;                  m[15] = 1;
    MatMulCur(m);
}

//=============================================================
// Lighting
//=============================================================

// Transform a direction vector by the upper-left 3x3 of the modelview
static void TransformDir3(const float* mv, const float* dir, float* out)
{
    out[0] = mv[0]*dir[0] + mv[4]*dir[1] + mv[8]*dir[2];
    out[1] = mv[1]*dir[0] + mv[5]*dir[1] + mv[9]*dir[2];
    out[2] = mv[2]*dir[0] + mv[6]*dir[1] + mv[10]*dir[2];
}

void glLightfv(GLenum light, GLenum pname, const GLfloat* params)
{
    int idx = (int)(light - GL_LIGHT0);
    if (idx < 0 || idx >= 4) return;

    if (pname == GL_POSITION) {
        // Transform direction into eye space using current modelview
        float dir[3] = { params[0], params[1], params[2] };
        TransformDir3(gMVStack[gMVTop], dir, gLightDir[idx]);
        // Normalise
        float len = sqrtf(gLightDir[idx][0]*gLightDir[idx][0]
                        + gLightDir[idx][1]*gLightDir[idx][1]
                        + gLightDir[idx][2]*gLightDir[idx][2]);
        if (len > 1e-6f) {
            gLightDir[idx][0] /= len;
            gLightDir[idx][1] /= len;
            gLightDir[idx][2] /= len;
        }
    } else if (pname == GL_DIFFUSE) {
        gLightDiff[idx][0] = params[0];
        gLightDiff[idx][1] = params[1];
        gLightDiff[idx][2] = params[2];
        gLightDiff[idx][3] = params[3];
    }
    // Ambient/specular per-light ignored (ambient is handled via LightModel)
}

void glLightModelfv(GLenum pname, const GLfloat* params)
{
    if (pname == GL_LIGHT_MODEL_AMBIENT) {
        gAmbientColor[0] = params[0];
        gAmbientColor[1] = params[1];
        gAmbientColor[2] = params[2];
        gAmbientColor[3] = params[3];
    }
}

void glColorMaterial(GLenum face, GLenum mode)
{
    (void)face; (void)mode;
    gColorMaterialEnabled = true;
}

void glMaterialfv(GLenum face, GLenum pname, const GLfloat* params)
{
    (void)face; (void)pname; (void)params;
    // No-op: the game uses glColorMaterial so vertex colors drive diffuse.
}

//=============================================================
// Fog
//=============================================================

void glFogi(GLenum pname, GLint param)
{
    if (pname == GL_FOG_MODE) gFogMode = param;
}

void glFogf(GLenum pname, GLfloat param)
{
    switch (pname) {
        case GL_FOG_DENSITY: gFogDensity = param; break;
        case GL_FOG_START:   gFogStart   = param; break;
        case GL_FOG_END:     gFogEnd     = param; break;
        default: break;
    }
}

void glFogfv(GLenum pname, const GLfloat* params)
{
    if (pname == GL_FOG_COLOR) {
        gFogColorVal[0] = params[0];
        gFogColorVal[1] = params[1];
        gFogColorVal[2] = params[2];
        gFogColorVal[3] = params[3];
    }
}

//=============================================================
// Texture env / gen (stubs – enough to keep state valid)
//=============================================================

void glTexEnvi(GLenum target, GLenum pname, GLint param)
{
    (void)target; (void)pname; (void)param;
    // Shader always modulates; multi-texture combine modes are ignored.
}

void glTexGeni(GLenum coord, GLenum pname, GLint param)
{
    (void)coord; (void)pname; (void)param;
    // Sphere-map tex-gen is not implemented; silently ignored.
}

//=============================================================
// Alpha func
//=============================================================

void glAlphaFunc(GLenum func, GLclampf ref)
{
    gAlphaFuncVal = (int)func;
    gAlphaRefVal  = (float)ref;
}

//=============================================================
// Polygon mode (stub – wireframe not needed for WASM release)
//=============================================================

void glPolygonMode(GLenum face, GLenum mode)
{
    (void)face; (void)mode;
}

//=============================================================
// Current color / normal / texcoord setters
//=============================================================

void glColor3f(GLfloat r, GLfloat g, GLfloat b)
{
    gCurrentColor[0]=r; gCurrentColor[1]=g; gCurrentColor[2]=b; gCurrentColor[3]=1.0f;
}

void glColor4f(GLfloat r, GLfloat g, GLfloat b, GLfloat a)
{
    gCurrentColor[0]=r; gCurrentColor[1]=g; gCurrentColor[2]=b; gCurrentColor[3]=a;
}

void glColor4fv(const GLfloat* v)
{
    gCurrentColor[0]=v[0]; gCurrentColor[1]=v[1]; gCurrentColor[2]=v[2]; gCurrentColor[3]=v[3];
}

void glNormal3f(GLfloat nx, GLfloat ny, GLfloat nz)
{
    gCurrentNormal[0]=nx; gCurrentNormal[1]=ny; gCurrentNormal[2]=nz;
}

void glNormal3fv(const GLfloat* v)
{
    gCurrentNormal[0]=v[0]; gCurrentNormal[1]=v[1]; gCurrentNormal[2]=v[2];
}

void glTexCoord2f(GLfloat s, GLfloat t)
{
    gCurrentTexCoord[0]=s; gCurrentTexCoord[1]=t;
}

void glTexCoord2fv(const GLfloat* v)
{
    gCurrentTexCoord[0]=v[0]; gCurrentTexCoord[1]=v[1];
}

//=============================================================
// Immediate mode
//=============================================================

void glBegin(GLenum mode)
{
    gIMMode  = mode;
    gIMCount = 0;
}

static void IMAddVert(float x, float y, float z)
{
    if (gIMCount >= IM_MAX_VERTS) return;
    IMVert* v    = &gIMBuf[gIMCount++];
    v->x  = x;  v->y  = y;  v->z  = z;
    v->nx = gCurrentNormal[0];
    v->ny = gCurrentNormal[1];
    v->nz = gCurrentNormal[2];
    v->r  = gCurrentColor[0];
    v->g  = gCurrentColor[1];
    v->b  = gCurrentColor[2];
    v->a  = gCurrentColor[3];
    v->u  = gCurrentTexCoord[0];
    v->v  = gCurrentTexCoord[1];
}

void glVertex2f(GLfloat x, GLfloat y)  { IMAddVert(x, y, 0); }
void glVertex3f(GLfloat x, GLfloat y, GLfloat z) { IMAddVert(x, y, z); }
void glVertex3fv(const GLfloat* v) { IMAddVert(v[0], v[1], v[2]); }

// Convert quads to triangles and emit a draw call
void glEnd(void)
{
    if (gIMCount == 0 || gProgram == 0) return;

    glUseProgram(gProgram);
    glBindVertexArray(gVAO);
    glBindBuffer(GL_ARRAY_BUFFER, gImmVBO);

    // Build the final vertex list (expand quads → triangles)
    static IMVert expanded[IM_MAX_VERTS * 2];
    int outCount = 0;
    GLenum drawMode = gIMMode;

    if (gIMMode == GL_QUADS || gIMMode == 0x0009 /* GL_POLYGON */) {
        // Each group of 4 verts → 2 triangles: (0,1,2) and (0,2,3)
        drawMode = GL_TRIANGLES;
        int nQuads = gIMCount / 4;
        for (int q = 0; q < nQuads; q++) {
            IMVert* base = gIMBuf + q * 4;
            expanded[outCount++] = base[0];
            expanded[outCount++] = base[1];
            expanded[outCount++] = base[2];
            expanded[outCount++] = base[0];
            expanded[outCount++] = base[2];
            expanded[outCount++] = base[3];
        }
    } else if (gIMMode == GL_QUAD_STRIP) {
        // Quad strip: each additional 2 verts forms a quad
        drawMode = GL_TRIANGLES;
        for (int i = 0; i + 3 < gIMCount; i += 2) {
            expanded[outCount++] = gIMBuf[i];
            expanded[outCount++] = gIMBuf[i+1];
            expanded[outCount++] = gIMBuf[i+2];
            expanded[outCount++] = gIMBuf[i+1];
            expanded[outCount++] = gIMBuf[i+3];
            expanded[outCount++] = gIMBuf[i+2];
        }
    } else {
        memcpy(expanded, gIMBuf, gIMCount * sizeof(IMVert));
        outCount = gIMCount;
    }

    if (outCount == 0) return;

    size_t immBytes = (size_t)outCount * sizeof(IMVert);
    if (immBytes > gImmVBOSize) {
        glBufferData(GL_ARRAY_BUFFER, (GLsizeiptr)immBytes, NULL, GL_DYNAMIC_DRAW);
        gImmVBOSize = immBytes;
    }
    glBufferSubData(GL_ARRAY_BUFFER, 0, (GLsizeiptr)immBytes, expanded);

    // Set up attrib pointers into the interleaved VBO
    #define STRIDE ((GLsizei)sizeof(IMVert))
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, STRIDE, (void*)offsetof(IMVert, x));
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, STRIDE, (void*)offsetof(IMVert, nx));
    glEnableVertexAttribArray(2);
    glVertexAttribPointer(2, 4, GL_FLOAT, GL_FALSE, STRIDE, (void*)offsetof(IMVert, r));
    glEnableVertexAttribArray(3);
    glVertexAttribPointer(3, 2, GL_FLOAT, GL_FALSE, STRIDE, (void*)offsetof(IMVert, u));
    #undef STRIDE

    UploadUniforms();
    glDrawArrays(drawMode, 0, outCount);

    gIMCount = 0;
}

#endif  // __EMSCRIPTEN__
