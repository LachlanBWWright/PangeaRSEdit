//
// vertex_array_compat.c
// Client-side vertex array compatibility implementation for WebGL
//
// Performance-critical path: the game issues ~200+ draw calls per frame.
// Each call must upload vertex data from CPU arrays to GPU buffers.
//
// Optimization strategy (non-interleaved direct upload):
//   Instead of copying client arrays into intermediate buffers and then
//   interleaving them into a single VBO (6 data passes per draw call),
//   we upload each attribute array directly to its own VBO (1 pass each).
//   For float arrays with stride==0, this is a single glBufferData with
//   the client pointer — zero CPU-side copying.  For GL_UNSIGNED_BYTE
//   colors, WebGL's normalized attribute support (GL_TRUE) lets the GPU
//   do the 0–255 → 0.0–1.0 conversion, also eliminating CPU work.
//

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include "game.h"
#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include <GLES2/gl2.h>

// Render statistics counters (defined in render_stats_stub.c for this game)
extern int gDrawCallsThisFrame;
extern int gVerticesThisFrame;
extern int gBufferUploadsThisFrame;

// #undef the macros so we can call the real GL functions for drawing.
// Our CompatGL_* implementations set up VBOs and call the real functions
// directly, bypassing the recursive macro redirect.
#undef glDrawElements
#undef glDrawArrays

VertexArrayState gVertexArrayState;
static int gCurrentClientTexture = 0; // 0 or 1 for GL_TEXTURE0 or GL_TEXTURE1

// ── Persistent GPU buffers for DrawArrays (not cached) ──────────────────
// Used by CompatGL_DrawArrays (immediate-mode style, dynamic geometry).
static GLuint sAttrVBO[5] = {0};  // pos, norm, color, tc0, tc1
static GLuint sIndexIBO = 0;

// ── Draw cache for CompatGL_DrawElements ────────────────────────────────
// 128-entry LRU cache keyed by client-array pointers, vertex/index counts,
// and attribute mask.  On a cache hit all glBufferData uploads are skipped.
//
// IMPORTANT: For geometry modified in-place each frame (particles, animated
// objects, etc.) call CompatGL_InvalidateCachePtr() AFTER writing new data
// and BEFORE the next draw call; otherwise the cached stale VBO is used.
#define DRAW_CACHE_SIZE 128

typedef struct {
    const void *pos_ptr;    // gVertexArrayState.vertexPointer
    const void *norm_ptr;   // normalPointer  (NULL if disabled)
    const void *color_ptr;  // colorPointer   (NULL if disabled)
    const void *tc0_ptr;    // texCoordPointers[0] (NULL if disabled)
    const void *tc1_ptr;    // texCoordPointers[1] (NULL if disabled)
    const void *idx_ptr;    // original index buffer pointer
    int         vtx_count;
    int         idx_count;
    int         idx_type;   // GL_UNSIGNED_SHORT or GL_UNSIGNED_INT
    uint8_t     attrib_mask;
    uint8_t     color_type; // GL_FLOAT or GL_UNSIGNED_BYTE; 0 = no color
    uint8_t     valid;
    GLuint      vbo[5];     // per-entry VBOs [pos, norm, color, tc0, tc1]
    GLuint      ibo;        // per-entry IBO (always uint32)
    uint64_t    lru_tick;
} DrawCacheEntry;

static DrawCacheEntry sDC[DRAW_CACHE_SIZE];
static uint64_t sDCTick = 0;

// Bitmask tracking which vertex attribute arrays are currently enabled
// on the GL side.  We only toggle when the set changes between draws.
static uint8_t sEnabledAttribMask = 0x1F;  // all 5 enabled by ModernGL_Init

// Persistent scratch buffer for ushort→uint index conversion
static GLuint* sIdxConvertBuf = NULL;
static int sIdxConvertBufCap = 0;

// Vertex count hint: set by CompatGL_SetVertexCount() before glDrawElements to
// skip the O(count) index-buffer scan that scans all 'count' indices to find the
// maximum index value and thereby determine vertexCount.
// The hint is consumed (reset to 0) by the next CompatGL_DrawElements call.
static GLsizei sVertexCountHint = 0;

// Allow callers to provide the vertex count, avoiding the O(count) index scan
// in CompatGL_DrawElements (where 'count' is the number of indices, not vertices).
// Call immediately before the glDrawElements macro call (which maps to CompatGL_DrawElements).
void CompatGL_SetVertexCount(GLsizei n)
{
    sVertexCountHint = n;
}

// ── Attribute enable/disable helpers ────────────────────────────────────

// Ensure exactly the attributes in 'needed' (bitmask) are enabled.
// Disabled attributes get a per-vertex constant via glVertexAttrib*.
static void SyncAttribEnables(uint8_t needed)
{
    uint8_t diff = sEnabledAttribMask ^ needed;
    if (!diff) return;  // fast-path: nothing changed

    for (int i = 0; i < 5; i++)
    {
        if (!(diff & (1u << i))) continue;

        if (needed & (1u << i))
        {
            glEnableVertexAttribArray(i);
        }
        else
        {
            glDisableVertexAttribArray(i);
            // Set per-vertex constant for the disabled attribute
            switch (i)
            {
                case ATTRIB_LOCATION_NORMAL:   glVertexAttrib3f(i, 0.0f, 1.0f, 0.0f); break;
                case ATTRIB_LOCATION_COLOR:    glVertexAttrib4f(i, 1.0f, 1.0f, 1.0f, 1.0f); break;
                case ATTRIB_LOCATION_TEXCOORD0:
                case ATTRIB_LOCATION_TEXCOORD1: glVertexAttrib2f(i, 0.0f, 0.0f); break;
                default: break;
            }
        }
    }
    sEnabledAttribMask = needed;
}

// Restore all 5 attributes to enabled state.  Called after non-interleaved
// draws so that the interleaved path (ModernGL_DrawGeometry, used for
// immediate-mode emulation) still works without its own enable tracking.
static void RestoreAllAttribs(void)
{
    SyncAttribEnables(0x1F);
}

void CompatGL_EnableClientState(GLenum array)
{
    switch (array)
    {
        case GL_VERTEX_ARRAY:
            gVertexArrayState.vertexArrayEnabled = true;
            break;
        case GL_NORMAL_ARRAY:
            gVertexArrayState.normalArrayEnabled = true;
            break;
        case GL_COLOR_ARRAY:
            gVertexArrayState.colorArrayEnabled = true;
            break;
        case GL_TEXTURE_COORD_ARRAY:
            if (gCurrentClientTexture >= 0 && gCurrentClientTexture < 2)
                gVertexArrayState.texCoordArrayEnabled[gCurrentClientTexture] = true;
            break;
    }
    gVertexArrayState.isDirty = true;
}

void CompatGL_DisableClientState(GLenum array)
{
    switch (array)
    {
        case GL_VERTEX_ARRAY:
            gVertexArrayState.vertexArrayEnabled = false;
            break;
        case GL_NORMAL_ARRAY:
            gVertexArrayState.normalArrayEnabled = false;
            break;
        case GL_COLOR_ARRAY:
            gVertexArrayState.colorArrayEnabled = false;
            break;
        case GL_TEXTURE_COORD_ARRAY:
            if (gCurrentClientTexture >= 0 && gCurrentClientTexture < 2)
                gVertexArrayState.texCoordArrayEnabled[gCurrentClientTexture] = false;
            break;
    }
    gVertexArrayState.isDirty = true;
}

void CompatGL_VertexPointer(GLint size, GLenum type, GLsizei stride, const void* pointer)
{
    gVertexArrayState.vertexPointer = pointer;
    gVertexArrayState.vertexSize = size;
    gVertexArrayState.vertexType = type;
    gVertexArrayState.vertexStride = stride;
    gVertexArrayState.isDirty = true;
}

void CompatGL_NormalPointer(GLenum type, GLsizei stride, const void* pointer)
{
    gVertexArrayState.normalPointer = pointer;
    gVertexArrayState.isDirty = true;
}

void CompatGL_ColorPointer(GLint size, GLenum type, GLsizei stride, const void* pointer)
{
    gVertexArrayState.colorPointer = pointer;
    gVertexArrayState.colorSize = size;
    gVertexArrayState.colorType = type;
    gVertexArrayState.colorStride = stride;
    gVertexArrayState.isDirty = true;
}

void CompatGL_TexCoordPointer(GLint size, GLenum type, GLsizei stride, const void* pointer)
{
    if (gCurrentClientTexture >= 0 && gCurrentClientTexture < 2)
    {
        gVertexArrayState.texCoordPointers[gCurrentClientTexture] = pointer;
        gVertexArrayState.texCoordSize[gCurrentClientTexture] = size;
        gVertexArrayState.texCoordStride[gCurrentClientTexture] = stride;
        gVertexArrayState.isDirty = true;
    }
}

void CompatGL_ClientActiveTexture(GLenum texture)
{
    // Convert GL_TEXTURE0_ARB/GL_TEXTURE1_ARB to index
    if (texture == GL_TEXTURE0_ARB || texture == GL_TEXTURE0)
        gCurrentClientTexture = 0;
    else if (texture == GL_TEXTURE1_ARB || texture == GL_TEXTURE1)
        gCurrentClientTexture = 1;
}

// Evict all draw-cache entries whose key contains 'ptr'.
// Call after writing new data to a CPU-side vertex/normal/color/texcoord array.
void CompatGL_InvalidateCachePtr(const void *ptr)
{
    for (int i = 0; i < DRAW_CACHE_SIZE; i++)
    {
        if (sDC[i].valid && (
                sDC[i].pos_ptr   == ptr ||
                sDC[i].norm_ptr  == ptr ||
                sDC[i].color_ptr == ptr ||
                sDC[i].tc0_ptr   == ptr ||
                sDC[i].tc1_ptr   == ptr ||
                sDC[i].idx_ptr   == ptr))
        {
            sDC[i].valid = 0;
        }
    }
}

void CompatGL_DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices)
{
    // Sync vertex color state to shader (only mark dirty on change)
    extern ModernGLState gModernGLState;
    if (gModernGLState.useVertexColor != gVertexArrayState.colorArrayEnabled)
    {
        gModernGLState.useVertexColor = gVertexArrayState.colorArrayEnabled;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_MATERIAL;
    }

    // Update shader state before drawing
    extern void CompatGL_UpdateShaderState(void);
    CompatGL_UpdateShaderState();

    if (type != GL_UNSIGNED_INT && type != GL_UNSIGNED_SHORT)
        return; // Unsupported index type

    // ── Find maximum index to determine vertex count ──────────────────
    // If the caller provided a hint via CompatGL_SetVertexCount(), use it
    // directly to skip the O(count) scan.  Otherwise scan the index buffer.
    int vertexCount;
    if (sVertexCountHint > 0)
    {
        vertexCount = (int)sVertexCountHint;
        sVertexCountHint = 0;  // consume hint
    }
    else
    {
        GLuint maxIdx = 0;
        if (type == GL_UNSIGNED_INT)
        {
            const GLuint* idx = (const GLuint*)indices;
            for (GLsizei i = 0; i < count; i++)
                if (idx[i] > maxIdx) maxIdx = idx[i];
        }
        else
        {
            const GLushort* idx = (const GLushort*)indices;
            for (GLsizei i = 0; i < count; i++)
                if ((GLuint)idx[i] > maxIdx) maxIdx = idx[i];
        }
        vertexCount = (int)maxIdx + 1;
    }

    // ── Determine which attributes are provided ──────────────────────
    Boolean hasPos   = gVertexArrayState.vertexArrayEnabled && gVertexArrayState.vertexPointer;
    Boolean hasNorm  = gVertexArrayState.normalArrayEnabled && gVertexArrayState.normalPointer;
    Boolean hasColor = gVertexArrayState.colorArrayEnabled  && gVertexArrayState.colorPointer;
    Boolean hasTC0   = gVertexArrayState.texCoordArrayEnabled[0] && gVertexArrayState.texCoordPointers[0];
    Boolean hasTC1   = gVertexArrayState.texCoordArrayEnabled[1] && gVertexArrayState.texCoordPointers[1];

    uint8_t attribMask = (1u << ATTRIB_LOCATION_POSITION);  // always need position
    if (hasNorm)  attribMask |= (1u << ATTRIB_LOCATION_NORMAL);
    if (hasColor) attribMask |= (1u << ATTRIB_LOCATION_COLOR);
    if (hasTC0)   attribMask |= (1u << ATTRIB_LOCATION_TEXCOORD0);
    if (hasTC1)   attribMask |= (1u << ATTRIB_LOCATION_TEXCOORD1);

    const void *posPtr   = gVertexArrayState.vertexPointer;
    const void *normPtr  = hasNorm  ? gVertexArrayState.normalPointer           : NULL;
    const void *colorPtr = hasColor ? gVertexArrayState.colorPointer            : NULL;
    const void *tc0Ptr   = hasTC0   ? gVertexArrayState.texCoordPointers[0]     : NULL;
    const void *tc1Ptr   = hasTC1   ? gVertexArrayState.texCoordPointers[1]     : NULL;
    uint8_t colorTypeKey = hasColor ? (uint8_t)gVertexArrayState.colorType : 0;

    SyncAttribEnables(attribMask);

    int uploads = 0;

    // ── Draw-cache lookup ─────────────────────────────────────────────
    int cacheIdx = -1;
    for (int ci = 0; ci < DRAW_CACHE_SIZE; ci++)
    {
        DrawCacheEntry *e = &sDC[ci];
        if (e->valid &&
            e->pos_ptr    == posPtr    && e->norm_ptr   == normPtr   &&
            e->color_ptr  == colorPtr  && e->tc0_ptr    == tc0Ptr    &&
            e->tc1_ptr    == tc1Ptr    && e->idx_ptr    == indices   &&
            e->vtx_count  == vertexCount && e->idx_count == (int)count &&
            e->idx_type   == (int)type &&
            e->attrib_mask == attribMask && e->color_type == colorTypeKey)
        {
            cacheIdx = ci;
            break;
        }
    }

    if (cacheIdx >= 0)
    {
        // ── Cache HIT: rebind cached VBOs, skip all glBufferData ──────
        DrawCacheEntry *e = &sDC[cacheIdx];
        e->lru_tick = ++sDCTick;

        if (hasPos)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[0]);
            glVertexAttribPointer(ATTRIB_LOCATION_POSITION, 3, GL_FLOAT, GL_FALSE, 0, 0);
        }
        if (hasNorm)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[1]);
            glVertexAttribPointer(ATTRIB_LOCATION_NORMAL, 3, GL_FLOAT, GL_FALSE, 0, 0);
        }
        if (hasColor)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[2]);
            if (colorTypeKey == GL_FLOAT)
                glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_FLOAT, GL_FALSE, 0, 0);
            else
                glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_UNSIGNED_BYTE, GL_TRUE, 0, 0);
        }
        if (hasTC0)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[3]);
            glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD0, 2, GL_FLOAT, GL_FALSE, 0, 0);
        }
        if (hasTC1)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[4]);
            glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD1, 2, GL_FLOAT, GL_FALSE, 0, 0);
        }

        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, e->ibo);
    }
    else
    {
        // ── Cache MISS: find LRU slot, upload data, store entry ───────
        int evict = 0;
        uint64_t oldest = UINT64_MAX;
        for (int ci = 0; ci < DRAW_CACHE_SIZE; ci++)
        {
            if (!sDC[ci].valid) { evict = ci; oldest = 0; break; }
            if (sDC[ci].lru_tick < oldest) { oldest = sDC[ci].lru_tick; evict = ci; }
        }
        DrawCacheEntry *e = &sDC[evict];

        // Allocate per-entry GPU buffers on first use of this slot
        if (!e->vbo[0]) glGenBuffers(5, e->vbo);
        if (!e->ibo)    glGenBuffers(1, &e->ibo);

        // ── POSITIONS ────────────────────────────────────────────────
        if (hasPos)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[0]);
            glBufferData(GL_ARRAY_BUFFER, vertexCount * 3 * (GLsizeiptr)sizeof(GLfloat),
                         posPtr, GL_STATIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_POSITION, 3, GL_FLOAT, GL_FALSE, 0, 0);
            uploads++;
        }

        // ── NORMALS ──────────────────────────────────────────────────
        if (hasNorm)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[1]);
            glBufferData(GL_ARRAY_BUFFER, vertexCount * 3 * (GLsizeiptr)sizeof(GLfloat),
                         normPtr, GL_STATIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_NORMAL, 3, GL_FLOAT, GL_FALSE, 0, 0);
            uploads++;
        }

        // ── COLORS: GPU handles byte→float normalization ──────────────
        if (hasColor)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[2]);
            if (colorTypeKey == GL_FLOAT)
            {
                glBufferData(GL_ARRAY_BUFFER, vertexCount * 4 * (GLsizeiptr)sizeof(GLfloat),
                             colorPtr, GL_STATIC_DRAW);
                glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_FLOAT, GL_FALSE, 0, 0);
            }
            else
            {
                glBufferData(GL_ARRAY_BUFFER, vertexCount * 4 * (GLsizeiptr)sizeof(GLubyte),
                             colorPtr, GL_STATIC_DRAW);
                glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_UNSIGNED_BYTE, GL_TRUE, 0, 0);
            }
            uploads++;
        }

        // ── TEXCOORD0 ────────────────────────────────────────────────
        if (hasTC0)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[3]);
            glBufferData(GL_ARRAY_BUFFER, vertexCount * 2 * (GLsizeiptr)sizeof(GLfloat),
                         tc0Ptr, GL_STATIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD0, 2, GL_FLOAT, GL_FALSE, 0, 0);
            uploads++;
        }

        // ── TEXCOORD1 ────────────────────────────────────────────────
        if (hasTC1)
        {
            glBindBuffer(GL_ARRAY_BUFFER, e->vbo[4]);
            glBufferData(GL_ARRAY_BUFFER, vertexCount * 2 * (GLsizeiptr)sizeof(GLfloat),
                         tc1Ptr, GL_STATIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD1, 2, GL_FLOAT, GL_FALSE, 0, 0);
            uploads++;
        }

        // ── INDEX BUFFER (convert ushort→uint if needed) ──────────────
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, e->ibo);
        if (type == GL_UNSIGNED_INT)
        {
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * (GLsizeiptr)sizeof(GLuint),
                         indices, GL_STATIC_DRAW);
        }
        else
        {
            if (count > sIdxConvertBufCap)
            {
                int newCap = count > sIdxConvertBufCap * 2 ? count : sIdxConvertBufCap * 2;
                if (newCap < 256) newCap = 256;
                free(sIdxConvertBuf);
                sIdxConvertBuf = (GLuint*)malloc(newCap * sizeof(GLuint));
                sIdxConvertBufCap = newCap;
            }
            const GLushort* src = (const GLushort*)indices;
            for (GLsizei i = 0; i < count; i++)
                sIdxConvertBuf[i] = (GLuint)src[i];
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * (GLsizeiptr)sizeof(GLuint),
                         sIdxConvertBuf, GL_STATIC_DRAW);
        }
        uploads++;

        // Store entry in cache
        e->pos_ptr    = posPtr;   e->norm_ptr   = normPtr;
        e->color_ptr  = colorPtr; e->tc0_ptr    = tc0Ptr;
        e->tc1_ptr    = tc1Ptr;   e->idx_ptr    = indices;
        e->vtx_count  = vertexCount;
        e->idx_count  = (int)count;
        e->idx_type   = (int)type;
        e->attrib_mask = attribMask;
        e->color_type  = colorTypeKey;
        e->lru_tick    = ++sDCTick;
        e->valid       = 1;
    }

    // ── DRAW ─────────────────────────────────────────────────────────
    glDrawElements(mode, count, GL_UNSIGNED_INT, 0);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);
    glBindBuffer(GL_ARRAY_BUFFER, 0);

    // Restore all attribs for the interleaved path (immediate mode)
    RestoreAllAttribs();

    // ── Profiling counters ───────────────────────────────────────────
    gDrawCallsThisFrame++;
    gVerticesThisFrame += vertexCount;
    gBufferUploadsThisFrame += uploads;
}

void CompatGL_DrawArrays(GLenum mode, GLint first, GLsizei count)
{
    // Sync vertex color state to shader (only mark dirty on change)
    extern ModernGLState gModernGLState;
    if (gModernGLState.useVertexColor != gVertexArrayState.colorArrayEnabled)
    {
        gModernGLState.useVertexColor = gVertexArrayState.colorArrayEnabled;
        gModernGLState.dirtyFlags |= MODERNGL_DIRTY_MATERIAL;
    }

    // Update shader state before drawing
    extern void CompatGL_UpdateShaderState(void);
    CompatGL_UpdateShaderState();

    // ── Create persistent VBOs on first use ──────────────────────────
    if (!sAttrVBO[0])
    {
        glGenBuffers(5, sAttrVBO);
        glGenBuffers(1, &sIndexIBO);
    }

    // ── Determine which attributes are provided ──────────────────────
    Boolean hasPos   = gVertexArrayState.vertexArrayEnabled && gVertexArrayState.vertexPointer;
    Boolean hasNorm  = gVertexArrayState.normalArrayEnabled && gVertexArrayState.normalPointer;
    Boolean hasColor = gVertexArrayState.colorArrayEnabled  && gVertexArrayState.colorPointer;
    Boolean hasTC0   = gVertexArrayState.texCoordArrayEnabled[0] && gVertexArrayState.texCoordPointers[0];
    Boolean hasTC1   = gVertexArrayState.texCoordArrayEnabled[1] && gVertexArrayState.texCoordPointers[1];

    uint8_t attribMask = (1u << ATTRIB_LOCATION_POSITION);
    if (hasNorm)  attribMask |= (1u << ATTRIB_LOCATION_NORMAL);
    if (hasColor) attribMask |= (1u << ATTRIB_LOCATION_COLOR);
    if (hasTC0)   attribMask |= (1u << ATTRIB_LOCATION_TEXCOORD0);
    if (hasTC1)   attribMask |= (1u << ATTRIB_LOCATION_TEXCOORD1);

    SyncAttribEnables(attribMask);

    int uploads = 0;

    // ── POSITIONS: direct upload with offset ─────────────────────────
    if (hasPos)
    {
        const GLfloat* src = (const GLfloat*)gVertexArrayState.vertexPointer + first * 3;
        glBindBuffer(GL_ARRAY_BUFFER, sAttrVBO[0]);
        glBufferData(GL_ARRAY_BUFFER, count * 3 * (GLsizeiptr)sizeof(GLfloat),
                     src, GL_DYNAMIC_DRAW);
        glVertexAttribPointer(ATTRIB_LOCATION_POSITION, 3, GL_FLOAT, GL_FALSE, 0, 0);
        uploads++;
    }

    // ── NORMALS ──────────────────────────────────────────────────────
    if (hasNorm)
    {
        const GLfloat* src = (const GLfloat*)gVertexArrayState.normalPointer + first * 3;
        glBindBuffer(GL_ARRAY_BUFFER, sAttrVBO[1]);
        glBufferData(GL_ARRAY_BUFFER, count * 3 * (GLsizeiptr)sizeof(GLfloat),
                     src, GL_DYNAMIC_DRAW);
        glVertexAttribPointer(ATTRIB_LOCATION_NORMAL, 3, GL_FLOAT, GL_FALSE, 0, 0);
        uploads++;
    }

    // ── COLORS ───────────────────────────────────────────────────────
    if (hasColor)
    {
        glBindBuffer(GL_ARRAY_BUFFER, sAttrVBO[2]);
        if (gVertexArrayState.colorType == GL_FLOAT)
        {
            const GLfloat* src = (const GLfloat*)gVertexArrayState.colorPointer + first * 4;
            glBufferData(GL_ARRAY_BUFFER, count * 4 * (GLsizeiptr)sizeof(GLfloat),
                         src, GL_DYNAMIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_FLOAT, GL_FALSE, 0, 0);
        }
        else if (gVertexArrayState.colorType == GL_UNSIGNED_BYTE)
        {
            const GLubyte* src = (const GLubyte*)gVertexArrayState.colorPointer + first * 4;
            glBufferData(GL_ARRAY_BUFFER, count * 4 * (GLsizeiptr)sizeof(GLubyte),
                         src, GL_DYNAMIC_DRAW);
            glVertexAttribPointer(ATTRIB_LOCATION_COLOR, 4, GL_UNSIGNED_BYTE, GL_TRUE, 0, 0);
        }
        uploads++;
    }

    // ── TEXCOORD0 ────────────────────────────────────────────────────
    if (hasTC0)
    {
        const GLfloat* src = (const GLfloat*)gVertexArrayState.texCoordPointers[0] + first * 2;
        glBindBuffer(GL_ARRAY_BUFFER, sAttrVBO[3]);
        glBufferData(GL_ARRAY_BUFFER, count * 2 * (GLsizeiptr)sizeof(GLfloat),
                     src, GL_DYNAMIC_DRAW);
        glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD0, 2, GL_FLOAT, GL_FALSE, 0, 0);
        uploads++;
    }

    // ── TEXCOORD1 ────────────────────────────────────────────────────
    if (hasTC1)
    {
        const GLfloat* src = (const GLfloat*)gVertexArrayState.texCoordPointers[1] + first * 2;
        glBindBuffer(GL_ARRAY_BUFFER, sAttrVBO[4]);
        glBufferData(GL_ARRAY_BUFFER, count * 2 * (GLsizeiptr)sizeof(GLfloat),
                     src, GL_DYNAMIC_DRAW);
        glVertexAttribPointer(ATTRIB_LOCATION_TEXCOORD1, 2, GL_FLOAT, GL_FALSE, 0, 0);
        uploads++;
    }

    // ── DRAW (no index buffer) ───────────────────────────────────────
    glDrawArrays(mode, 0, count);

    glBindBuffer(GL_ARRAY_BUFFER, 0);

    // Restore all attribs for the interleaved path (immediate mode)
    RestoreAllAttribs();

    // ── Profiling counters ───────────────────────────────────────────
    gDrawCallsThisFrame++;
    gVerticesThisFrame += count;
    gBufferUploadsThisFrame += uploads;
}

#endif // __EMSCRIPTEN__ || __ANDROID__
