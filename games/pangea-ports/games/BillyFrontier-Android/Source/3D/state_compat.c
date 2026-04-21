//
// state_compat.c
// OpenGL state management compatibility implementation
//

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include "game.h"
#include <string.h>
#include <math.h>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

// IMPORTANT: #undef macros that this file implements, so the default/passthrough
// cases can call the REAL OpenGL functions provided by Emscripten's GL emulation
// instead of recursing back into our CompatGL_* wrappers.
#undef glEnable
#undef glDisable
#undef glIsEnabled
#undef glGetFloatv
#undef glGetIntegerv
#undef glGetBooleanv
#undef glBlendFunc
#undef glDepthMask

// ── Direct WebGL calls ────────────────────────────────────────────────────────
// When LEGACY_GL_EMULATION is active, Emscripten hooks glEnable/glDisable with
// wrappers that inspect texture-unit state via getCurTexUnit().  That state is
// only initialised after the first draw call, so any glEnable/glDisable that
// happens during OpenGL *initialisation* (before any geometry has been drawn)
// will crash with "Cannot read properties of null".
//
// To avoid this, the default/passthrough cases below call the WebGL context
// directly (GLctx.enable / GLctx.disable / GLctx.isEnabled / GLctx.getParameter),
// bypassing Emscripten's hooks entirely.  This is safe because the caps that
// reach the default case (GL_BLEND, GL_DEPTH_TEST, GL_CULL_FACE, …) are plain
// WebGL caps with no legacy-emulation semantics.
// ──────────────────────────────────────────────────────────────────────────────

static void WebGL_Enable(GLenum cap)
{
#ifdef __EMSCRIPTEN__
    EM_ASM({ GLctx.enable($0); }, cap);
#else
    glEnable(cap);
#endif
}

static void WebGL_Disable(GLenum cap)
{
#ifdef __EMSCRIPTEN__
    EM_ASM({ GLctx.disable($0); }, cap);
#else
    glDisable(cap);
#endif
}

static GLboolean WebGL_IsEnabled(GLenum cap)
{
#ifdef __EMSCRIPTEN__
    return (GLboolean)EM_ASM_INT({ return GLctx.isEnabled($0) ? 1 : 0; }, cap);
#else
    return glIsEnabled(cap);
#endif
}

static void WebGL_GetFloatv(GLenum pname, GLfloat* params)
{
    // For unsupported pnames fall back to the real glGetFloatv (which is the
    // Emscripten wrapper).  The one pname we intercept (GL_CURRENT_COLOR)
    // never reaches here — it's handled in CompatGL_GetFloatv above.
    glGetFloatv(pname, params);
}

// Matrix stack implementation
#define MATRIX_STACK_DEPTH 32

// Forward declarations
static void Matrix4x4Identity(float* m);
static void Matrix4x4Multiply(const float* a, const float* b, float* out);

typedef struct {
    float matrices[MATRIX_STACK_DEPTH][16];
    int depth;
} MatrixStack;

static MatrixStack gModelViewStack;
static MatrixStack gProjectionStack;
static MatrixStack gTextureStack;
static MatrixStack* gCurrentStack = &gModelViewStack;
static Boolean gMatrixStacksInitialized = false;
// True when any matrix stack has been modified since the last
// CompatGL_UpdateShaderState call. This avoids redundant 4×4 matrix
// multiplications on every draw call when only the material or other
// non-matrix state has changed.
static Boolean gMatrixStacksDirty = true;

static void EnsureMatrixStacksInitialized(void)
{
    if (!gMatrixStacksInitialized)
    {
        gMatrixStacksInitialized = true;
        Matrix4x4Identity(gModelViewStack.matrices[0]);
        Matrix4x4Identity(gProjectionStack.matrices[0]);
        Matrix4x4Identity(gTextureStack.matrices[0]);
    }
}

static GLenum gCurrentMatrixMode = GL_MODELVIEW;
static int gCurrentTextureUnit = 0;
static Boolean gLightingEnabled = false;
static Boolean gFogEnabled = false;
static Boolean gAlphaTestEnabled = false;
static Boolean gTexture2DEnabled[2] = {false, false}; // Per texture unit
static Boolean gNormalizeEnabled = false;
static int gAlphaFunc = 7; // GL_ALWAYS
static float gAlphaRef = 0.0f;

// Track blend func state for glGetIntegerv compat
static GLenum gBlendSrc = GL_ONE;
static GLenum gBlendDst = GL_ZERO;
static GLboolean gDepthMask = GL_TRUE;

// Helper to multiply two 4x4 column-major matrices: out = a * b
// OpenGL stores matrices in column-major order: element (row, col) is at index [col*4+row].
// So for C = A * B: C(row,col) = sum_k A(row,k) * B(k,col)
//                  = sum_k a[k*4+row] * b[col*4+k]
static void Matrix4x4Multiply(const float* a, const float* b, float* out)
{
    for (int col = 0; col < 4; col++)
    {
        for (int row = 0; row < 4; row++)
        {
            float sum = 0;
            for (int k = 0; k < 4; k++)
            {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            out[col * 4 + row] = sum;
        }
    }
}

// Helper to set identity matrix
static void Matrix4x4Identity(float* m)
{
    memset(m, 0, 16 * sizeof(float));
    m[0] = m[5] = m[10] = m[15] = 1.0f;
}

void CompatGL_Enable(GLenum cap)
{
    switch (cap)
    {
        case GL_LIGHTING:
            gLightingEnabled = true;
            ModernGL_SetLighting(true);
            break;
        case GL_FOG:
            gFogEnabled = true;
            break;
        case GL_ALPHA_TEST:
            gAlphaTestEnabled = true;
            break;
        case GL_TEXTURE_2D:
            if (gCurrentTextureUnit >= 0 && gCurrentTextureUnit < 2)
                gTexture2DEnabled[gCurrentTextureUnit] = true;
            break;

        // States that don't exist in WebGL/GLES2 — silently ignore
        case GL_NORMALIZE:
            gNormalizeEnabled = true;
            break;
        case GL_RESCALE_NORMAL:
        case GL_COLOR_MATERIAL:
        case GL_TEXTURE_GEN_S:
        case GL_TEXTURE_GEN_T:
            break;

        // Lights — track in our modern GL state
        case GL_LIGHT0:
        case GL_LIGHT1:
        case GL_LIGHT2:
        case GL_LIGHT3:
        {
            int idx = cap - GL_LIGHT0;
            extern ModernGLState gModernGLState;
            if (idx >= 0 && idx < 4 && idx >= gModernGLState.numLights)
            {
                gModernGLState.numLights = idx + 1;
                gModernGLState.dirtyFlags |= MODERNGL_DIRTY_LIGHTING;
            }
            break;
        }

        // Other states (GL_BLEND, GL_DEPTH_TEST, GL_CULL_FACE, etc.)
        // Call WebGL context directly to bypass LEGACY_GL_EMULATION hooks
        // that would crash before the first draw call (getCurTexUnit is null).
        default:
            WebGL_Enable(cap);
            break;
    }
}

void CompatGL_Disable(GLenum cap)
{
    switch (cap)
    {
        case GL_LIGHTING:
            gLightingEnabled = false;
            ModernGL_SetLighting(false);
            break;
        case GL_FOG:
            gFogEnabled = false;
            break;
        case GL_ALPHA_TEST:
            gAlphaTestEnabled = false;
            break;
        case GL_TEXTURE_2D:
            if (gCurrentTextureUnit >= 0 && gCurrentTextureUnit < 2)
                gTexture2DEnabled[gCurrentTextureUnit] = false;
            break;

        // States that don't exist in WebGL/GLES2 — silently ignore
        case GL_NORMALIZE:
            gNormalizeEnabled = false;
            break;
        case GL_RESCALE_NORMAL:
        case GL_COLOR_MATERIAL:
            break;
        case GL_TEXTURE_GEN_S:
        case GL_TEXTURE_GEN_T:
        {
            // Reset sphere map when texture generation is disabled
            extern ModernGLState gModernGLState;
            gModernGLState.useSphereMap = false;
            gModernGLState.dirtyFlags |= MODERNGL_DIRTY_TEXTURES;
            break;
        }

        // Lights — we don't truly disable them in the shader, but stop tracking
        case GL_LIGHT0:
        case GL_LIGHT1:
        case GL_LIGHT2:
        case GL_LIGHT3:
            break;

        default:
            WebGL_Disable(cap);
            break;
    }
}

void CompatGL_AlphaFunc(GLenum func, GLfloat ref)
{
    // Convert GL alpha func to our internal format
    switch (func)
    {
        case GL_NEVER: gAlphaFunc = 0; break;
        case GL_LESS: gAlphaFunc = 1; break;
        case GL_EQUAL: gAlphaFunc = 2; break;
        case GL_LEQUAL: gAlphaFunc = 3; break;
        case GL_GREATER: gAlphaFunc = 4; break;
        case GL_NOTEQUAL: gAlphaFunc = 5; break;
        case GL_GEQUAL: gAlphaFunc = 6; break;
        case GL_ALWAYS: gAlphaFunc = 7; break;
    }
    gAlphaRef = ref;
}

void CompatGL_Fog(GLenum pname, GLfloat param)
{
    extern ModernGLState gModernGLState;

    switch (pname)
    {
        case GL_FOG_START:
            gModernGLState.fogStart = param;
            break;
        case GL_FOG_END:
            gModernGLState.fogEnd = param;
            break;
        case GL_FOG_DENSITY:
            gModernGLState.fogDensity = param;
            break;
    }
    gModernGLState.dirtyFlags |= MODERNGL_DIRTY_FOG;
}

void CompatGL_Fogfv(GLenum pname, const GLfloat* params)
{
    extern ModernGLState gModernGLState;

    if (pname == GL_FOG_COLOR)
    {
        gModernGLState.fogColor[0] = params[0];
        gModernGLState.fogColor[1] = params[1];
        gModernGLState.fogColor[2] = params[2];
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_FOG;
    }
}

void CompatGL_Fogi(GLenum pname, GLint param)
{
    extern ModernGLState gModernGLState;

    if (pname == GL_FOG_MODE)
    {
        switch (param)
        {
            case GL_LINEAR: gModernGLState.fogMode = 0; break;
            case GL_EXP: gModernGLState.fogMode = 1; break;
            case GL_EXP2: gModernGLState.fogMode = 2; break;
        }
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_FOG;
    }
}

void CompatGL_Light(GLenum light, GLenum pname, const GLfloat* params)
{
    extern ModernGLState gModernGLState;

    int lightIndex = light - GL_LIGHT0;
    if (lightIndex < 0 || lightIndex >= 4) return;

    if (pname == GL_POSITION)
    {
        // Per OpenGL spec, GL_POSITION is transformed by the current modelview matrix.
        // Transform the direction into eye space so it matches the eye-space normals
        // computed in the vertex shader (uNormalMatrix = mat3(MV)).
        const float* mv = gModelViewStack.matrices[gModelViewStack.depth];
        float dx = params[0], dy = params[1], dz = params[2];
        float ex = mv[0]*dx + mv[4]*dy + mv[8]*dz;
        float ey = mv[1]*dx + mv[5]*dy + mv[9]*dz;
        float ez = mv[2]*dx + mv[6]*dy + mv[10]*dz;
        // Normalize
        float len = sqrtf(ex*ex + ey*ey + ez*ez);
        if (len > 0.0001f)
        {
            ex /= len;
            ey /= len;
            ez /= len;
        }
        gModernGLState.lightDirection[lightIndex][0] = ex;
        gModernGLState.lightDirection[lightIndex][1] = ey;
        gModernGLState.lightDirection[lightIndex][2] = ez;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_LIGHTING;
    }
    else if (pname == GL_DIFFUSE)
    {
        gModernGLState.lightColor[lightIndex][0] = params[0];
        gModernGLState.lightColor[lightIndex][1] = params[1];
        gModernGLState.lightColor[lightIndex][2] = params[2];
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_LIGHTING;
    }
}

void CompatGL_LightModelfv(GLenum pname, const GLfloat* params)
{
    extern ModernGLState gModernGLState;

    if (pname == GL_LIGHT_MODEL_AMBIENT)
    {
        gModernGLState.ambientLight[0] = params[0];
        gModernGLState.ambientLight[1] = params[1];
        gModernGLState.ambientLight[2] = params[2];
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_LIGHTING;
    }
}

void CompatGL_Material(GLenum face, GLenum pname, const GLfloat* params)
{
    extern ModernGLState gModernGLState;

    if (pname == GL_AMBIENT_AND_DIFFUSE || pname == GL_DIFFUSE)
    {
        gModernGLState.materialColor[0] = params[0];
        gModernGLState.materialColor[1] = params[1];
        gModernGLState.materialColor[2] = params[2];
        gModernGLState.materialColor[3] = params[3];
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_MATERIAL;
    }
}

void CompatGL_TexEnvi(GLenum target, GLenum pname, GLint param)
{
    extern ModernGLState gModernGLState;

    if (target == GL_TEXTURE_ENV && pname == GL_TEXTURE_ENV_MODE)
    {
        // Map texture environment modes to our multi-texture combine mode
        switch (param)
        {
            case GL_MODULATE:
                gModernGLState.multiTextureCombine = 0;
                break;
            case GL_ADD:
            case GL_COMBINE:
                gModernGLState.multiTextureCombine = 1;
                break;
        }
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_TEXTURES;
    }
    else if (pname == GL_COMBINE_RGB)
    {
        if (param == GL_ADD)
            gModernGLState.multiTextureCombine = 1;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_TEXTURES;
    }
}

void CompatGL_TexGeni(GLenum coord, GLenum pname, GLint param)
{
    extern ModernGLState gModernGLState;

    if (pname == GL_TEXTURE_GEN_MODE && param == GL_SPHERE_MAP)
    {
        gModernGLState.useSphereMap = true;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_TEXTURES;
    }
}

void CompatGL_ActiveTexture(GLenum texture)
{
    gCurrentTextureUnit = (texture == GL_TEXTURE1 || texture == GL_TEXTURE1_ARB) ? 1 : 0;

    // Also call the real function for texture binding
    extern PFNGLACTIVETEXTUREARBPROC procptr_glActiveTextureARB;
    if (procptr_glActiveTextureARB)
        procptr_glActiveTextureARB(texture);
}

void CompatGL_MatrixMode(GLenum mode)
{
    EnsureMatrixStacksInitialized();
    gCurrentMatrixMode = mode;

    switch (mode)
    {
        case GL_MODELVIEW:
            gCurrentStack = &gModelViewStack;
            break;
        case GL_PROJECTION:
            gCurrentStack = &gProjectionStack;
            break;
        case GL_TEXTURE:
            gCurrentStack = &gTextureStack;
            break;
    }
}

void CompatGL_LoadMatrix(const GLfloat* m)
{
    if (gCurrentStack->depth < MATRIX_STACK_DEPTH)
    {
        memcpy(gCurrentStack->matrices[gCurrentStack->depth], m, 16 * sizeof(float));
        gMatrixStacksDirty = true;
    }
}

void CompatGL_LoadIdentity(void)
{
    if (gCurrentStack->depth < MATRIX_STACK_DEPTH)
    {
        Matrix4x4Identity(gCurrentStack->matrices[gCurrentStack->depth]);
        gMatrixStacksDirty = true;
    }
}

void CompatGL_MultMatrix(const GLfloat* m)
{
    if (gCurrentStack->depth < MATRIX_STACK_DEPTH)
    {
        float result[16];
        Matrix4x4Multiply(gCurrentStack->matrices[gCurrentStack->depth], m, result);
        memcpy(gCurrentStack->matrices[gCurrentStack->depth], result, 16 * sizeof(float));
        gMatrixStacksDirty = true;
    }
}

void CompatGL_PushMatrix(void)
{
    if (gCurrentStack->depth + 1 < MATRIX_STACK_DEPTH)
    {
        memcpy(gCurrentStack->matrices[gCurrentStack->depth + 1],
               gCurrentStack->matrices[gCurrentStack->depth],
               16 * sizeof(float));
        gCurrentStack->depth++;
        gMatrixStacksDirty = true;
    }
}

void CompatGL_PopMatrix(void)
{
    if (gCurrentStack->depth > 0)
    {
        gCurrentStack->depth--;
        gMatrixStacksDirty = true;
    }
}

void CompatGL_Translate(GLfloat x, GLfloat y, GLfloat z)
{
    float translation[16];
    Matrix4x4Identity(translation);
    translation[12] = x;
    translation[13] = y;
    translation[14] = z;
    CompatGL_MultMatrix(translation);
}

void CompatGL_Rotate(GLfloat angle, GLfloat x, GLfloat y, GLfloat z)
{
    float rad = angle * 3.14159265f / 180.0f;
    float c = cosf(rad);
    float s = sinf(rad);
    float len = sqrtf(x*x + y*y + z*z);
    if (len > 0.0001f)
    {
        x /= len;
        y /= len;
        z /= len;
    }

    float rotation[16];
    rotation[0] = x*x*(1-c) + c;
    rotation[1] = y*x*(1-c) + z*s;
    rotation[2] = x*z*(1-c) - y*s;
    rotation[3] = 0;
    rotation[4] = x*y*(1-c) - z*s;
    rotation[5] = y*y*(1-c) + c;
    rotation[6] = y*z*(1-c) + x*s;
    rotation[7] = 0;
    rotation[8] = x*z*(1-c) + y*s;
    rotation[9] = y*z*(1-c) - x*s;
    rotation[10] = z*z*(1-c) + c;
    rotation[11] = 0;
    rotation[12] = 0;
    rotation[13] = 0;
    rotation[14] = 0;
    rotation[15] = 1;

    CompatGL_MultMatrix(rotation);
}

void CompatGL_Scale(GLfloat x, GLfloat y, GLfloat z)
{
    float scale[16];
    Matrix4x4Identity(scale);
    scale[0] = x;
    scale[5] = y;
    scale[10] = z;
    CompatGL_MultMatrix(scale);
}

void CompatGL_Frustum(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble near, GLdouble far)
{
    float frustum[16] = {0};
    frustum[0] = (2.0f * near) / (right - left);
    frustum[5] = (2.0f * near) / (top - bottom);
    frustum[8] = (right + left) / (right - left);
    frustum[9] = (top + bottom) / (top - bottom);
    frustum[10] = -(far + near) / (far - near);
    frustum[11] = -1.0f;
    frustum[14] = -(2.0f * far * near) / (far - near);
    CompatGL_MultMatrix(frustum);
}

void CompatGL_Ortho(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble near, GLdouble far)
{
    float ortho[16] = {0};
    ortho[0] = 2.0f / (right - left);
    ortho[5] = 2.0f / (top - bottom);
    ortho[10] = -2.0f / (far - near);
    ortho[12] = -(right + left) / (right - left);
    ortho[13] = -(top + bottom) / (top - bottom);
    ortho[14] = -(far + near) / (far - near);
    ortho[15] = 1.0f;
    CompatGL_MultMatrix(ortho);
}

void CompatGL_UpdateShaderState(void)
{
    EnsureMatrixStacksInitialized();
    extern ModernGLState gModernGLState;
    extern float gGlobalTransparency;
    extern OGLColorRGB gGlobalColorFilter;

    // Only recompute MVP, normal matrix, and texture matrix when the matrix
    // stacks have actually changed.  This turns an O(draws) matrix multiply
    // into O(matrix-changes), which is typically 1-2 per frame vs 200+.
    if (gMatrixStacksDirty)
    {
        // Compute MVP matrix
        float mvp[16];
        Matrix4x4Multiply(gProjectionStack.matrices[gProjectionStack.depth],
                          gModelViewStack.matrices[gModelViewStack.depth],
                          mvp);

        // Extract 3x3 normal matrix from model-view
        float normalMatrix[9];
        const float* mv = gModelViewStack.matrices[gModelViewStack.depth];
        normalMatrix[0] = mv[0]; normalMatrix[1] = mv[1]; normalMatrix[2] = mv[2];
        normalMatrix[3] = mv[4]; normalMatrix[4] = mv[5]; normalMatrix[5] = mv[6];
        normalMatrix[6] = mv[8]; normalMatrix[7] = mv[9]; normalMatrix[8] = mv[10];

        // Update matrices in shader state
        ModernGL_SetMatrices(mvp, gModelViewStack.matrices[gModelViewStack.depth], normalMatrix);

        // Update texture matrix
        ModernGL_SetTextureMatrix(gTextureStack.matrices[gTextureStack.depth]);

        gMatrixStacksDirty = false;
    }

    // Sync GL_TEXTURE_2D state to shader texture flags
    if (gModernGLState.useTexture0 != gTexture2DEnabled[0]
        || gModernGLState.useTexture1 != gTexture2DEnabled[1])
    {
        gModernGLState.useTexture0 = gTexture2DEnabled[0];
        gModernGLState.useTexture1 = gTexture2DEnabled[1];
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_TEXTURES;
    }

    // Sync game global transparency & color filter to shader state
    if (gModernGLState.globalTransparency != gGlobalTransparency
        || gModernGLState.globalColorFilter[0] != gGlobalColorFilter.r
        || gModernGLState.globalColorFilter[1] != gGlobalColorFilter.g
        || gModernGLState.globalColorFilter[2] != gGlobalColorFilter.b)
    {
        gModernGLState.globalTransparency = gGlobalTransparency;
        gModernGLState.globalColorFilter[0] = gGlobalColorFilter.r;
        gModernGLState.globalColorFilter[1] = gGlobalColorFilter.g;
        gModernGLState.globalColorFilter[2] = gGlobalColorFilter.b;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_GLOBALS;
    }

    // Update fog state
    ModernGL_SetFog(gFogEnabled, gModernGLState.fogMode, gModernGLState.fogStart,
                    gModernGLState.fogEnd, gModernGLState.fogDensity,
                    gModernGLState.fogColor[0], gModernGLState.fogColor[1], gModernGLState.fogColor[2]);

    // Update alpha test
    ModernGL_SetAlphaTest(gAlphaTestEnabled, gAlphaFunc, gAlphaRef);

    // Use shader and update only dirty uniforms
    ModernGL_UseShader();
    ModernGL_UpdateUniforms();
}

GLboolean CompatGL_IsEnabled(GLenum cap)
{
    switch (cap)
    {
        case GL_LIGHTING:       return gLightingEnabled;
        case GL_FOG:            return gFogEnabled;
        case GL_ALPHA_TEST:     return gAlphaTestEnabled;
        case GL_TEXTURE_2D:     return (gCurrentTextureUnit >= 0 && gCurrentTextureUnit < 2) ? gTexture2DEnabled[gCurrentTextureUnit] : false;
        case GL_NORMALIZE:      return gNormalizeEnabled;
        case GL_RESCALE_NORMAL: return false;
        case GL_COLOR_MATERIAL: return false;
        default:
            return WebGL_IsEnabled(cap);
    }
}

void CompatGL_GetFloatv(GLenum pname, GLfloat* params)
{
    extern ModernGLState gModernGLState;
    extern ImmediateModeBuffer gImmediateModeBuffer;

    switch (pname)
    {
        case GL_CURRENT_COLOR:
            // Return the current color from our immediate mode buffer
            params[0] = gImmediateModeBuffer.currentColor[0];
            params[1] = gImmediateModeBuffer.currentColor[1];
            params[2] = gImmediateModeBuffer.currentColor[2];
            params[3] = gImmediateModeBuffer.currentColor[3];
            break;
        case GL_MODELVIEW_MATRIX:
            // Return the current modelview matrix from our software stack
            EnsureMatrixStacksInitialized();
            memcpy(params, gModelViewStack.matrices[gModelViewStack.depth], 16 * sizeof(float));
            break;
        case GL_PROJECTION_MATRIX:
            // Return the current projection matrix from our software stack
            EnsureMatrixStacksInitialized();
            memcpy(params, gProjectionStack.matrices[gProjectionStack.depth], 16 * sizeof(float));
            break;
        default:
            WebGL_GetFloatv(pname, params);
            break;
    }
}

void CompatGL_BlendFunc(GLenum sfactor, GLenum dfactor)
{
    gBlendSrc = sfactor;
    gBlendDst = dfactor;
    glBlendFunc(sfactor, dfactor);
}

void CompatGL_DepthMask(GLboolean flag)
{
    gDepthMask = flag;
    glDepthMask(flag);
}

void CompatGL_GetIntegerv(GLenum pname, GLint* params)
{
    switch (pname)
    {
        case GL_BLEND_SRC:
        case GL_BLEND_SRC_ALPHA:
            params[0] = (GLint)gBlendSrc;
            break;
        case GL_BLEND_DST:
        case GL_BLEND_DST_ALPHA:
            params[0] = (GLint)gBlendDst;
            break;
        default:
            glGetIntegerv(pname, params);
            break;
    }
}

void CompatGL_GetBooleanv(GLenum pname, GLboolean* params)
{
    switch (pname)
    {
        case GL_DEPTH_WRITEMASK:
            params[0] = gDepthMask;
            break;
        default:
            glGetBooleanv(pname, params);
            break;
    }
}

#endif // __EMSCRIPTEN__ || __ANDROID__
