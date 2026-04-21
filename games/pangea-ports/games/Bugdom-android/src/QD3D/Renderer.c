// RENDERER.C
// Modern OpenGL ES 2.0 / WebGL-compatible renderer
// (C)2021 Iliyas Jorio
// This file is part of Bugdom. https://github.com/jorio/bugdom

/****************************/
/*    EXTERNALS             */
/****************************/

// On desktop (non-ES) builds, we need GL 2.0+ shader function prototypes.
// Must be defined before game.h pulls in SDL_opengl.h -> SDL_opengl_glext.h.
#if !defined(__EMSCRIPTEN__) && !defined(__ANDROID__)
#define GL_GLEXT_PROTOTYPES 1
#endif

#include "game.h"

#ifdef __EMSCRIPTEN__
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#elif defined(__ANDROID__)
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#endif

#include <QD3D.h>
#include <string.h>

#pragma mark -

/****************************/
/*    PROTOTYPES            */
/****************************/

typedef struct RendererState
{
GLuint          shaderProgram;

// Attribute locations
GLint           loc_a_Position;
GLint           loc_a_Normal;
GLint           loc_a_TexCoord;
GLint           loc_a_Color;

// Uniform locations
GLint           loc_u_Projection;
GLint           loc_u_ModelView;
GLint           loc_u_NormalMatrix;
GLint           loc_u_DiffuseColor;
GLint           loc_u_Texture0;
GLint           loc_u_TextureEnabled;
GLint           loc_u_LightingEnabled;
GLint           loc_u_AmbientColor;
GLint           loc_u_NumLights;
GLint           loc_u_LightDir0;
GLint           loc_u_LightColor0;
GLint           loc_u_LightDir1;
GLint           loc_u_LightColor1;
GLint           loc_u_FogEnabled;
GLint           loc_u_FogColor;
GLint           loc_u_FogStart;
GLint           loc_u_FogEnd;
GLint           loc_u_AlphaTestEnabled;
GLint           loc_u_AlphaThreshold;
GLint           loc_u_UseVertexColors;

// Tracked GL state
GLuint          boundTexture;
bool            attrib_Position;
bool            attrib_Normal;
bool            attrib_TexCoord;
bool            attrib_Color;
bool            textureEnabled;
bool            lightingEnabled;
bool            fogEnabled;
bool            alphaTestEnabled;
bool            useVertexColors;
bool            sceneHasFog;
float           fogStart;
float           fogEnd;
float           fogColor[4];
bool            hasFlag_glDepthMask;
bool            blendFuncIsAdditive;
bool            hasState_GL_BLEND;
bool            hasState_GL_DEPTH_TEST;
bool            hasState_GL_CULL_FACE;
GLboolean       wantColorMask;
const TQ3Matrix4x4*  currentTransform;
} RendererState;

typedef struct MeshQueueEntry
{
const TQ3TriMeshData*   mesh;
const TQ3Matrix4x4*     transform;
const RenderModifiers*  mods;
float                   depth;
uint16_t                slot;
bool                    meshIsTransparent;
} MeshQueueEntry;

#define MESHQUEUE_MAX_SIZE 4096

static MeshQueueEntry       gMeshQueueEntryPool[MESHQUEUE_MAX_SIZE];
static MeshQueueEntry*      gMeshQueuePtrs[MESHQUEUE_MAX_SIZE];
static int                  gMeshQueueSize = 0;
static bool                 gFrameStarted = false;

static float                gBackupVertexColors[4*65536];

#ifdef __EMSCRIPTEN__
// WebGL requires VBOs — client-side vertex arrays are not supported.
// Each vertex attribute gets its own streaming VBO so that uploading data for
// one attribute does not overwrite the previously-uploaded data for another.
// (A single shared VBO would be overwritten by each glBufferData call, causing
// all glVertexAttribPointer(offset=0) calls to read the *last* uploaded array.)
enum { VBO_ATTRIB_POS=0, VBO_ATTRIB_NORM=1, VBO_ATTRIB_COLOR=2, VBO_ATTRIB_TC=3, VBO_ATTRIB_COUNT=4 };
static GLuint               s_attrVBO[VBO_ATTRIB_COUNT] = {0,0,0,0};
static GLuint               s_streamEBO = 0;
#endif

static int DrawOrderComparator(void const* a_void, void const* b_void);

static void BeginDepthPass(const MeshQueueEntry* entry);
static void BeginShadingPass(const MeshQueueEntry* entry);
static void PrepareOpaqueShading(const MeshQueueEntry* entry);
static void PrepareAlphaShading(const MeshQueueEntry* entry);
static void SendGeometry(const MeshQueueEntry* entry);

#ifdef __EMSCRIPTEN__
// WebGL does not support client-side vertex arrays — all data must live in GPU buffers.
// VertexAttribVBO uploads a flat array of floats to the per-attribute VBO and sets up
// the vertex attribute pointer.  Each attribute has its own VBO so uploads for different
// attributes do not overwrite each other.
static void VertexAttribVBO(GLint attribLoc, GLint attrIdx, GLint components, GLsizei numVerts, const GLfloat* data)
{
	glBindBuffer(GL_ARRAY_BUFFER, s_attrVBO[attrIdx]);
	glBufferData(GL_ARRAY_BUFFER, (GLsizeiptr)(numVerts * components * sizeof(GLfloat)), data, GL_STREAM_DRAW);
	glVertexAttribPointer(attribLoc, components, GL_FLOAT, GL_FALSE, 0, 0);
	glBindBuffer(GL_ARRAY_BUFFER, 0);
}
// DrawElementsVBO uploads an index array to the streaming EBO and issues the draw call.
static void DrawElementsVBO(GLenum mode, GLsizei count, const TQ3TriMeshTriangleData* triangles)
{
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, s_streamEBO);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, (GLsizeiptr)(count * sizeof(GLuint)), triangles, GL_STREAM_DRAW);
	glDrawElements(mode, count, GL_UNSIGNED_INT, 0);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
}
#define ATTRIB_VBO(loc, vboIdx, components, mesh, field) VertexAttribVBO((loc), (vboIdx), (components), (mesh)->numPoints, (const GLfloat*)(mesh)->field)
#define DRAW_ELEMENTS_VBO(mesh) DrawElementsVBO(GL_TRIANGLES, (mesh)->numTriangles * 3, (mesh)->triangles)
#else
#define ATTRIB_VBO(loc, vboIdx, components, mesh, field) glVertexAttribPointer((loc), (components), GL_FLOAT, GL_FALSE, 0, (mesh)->field)
#define DRAW_ELEMENTS_VBO(mesh) glDrawElements(GL_TRIANGLES, (mesh)->numTriangles * 3, GL_UNSIGNED_INT, (mesh)->triangles)
#endif

#pragma mark -

/****************************/
/*    CONSTANTS             */
/****************************/

const TQ3Point3D kQ3Point3D_Zero = {0, 0, 0};

static const RenderModifiers kDefaultRenderMods =
{
.statusBits     = 0,
.diffuseColor   = {1,1,1,1},
.autoFadeFactor = 1.0f,
.drawOrder      = 0,
};

const RenderModifiers kDefaultRenderMods_UI =
{
.statusBits     = STATUS_BIT_NULLSHADER | STATUS_BIT_NOFOG | STATUS_BIT_NOZWRITE,
.diffuseColor   = {1,1,1,1},
.autoFadeFactor = 1.0f,
.drawOrder      = kDrawOrder_UI
};

static const RenderModifiers kDefaultRenderMods_FadeOverlay =
{
.statusBits     = STATUS_BIT_NULLSHADER | STATUS_BIT_NOFOG | STATUS_BIT_NOZWRITE,
.diffuseColor   = {1,1,1,1},
.autoFadeFactor = 1.0f,
.drawOrder      = kDrawOrder_FadeOverlay
};

const RenderModifiers kDefaultRenderMods_DebugUI =
{
.statusBits     = STATUS_BIT_NULLSHADER | STATUS_BIT_NOFOG | STATUS_BIT_NOZWRITE | STATUS_BIT_KEEPBACKFACES | STATUS_BIT_DONTCULL,
.diffuseColor   = {1,1,1,1},
.autoFadeFactor = 1.0f,
.drawOrder      = kDrawOrder_DebugUI
};

const RenderModifiers kDefaultRenderMods_Pillarbox =
{
.statusBits     = STATUS_BIT_NULLSHADER | STATUS_BIT_NOFOG | STATUS_BIT_NOZWRITE | STATUS_BIT_KEEPBACKFACES | STATUS_BIT_DONTCULL,
.diffuseColor   = {0,0,0,1},
.autoFadeFactor = 1.0f,
.drawOrder      = kDrawOrder_DebugUI
};

#pragma mark -

/****************************/
/*    SHADER SOURCE         */
/****************************/

static const char* kVertexShaderSource =
"precision mediump float;\n"
"precision mediump int;\n"
"attribute vec3 a_Position;\n"
"attribute vec3 a_Normal;\n"
"attribute vec2 a_TexCoord;\n"
"attribute vec4 a_Color;\n"
"uniform mat4 u_Projection;\n"
"uniform mat4 u_ModelView;\n"
"uniform mat3 u_NormalMatrix;\n"
"uniform int  u_LightingEnabled;\n"
"uniform vec4 u_AmbientColor;\n"
"uniform int  u_NumLights;\n"
"uniform vec3 u_LightDir0;\n"
"uniform vec4 u_LightColor0;\n"
"uniform vec3 u_LightDir1;\n"
"uniform vec4 u_LightColor1;\n"
"uniform int  u_UseVertexColors;\n"
"uniform vec4 u_DiffuseColor;\n"
"uniform int  u_FogEnabled;\n"
"uniform float u_FogStart;\n"
"uniform float u_FogEnd;\n"
"varying vec2 v_TexCoord;\n"
"varying vec4 v_Color;\n"
"varying float v_FogFactor;\n"
"void main() {\n"
"    vec4 eyePos = u_ModelView * vec4(a_Position, 1.0);\n"
"    gl_Position = u_Projection * eyePos;\n"
"    v_TexCoord = a_TexCoord;\n"
"    vec4 baseColor = (u_UseVertexColors != 0) ? a_Color : u_DiffuseColor;\n"
"    if (u_LightingEnabled != 0) {\n"
"        vec3 eyeNormal = normalize(u_NormalMatrix * a_Normal);\n"
"        vec3 lit = u_AmbientColor.rgb;\n"
"        if (u_NumLights > 0) { lit += u_LightColor0.rgb * max(dot(eyeNormal, u_LightDir0), 0.0); }\n"
"        if (u_NumLights > 1) { lit += u_LightColor1.rgb * max(dot(eyeNormal, u_LightDir1), 0.0); }\n"
"        v_Color = vec4(baseColor.rgb * clamp(lit, 0.0, 1.0), baseColor.a);\n"
"    } else {\n"
"        v_Color = baseColor;\n"
"    }\n"
"    if (u_FogEnabled != 0) {\n"
"        float d = length(eyePos.xyz);\n"
"        v_FogFactor = clamp((u_FogEnd - d) / (u_FogEnd - u_FogStart), 0.0, 1.0);\n"
"    } else {\n"
"        v_FogFactor = 1.0;\n"
"    }\n"
"}\n";

static const char* kFragmentShaderSource =
"precision mediump float;\n"
"precision mediump int;\n"
"uniform sampler2D u_Texture0;\n"
"uniform int u_TextureEnabled;\n"
"uniform int u_AlphaTestEnabled;\n"
"uniform float u_AlphaThreshold;\n"
"uniform vec4 u_FogColor;\n"
"uniform int u_FogEnabled;\n"
"varying vec2 v_TexCoord;\n"
"varying vec4 v_Color;\n"
"varying float v_FogFactor;\n"
"void main() {\n"
"    vec4 color;\n"
"    if (u_TextureEnabled != 0) {\n"
"        color = v_Color * texture2D(u_Texture0, v_TexCoord);\n"
"    } else {\n"
"        color = v_Color;\n"
"    }\n"
"    if (u_AlphaTestEnabled != 0 && color.a < u_AlphaThreshold) discard;\n"
"    if (u_FogEnabled != 0) { color.rgb = mix(u_FogColor.rgb, color.rgb, v_FogFactor); }\n"
"    gl_FragColor = color;\n"
"}\n";

#pragma mark -

/****************************/
/*    VARIABLES             */
/****************************/

static SDL_GLContext gGLContext = NULL;
static RendererState gState;
float gGammaFadeFactor = 1.0f;
static TQ3TriMeshData* gFullscreenQuad = nil;

// Current matrices (set by camera / 2D mode)
static TQ3Matrix4x4 gCurrentProjection;
static TQ3Matrix4x4 gCurrentModelView;

// Matrix stack for 2D mode push/pop
#define MATRIX_STACK_DEPTH 4
static TQ3Matrix4x4 gProjectionStack[MATRIX_STACK_DEPTH];
static TQ3Matrix4x4 gModelViewStack[MATRIX_STACK_DEPTH];
static int gMatrixStackTop = 0;

#pragma mark -

/****************************/
/*    HELPERS               */
/****************************/

#if _DEBUG
void DoFatalGLError(GLenum error, const char* file, int line)
{
static char alertbuf[1024];
SDL_snprintf(alertbuf, sizeof(alertbuf), "OpenGL error 0x%x\nin %s:%d", error, file, line);
DoFatalAlert(alertbuf);
}
#endif

static GLuint CompileShader(GLenum type, const char* source)
{
GLuint shader = glCreateShader(type);
glShaderSource(shader, 1, &source, NULL);
glCompileShader(shader);

GLint status;
glGetShaderiv(shader, GL_COMPILE_STATUS, &status);
if (!status)
{
char log[1024];
glGetShaderInfoLog(shader, sizeof(log), NULL, log);
SDL_Log("Shader compile error:\n%s\n", log);
GAME_ASSERT_MESSAGE(false, "Shader compile failed");
}
return shader;
}

static void CreateShaderProgram(void)
{
GLuint vert = CompileShader(GL_VERTEX_SHADER,   kVertexShaderSource);
GLuint frag = CompileShader(GL_FRAGMENT_SHADER, kFragmentShaderSource);

gState.shaderProgram = glCreateProgram();
glAttachShader(gState.shaderProgram, vert);
glAttachShader(gState.shaderProgram, frag);

// Bind attribute locations before link
glBindAttribLocation(gState.shaderProgram, 0, "a_Position");
glBindAttribLocation(gState.shaderProgram, 1, "a_Normal");
glBindAttribLocation(gState.shaderProgram, 2, "a_TexCoord");
glBindAttribLocation(gState.shaderProgram, 3, "a_Color");

glLinkProgram(gState.shaderProgram);

GLint status;
glGetProgramiv(gState.shaderProgram, GL_LINK_STATUS, &status);
if (!status)
{
char log[1024];
glGetProgramInfoLog(gState.shaderProgram, sizeof(log), NULL, log);
SDL_Log("Shader link error:\n%s\n", log);
GAME_ASSERT_MESSAGE(false, "Shader link failed");
}

glDeleteShader(vert);
glDeleteShader(frag);

glUseProgram(gState.shaderProgram);

// Cache attribute locations
gState.loc_a_Position        = glGetAttribLocation(gState.shaderProgram, "a_Position");
gState.loc_a_Normal          = glGetAttribLocation(gState.shaderProgram, "a_Normal");
gState.loc_a_TexCoord        = glGetAttribLocation(gState.shaderProgram, "a_TexCoord");
gState.loc_a_Color           = glGetAttribLocation(gState.shaderProgram, "a_Color");

// Cache uniform locations
gState.loc_u_Projection      = glGetUniformLocation(gState.shaderProgram, "u_Projection");
gState.loc_u_ModelView       = glGetUniformLocation(gState.shaderProgram, "u_ModelView");
gState.loc_u_NormalMatrix    = glGetUniformLocation(gState.shaderProgram, "u_NormalMatrix");
gState.loc_u_DiffuseColor    = glGetUniformLocation(gState.shaderProgram, "u_DiffuseColor");
gState.loc_u_Texture0        = glGetUniformLocation(gState.shaderProgram, "u_Texture0");
gState.loc_u_TextureEnabled  = glGetUniformLocation(gState.shaderProgram, "u_TextureEnabled");
gState.loc_u_LightingEnabled = glGetUniformLocation(gState.shaderProgram, "u_LightingEnabled");
gState.loc_u_AmbientColor    = glGetUniformLocation(gState.shaderProgram, "u_AmbientColor");
gState.loc_u_NumLights       = glGetUniformLocation(gState.shaderProgram, "u_NumLights");
gState.loc_u_LightDir0       = glGetUniformLocation(gState.shaderProgram, "u_LightDir0");
gState.loc_u_LightColor0     = glGetUniformLocation(gState.shaderProgram, "u_LightColor0");
gState.loc_u_LightDir1       = glGetUniformLocation(gState.shaderProgram, "u_LightDir1");
gState.loc_u_LightColor1     = glGetUniformLocation(gState.shaderProgram, "u_LightColor1");
gState.loc_u_FogEnabled      = glGetUniformLocation(gState.shaderProgram, "u_FogEnabled");
gState.loc_u_FogColor        = glGetUniformLocation(gState.shaderProgram, "u_FogColor");
gState.loc_u_FogStart        = glGetUniformLocation(gState.shaderProgram, "u_FogStart");
gState.loc_u_FogEnd          = glGetUniformLocation(gState.shaderProgram, "u_FogEnd");
gState.loc_u_AlphaTestEnabled= glGetUniformLocation(gState.shaderProgram, "u_AlphaTestEnabled");
gState.loc_u_AlphaThreshold  = glGetUniformLocation(gState.shaderProgram, "u_AlphaThreshold");
gState.loc_u_UseVertexColors = glGetUniformLocation(gState.shaderProgram, "u_UseVertexColors");

// Set texture sampler to unit 0
glUniform1i(gState.loc_u_Texture0, 0);

// Set initial defaults that never change
glUniform1f(gState.loc_u_AlphaThreshold, 0.4999f);
glUniform1i(gState.loc_u_NumLights, 0);
glUniform4f(gState.loc_u_AmbientColor, 1, 1, 1, 1);
}

static void UploadMatrix4x4(GLint loc, const TQ3Matrix4x4* m)
{
// TQ3Matrix4x4 is column-major (value[col][row]), which matches OpenGL's expected layout.
// WebGL 1 requires transpose=GL_FALSE.
glUniformMatrix4fv(loc, 1, GL_FALSE, (const float*) m->value);
}

static void UploadMatrix3x3NormalFromMV(const TQ3Matrix4x4* mv)
{
// Normal matrix = upper-left 3x3 of modelview (valid for rigid/uniform-scale transforms).
// Supply column-major (GL_FALSE) by treating TQ3 rows as GL columns.
float nm[9] = {
mv->value[0][0], mv->value[0][1], mv->value[0][2],
mv->value[1][0], mv->value[1][1], mv->value[1][2],
mv->value[2][0], mv->value[2][1], mv->value[2][2],
};
glUniformMatrix3fv(gState.loc_u_NormalMatrix, 1, GL_FALSE, nm);
}

static inline void SetAttrib(int loc, bool* flag, bool enable)
{
if (enable != *flag)
{
if (enable)
glEnableVertexAttribArray(loc);
else
glDisableVertexAttribArray(loc);
*flag = enable;
}
}

#define EnableAttrib(name)  SetAttrib(gState.loc_a_##name, &gState.attrib_##name, true)
#define DisableAttrib(name) SetAttrib(gState.loc_a_##name, &gState.attrib_##name, false)

static inline void SetStateGL(GLenum s, bool* flag, bool enable)
{
if (enable != *flag)
{
if (enable)
glEnable(s);
else
glDisable(s);
*flag = enable;
}
}

#define EnableState(s)  SetStateGL(s, &gState.hasState_##s, true)
#define DisableState(s) SetStateGL(s, &gState.hasState_##s, false)
#define SetState(s, v)  SetStateGL(s, &gState.hasState_##s, (v))

#define SetFlag(glFn, val) do { \
if ((val) != gState.hasFlag_##glFn) { \
glFn((val) ? GL_TRUE : GL_FALSE); \
gState.hasFlag_##glFn = (val); \
} } while(0)

static inline void SetColorMask(GLboolean enable)
{
if (enable != gState.wantColorMask)
{
glColorMask(enable, enable, enable, enable);
gState.wantColorMask = enable;
}
}

static inline void SetUniformBool(GLint loc, bool* tracked, bool val)
{
if (val != *tracked)
{
glUniform1i(loc, val ? 1 : 0);
*tracked = val;
}
}

#pragma mark -

//=======================================================================================================

/****************************/
/*    API IMPLEMENTATION    */
/****************************/

void Render_CreateContext(void)
{
gGLContext = SDL_GL_CreateContext(gSDLWindow);
GAME_ASSERT(gGLContext);
}

void Render_DeleteContext(void)
{
if (gGLContext)
{
#ifdef __EMSCRIPTEN__
// Free streaming VBOs/EBO before destroying the GL context.
if (s_attrVBO[0]) { glDeleteBuffers(VBO_ATTRIB_COUNT, s_attrVBO); for (int i=0;i<VBO_ATTRIB_COUNT;i++) s_attrVBO[i]=0; }
if (s_streamEBO) { glDeleteBuffers(1, &s_streamEBO); s_streamEBO = 0; }
#endif
SDL_GL_DestroyContext(gGLContext);
gGLContext = NULL;
}
}

void Render_SetDefaultModifiers(RenderModifiers* dest)
{
SDL_memcpy(dest, &kDefaultRenderMods, sizeof(RenderModifiers));
}

void Render_SetProjectionMatrix(const TQ3Matrix4x4* m)
{
gCurrentProjection = *m;
UploadMatrix4x4(gState.loc_u_Projection, &gCurrentProjection);
}

void Render_SetModelViewMatrix(const TQ3Matrix4x4* m)
{
gCurrentModelView = *m;
UploadMatrix4x4(gState.loc_u_ModelView, &gCurrentModelView);
UploadMatrix3x3NormalFromMV(&gCurrentModelView);
}

void Render_SetLights(const QD3DLightDefType* lights, const TQ3Matrix4x4* viewMatrix)
{
// Ambient
glUniform4f(gState.loc_u_AmbientColor,
lights->ambientBrightness * lights->ambientColor.r,
lights->ambientBrightness * lights->ambientColor.g,
lights->ambientBrightness * lights->ambientColor.b,
1.0f);

int numLights = (int) lights->numFillLights;
if (numLights > 2)
numLights = 2;
glUniform1i(gState.loc_u_NumLights, numLights);

for (int i = 0; i < numLights; i++)
{
// Negate direction (toward-light convention)
TQ3Vector3D dir = {
-lights->fillDirection[i].x,
-lights->fillDirection[i].y,
-lights->fillDirection[i].z
};

// Transform direction to view space (transpose of upper-left 3x3 of viewMatrix)
TQ3Vector3D dirView;
dirView.x = viewMatrix->value[0][0]*dir.x + viewMatrix->value[1][0]*dir.y + viewMatrix->value[2][0]*dir.z;
dirView.y = viewMatrix->value[0][1]*dir.x + viewMatrix->value[1][1]*dir.y + viewMatrix->value[2][1]*dir.z;
dirView.z = viewMatrix->value[0][2]*dir.x + viewMatrix->value[1][2]*dir.y + viewMatrix->value[2][2]*dir.z;

// Normalize
float len = sqrtf(dirView.x*dirView.x + dirView.y*dirView.y + dirView.z*dirView.z);
if (len > 0.0001f)
{
dirView.x /= len;
dirView.y /= len;
dirView.z /= len;
}

GLint locDir   = (i == 0) ? gState.loc_u_LightDir0  : gState.loc_u_LightDir1;
GLint locColor = (i == 0) ? gState.loc_u_LightColor0 : gState.loc_u_LightColor1;

glUniform3f(locDir, dirView.x, dirView.y, dirView.z);
glUniform4f(locColor,
lights->fillColor[i].r * lights->fillBrightness[i],
lights->fillColor[i].g * lights->fillBrightness[i],
lights->fillColor[i].b * lights->fillBrightness[i],
1.0f);
}
}

void Render_InitState(const TQ3ColorRGBA* clearColor)
{
// Compile & link shaders
CreateShaderProgram();

// Depth / blend / face culling
glEnable(GL_DEPTH_TEST);    gState.hasState_GL_DEPTH_TEST = true;
glEnable(GL_CULL_FACE);     gState.hasState_GL_CULL_FACE  = true;
glDisable(GL_BLEND);        gState.hasState_GL_BLEND       = false;

glDepthMask(GL_TRUE);
gState.hasFlag_glDepthMask = true;

glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
gState.blendFuncIsAdditive = false;

glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
gState.wantColorMask = true;

glFrontFace(GL_CCW);

// Position attrib always enabled; others off
glEnableVertexAttribArray(0);   gState.attrib_Position = true;
glDisableVertexAttribArray(1);  gState.attrib_Normal   = false;
glDisableVertexAttribArray(2);  gState.attrib_TexCoord = false;
glDisableVertexAttribArray(3);  gState.attrib_Color    = false;

// Shader uniform initial state
gState.textureEnabled   = false;    glUniform1i(gState.loc_u_TextureEnabled,   0);
gState.lightingEnabled  = true;     glUniform1i(gState.loc_u_LightingEnabled,  1);
gState.fogEnabled       = false;    glUniform1i(gState.loc_u_FogEnabled,       0);
gState.alphaTestEnabled = false;    glUniform1i(gState.loc_u_AlphaTestEnabled, 0);
gState.useVertexColors  = false;    glUniform1i(gState.loc_u_UseVertexColors,  0);

glUniform4f(gState.loc_u_DiffuseColor, 1, 1, 1, 1);
glUniform4f(gState.loc_u_FogColor, 0, 0, 0, 1);

gState.sceneHasFog      = false;
gState.boundTexture     = 0;
gState.currentTransform = NULL;

glClearColor(clearColor->r, clearColor->g, clearColor->b, 1.0f);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

// Set up mesh queue & fullscreen overlay quad
gMeshQueueSize = 0;
SDL_memset(gMeshQueuePtrs, 0, sizeof(gMeshQueuePtrs));

if (!gFullscreenQuad)
{
gFullscreenQuad = MakeQuadMesh_UI(0, 0, GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT, 0, 0, 1, 1);
}

#ifdef __EMSCRIPTEN__
// WebGL requires all vertex data in GPU buffers — create streaming VBO/EBO.
if (!s_attrVBO[0]) { glGenBuffers(VBO_ATTRIB_COUNT, s_attrVBO); }
if (!s_streamEBO) { glGenBuffers(1, &s_streamEBO); }
#endif

CHECK_GL_ERROR();
}

void Render_EndScene(void)
{
if (gFullscreenQuad)
{
Q3TriMeshData_Dispose(gFullscreenQuad);
gFullscreenQuad = NULL;
}
}

void Render_EnableFog(
float camHither,
float camYon,
float fogHither,
float fogYon,
TQ3ColorRGBA fogColor)
{
(void) camHither;

float fogRefYon = (camYon > 4200.0f) ? 4200.0f : camYon;
gState.fogStart    = fogHither * fogRefYon;
gState.fogEnd      = fogYon   * fogRefYon;
gState.fogColor[0] = fogColor.r;
gState.fogColor[1] = fogColor.g;
gState.fogColor[2] = fogColor.b;
gState.fogColor[3] = fogColor.a;

glUniform1f(gState.loc_u_FogStart, gState.fogStart);
glUniform1f(gState.loc_u_FogEnd,   gState.fogEnd);
glUniform4f(gState.loc_u_FogColor, fogColor.r, fogColor.g, fogColor.b, fogColor.a);

gState.sceneHasFog = true;
}

void Render_DisableFog(void)
{
gState.sceneHasFog = false;
}

#pragma mark -

void Render_BindTexture(GLuint textureName)
{
if (gState.boundTexture != textureName)
{
glBindTexture(GL_TEXTURE_2D, textureName);
gState.boundTexture = textureName;
}
}

#pragma mark - Texture Loading

#ifdef __EMSCRIPTEN__
static void* ConvertBGRA32ToRGBA(const void* src, int width, int height)
{
int n = width * height;
uint8_t* dst = (uint8_t*) AllocPtr(n * 4);
const uint8_t* s = (const uint8_t*) src;
for (int i = 0; i < n; i++)
{
dst[i*4+0] = s[i*4+2];     // R
dst[i*4+1] = s[i*4+1];     // G
dst[i*4+2] = s[i*4+0];     // B
dst[i*4+3] = s[i*4+3];     // A
}
return dst;
}

static void* ConvertBGR24ToRGB(const void* src, int width, int height)
{
int n = width * height;
uint8_t* dst = (uint8_t*) AllocPtr(n * 3);
const uint8_t* s = (const uint8_t*) src;
for (int i = 0; i < n; i++)
{
dst[i*3+0] = s[i*3+2];     // R
dst[i*3+1] = s[i*3+1];     // G
dst[i*3+2] = s[i*3+0];     // B
}
return dst;
}

// Convert 16-bit 1555 (GL_UNSIGNED_SHORT_1_5_5_5_REV + GL_BGRA) to RGBA8
static void* Convert1555ToRGBA8(const void* src, int width, int height, bool hasAlpha)
{
int n = width * height;
uint8_t* dst = (uint8_t*) AllocPtr(n * 4);
const uint16_t* s = (const uint16_t*) src;
for (int i = 0; i < n; i++)
{
uint16_t v = s[i];
uint8_t b = (v & 0x001F);
uint8_t g = (v >> 5)  & 0x1F;
uint8_t r = (v >> 10) & 0x1F;
uint8_t a = (v >> 15) & 1;
dst[i*4+0] = (r << 3) | (r >> 2);
dst[i*4+1] = (g << 3) | (g >> 2);
dst[i*4+2] = (b << 3) | (b >> 2);
dst[i*4+3] = hasAlpha ? (a ? 255 : 0) : 255;
}
return dst;
}
#endif // __EMSCRIPTEN__

/********************* CLASSIFY PIXMAP OPACITY ************************/
//
// Inspect the 3DMF pixmap's alpha usage so we can choose the least-expensive
// correct texturing mode:
//   - fully opaque alpha    -> kQ3TexturingModeOpaque
//   - binary 0/255 alpha    -> kQ3TexturingModeAlphaTest
//   - intermediate alpha    -> kQ3TexturingModeAlphaBlend
//
static TQ3TexturingMode ClassifyPixmapOpacity(const TQ3TextureShader* textureShader)
{
	switch (textureShader->pixmap->pixelType)
	{
		case kQ3PixelTypeRGB32:
		case kQ3PixelTypeRGB16:
		case kQ3PixelTypeRGB24:
			return kQ3TexturingModeOpaque;

		case kQ3PixelTypeARGB16:
			return kQ3TexturingModeAlphaTest;

		case kQ3PixelTypeARGB32:
		{
			bool sawTransparentPixel = false;
			const uint8_t* pixels = (const uint8_t*) textureShader->pixmap->image;
			int width = textureShader->pixmap->width;
			int height = textureShader->pixmap->height;
			int rowBytes = textureShader->pixmap->rowBytes;
			if (rowBytes <= 0)
				rowBytes = width * 4;

			for (int y = 0; y < height; y++)
			{
				const uint8_t* row = pixels + y * rowBytes;
				for (int x = 0; x < width; x++)
				{
					uint8_t alpha = row[x * 4 + 3];
					if (alpha == 255)
						continue;

					sawTransparentPixel = true;
					if (alpha != 0)
						return kQ3TexturingModeAlphaBlend;
				}
			}

			return sawTransparentPixel ? kQ3TexturingModeAlphaTest : kQ3TexturingModeOpaque;
		}

		default:
			return kQ3TexturingModeOff;
	}
}

GLuint Render_LoadTexture(
GLenum internalFormat,
int width,
int height,
GLenum bufferFormat,
GLenum bufferType,
const GLvoid* pixels,
RendererTextureFlags flags)
{
GAME_ASSERT(gGLContext);

GLuint textureName;
glGenTextures(1, &textureName);
CHECK_GL_ERROR();

Render_BindTexture(textureName);
CHECK_GL_ERROR();

glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, !gGamePrefs.lowDetail ? GL_LINEAR : GL_NEAREST);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, !gGamePrefs.lowDetail ? GL_LINEAR : GL_NEAREST);

if (flags & kRendererTextureFlags_ClampU)
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
if (flags & kRendererTextureFlags_ClampV)
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

#ifdef __EMSCRIPTEN__
// WebGL 1 does not support GL_REPEAT on non-power-of-two (NPOT) textures:
// sampling such a texture returns black (0,0,0,0) instead of the correct colour.
// Only force CLAMP_TO_EDGE for NPOT textures; POT textures may legitimately
// use GL_REPEAT (e.g. the log barrel uses UV coords up to ~4.8).
{
	bool npotW = (width  & (width  - 1)) != 0;
	bool npotH = (height & (height - 1)) != 0;
	if ((npotW || npotH) && !(flags & kRendererTextureFlags_ClampU))
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
	if ((npotW || npotH) && !(flags & kRendererTextureFlags_ClampV))
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
}
#endif

#ifdef __EMSCRIPTEN__
// WebGL 1 only supports RGBA/RGB + UNSIGNED_BYTE (and a few 16-bit packed types).
// Convert from Mac/legacy pixel formats to WebGL-compatible ones.
void* converted = NULL;
GLenum glFormat = GL_RGBA;
GLenum glType   = GL_UNSIGNED_BYTE;

if (bufferFormat == GL_BGRA && bufferType == GL_UNSIGNED_INT_8_8_8_8_REV)
{
converted = ConvertBGRA32ToRGBA(pixels, width, height);
glFormat  = GL_RGBA;
// RGB32 textures (internalFormat==GL_RGB) have no real alpha; the source
// byte is zero (unused Mac padding). Force alpha=255 so the WebGL canvas
// does not write transparent pixels and show the HTML background through
// opaque geometry. (Same principle as the 1555 fix in Render_UpdateTexture.)
if (internalFormat == GL_RGB)
{
	uint8_t* p = (uint8_t*) converted;
	for (int i = 0; i < width * height; i++)
		p[i*4+3] = 255;
}
}
else if (bufferFormat == GL_BGR && bufferType == GL_UNSIGNED_BYTE)
{
converted = ConvertBGR24ToRGB(pixels, width, height);
glFormat  = GL_RGB;
}
else if (bufferFormat == GL_BGRA && bufferType == GL_UNSIGNED_SHORT_1_5_5_5_REV)
{
bool hasAlpha = (internalFormat == GL_RGBA);
converted = Convert1555ToRGBA8(pixels, width, height, hasAlpha);
glFormat  = GL_RGBA;
}
else
{
glFormat = bufferFormat;
glType   = bufferType;
}

glTexImage2D(GL_TEXTURE_2D, 0, glFormat, width, height, 0,
glFormat, glType, converted ? converted : pixels);

if (converted)
DisposePtr((Ptr) converted);
#else
glTexImage2D(GL_TEXTURE_2D, 0, internalFormat, width, height, 0,
bufferFormat, bufferType, pixels);
#endif

CHECK_GL_ERROR();
return textureName;
}

void Render_UpdateTexture(
GLuint textureName,
int x,
int y,
int width,
int height,
GLenum bufferFormat,
GLenum bufferType,
const GLvoid* pixels,
int rowBytesInInput)
{
Render_BindTexture(textureName);

#ifdef __EMSCRIPTEN__
// WebGL 1 only supports RGBA/RGB + UNSIGNED_BYTE.
// Convert legacy pixel formats, same as Render_LoadTexture.
void* converted = NULL;
GLenum glFormat = bufferFormat;
GLenum glType   = bufferType;

// First, strip row padding if present (WebGL 1 has no GL_UNPACK_ROW_LENGTH).
const GLvoid* srcPixels = pixels;
uint8_t* rowStripped = NULL;
if (rowBytesInInput > 0)
{
int bpp = 4;
if (bufferFormat == GL_RGB || bufferFormat == GL_BGR) bpp = 3;
else if (bufferFormat == GL_ALPHA) bpp = 1;
else if (bufferType == GL_UNSIGNED_SHORT_1_5_5_5_REV) bpp = 2;
int lineBytes = width * bpp;
int strideBytes = rowBytesInInput * bpp;  // rowBytesInInput is in pixels, convert to bytes
rowStripped = (uint8_t*) AllocPtr(height * lineBytes);
const uint8_t* src = (const uint8_t*) pixels;
for (int row = 0; row < height; row++)
SDL_memcpy(rowStripped + row * lineBytes, src + row * strideBytes, lineBytes);
srcPixels = rowStripped;
}

if (bufferFormat == GL_BGRA && bufferType == GL_UNSIGNED_INT_8_8_8_8_REV)
{
	converted = ConvertBGRA32ToRGBA(srcPixels, width, height);
	glFormat  = GL_RGBA;
	glType    = GL_UNSIGNED_BYTE;
}
else if (bufferFormat == GL_BGR && bufferType == GL_UNSIGNED_BYTE)
{
	converted = ConvertBGR24ToRGB(srcPixels, width, height);
	glFormat  = GL_RGB;
}
else if (bufferFormat == GL_BGRA && bufferType == GL_UNSIGNED_SHORT_1_5_5_5_REV)
{
	// Terrain supertile textures are GL_RGB (fully opaque). Force alpha=255 so that
	// the WebGL canvas (alpha:true) does not composite tile pixels as transparent,
	// which would show the page background through the terrain.
	converted = Convert1555ToRGBA8(srcPixels, width, height, false);
	glFormat  = GL_RGBA;
	glType    = GL_UNSIGNED_BYTE;
}

const GLvoid* uploadPixels = converted ? converted : srcPixels;
glTexSubImage2D(GL_TEXTURE_2D, 0, x, y, width, height, glFormat, glType, uploadPixels);

if (converted)
DisposePtr((Ptr) converted);
if (rowStripped)
DisposePtr((Ptr) rowStripped);
#else
GLint pUnpackRowLength = 0;
if (rowBytesInInput > 0)
{
glGetIntegerv(GL_UNPACK_ROW_LENGTH, &pUnpackRowLength);
glPixelStorei(GL_UNPACK_ROW_LENGTH, rowBytesInInput);
}
glTexSubImage2D(GL_TEXTURE_2D, 0, x, y, width, height, bufferFormat, bufferType, pixels);
if (rowBytesInInput > 0)
glPixelStorei(GL_UNPACK_ROW_LENGTH, pUnpackRowLength);
#endif

CHECK_GL_ERROR();
}

void Render_Load3DMFTextures(TQ3MetaFile* metaFile, GLuint* outTextureNames, bool forceClampUVs)
{
for (int i = 0; i < metaFile->numTextures; i++)
{
TQ3TextureShader* textureShader = &metaFile->textures[i];
GAME_ASSERT(textureShader->pixmap);
GAME_ASSERT(textureShader->pixmap->image);

TQ3TexturingMode meshTexturingMode = kQ3TexturingModeOff;
GLenum internalFormat;
GLenum format;
GLenum type;

	switch (textureShader->pixmap->pixelType)
	{
		case kQ3PixelTypeRGB32:
			meshTexturingMode = ClassifyPixmapOpacity(textureShader);
			internalFormat = GL_RGB;
			format = GL_BGRA;
			type   = GL_UNSIGNED_INT_8_8_8_8_REV;
			break;

		case kQ3PixelTypeARGB32:
			meshTexturingMode = ClassifyPixmapOpacity(textureShader);
			internalFormat = GL_RGBA;
			format = GL_BGRA;
			type   = GL_UNSIGNED_INT_8_8_8_8_REV;
			break;

		case kQ3PixelTypeRGB16:
			meshTexturingMode = ClassifyPixmapOpacity(textureShader);
			internalFormat = GL_RGB;
			format = GL_BGRA;
			type   = GL_UNSIGNED_SHORT_1_5_5_5_REV;
			break;

		case kQ3PixelTypeARGB16:
			meshTexturingMode = ClassifyPixmapOpacity(textureShader);
			internalFormat = GL_RGBA;
			format = GL_BGRA;
			type   = GL_UNSIGNED_SHORT_1_5_5_5_REV;
			break;

		case kQ3PixelTypeRGB24:
			meshTexturingMode = ClassifyPixmapOpacity(textureShader);
			internalFormat = GL_RGB;
			format = GL_BGR;
			type   = GL_UNSIGNED_BYTE;
			break;

		default:
			DoAlert("3DMF texture: Unsupported kQ3PixelType");
			continue;
	}

int clampFlags = forceClampUVs ? kRendererTextureFlags_ClampBoth : 0;
if (textureShader->boundaryU == kQ3ShaderUVBoundaryClamp)
clampFlags |= kRendererTextureFlags_ClampU;
if (textureShader->boundaryV == kQ3ShaderUVBoundaryClamp)
clampFlags |= kRendererTextureFlags_ClampV;

outTextureNames[i] = Render_LoadTexture(
internalFormat,
textureShader->pixmap->width,
textureShader->pixmap->height,
format,
type,
textureShader->pixmap->image,
clampFlags);

for (int j = 0; j < metaFile->numMeshes; j++)
{
if (metaFile->meshes[j]->internalTextureID == i)
{
metaFile->meshes[j]->glTextureName = outTextureNames[i];
metaFile->meshes[j]->texturingMode = meshTexturingMode;
}
}
}
}

#pragma mark -

void Render_StartFrame(void)
{
bool didMakeCurrent = SDL_GL_MakeCurrent(gSDLWindow, gGLContext);
GAME_ASSERT_MESSAGE(didMakeCurrent, SDL_GetError());

glUseProgram(gState.shaderProgram);

// Clear rendering statistics
SDL_memset(&gRenderStats, 0, sizeof(gRenderStats));

// Clear mesh queue
gMeshQueueSize = 0;

// The depth mask must be re-enabled so we can clear the depth buffer.
SetFlag(glDepthMask, true);

GLbitfield clearWhat = GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT;
#if OSXPPC
if (gIsInGame && gLevelType == LEVEL_TYPE_LAWN && gCyclorama && gDebugMode != DEBUG_MODE_WIREFRAME)
clearWhat &= ~GL_COLOR_BUFFER_BIT;
#endif
glClear(clearWhat);

GAME_ASSERT(gState.currentTransform == NULL);
GAME_ASSERT(!gFrameStarted);
gFrameStarted = true;
}

void Render_SetViewport(int x, int y, int w, int h)
{
glViewport(x, y, w, h);
}

void Render_FlushQueue(void)
{
	GAME_ASSERT(gFrameStarted);

	if (gMeshQueueSize == 0)
		return;

	//--------------------------------------------------------------
	// SORT DRAW QUEUE ENTRIES
	// Opaque meshes are sorted front-to-back,
	// followed by transparent meshes sorted back-to-front.
	SDL_qsort(
			gMeshQueuePtrs,
			gMeshQueueSize,
			sizeof(gMeshQueuePtrs[0]),
			DrawOrderComparator);

	//--------------------------------------------------------------
	// PASS 1: OPAQUE COLOR + DEPTH
	// Draw opaque meshes to color AND depth buffers.

	int numDeferredColorMeshes = 0;

	SetFlag(glDepthMask, true);
	glDepthFunc(GL_LEQUAL);
	DisableState(GL_BLEND);

	for (int i = 0; i < gMeshQueueSize; i++)
	{
		MeshQueueEntry* entry = gMeshQueuePtrs[i];

		if (!entry->meshIsTransparent)
		{
			BeginShadingPass(entry);
			PrepareOpaqueShading(entry);
			SendGeometry(entry);
		}
		else
		{
			// Defer transparent mesh to Pass 2
			GAME_ASSERT(numDeferredColorMeshes <= i);
			gMeshQueuePtrs[numDeferredColorMeshes++] = entry;
		}
	}

	//--------------------------------------------------------------
	// PASS 2: ALPHA-BLENDED COLOR
	// Draw transparent meshes to color buffer only.

	gRenderStats.meshesPass2 += numDeferredColorMeshes;

	if (numDeferredColorMeshes > 0)
	{
		EnableState(GL_BLEND);
		gState.alphaTestEnabled = false;
		glUniform1i(gState.loc_u_AlphaTestEnabled, 0);
		SetFlag(glDepthMask, false);
		glDepthFunc(GL_LEQUAL);     // depth info already written in pass 1

		for (int i = 0; i < numDeferredColorMeshes; i++)
		{
			const MeshQueueEntry* entry = gMeshQueuePtrs[i];
			BeginShadingPass(entry);
			PrepareAlphaShading(entry);
			SendGeometry(entry);
		}
	}

	//--------------------------------------------------------------
	// CLEAN UP

	// Restore camera-only modelview if a per-object transform was left active
	if (gState.currentTransform != NULL)
	{
		UploadMatrix4x4(gState.loc_u_ModelView, &gCurrentModelView);
		UploadMatrix3x3NormalFromMV(&gCurrentModelView);
		gState.currentTransform = NULL;
	}

	gMeshQueueSize = 0;
}

void Render_EndFrame(void)
{
GAME_ASSERT(gFrameStarted);
Render_FlushQueue();
gFrameStarted = false;
}

#pragma mark -

static inline float WorldPointToDepth(const TQ3Point3D p)
{
// Simplified depth estimation relative to the camera frustum.
#define M(x,y) gCameraWorldToFrustumMatrix.value[x][y]
return p.x*M(0,2) + p.y*M(1,2) + p.z*M(2,2);
#undef M
}

static float GetDepth(
int                 numMeshes,
TQ3TriMeshData**    meshList,
const TQ3Point3D*   centerCoord)
{
if (centerCoord)
return WorldPointToDepth(*centerCoord);

// Average centers of all bounding boxes
float mult = (float) numMeshes / 2.0f;
TQ3Point3D center = {0, 0, 0};
for (int i = 0; i < numMeshes; i++)
{
center.x += (meshList[i]->bBox.min.x + meshList[i]->bBox.max.x) * mult;
center.y += (meshList[i]->bBox.min.y + meshList[i]->bBox.max.y) * mult;
center.z += (meshList[i]->bBox.min.z + meshList[i]->bBox.max.z) * mult;
}
return WorldPointToDepth(center);
}

static bool IsMeshTransparent(const TQ3TriMeshData* mesh, const RenderModifiers* mods)
{
return  mesh->texturingMode == kQ3TexturingModeAlphaBlend
|| mesh->diffuseColor.a < .999f
|| mods->diffuseColor.a < .999f
|| mods->autoFadeFactor < .999f
|| (mods->statusBits & STATUS_BIT_GLOW);
}

static MeshQueueEntry* NewMeshQueueEntry(void)
{
MeshQueueEntry* entry = &gMeshQueueEntryPool[gMeshQueueSize];
gMeshQueuePtrs[gMeshQueueSize] = entry;
gMeshQueueSize++;
return entry;
}

void Render_SubmitMeshList(
		int                     numMeshes,
		TQ3TriMeshData**        meshList,
		const TQ3Matrix4x4*     transform,
		const RenderModifiers*  mods,
		const TQ3Point3D*       centerCoord,
		uint16_t                slot)
{
	if (numMeshes <= 0)
		SDL_Log("not drawing this!\n");

	GAME_ASSERT(gFrameStarted);
	GAME_ASSERT(gMeshQueueSize + numMeshes <= MESHQUEUE_MAX_SIZE);

	float depth = GetDepth(numMeshes, meshList, centerCoord);

	for (int i = 0; i < numMeshes; i++)
	{
		MeshQueueEntry* entry       = NewMeshQueueEntry();
		entry->mesh                 = meshList[i];
		entry->transform            = transform;
		entry->mods                 = mods ? mods : &kDefaultRenderMods;
		entry->depth                = depth;
		entry->slot                 = slot;
		entry->meshIsTransparent    = IsMeshTransparent(entry->mesh, entry->mods);

		gRenderStats.meshesPass1++;
		gRenderStats.triangles += entry->mesh->numTriangles;

		GAME_ASSERT(!(entry->mods->statusBits & STATUS_BIT_HIDDEN));
	}
}

void Render_SubmitMesh(
		const TQ3TriMeshData*   mesh,
		const TQ3Matrix4x4*     transform,
		const RenderModifiers*  mods,
		const TQ3Point3D*       centerCoord,
		uint16_t                slot)
{
	GAME_ASSERT(gFrameStarted);
	GAME_ASSERT(gMeshQueueSize < MESHQUEUE_MAX_SIZE);

	MeshQueueEntry* entry       = NewMeshQueueEntry();
	entry->mesh                 = mesh;
	entry->transform            = transform;
	entry->mods                 = mods ? mods : &kDefaultRenderMods;
	entry->depth                = GetDepth(1, (TQ3TriMeshData **) &mesh, centerCoord);
	entry->slot                 = slot;
	entry->meshIsTransparent    = IsMeshTransparent(entry->mesh, entry->mods);

	gRenderStats.meshesPass1++;
	gRenderStats.triangles += entry->mesh->numTriangles;

	GAME_ASSERT(!(entry->mods->statusBits & STATUS_BIT_HIDDEN));
}

#pragma mark -

static int DrawOrderComparator(const void* a_void, const void* b_void)
{
	static const int AFirst   = -1;
	static const int BFirst   = +1;
	static const int DontCare =  0;

	const MeshQueueEntry* a = *(MeshQueueEntry**) a_void;
	const MeshQueueEntry* b = *(MeshQueueEntry**) b_void;

	// 1. Manual draw order (e.g. Terrain < World < UI)
	if (a->mods->drawOrder < b->mods->drawOrder)    return AFirst;
	if (a->mods->drawOrder > b->mods->drawOrder)    return BFirst;

	// 2. Opaque meshes before transparent meshes
	if (a->meshIsTransparent != b->meshIsTransparent)
		return b->meshIsTransparent ? AFirst : BFirst;

	// 3. Depth sort
	if (!a->meshIsTransparent)
	{
		// Opaque: Front-to-Back (optimization)
		if (a->depth < b->depth)    return AFirst;
		if (a->depth > b->depth)    return BFirst;
	}
	else
	{
		// Transparent: Back-to-Front (required for blending)
		if (a->depth < b->depth)    return BFirst;
		if (a->depth > b->depth)    return AFirst;
	}

	// 4. Slot tie-breaker (linked list order)
	// If depth is identical, use Slot to maintain a consistent order.
	if (a->slot < b->slot) return AFirst;
	if (a->slot > b->slot) return BFirst;

	return DontCare;
}

#pragma mark -

static void SendGeometry(const MeshQueueEntry* entry)
{
uint32_t statusBits = entry->mods->statusBits;
const TQ3TriMeshData* mesh = entry->mesh;

// Cull backfaces unless explicitly kept
SetState(GL_CULL_FACE, !(statusBits & STATUS_BIT_KEEPBACKFACES));

// Two-pass for transparent backfaces: draw backfaces first, then frontfaces
if (statusBits & STATUS_BIT_KEEPBACKFACES_2PASS)
glCullFace(GL_FRONT);       // pass 1: draw backfaces

// Submit vertex positions
ATTRIB_VBO(gState.loc_a_Position, VBO_ATTRIB_POS, 3, mesh, points);

// Upload combined modelview if the per-object transform changed
if (gState.currentTransform != entry->transform)
{
if (entry->transform)
{
TQ3Matrix4x4 combined;
Q3Matrix4x4_Multiply(entry->transform, &gCurrentModelView, &combined);
UploadMatrix4x4(gState.loc_u_ModelView, &combined);
UploadMatrix3x3NormalFromMV(&combined);
}
else
{
UploadMatrix4x4(gState.loc_u_ModelView, &gCurrentModelView);
UploadMatrix3x3NormalFromMV(&gCurrentModelView);
}
gState.currentTransform = entry->transform;
}

DRAW_ELEMENTS_VBO(mesh);
CHECK_GL_ERROR();

// Pass 2: draw frontfaces (improves look of translucent spheres etc.)
if (statusBits & STATUS_BIT_KEEPBACKFACES_2PASS)
{
glCullFace(GL_BACK);        // pass 2: draw frontfaces
DRAW_ELEMENTS_VBO(mesh);
CHECK_GL_ERROR();
}
}

static void BeginDepthPass(const MeshQueueEntry* entry)
{
const TQ3TriMeshData* mesh = entry->mesh;

GAME_ASSERT(!(entry->mods->statusBits & STATUS_BIT_NOZWRITE));

// Never write to color buffer in this pass
SetColorMask(GL_FALSE);
SetFlag(glDepthMask, true);
EnableState(GL_DEPTH_TEST);

// No lighting or fog needed for depth-only pass
SetUniformBool(gState.loc_u_LightingEnabled, &gState.lightingEnabled, false);
SetUniformBool(gState.loc_u_FogEnabled,      &gState.fogEnabled,      false);
SetUniformBool(gState.loc_u_UseVertexColors, &gState.useVertexColors, false);
glUniform4f(gState.loc_u_DiffuseColor, 1, 1, 1, 1);

DisableAttrib(Normal);
DisableAttrib(Color);

if (gDebugMode != DEBUG_MODE_NOTEXTURES &&
(mesh->texturingMode & kQ3TexturingModeExt_OpacityModeMask) != kQ3TexturingModeOff)
{
SetUniformBool(gState.loc_u_TextureEnabled,   &gState.textureEnabled,   true);
SetUniformBool(gState.loc_u_AlphaTestEnabled, &gState.alphaTestEnabled, true);
EnableAttrib(TexCoord);
Render_BindTexture(mesh->glTextureName);
ATTRIB_VBO(gState.loc_a_TexCoord, VBO_ATTRIB_TC, 2, mesh, vertexUVs);
CHECK_GL_ERROR();
}
else
{
SetUniformBool(gState.loc_u_TextureEnabled,   &gState.textureEnabled,   false);
SetUniformBool(gState.loc_u_AlphaTestEnabled, &gState.alphaTestEnabled, false);
DisableAttrib(TexCoord);
}
}

static void BeginShadingPass(const MeshQueueEntry* entry)
{
const TQ3TriMeshData* mesh = entry->mesh;
uint32_t statusBits = entry->mods->statusBits;

// Always write to color buffer in this pass
SetColorMask(GL_TRUE);

// Environment map effect
if (statusBits & STATUS_BIT_REFLECTIONMAP)
EnvironmentMapTriMesh(mesh, entry->transform);

// Lighting
bool wantLighting = !((statusBits & STATUS_BIT_NULLSHADER)
|| (mesh->texturingMode & kQ3TexturingModeExt_NullShaderFlag));
SetUniformBool(gState.loc_u_LightingEnabled, &gState.lightingEnabled, wantLighting);

// Fog
bool wantFog = gState.sceneHasFog && !(statusBits & STATUS_BIT_NOFOG);
SetUniformBool(gState.loc_u_FogEnabled, &gState.fogEnabled, wantFog);

// Texture mapping
if (gDebugMode != DEBUG_MODE_NOTEXTURES &&
(mesh->texturingMode & kQ3TexturingModeExt_OpacityModeMask) != kQ3TexturingModeOff)
{
SetUniformBool(gState.loc_u_TextureEnabled, &gState.textureEnabled, true);
EnableAttrib(TexCoord);
Render_BindTexture(mesh->glTextureName);
const float* uvs = (const float*)(statusBits & STATUS_BIT_REFLECTIONMAP ? gEnvMapUVs : mesh->vertexUVs);
#ifdef __EMSCRIPTEN__
VertexAttribVBO(gState.loc_a_TexCoord, VBO_ATTRIB_TC, 2, mesh->numPoints, uvs);
#else
glVertexAttribPointer(gState.loc_a_TexCoord, 2, GL_FLOAT, GL_FALSE, 0, uvs);
#endif
CHECK_GL_ERROR();
}
else
{
SetUniformBool(gState.loc_u_TextureEnabled, &gState.textureEnabled, false);
DisableAttrib(TexCoord);
}

// Normal data (only when lighting is active)
if (mesh->hasVertexNormals && wantLighting)
{
EnableAttrib(Normal);
ATTRIB_VBO(gState.loc_a_Normal, VBO_ATTRIB_NORM, 3, mesh, vertexNormals);
}
else
{
DisableAttrib(Normal);
}
}

static void PrepareOpaqueShading(const MeshQueueEntry* entry)
{
const TQ3TriMeshData* mesh = entry->mesh;
const uint32_t statusBits  = entry->mods->statusBits;
TQ3TexturingMode texMode   = (mesh->texturingMode & kQ3TexturingModeExt_OpacityModeMask);

SetFlag(glDepthMask, !(statusBits & STATUS_BIT_NOZWRITE));

bool wantAlphaTest = (texMode == kQ3TexturingModeAlphaTest);
SetUniformBool(gState.loc_u_AlphaTestEnabled, &gState.alphaTestEnabled, wantAlphaTest);

if (mesh->hasVertexColors)
{
SetUniformBool(gState.loc_u_UseVertexColors, &gState.useVertexColors, true);
EnableAttrib(Color);
ATTRIB_VBO(gState.loc_a_Color, VBO_ATTRIB_COLOR, 4, mesh, vertexColors);
}
else
{
SetUniformBool(gState.loc_u_UseVertexColors, &gState.useVertexColors, false);
DisableAttrib(Color);
glUniform4f(gState.loc_u_DiffuseColor,
mesh->diffuseColor.r * entry->mods->diffuseColor.r,
mesh->diffuseColor.g * entry->mods->diffuseColor.g,
mesh->diffuseColor.b * entry->mods->diffuseColor.b,
1.0f);
}
}

static void PrepareAlphaShading(const MeshQueueEntry* entry)
{
	const TQ3TriMeshData* mesh = entry->mesh;
	const uint32_t statusBits  = entry->mods->statusBits;

	// In multi-pass rendering, transparent objects should NOT write to depth
	// to avoid blocking other transparent objects behind them.
	SetFlag(glDepthMask, false);

	// Additive blending for glow meshes
bool wantAdditive = !!(statusBits & STATUS_BIT_GLOW);
if (gState.blendFuncIsAdditive != wantAdditive)
{
if (wantAdditive)
glBlendFunc(GL_SRC_ALPHA, GL_ONE);
else
glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
gState.blendFuncIsAdditive = wantAdditive;
}

if (mesh->hasVertexColors)
{
SetUniformBool(gState.loc_u_UseVertexColors, &gState.useVertexColors, true);
EnableAttrib(Color);

// Bake autoFadeFactor into the per-vertex alpha channel
GAME_ASSERT(4 * mesh->numPoints <= (int)(sizeof(gBackupVertexColors) / sizeof(gBackupVertexColors[0])));
int j = 0;
for (int v = 0; v < mesh->numPoints; v++)
{
gBackupVertexColors[j++] = mesh->vertexColors[v].r;
gBackupVertexColors[j++] = mesh->vertexColors[v].g;
gBackupVertexColors[j++] = mesh->vertexColors[v].b;
gBackupVertexColors[j++] = mesh->vertexColors[v].a * entry->mods->autoFadeFactor;
}
#ifdef __EMSCRIPTEN__
VertexAttribVBO(gState.loc_a_Color, VBO_ATTRIB_COLOR, 4, mesh->numPoints, gBackupVertexColors);
#else
glVertexAttribPointer(gState.loc_a_Color, 4, GL_FLOAT, GL_FALSE, 0, gBackupVertexColors);
#endif
}
else
{
SetUniformBool(gState.loc_u_UseVertexColors, &gState.useVertexColors, false);
DisableAttrib(Color);
glUniform4f(gState.loc_u_DiffuseColor,
mesh->diffuseColor.r * entry->mods->diffuseColor.r,
mesh->diffuseColor.g * entry->mods->diffuseColor.g,
mesh->diffuseColor.b * entry->mods->diffuseColor.b,
mesh->diffuseColor.a * entry->mods->diffuseColor.a * entry->mods->autoFadeFactor);
}
}

void Render_ResetColor(void)
{
DisableState(GL_BLEND);
SetUniformBool(gState.loc_u_AlphaTestEnabled, &gState.alphaTestEnabled, false);
SetUniformBool(gState.loc_u_LightingEnabled,  &gState.lightingEnabled,  false);
SetUniformBool(gState.loc_u_TextureEnabled,   &gState.textureEnabled,   false);
DisableAttrib(Normal);
DisableAttrib(Color);
glUniform4f(gState.loc_u_DiffuseColor, 1, 1, 1, 1);
}

#pragma mark -

//=======================================================================================================

TQ3Vector2D FitRectKeepAR(
int logicalWidth,
int logicalHeight,
float displayWidth,
float displayHeight)
{
float displayAR = (float) displayWidth  / (float) displayHeight;
float logicalAR = (float) logicalWidth  / (float) logicalHeight;

if (displayAR >= logicalAR)
return (TQ3Vector2D) { displayHeight * logicalAR, displayHeight };
else
return (TQ3Vector2D) { displayWidth, displayWidth / logicalAR };
}

/****************************/
/*    2D MODE               */
/****************************/

static void MakeOrthoMatrix(
TQ3Matrix4x4* m,
float left, float right,
float bottom, float top,
float nearZ, float farZ)
{
float rl = right - left;
float tb = top   - bottom;
float fn = farZ  - nearZ;
SDL_memset(m->value, 0, sizeof(m->value));
m->value[0][0] =  2.0f / rl;
m->value[1][1] =  2.0f / tb;
m->value[2][2] = -2.0f / fn;
m->value[3][0] = -(right + left)   / rl;
m->value[3][1] = -(top   + bottom) / tb;
m->value[3][2] = -(farZ  + nearZ)  / fn;
m->value[3][3] = 1.0f;
}

static void MakeIdentityMatrix(TQ3Matrix4x4* m)
{
SDL_memset(m->value, 0, sizeof(m->value));
m->value[0][0] = m->value[1][1] = m->value[2][2] = m->value[3][3] = 1.0f;
}

void Render_Enter2D_Full640x480(void)
{
if (gGamePrefs.force4x3AspectRatio)
{
TQ3Vector2D fitted = FitRectKeepAR(GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT, gWindowWidth, gWindowHeight);
glViewport(
(GLint) (0.5f * (gWindowWidth  - fitted.x)),
(GLint) (0.5f * (gWindowHeight - fitted.y)),
(GLint) ceilf(fitted.x),
(GLint) ceilf(fitted.y));
}
else
{
glViewport(0, 0, gWindowWidth, gWindowHeight);
}

GAME_ASSERT(gMatrixStackTop < MATRIX_STACK_DEPTH);
gProjectionStack[gMatrixStackTop] = gCurrentProjection;
gModelViewStack[gMatrixStackTop]  = gCurrentModelView;
gMatrixStackTop++;

TQ3Matrix4x4 proj, mv;
MakeOrthoMatrix(&proj, 0, 640, 480, 0, 0, 1000);
MakeIdentityMatrix(&mv);
Render_SetProjectionMatrix(&proj);
Render_SetModelViewMatrix(&mv);
}

void Render_Enter2D_NormalizedCoordinates(float aspect)
{
GAME_ASSERT(gMatrixStackTop < MATRIX_STACK_DEPTH);
gProjectionStack[gMatrixStackTop] = gCurrentProjection;
gModelViewStack[gMatrixStackTop]  = gCurrentModelView;
gMatrixStackTop++;

TQ3Matrix4x4 proj, mv;
MakeOrthoMatrix(&proj, -aspect, aspect, -1, 1, 0, 1000);
MakeIdentityMatrix(&mv);
Render_SetProjectionMatrix(&proj);
Render_SetModelViewMatrix(&mv);
}

void Render_Enter2D_NativeResolution(void)
{
GAME_ASSERT(gMatrixStackTop < MATRIX_STACK_DEPTH);
gProjectionStack[gMatrixStackTop] = gCurrentProjection;
gModelViewStack[gMatrixStackTop]  = gCurrentModelView;
gMatrixStackTop++;

TQ3Matrix4x4 proj, mv;
MakeOrthoMatrix(&proj, 0, gWindowWidth, gWindowHeight, 0, 0, 1000);
MakeIdentityMatrix(&mv);
Render_SetProjectionMatrix(&proj);
Render_SetModelViewMatrix(&mv);
}

void Render_Exit2D(void)
{
GAME_ASSERT(gMatrixStackTop > 0);
gMatrixStackTop--;
Render_SetProjectionMatrix(&gProjectionStack[gMatrixStackTop]);
Render_SetModelViewMatrix(&gModelViewStack[gMatrixStackTop]);
}

#pragma mark -

//=======================================================================================================

/*******************************************/
/*    BACKDROP/OVERLAY (COVER WINDOW)      */
/*******************************************/

void Render_DrawFadeOverlay(float opacity)
{
GAME_ASSERT(gFullscreenQuad);
gFullscreenQuad->texturingMode = kQ3TexturingModeOff;
gFullscreenQuad->diffuseColor  = (TQ3ColorRGBA) { 0, 0, 0, 1.0f - opacity };
Render_SubmitMesh(gFullscreenQuad, NULL, &kDefaultRenderMods_FadeOverlay, &kQ3Point3D_Zero, 0);
}

#pragma mark -

TQ3Area Render_GetAdjustedViewportRect(Rect paneClip, int logicalWidth, int logicalHeight)
{
float scaleX, scaleY, xoff = 0, yoff = 0;

if (!gGamePrefs.force4x3AspectRatio)
{
scaleX = gWindowWidth  / (float) logicalWidth;
scaleY = gWindowHeight / (float) logicalHeight;
}
else
{
TQ3Vector2D fitted = FitRectKeepAR(logicalWidth, logicalHeight, gWindowWidth, gWindowHeight);
xoff   = (gWindowWidth  - fitted.x) * 0.5f;
yoff   = (gWindowHeight - fitted.y) * 0.5f;
scaleX = fitted.x / (float) logicalWidth;
scaleY = fitted.y / (float) logicalHeight;
}

float left   = floorf(xoff + scaleX * paneClip.left);
float right  = ceilf (xoff + scaleX * (logicalWidth  - paneClip.right));
float top    = floorf(yoff + scaleY * paneClip.top);
float bottom = ceilf (yoff + scaleY * (logicalHeight - paneClip.bottom));

return (TQ3Area) {{left, top}, {right, bottom}};
}
