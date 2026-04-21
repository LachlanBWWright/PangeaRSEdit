// gl_compat.c – OpenGL fixed-function compatibility layer for Emscripten/WebGL.
//
// Provides a GLES2 / WebGL implementation of the OpenGL 1.x fixed-function
// pipeline used by Nanosaur 2, without using Emscripten's LEGACY_GL_EMULATION.
//
// Architecture:
//   • One GLSL ES 1.00 program implements vertex transforms, per-vertex
//     lighting (up to MAX_FILL_LIGHTS directional lights), fog, multi-texture
//     (2 units), texture-env combine modes, and alpha-test discard.
//   • Software matrix stacks (modelview, projection) mirror the OpenGL state.
//   • glVertexPointer / glNormalPointer / glColorPointer / glTexCoordPointer
//     record client-side array state; on glDrawElements or glDrawArrays the
//     data is uploaded to a temporary VBO and drawn with proper attrib bindings.
//   • glBegin / glEnd buffers vertices in a small CPU array and flushes via
//     glDrawArrays when glEnd is called; GL_QUADS is split into triangles.
//   • glGetFloatv for GL_MODELVIEW_MATRIX / GL_PROJECTION_MATRIX returns our
//     software stack top.

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include <SDL3/SDL.h>
#include "gl_compat.h"

#include <string.h>
#include <math.h>
#include <stdlib.h>
#include <stdio.h>

// ── Constants ─────────────────────────────────────────────────────────────────
#define MAX_FILL_LIGHTS   4
#define MATRIX_STACK_DEPTH 32
#define IMMED_MAX_VERTS   16384

// ── Forward declarations for Emscripten's real GL functions ───────────────────
// These are provided by Emscripten's WebGL library and bypass our wrappers.
#ifdef __EMSCRIPTEN__
// On Emscripten, use the emscripten_gl* functions which bypass our macro wrappers
// and call the underlying WebGL functions directly.
extern void emscripten_glEnable(GLenum cap);
extern void emscripten_glDisable(GLenum cap);
extern void emscripten_glGetFloatv(GLenum pname, GLfloat *data);
extern void emscripten_glGetIntegerv(GLenum pname, GLint *data);
extern void emscripten_glDrawElements(GLenum mode, GLsizei count, GLenum type, const void *indices);
extern void emscripten_glDrawArrays(GLenum mode, GLint first, GLsizei count);
extern void emscripten_glHint(GLenum target, GLenum mode);
extern GLboolean emscripten_glIsEnabled(GLenum cap);
#define REAL_glEnable           emscripten_glEnable
#define REAL_glDisable          emscripten_glDisable
#define REAL_glGetFloatv        emscripten_glGetFloatv
#define REAL_glGetIntegerv      emscripten_glGetIntegerv
#define REAL_glDrawElements     emscripten_glDrawElements
#define REAL_glDrawArrays       emscripten_glDrawArrays
#define REAL_glHint             emscripten_glHint
#define REAL_glIsEnabled        emscripten_glIsEnabled
#else // __ANDROID__
// On Android, we define our own gl wrappers with the same names as GLES2 functions.
// To call the REAL GLES2 implementation from within those wrappers (without recursion),
// we use dlsym(RTLD_NEXT, ...) to obtain function pointers from the next DSO in the
// search order (i.e., libGLESv2.so).  The pointers are populated in COMPAT_GL_Init.
#include <dlfcn.h>
static void      (*real_glEnable)      (GLenum)                              = NULL;
static void      (*real_glDisable)     (GLenum)                              = NULL;
static void      (*real_glGetFloatv)   (GLenum, GLfloat*)                    = NULL;
static void      (*real_glGetIntegerv) (GLenum, GLint*)                      = NULL;
static void      (*real_glDrawElements)(GLenum, GLsizei, GLenum, const void*)= NULL;
static void      (*real_glDrawArrays)  (GLenum, GLint, GLsizei)              = NULL;
static void      (*real_glHint)        (GLenum, GLenum)                      = NULL;
static GLboolean (*real_glIsEnabled)   (GLenum)                              = NULL;
#define REAL_glEnable           real_glEnable
#define REAL_glDisable          real_glDisable
#define REAL_glGetFloatv        real_glGetFloatv
#define REAL_glGetIntegerv      real_glGetIntegerv
#define REAL_glDrawElements     real_glDrawElements
#define REAL_glDrawArrays       real_glDrawArrays
#define REAL_glHint             real_glHint
#define REAL_glIsEnabled        real_glIsEnabled
#endif // __EMSCRIPTEN__ || __ANDROID__

// ── 4×4 float matrix ─────────────────────────────────────────────────────────
typedef struct { float m[16]; } Mat4;

static void mat4_identity(Mat4 *out) {
    memset(out, 0, sizeof(*out));
    out->m[0] = out->m[5] = out->m[10] = out->m[15] = 1.0f;
}
static void mat4_mul(Mat4 *out, const Mat4 *a, const Mat4 *b) {
    Mat4 tmp;
    for (int c = 0; c < 4; c++)
        for (int r = 0; r < 4; r++) {
            float s = 0;
            for (int k = 0; k < 4; k++) s += a->m[k*4+r] * b->m[c*4+k];
            tmp.m[c*4+r] = s;
        }
    *out = tmp;
}
static void mat3_from_mat4(float out[9], const Mat4 *m) {
    // upper-left 3×3
    out[0]=m->m[0]; out[1]=m->m[1]; out[2]=m->m[2];
    out[3]=m->m[4]; out[4]=m->m[5]; out[5]=m->m[6];
    out[6]=m->m[8]; out[7]=m->m[9]; out[8]=m->m[10];
}

// ── Matrix stacks ─────────────────────────────────────────────────────────────
static Mat4 s_modelview_stack[MATRIX_STACK_DEPTH];
static int  s_modelview_top = 0;
static Mat4 s_projection_stack[MATRIX_STACK_DEPTH];
static int  s_projection_top = 0;
static int  s_matrix_mode = GL_MODELVIEW;

static Mat4 *current_matrix(void) {
    return s_matrix_mode == GL_PROJECTION
        ? &s_projection_stack[s_projection_top]
        : &s_modelview_stack[s_modelview_top];
}

// ── Lighting state ────────────────────────────────────────────────────────────
typedef struct {
    int   enabled;
    float position[4];   // in eye space (set via glLightfv GL_POSITION)
    float diffuse[4];
    float ambient[4];
} LightState;

static float       s_ambient_light[4] = {0.2f, 0.2f, 0.2f, 1.0f};
static LightState  s_lights[MAX_FILL_LIGHTS];
static int         s_lighting_enabled = 0;

// ── Fog state ─────────────────────────────────────────────────────────────────
static int   s_fog_enabled = 0;
static int   s_fog_mode    = GL_LINEAR;   // GL_LINEAR / GL_EXP / GL_EXP2
static float s_fog_start   = 0.0f;
static float s_fog_end     = 1.0f;
static float s_fog_density = 1.0f;
static float s_fog_color[4] = {0,0,0,1};

// ── Alpha-test state ──────────────────────────────────────────────────────────
static int   s_alpha_test_enabled = 0;
static int   s_alpha_func  = GL_ALWAYS;  // GL_ALWAYS … GL_NEVER
static float s_alpha_ref   = 0.0f;

// ── Texture-env state ─────────────────────────────────────────────────────────
// 0=MODULATE 1=ADD 2=REPLACE 3=COMBINE_ADD
static int s_texenv_mode[2] = {0, 0};
static int s_texgen_s = 0, s_texgen_t = 0;  // sphere mapping enabled

// ── Current vertex color ──────────────────────────────────────────────────────
static float s_current_color[4] = {1,1,1,1};

// ── Client-state vertex arrays ────────────────────────────────────────────────
typedef struct {
    int         enabled;
    GLint       size;
    GLenum      type;
    GLsizei     stride;
    const void *ptr;
} ClientArray;

static ClientArray s_ca_vertex   = {0,3,GL_FLOAT,0,NULL};
static ClientArray s_ca_normal   = {0,3,GL_FLOAT,0,NULL};
static ClientArray s_ca_color    = {0,4,GL_FLOAT,0,NULL};
static ClientArray s_ca_texcoord[2] = {{0,2,GL_FLOAT,0,NULL},{0,2,GL_FLOAT,0,NULL}};
static int s_active_texcoord_unit = 0;  // for glClientActiveTexture

// ── Immediate-mode buffer ─────────────────────────────────────────────────────
typedef struct {
    float x,y,z;
    float nx,ny,nz;
    float r,g,b,a;
    float s0,t0;
    float s1,t1;
} ImmVert;
static ImmVert s_imm_verts[IMMED_MAX_VERTS];
static int     s_imm_count = 0;
static GLenum  s_imm_prim  = GL_TRIANGLES;
static int     s_in_begin  = 0;
static float   s_imm_cur_nx = 0, s_imm_cur_ny = 0, s_imm_cur_nz = 1;
static float   s_imm_cur_s0 = 0, s_imm_cur_t0 = 0;

// ── GL objects ────────────────────────────────────────────────────────────────
static GLuint  s_prog = 0;
static GLuint  s_vbo  = 0;

// Attribute locations (bound at compile time to fixed slots)
#define ATTRIB_POSITION  0
#define ATTRIB_NORMAL    1
#define ATTRIB_COLOR     2
#define ATTRIB_TEXCOORD0 3
#define ATTRIB_TEXCOORD1 4

// Uniform locations
static GLint u_mv, u_proj, u_normal_mat;
static GLint u_current_color, u_use_color_array;
static GLint u_lighting, u_ambient;
static GLint u_num_lights;
static GLint u_light_pos[MAX_FILL_LIGHTS];
static GLint u_light_diff[MAX_FILL_LIGHTS];
static GLint u_light_amb[MAX_FILL_LIGHTS];
static GLint u_fog, u_fog_mode_u, u_fog_start_u, u_fog_end_u, u_fog_density_u, u_fog_color_u;
static GLint u_alpha_test_u, u_alpha_func_u, u_alpha_ref_u;
static GLint u_texture0, u_texture1;
static GLint u_sampler0, u_sampler1;
static GLint u_texenv0, u_texenv1;
static GLint u_texgen;

// ── GLSL source strings ───────────────────────────────────────────────────────
static const char *VERT_SRC =
    "precision mediump float;\nprecision mediump int;\n"
    "attribute vec3 a_position;\n"
    "attribute vec3 a_normal;\n"
    "attribute vec4 a_color;\n"
    "attribute vec2 a_texcoord0;\n"
    "attribute vec2 a_texcoord1;\n"
    "uniform mat4 u_mv;\n"
    "uniform mat4 u_proj;\n"
    "uniform mat3 u_normal_mat;\n"
    "uniform vec4 u_current_color;\n"
    // Use int instead of bool: bool uniforms can be unreliable in GLSL ES 1.0
    "uniform int  u_use_color_array;\n"
    "uniform int  u_lighting;\n"
    "uniform vec4 u_ambient;\n"
    "uniform int  u_num_lights;\n"
    "uniform vec4 u_light_pos[4];\n"
    "uniform vec4 u_light_diff[4];\n"
    "uniform vec4 u_light_amb[4];\n"
    "uniform int  u_fog;\n"
    "uniform int  u_texgen;\n"
    "varying vec4 v_color;\n"
    "varying vec2 v_tc0;\n"
    "varying vec2 v_tc1;\n"
    "varying float v_fog_depth;\n"
    // Helper: compute contribution from one light
    "vec3 light_contrib(int li, vec3 n, vec4 ep) {\n"
    "  vec3 ld = (u_light_pos[li].w == 0.0)\n"
    "           ? normalize(vec3(u_light_pos[li]))\n"
    "           : normalize(vec3(u_light_pos[li]) - vec3(ep));\n"
    "  float d = max(dot(n, ld), 0.0);\n"
    "  return u_light_amb[li].rgb + d * u_light_diff[li].rgb;\n"
    "}\n"
    "void main() {\n"
    "  vec4 eye_pos = u_mv * vec4(a_position, 1.0);\n"
    "  gl_Position  = u_proj * eye_pos;\n"
    "  vec4 vc = (u_use_color_array != 0) ? a_color : u_current_color;\n"
    "  if (u_lighting != 0) {\n"
    "    vec3 n = normalize(u_normal_mat * a_normal);\n"
    "    vec4 color = u_ambient;\n"
    // Unrolled 4-light loop — avoids break+non-constant-bound (invalid GLSL ES 1.0)
    "    if (u_num_lights > 0) color.rgb += light_contrib(0, n, eye_pos);\n"
    "    if (u_num_lights > 1) color.rgb += light_contrib(1, n, eye_pos);\n"
    "    if (u_num_lights > 2) color.rgb += light_contrib(2, n, eye_pos);\n"
    "    if (u_num_lights > 3) color.rgb += light_contrib(3, n, eye_pos);\n"
    "    v_color = clamp(color, 0.0, 1.0) * vc;\n"
    "  } else {\n"
    "    v_color = vc;\n"
    "  }\n"
    // Sphere-map texcoords from eye-space normal
    "  if (u_texgen != 0) {\n"
    "    vec3 r = reflect(normalize(vec3(eye_pos)), normalize(u_normal_mat * a_normal));\n"
    "    float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0));\n"
    "    v_tc1 = vec2(r.x/m + 0.5, r.y/m + 0.5);\n"
    "    v_tc0 = a_texcoord0;\n"
    "  } else {\n"
    "    v_tc0 = a_texcoord0;\n"
    "    v_tc1 = a_texcoord1;\n"
    "  }\n"
    "  v_fog_depth = (u_fog != 0) ? abs(eye_pos.z) : 0.0;\n"
    "}\n";

static const char *FRAG_SRC =
    "precision mediump float;\nprecision mediump int;\n"
    "varying vec4  v_color;\n"
    "varying vec2  v_tc0;\n"
    "varying vec2  v_tc1;\n"
    "varying float v_fog_depth;\n"
    // Use int instead of bool for the same GLSL ES 1.0 compatibility reason
    "uniform int       u_texture0;\n"
    "uniform int       u_texture1;\n"
    "uniform sampler2D u_sampler0;\n"
    "uniform sampler2D u_sampler1;\n"
    "uniform int       u_texenv0;\n"   // 0=MODULATE 1=ADD 2=REPLACE 3=COMBINE_ADD
    "uniform int       u_texenv1;\n"
    "uniform int       u_fog;\n"
    "uniform int       u_fog_mode;\n"  // 0=LINEAR 1=EXP 2=EXP2
    "uniform float     u_fog_start;\n"
    "uniform float     u_fog_end;\n"
    "uniform float     u_fog_density;\n"
    "uniform vec4      u_fog_color;\n"
    "uniform int       u_alpha_test;\n"
    "uniform int       u_alpha_func;\n" // 0=NEVER 1=LESS 2=EQUAL 3=LEQUAL 4=GREATER 5=NOTEQUAL 6=GEQUAL 7=ALWAYS
    "uniform float     u_alpha_ref;\n"
    "void main() {\n"
    "  vec4 color = v_color;\n"
    "  if (u_texture0 != 0) {\n"
    "    vec4 tex = texture2D(u_sampler0, v_tc0);\n"
    "    if      (u_texenv0 == 0) color *= tex;\n"          // MODULATE
    "    else if (u_texenv0 == 1) { color.rgb = min(color.rgb+tex.rgb,1.0); color.a *= tex.a; }\n"  // ADD
    "    else if (u_texenv0 == 2) color = tex;\n"           // REPLACE
    "    else if (u_texenv0 == 3) { color.rgb = min(color.rgb+tex.rgb,1.0); }\n"  // COMBINE_ADD
    "  }\n"
    "  if (u_texture1 != 0) {\n"
    "    vec4 tex = texture2D(u_sampler1, v_tc1);\n"
    "    if      (u_texenv1 == 0) color *= tex;\n"
    "    else if (u_texenv1 == 1) { color.rgb = min(color.rgb+tex.rgb,1.0); color.a *= tex.a; }\n"
    "    else if (u_texenv1 == 2) color = tex;\n"
    "    else if (u_texenv1 == 3) { color.rgb = min(color.rgb+tex.rgb,1.0); }\n"
    "  }\n"
    "  if (u_alpha_test != 0) {\n"
    "    float a = color.a;\n"
    "    if      (u_alpha_func == 0) discard;\n"            // NEVER
    "    else if (u_alpha_func == 1 && a >= u_alpha_ref) discard;\n"  // LESS
    "    else if (u_alpha_func == 2 && a != u_alpha_ref) discard;\n"  // EQUAL
    "    else if (u_alpha_func == 3 && a >  u_alpha_ref) discard;\n"  // LEQUAL
    "    else if (u_alpha_func == 4 && a <= u_alpha_ref) discard;\n"  // GREATER
    "    else if (u_alpha_func == 5 && a == u_alpha_ref) discard;\n"  // NOTEQUAL
    "    else if (u_alpha_func == 6 && a <  u_alpha_ref) discard;\n"  // GEQUAL
    "  }\n"
    "  if (u_fog != 0) {\n"
    "    float ff;\n"
    "    if      (u_fog_mode == 0) ff = (u_fog_end - v_fog_depth) / (u_fog_end - u_fog_start);\n"
    "    else if (u_fog_mode == 1) ff = exp(-u_fog_density * v_fog_depth);\n"
    "    else { float d = u_fog_density * v_fog_depth; ff = exp(-d*d); }\n"
    "    ff = clamp(ff, 0.0, 1.0);\n"
    "    color.rgb = mix(u_fog_color.rgb, color.rgb, ff);\n"
    "  }\n"
    "  gl_FragColor = color;\n"
    "}\n";

// ── Helpers ───────────────────────────────────────────────────────────────────
static GLuint compile_shader(GLenum type, const char *src) {
    GLuint s = glCreateShader(type);
    glShaderSource(s, 1, &src, NULL);
    glCompileShader(s);
    GLint ok; glGetShaderiv(s, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        char buf[512]; glGetShaderInfoLog(s, 512, NULL, buf);
        SDL_Log("gl_compat: shader compile error: %s", buf);
    }
    return s;
}

// Upload matrices and lighting uniforms before a draw call
static void upload_uniforms(void) {
    glUseProgram(s_prog);

    // Matrices
    glUniformMatrix4fv(u_mv,   1, GL_FALSE, s_modelview_stack[s_modelview_top].m);
    glUniformMatrix4fv(u_proj, 1, GL_FALSE, s_projection_stack[s_projection_top].m);
    float nm[9]; mat3_from_mat4(nm, &s_modelview_stack[s_modelview_top]);
    glUniformMatrix3fv(u_normal_mat, 1, GL_FALSE, nm);

    // Current color
    glUniform4fv(u_current_color, 1, s_current_color);
    glUniform1i(u_use_color_array, s_ca_color.enabled ? 1 : 0);

    // Lighting
    glUniform1i(u_lighting, s_lighting_enabled ? 1 : 0);
    glUniform4fv(u_ambient, 1, s_ambient_light);
    int nl = 0;
    for (int i = 0; i < MAX_FILL_LIGHTS; i++) {
        if (s_lights[i].enabled) {
            glUniform4fv(u_light_pos[nl], 1, s_lights[i].position);
            glUniform4fv(u_light_diff[nl], 1, s_lights[i].diffuse);
            glUniform4fv(u_light_amb[nl], 1, s_lights[i].ambient);
            nl++;
        }
    }
    glUniform1i(u_num_lights, nl);

    // Fog
    glUniform1i(u_fog, s_fog_enabled ? 1 : 0);
    if (s_fog_enabled) {
        int fm = (s_fog_mode == GL_EXP) ? 1 : (s_fog_mode == GL_EXP2) ? 2 : 0;
        glUniform1i(u_fog_mode_u, fm);
        glUniform1f(u_fog_start_u,   s_fog_start);
        glUniform1f(u_fog_end_u,     s_fog_end);
        glUniform1f(u_fog_density_u, s_fog_density);
        glUniform4fv(u_fog_color_u, 1, s_fog_color);
    }

    // Alpha test
    glUniform1i(u_alpha_test_u, s_alpha_test_enabled ? 1 : 0);
    if (s_alpha_test_enabled) {
        int af = 7; // ALWAYS
        if      (s_alpha_func == GL_NEVER)   af = 0;
        else if (s_alpha_func == GL_LESS)    af = 1;
        else if (s_alpha_func == GL_EQUAL)   af = 2;
        else if (s_alpha_func == GL_LEQUAL)  af = 3;
        else if (s_alpha_func == GL_GREATER) af = 4;
        else if (s_alpha_func == GL_NOTEQUAL)af = 5;
        else if (s_alpha_func == GL_GEQUAL)  af = 6;
        glUniform1i(u_alpha_func_u, af);
        glUniform1f(u_alpha_ref_u, s_alpha_ref);
    }

    // Textures — query which texture units are active
    GLint tex0 = 0, tex1 = 0;
    glActiveTexture(GL_TEXTURE0);
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &tex0);
    glActiveTexture(GL_TEXTURE1);
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &tex1);

    // Restore active texture to 0 for default behaviour
    glActiveTexture(GL_TEXTURE0);

    int has_tex0 = (tex0 != 0) && s_ca_texcoord[0].enabled;
    int has_tex1 = (tex1 != 0) && (s_ca_texcoord[1].enabled || s_texgen_s);

    glUniform1i(u_texture0, has_tex0 ? 1 : 0);
    glUniform1i(u_texture1, has_tex1 ? 1 : 0);
    glUniform1i(u_sampler0, 0);
    glUniform1i(u_sampler1, 1);
    glUniform1i(u_texenv0,  s_texenv_mode[0]);
    glUniform1i(u_texenv1,  s_texenv_mode[1]);
    glUniform1i(u_texgen,   (s_texgen_s || s_texgen_t) ? 1 : 0);
}

// Set up vertex attributes from client-side arrays, upload to VBO, return
// vertex count (or -1 on error).  stride_out = per-vertex byte size.
static int setup_vertex_attribs_from_arrays(int vertex_count) {
    // Build an interleaved buffer: pos(3f) normal(3f) color(4f) tc0(2f) tc1(2f)
    const int STRIDE = (3+3+4+2+2) * sizeof(float);  // 56 bytes
    int buf_size = vertex_count * STRIDE;
    float *buf = (float *)malloc(buf_size);
    if (!buf) return -1;

    for (int i = 0; i < vertex_count; i++) {
        float *dst = buf + i * (3+3+4+2+2);

        // Position
        if (s_ca_vertex.ptr) {
            // Default stride = size * sizeof(float); NOT hardcoded 3*sizeof(float)
            // because 2D quads (size=2) pack tightly at 8 bytes/vertex.
            int vStride = s_ca_vertex.stride ? s_ca_vertex.stride
                                              : s_ca_vertex.size * (int)sizeof(float);
            const float *src = (const float *)((const char *)s_ca_vertex.ptr + i * vStride);
            dst[0] = src[0]; dst[1] = src[1]; dst[2] = (s_ca_vertex.size >= 3) ? src[2] : 0.0f;
        } else { dst[0]=dst[1]=dst[2]=0; }

        // Normal
        if (s_ca_normal.enabled && s_ca_normal.ptr) {
            const float *src = (const float *)((const char *)s_ca_normal.ptr
                               + i * (s_ca_normal.stride ? s_ca_normal.stride : 3*sizeof(float)));
            dst[3] = src[0]; dst[4] = src[1]; dst[5] = src[2];
        } else { dst[3]=0; dst[4]=0; dst[5]=1; }

        // Color
        if (s_ca_color.enabled && s_ca_color.ptr) {
            const float *src = (const float *)((const char *)s_ca_color.ptr
                               + i * (s_ca_color.stride ? s_ca_color.stride : 4*sizeof(float)));
            dst[6] = src[0]; dst[7] = src[1]; dst[8] = src[2]; dst[9] = src[3];
        } else {
            dst[6]=s_current_color[0]; dst[7]=s_current_color[1];
            dst[8]=s_current_color[2]; dst[9]=s_current_color[3];
        }

        // Texcoord0
        if (s_ca_texcoord[0].enabled && s_ca_texcoord[0].ptr) {
            const float *src = (const float *)((const char *)s_ca_texcoord[0].ptr
                               + i * (s_ca_texcoord[0].stride ? s_ca_texcoord[0].stride : 2*sizeof(float)));
            dst[10] = src[0]; dst[11] = src[1];
        } else { dst[10]=0; dst[11]=0; }

        // Texcoord1
        if (s_ca_texcoord[1].enabled && s_ca_texcoord[1].ptr) {
            const float *src = (const float *)((const char *)s_ca_texcoord[1].ptr
                               + i * (s_ca_texcoord[1].stride ? s_ca_texcoord[1].stride : 2*sizeof(float)));
            dst[12] = src[0]; dst[13] = src[1];
        } else { dst[12]=0; dst[13]=0; }
    }

    glBindBuffer(GL_ARRAY_BUFFER, s_vbo);
    glBufferData(GL_ARRAY_BUFFER, buf_size, buf, GL_STREAM_DRAW);
    free(buf);

    // Bind attributes
    glEnableVertexAttribArray(ATTRIB_POSITION);
    glVertexAttribPointer(ATTRIB_POSITION,  3, GL_FLOAT, GL_FALSE, STRIDE, (void*)(0*sizeof(float)));

    glEnableVertexAttribArray(ATTRIB_NORMAL);
    glVertexAttribPointer(ATTRIB_NORMAL,    3, GL_FLOAT, GL_FALSE, STRIDE, (void*)(3*sizeof(float)));

    glEnableVertexAttribArray(ATTRIB_COLOR);
    glVertexAttribPointer(ATTRIB_COLOR,     4, GL_FLOAT, GL_FALSE, STRIDE, (void*)(6*sizeof(float)));

    glEnableVertexAttribArray(ATTRIB_TEXCOORD0);
    glVertexAttribPointer(ATTRIB_TEXCOORD0, 2, GL_FLOAT, GL_FALSE, STRIDE, (void*)(10*sizeof(float)));

    glEnableVertexAttribArray(ATTRIB_TEXCOORD1);
    glVertexAttribPointer(ATTRIB_TEXCOORD1, 2, GL_FLOAT, GL_FALSE, STRIDE, (void*)(12*sizeof(float)));

    return vertex_count;
}

static void disable_vertex_attribs(void) {
    glDisableVertexAttribArray(ATTRIB_POSITION);
    glDisableVertexAttribArray(ATTRIB_NORMAL);
    glDisableVertexAttribArray(ATTRIB_COLOR);
    glDisableVertexAttribArray(ATTRIB_TEXCOORD0);
    glDisableVertexAttribArray(ATTRIB_TEXCOORD1);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

// ── Public: init ──────────────────────────────────────────────────────────────
void COMPAT_GL_Init(void) {
#ifdef __ANDROID__
    // Load real GLES2 function pointers via dlsym(RTLD_NEXT, ...) to avoid infinite
    // recursion when our wrappers (same symbol names as GLES2 functions) call the
    // underlying GLES2 implementation.
    real_glEnable       = (void(*)(GLenum))       dlsym(RTLD_NEXT, "glEnable");
    real_glDisable      = (void(*)(GLenum))       dlsym(RTLD_NEXT, "glDisable");
    real_glGetFloatv    = (void(*)(GLenum,GLfloat*)) dlsym(RTLD_NEXT, "glGetFloatv");
    real_glGetIntegerv  = (void(*)(GLenum,GLint*))   dlsym(RTLD_NEXT, "glGetIntegerv");
    real_glDrawElements = (void(*)(GLenum,GLsizei,GLenum,const void*)) dlsym(RTLD_NEXT, "glDrawElements");
    real_glDrawArrays   = (void(*)(GLenum,GLint,GLsizei)) dlsym(RTLD_NEXT, "glDrawArrays");
    real_glHint         = (void(*)(GLenum,GLenum)) dlsym(RTLD_NEXT, "glHint");
    real_glIsEnabled    = (GLboolean(*)(GLenum))  dlsym(RTLD_NEXT, "glIsEnabled");
#endif // __ANDROID__
    // Init matrix stacks
    for (int i = 0; i < MATRIX_STACK_DEPTH; i++) {
        mat4_identity(&s_modelview_stack[i]);
        mat4_identity(&s_projection_stack[i]);
    }
    memset(s_lights, 0, sizeof(s_lights));

    // Compile shader
    GLuint vs = compile_shader(GL_VERTEX_SHADER,   VERT_SRC);
    GLuint fs = compile_shader(GL_FRAGMENT_SHADER, FRAG_SRC);
    s_prog = glCreateProgram();
    glAttachShader(s_prog, vs);
    glAttachShader(s_prog, fs);
    // Bind attribute locations BEFORE linking
    glBindAttribLocation(s_prog, ATTRIB_POSITION,  "a_position");
    glBindAttribLocation(s_prog, ATTRIB_NORMAL,    "a_normal");
    glBindAttribLocation(s_prog, ATTRIB_COLOR,     "a_color");
    glBindAttribLocation(s_prog, ATTRIB_TEXCOORD0, "a_texcoord0");
    glBindAttribLocation(s_prog, ATTRIB_TEXCOORD1, "a_texcoord1");
    glLinkProgram(s_prog);
    GLint ok; glGetProgramiv(s_prog, GL_LINK_STATUS, &ok);
    if (!ok) {
        char buf[512]; glGetProgramInfoLog(s_prog, 512, NULL, buf);
        SDL_Log("gl_compat: link error: %s", buf);
    }
    glDeleteShader(vs); glDeleteShader(fs);

    // Cache uniform locations
    u_mv         = glGetUniformLocation(s_prog, "u_mv");
    u_proj       = glGetUniformLocation(s_prog, "u_proj");
    u_normal_mat = glGetUniformLocation(s_prog, "u_normal_mat");
    u_current_color   = glGetUniformLocation(s_prog, "u_current_color");
    u_use_color_array = glGetUniformLocation(s_prog, "u_use_color_array");
    u_lighting   = glGetUniformLocation(s_prog, "u_lighting");
    u_ambient    = glGetUniformLocation(s_prog, "u_ambient");
    u_num_lights = glGetUniformLocation(s_prog, "u_num_lights");
    for (int i = 0; i < MAX_FILL_LIGHTS; i++) {
        char name[32];
        snprintf(name, sizeof(name), "u_light_pos[%d]", i);  u_light_pos[i]  = glGetUniformLocation(s_prog, name);
        snprintf(name, sizeof(name), "u_light_diff[%d]", i); u_light_diff[i] = glGetUniformLocation(s_prog, name);
        snprintf(name, sizeof(name), "u_light_amb[%d]", i);  u_light_amb[i]  = glGetUniformLocation(s_prog, name);
    }
    u_fog         = glGetUniformLocation(s_prog, "u_fog");
    u_fog_mode_u  = glGetUniformLocation(s_prog, "u_fog_mode");
    u_fog_start_u = glGetUniformLocation(s_prog, "u_fog_start");
    u_fog_end_u   = glGetUniformLocation(s_prog, "u_fog_end");
    u_fog_density_u = glGetUniformLocation(s_prog, "u_fog_density");
    u_fog_color_u = glGetUniformLocation(s_prog, "u_fog_color");
    u_alpha_test_u= glGetUniformLocation(s_prog, "u_alpha_test");
    u_alpha_func_u= glGetUniformLocation(s_prog, "u_alpha_func");
    u_alpha_ref_u = glGetUniformLocation(s_prog, "u_alpha_ref");
    u_texture0    = glGetUniformLocation(s_prog, "u_texture0");
    u_texture1    = glGetUniformLocation(s_prog, "u_texture1");
    u_sampler0    = glGetUniformLocation(s_prog, "u_sampler0");
    u_sampler1    = glGetUniformLocation(s_prog, "u_sampler1");
    u_texenv0     = glGetUniformLocation(s_prog, "u_texenv0");
    u_texenv1     = glGetUniformLocation(s_prog, "u_texenv1");
    u_texgen      = glGetUniformLocation(s_prog, "u_texgen");

    // VBO for interleaved vertex data
    glGenBuffers(1, &s_vbo);

    SDL_Log("gl_compat: initialized (prog=%u)", s_prog);
}

// ── Matrix operations ─────────────────────────────────────────────────────────
void glMatrixMode(GLenum mode) { s_matrix_mode = mode; }

void glLoadIdentity(void) { mat4_identity(current_matrix()); }

void glLoadMatrixf(const GLfloat *m) { memcpy(current_matrix()->m, m, 64); }

void glMultMatrixf(const GLfloat *m) {
    Mat4 a = *current_matrix();
    Mat4 b; memcpy(b.m, m, 64);
    mat4_mul(current_matrix(), &a, &b);
}

void glPushMatrix(void) {
    if (s_matrix_mode == GL_PROJECTION) {
        if (s_projection_top < MATRIX_STACK_DEPTH-1) {
            s_projection_stack[s_projection_top+1] = s_projection_stack[s_projection_top];
            s_projection_top++;
        }
    } else {
        if (s_modelview_top < MATRIX_STACK_DEPTH-1) {
            s_modelview_stack[s_modelview_top+1] = s_modelview_stack[s_modelview_top];
            s_modelview_top++;
        }
    }
}

void glPopMatrix(void) {
    if (s_matrix_mode == GL_PROJECTION) {
        if (s_projection_top > 0) s_projection_top--;
    } else {
        if (s_modelview_top > 0) s_modelview_top--;
    }
}

void glTranslatef(GLfloat x, GLfloat y, GLfloat z) {
    Mat4 t; mat4_identity(&t);
    t.m[12]=x; t.m[13]=y; t.m[14]=z;
    Mat4 a = *current_matrix(); mat4_mul(current_matrix(), &a, &t);
}

void glScalef(GLfloat x, GLfloat y, GLfloat z) {
    Mat4 s; mat4_identity(&s);
    s.m[0]=x; s.m[5]=y; s.m[10]=z;
    Mat4 a = *current_matrix(); mat4_mul(current_matrix(), &a, &s);
}

void glRotatef(GLfloat angle, GLfloat ax, GLfloat ay, GLfloat az) {
    float r = angle * (3.14159265358979f / 180.0f);
    float c = cosf(r), s = sinf(r);
    float l = sqrtf(ax*ax+ay*ay+az*az);
    if (l < 1e-7f) return;
    ax/=l; ay/=l; az/=l;
    Mat4 rot; mat4_identity(&rot);
    rot.m[0] = c+ax*ax*(1-c);     rot.m[1] = ay*ax*(1-c)+az*s;  rot.m[2] = az*ax*(1-c)-ay*s;
    rot.m[4] = ax*ay*(1-c)-az*s;  rot.m[5] = c+ay*ay*(1-c);     rot.m[6] = az*ay*(1-c)+ax*s;
    rot.m[8] = ax*az*(1-c)+ay*s;  rot.m[9] = ay*az*(1-c)-ax*s;  rot.m[10]= c+az*az*(1-c);
    Mat4 a = *current_matrix(); mat4_mul(current_matrix(), &a, &rot);
}

void glOrtho(GLdouble l, GLdouble r, GLdouble b, GLdouble t, GLdouble n, GLdouble f) {
    Mat4 m; mat4_identity(&m);
    m.m[0]  =  2.0f/(float)(r-l);
    m.m[5]  =  2.0f/(float)(t-b);
    m.m[10] = -2.0f/(float)(f-n);
    m.m[12] = -(float)(r+l)/(float)(r-l);
    m.m[13] = -(float)(t+b)/(float)(t-b);
    m.m[14] = -(float)(f+n)/(float)(f-n);
    *current_matrix() = m;
}

void glFrustum(GLdouble l, GLdouble r, GLdouble b, GLdouble t, GLdouble n, GLdouble f) {
    Mat4 m; memset(m.m, 0, sizeof(m.m));
    m.m[0]  =  2.0f*(float)n/(float)(r-l);
    m.m[5]  =  2.0f*(float)n/(float)(t-b);
    m.m[8]  =  (float)(r+l)/(float)(r-l);
    m.m[9]  =  (float)(t+b)/(float)(t-b);
    m.m[10] = -(float)(f+n)/(float)(f-n);
    m.m[11] = -1.0f;
    m.m[14] = -2.0f*(float)(f*n)/(float)(f-n);
    *current_matrix() = m;
}

// ── glGetFloatv / glGetDoublev intercepts ─────────────────────────────────────
void glGetFloatv(GLenum pname, GLfloat *data) {
    if (pname == GL_MODELVIEW_MATRIX) {
        memcpy(data, s_modelview_stack[s_modelview_top].m, 64); return;
    }
    if (pname == GL_PROJECTION_MATRIX) {
        memcpy(data, s_projection_stack[s_projection_top].m, 64); return;
    }
    // Pass through all other queries to GLES2
    // Use the real GLES2 glGetFloatv via a direct call (avoid macro recursion)
    REAL_glGetFloatv(pname, data);
}

void glGetDoublev(GLenum pname, GLdouble *data) {
    // Read float then convert — GLES2 has no glGetDoublev
    float tmp[16];
    glGetFloatv(pname, tmp);
    for (int i = 0; i < 16; i++) data[i] = (double)tmp[i];
}

// ── Enable / Disable intercepts ───────────────────────────────────────────────
void glEnable(GLenum cap) {
    switch (cap) {
        case GL_LIGHTING:    s_lighting_enabled = 1; break;
        case GL_LIGHT0: case GL_LIGHT1: case GL_LIGHT2: case GL_LIGHT3:
            s_lights[cap - GL_LIGHT0].enabled = 1; break;
        case GL_FOG:         s_fog_enabled = 1; break;
        case GL_ALPHA_TEST:  s_alpha_test_enabled = 1; break;
        case GL_TEXTURE_GEN_S: s_texgen_s = 1; break;
        case GL_TEXTURE_GEN_T: s_texgen_t = 1; break;
        case GL_NORMALIZE:   break;  // handled by per-vertex normalize in shader
        case GL_RESCALE_NORMAL: break;  // not supported in WebGL; normalize handled in shader
        case GL_COLOR_MATERIAL: break;  // silently ignore
        case GL_TEXTURE_2D:  break;  // not valid in GLES2; texture state is inferred from bindings
        default:
            // Pass through to GLES2
            {
                REAL_glEnable(cap);
            }
    }
}

void glDisable(GLenum cap) {
    switch (cap) {
        case GL_LIGHTING:    s_lighting_enabled = 0; break;
        case GL_LIGHT0: case GL_LIGHT1: case GL_LIGHT2: case GL_LIGHT3:
            s_lights[cap - GL_LIGHT0].enabled = 0; break;
        case GL_FOG:         s_fog_enabled = 0; break;
        case GL_ALPHA_TEST:  s_alpha_test_enabled = 0; break;
        case GL_TEXTURE_GEN_S: s_texgen_s = 0; break;
        case GL_TEXTURE_GEN_T: s_texgen_t = 0; break;
        case GL_NORMALIZE:   break;
        case GL_RESCALE_NORMAL: break;  // not supported in WebGL
        case GL_COLOR_MATERIAL: break;
        case GL_TEXTURE_2D:  break;  // not valid in GLES2
        default:
            {
                REAL_glDisable(cap);
            }
    }
}

// ── Lighting ──────────────────────────────────────────────────────────────────
void glLightfv(GLenum light, GLenum pname, const GLfloat *p) {
    int i = (int)(light - GL_LIGHT0);
    if (i < 0 || i >= MAX_FILL_LIGHTS) return;
    if (pname == GL_POSITION) {
        // Transform position to eye space using the current modelview matrix
        // For directional lights (w=0), we transform just the direction
        const float *mv = s_modelview_stack[s_modelview_top].m;
        float ep[4];
        for (int r = 0; r < 4; r++) {
            ep[r] = mv[0*4+r]*p[0] + mv[1*4+r]*p[1] + mv[2*4+r]*p[2] + mv[3*4+r]*p[3];
        }
        memcpy(s_lights[i].position, ep, sizeof(ep));
    } else if (pname == GL_DIFFUSE) {
        memcpy(s_lights[i].diffuse, p, 4*sizeof(float));
    } else if (pname == GL_AMBIENT) {
        memcpy(s_lights[i].ambient, p, 4*sizeof(float));
    }
}

void glLightModelfv(GLenum pname, const GLfloat *p) {
    if (pname == GL_LIGHT_MODEL_AMBIENT) memcpy(s_ambient_light, p, 4*sizeof(float));
}

void glLightModeli(GLenum pname, GLint param) {
    (void)pname; (void)param;  // GL_LIGHT_MODEL_TWO_SIDE – ignore for now
}

void glMaterialfv(GLenum face, GLenum pname, const GLfloat *p) {
    (void)face;
    if (pname == GL_DIFFUSE || pname == GL_AMBIENT_AND_DIFFUSE)
        memcpy(s_current_color, p, 4*sizeof(float));
}

void glColorMaterial(GLenum face, GLenum mode) { (void)face; (void)mode; }

// ── Fog ───────────────────────────────────────────────────────────────────────
void glFogi(GLenum pname, GLint param) {
    if (pname == GL_FOG_MODE)    s_fog_mode = param;
}
void glFogf(GLenum pname, GLfloat param) {
    if (pname == GL_FOG_START)   s_fog_start   = param;
    else if (pname == GL_FOG_END)     s_fog_end     = param;
    else if (pname == GL_FOG_DENSITY) s_fog_density = param;
}
void glFogfv(GLenum pname, const GLfloat *p) {
    if (pname == GL_FOG_COLOR) memcpy(s_fog_color, p, 4*sizeof(float));
    else glFogf(pname, p[0]);
}

// ── Alpha test ────────────────────────────────────────────────────────────────
void glAlphaFunc(GLenum func, GLclampf ref) {
    s_alpha_func = func;
    s_alpha_ref  = ref;
}

// ── Texture env ───────────────────────────────────────────────────────────────
void glTexEnvi(GLenum target, GLenum pname, GLint param) {
    if (target != GL_TEXTURE_ENV) return;
    // Determine which texture unit
    GLint unit = 0;
    typedef void (*getiv_t)(GLenum, GLint*);
    REAL_glGetIntegerv(GL_ACTIVE_TEXTURE, &unit);
    int tu = (unit >= (GLint)GL_TEXTURE0) ? (int)(unit - GL_TEXTURE0) : 0;
    if (tu < 0 || tu > 1) tu = 0;

    if (pname == GL_TEXTURE_ENV_MODE) {
        if (param == GL_MODULATE)      s_texenv_mode[tu] = 0;
        else if (param == GL_ADD)      s_texenv_mode[tu] = 1;
        else if (param == GL_REPLACE)  s_texenv_mode[tu] = 2;
        else if (param == GL_COMBINE)  s_texenv_mode[tu] = 3;  // COMBINE_ADD default
    } else if (pname == GL_COMBINE_RGB && param == GL_ADD) {
        s_texenv_mode[tu] = 3;  // COMBINE_ADD
    }
}

void glTexGeni(GLenum coord, GLenum pname, GLint param) {
    if (pname == GL_TEXTURE_GEN_MODE && param == GL_SPHERE_MAP) {
        if (coord == GL_S) s_texgen_s = 1;
        if (coord == GL_T) s_texgen_t = 1;
    }
}

// ── Colors ────────────────────────────────────────────────────────────────────
void glColor4f(GLfloat r, GLfloat g, GLfloat b, GLfloat a) {
    s_current_color[0]=r; s_current_color[1]=g;
    s_current_color[2]=b; s_current_color[3]=a;
}
void glColor4fv(const GLfloat *v) { memcpy(s_current_color, v, 4*sizeof(float)); }
void glNormal3f(GLfloat nx, GLfloat ny, GLfloat nz) {
    s_imm_cur_nx=nx; s_imm_cur_ny=ny; s_imm_cur_nz=nz;
}

// ── Client-state vertex arrays ────────────────────────────────────────────────
void glEnableClientState(GLenum array) {
    switch (array) {
        case GL_VERTEX_ARRAY:        s_ca_vertex.enabled   = 1; break;
        case GL_NORMAL_ARRAY:        s_ca_normal.enabled   = 1; break;
        case GL_COLOR_ARRAY:         s_ca_color.enabled    = 1; break;
        case GL_TEXTURE_COORD_ARRAY: s_ca_texcoord[s_active_texcoord_unit].enabled = 1; break;
    }
}
void glDisableClientState(GLenum array) {
    switch (array) {
        case GL_VERTEX_ARRAY:        s_ca_vertex.enabled   = 0; break;
        case GL_NORMAL_ARRAY:        s_ca_normal.enabled   = 0; break;
        case GL_COLOR_ARRAY:         s_ca_color.enabled    = 0; break;
        case GL_TEXTURE_COORD_ARRAY: s_ca_texcoord[s_active_texcoord_unit].enabled = 0; break;
    }
}
void glClientActiveTexture(GLenum texture) {
    s_active_texcoord_unit = (int)(texture - GL_TEXTURE0);
    if (s_active_texcoord_unit < 0 || s_active_texcoord_unit > 1) s_active_texcoord_unit = 0;
}
void glVertexPointer(GLint size, GLenum type, GLsizei stride, const void *ptr) {
    s_ca_vertex.size=size; s_ca_vertex.type=type; s_ca_vertex.stride=stride; s_ca_vertex.ptr=ptr;
}
void glNormalPointer(GLenum type, GLsizei stride, const void *ptr) {
    s_ca_normal.size=3; s_ca_normal.type=type; s_ca_normal.stride=stride; s_ca_normal.ptr=ptr;
}
void glColorPointer(GLint size, GLenum type, GLsizei stride, const void *ptr) {
    s_ca_color.size=size; s_ca_color.type=type; s_ca_color.stride=stride; s_ca_color.ptr=ptr;
}
void glTexCoordPointer(GLint size, GLenum type, GLsizei stride, const void *ptr) {
    s_ca_texcoord[s_active_texcoord_unit].size=size;
    s_ca_texcoord[s_active_texcoord_unit].type=type;
    s_ca_texcoord[s_active_texcoord_unit].stride=stride;
    s_ca_texcoord[s_active_texcoord_unit].ptr=ptr;
}

// ── Draw calls ────────────────────────────────────────────────────────────────

// Count the highest index value in an index buffer to know how many vertices
// to upload.
static int max_index(GLenum type, const void *indices, GLsizei count) {
    int mx = 0;
    if (type == GL_UNSIGNED_INT) {
        const GLuint *p = (const GLuint *)indices;
        for (int i = 0; i < count; i++) if ((int)p[i] > mx) mx = (int)p[i];
    } else if (type == GL_UNSIGNED_SHORT) {
        const GLushort *p = (const GLushort *)indices;
        for (int i = 0; i < count; i++) if ((int)p[i] > mx) mx = (int)p[i];
    } else {
        const GLubyte *p = (const GLubyte *)indices;
        for (int i = 0; i < count; i++) if ((int)p[i] > mx) mx = (int)p[i];
    }
    return mx;
}

void glDrawElements(GLenum mode, GLsizei count, GLenum type, const void *indices) {
    if (!s_ca_vertex.ptr || count <= 0) return;

    int vertex_count = max_index(type, indices, count) + 1;
    if (setup_vertex_attribs_from_arrays(vertex_count) < 0) return;
    upload_uniforms();

    // Upload index buffer to an element VBO
    GLuint ibo; glGenBuffers(1, &ibo);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ibo);

    // Convert GL_UNSIGNED_INT indices to GL_UNSIGNED_SHORT if needed
    // (WebGL1 only supports UNSIGNED_BYTE and UNSIGNED_SHORT unless OES_element_index_uint)
    if (type == GL_UNSIGNED_INT) {
        // Check if OES_element_index_uint is available (most WebGL2 contexts support it)
        // For safety, try to use the extension or convert to short if small enough
        if (vertex_count <= 65535) {
            GLushort *short_idx = (GLushort *)malloc(count * sizeof(GLushort));
            const GLuint *uint_idx = (const GLuint *)indices;
            for (int i = 0; i < count; i++) short_idx[i] = (GLushort)uint_idx[i];
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * sizeof(GLushort), short_idx, GL_STREAM_DRAW);
            free(short_idx);
            type = GL_UNSIGNED_SHORT;
        } else {
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * sizeof(GLuint), indices, GL_STREAM_DRAW);
            // GL_UNSIGNED_INT requires OES_element_index_uint; keep type as is
        }
    } else {
        GLsizei sz = (type == GL_UNSIGNED_SHORT) ? sizeof(GLushort) : sizeof(GLubyte);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * sz, indices, GL_STREAM_DRAW);
    }

    typedef void (*real_draw_t)(GLenum,GLsizei,GLenum,const void*);
    REAL_glDrawElements(mode, count, type, 0);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
    glDeleteBuffers(1, &ibo);
    disable_vertex_attribs();
}

void glDrawArrays(GLenum mode, GLint first, GLsizei count) {
    if (!s_ca_vertex.ptr || count <= 0) return;

    // Temporarily adjust pointer for 'first'
    // (Not fully correct for all types, but handles the common float case)
    const void *orig = s_ca_vertex.ptr;
    if (first != 0) {
        int vstride = s_ca_vertex.stride ? s_ca_vertex.stride : 3*sizeof(float);
        s_ca_vertex.ptr = (const char *)orig + first * vstride;
    }

    if (setup_vertex_attribs_from_arrays(count) < 0) { s_ca_vertex.ptr = orig; return; }
    upload_uniforms();

    s_ca_vertex.ptr = orig;

    typedef void (*real_draw_t)(GLenum,GLint,GLsizei);
    REAL_glDrawArrays(mode, 0, count);

    disable_vertex_attribs();
}

// ── Immediate mode ────────────────────────────────────────────────────────────

void glBegin(GLenum mode) {
    s_imm_prim  = mode;
    s_imm_count = 0;
    s_in_begin  = 1;
}

void glTexCoord2f(GLfloat s, GLfloat t) { s_imm_cur_s0=s; s_imm_cur_t0=t; }
void glTexCoord2fv(const GLfloat *v)    { s_imm_cur_s0=v[0]; s_imm_cur_t0=v[1]; }

static void imm_emit(float x, float y, float z) {
    if (s_imm_count >= IMMED_MAX_VERTS) return;
    ImmVert *v = &s_imm_verts[s_imm_count++];
    v->x = x; v->y = y; v->z = z;
    v->nx = s_imm_cur_nx; v->ny = s_imm_cur_ny; v->nz = s_imm_cur_nz;
    v->r  = s_current_color[0]; v->g  = s_current_color[1];
    v->b  = s_current_color[2]; v->a  = s_current_color[3];
    v->s0 = s_imm_cur_s0; v->t0 = s_imm_cur_t0;
    v->s1 = 0; v->t1 = 0;
}

void glVertex2f(GLfloat x, GLfloat y) { imm_emit(x, y, 0); }
void glVertex3f(GLfloat x, GLfloat y, GLfloat z) { imm_emit(x, y, z); }
void glVertex3fv(const GLfloat *v) { imm_emit(v[0], v[1], v[2]); }

void glEnd(void) {
    if (!s_in_begin || s_imm_count == 0) { s_in_begin = 0; return; }
    s_in_begin = 0;

    // Convert GL_QUADS to triangles (2 tris per quad)
    ImmVert *src  = s_imm_verts;
    int      nsrc = s_imm_count;
    ImmVert *draw_buf = src;
    int      draw_cnt = nsrc;
    ImmVert *tmp = NULL;
    GLenum   draw_prim = s_imm_prim;

    if (s_imm_prim == GL_QUADS && nsrc >= 4) {
        int nquads = nsrc / 4;
        tmp = (ImmVert *)malloc(nquads * 6 * sizeof(ImmVert));
        if (tmp) {
            draw_cnt = 0;
            for (int q = 0; q < nquads; q++) {
                ImmVert *qv = &src[q*4];
                tmp[draw_cnt++] = qv[0]; tmp[draw_cnt++] = qv[1]; tmp[draw_cnt++] = qv[2];
                tmp[draw_cnt++] = qv[0]; tmp[draw_cnt++] = qv[2]; tmp[draw_cnt++] = qv[3];
            }
            draw_buf  = tmp;
            draw_prim = GL_TRIANGLES;
        }
    } else if (s_imm_prim == GL_POLYGON && nsrc >= 3) {
        tmp = (ImmVert *)malloc((nsrc-2) * 3 * sizeof(ImmVert));
        if (tmp) {
            draw_cnt = 0;
            for (int i = 1; i < nsrc-1; i++) {
                tmp[draw_cnt++] = src[0];
                tmp[draw_cnt++] = src[i];
                tmp[draw_cnt++] = src[i+1];
            }
            draw_buf  = tmp;
            draw_prim = GL_TRIANGLES;
        }
    }

    // Build interleaved VBO from the immediate-mode buffer
    const int STRIDE = (3+3+4+2+2) * sizeof(float);
    float *vbo_data = (float *)malloc(draw_cnt * STRIDE);
    if (!vbo_data) { free(tmp); return; }
    for (int i = 0; i < draw_cnt; i++) {
        float *d = vbo_data + i*(3+3+4+2+2);
        ImmVert *v = &draw_buf[i];
        d[0]=v->x; d[1]=v->y; d[2]=v->z;
        d[3]=v->nx; d[4]=v->ny; d[5]=v->nz;
        d[6]=v->r; d[7]=v->g; d[8]=v->b; d[9]=v->a;
        d[10]=v->s0; d[11]=v->t0;
        d[12]=v->s1; d[13]=v->t1;
    }
    free(tmp);

    glBindBuffer(GL_ARRAY_BUFFER, s_vbo);
    glBufferData(GL_ARRAY_BUFFER, draw_cnt * STRIDE, vbo_data, GL_STREAM_DRAW);
    free(vbo_data);

    glEnableVertexAttribArray(ATTRIB_POSITION);
    glVertexAttribPointer(ATTRIB_POSITION,  3, GL_FLOAT, GL_FALSE, STRIDE, (void*)(0*sizeof(float)));
    glEnableVertexAttribArray(ATTRIB_NORMAL);
    glVertexAttribPointer(ATTRIB_NORMAL,    3, GL_FLOAT, GL_FALSE, STRIDE, (void*)(3*sizeof(float)));
    glEnableVertexAttribArray(ATTRIB_COLOR);
    glVertexAttribPointer(ATTRIB_COLOR,     4, GL_FLOAT, GL_FALSE, STRIDE, (void*)(6*sizeof(float)));
    glEnableVertexAttribArray(ATTRIB_TEXCOORD0);
    glVertexAttribPointer(ATTRIB_TEXCOORD0, 2, GL_FLOAT, GL_FALSE, STRIDE, (void*)(10*sizeof(float)));
    glEnableVertexAttribArray(ATTRIB_TEXCOORD1);
    glVertexAttribPointer(ATTRIB_TEXCOORD1, 2, GL_FLOAT, GL_FALSE, STRIDE, (void*)(12*sizeof(float)));

    // Force use_color_array = true for immediate mode (we baked per-vertex color).
    // Also force texcoord[0] array enabled so the shader uses the texture when one
    // is bound — even though GL_TEXTURE_COORD_ARRAY isn't explicitly enabled for
    // immediate-mode drawing (which uses glTexCoord2f, not a client array).
    int saved_use_color   = s_ca_color.enabled;
    int saved_tex0_enabled = s_ca_texcoord[0].enabled;
    s_ca_color.enabled = 1;
    s_ca_texcoord[0].enabled = 1;
    upload_uniforms();
    s_ca_color.enabled = saved_use_color;
    s_ca_texcoord[0].enabled = saved_tex0_enabled;

    REAL_glDrawArrays(draw_prim, 0, draw_cnt);

    disable_vertex_attribs();
    s_imm_count = 0;
}

// ── Stubs ─────────────────────────────────────────────────────────────────────
void glPolygonMode(GLenum face, GLenum mode) { (void)face; (void)mode; }
void glPushAttrib(GLbitfield mask) { (void)mask; }
void glPopAttrib(void) {}
void glDrawBuffer(GLenum buf) { (void)buf; }

// glHint — WebGL only supports GL_GENERATE_MIPMAP_HINT; silently ignore
// unsupported hints like GL_FOG_HINT to prevent GL_INVALID_ENUM errors.
void glHint(GLenum target, GLenum mode) {
    if (target == GL_GENERATE_MIPMAP_HINT) {
        REAL_glHint(target, mode);
    }
    // All other hints (GL_FOG_HINT, etc.) are no-ops in WebGL
}

// glIsEnabled — return tracked state for emulated caps; pass through for real ones.
// Without this, OGL_PushState() gets wrong values for GL_FOG and GL_NORMALIZE.
GLboolean glIsEnabled(GLenum cap) {
    switch (cap) {
        case GL_LIGHTING:       return s_lighting_enabled ? GL_TRUE : GL_FALSE;
        case GL_FOG:            return s_fog_enabled      ? GL_TRUE : GL_FALSE;
        case GL_ALPHA_TEST:     return s_alpha_test_enabled ? GL_TRUE : GL_FALSE;
        case GL_NORMALIZE:      return GL_FALSE;  // normalize is always handled in shader
        case GL_RESCALE_NORMAL: return GL_FALSE;
        case GL_COLOR_MATERIAL: return GL_FALSE;
        case GL_TEXTURE_2D:     return GL_FALSE;  // not tracked per-unit; state inferred from bindings
        case GL_TEXTURE_GEN_S:  return s_texgen_s ? GL_TRUE : GL_FALSE;
        case GL_TEXTURE_GEN_T:  return s_texgen_t ? GL_TRUE : GL_FALSE;
        default:
            return REAL_glIsEnabled(cap);
    }
}

// Apple extension stubs
void glGenFencesAPPLE(GLsizei n, GLuint *f)          { for(int i=0;i<n;i++) f[i]=0; }
void glDeleteFencesAPPLE(GLsizei n, const GLuint *f) { (void)n; (void)f; }
void glSetFenceAPPLE(GLuint f)                       { (void)f; }
void glFinishFenceAPPLE(GLuint f)                    { (void)f; }
GLboolean glTestFenceAPPLE(GLuint f)                 { (void)f; return GL_TRUE; }
GLboolean glIsFenceNV(GLuint f)                      { (void)f; return GL_FALSE; }
void glGenVertexArraysAPPLE(GLsizei n, GLuint *a)    { for(int i=0;i<n;i++) a[i]=0; }
void glBindVertexArrayAPPLE(GLuint a)                { (void)a; }
void glFlushVertexArrayRangeAPPLE(GLsizei l, void *p){ (void)l; (void)p; }
void glVertexArrayRangeAPPLE(GLsizei l, void *p)     { (void)l; (void)p; }
void glVertexArrayParameteriAPPLE(GLenum pname, GLint param) { (void)pname; (void)param; }

#endif // __EMSCRIPTEN__ || __ANDROID__
