//
// vertex_array_compat.h
// Client-side vertex array compatibility for WebGL
//

#pragma once

#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)

#include "modern_gl.h"

// For Emscripten, we need to convert client-side vertex arrays to VBOs
// This structure caches the vertex array setup for a draw call
typedef struct
{
    ModernGLGeometry* geometry;
    Boolean isDirty;

    // Original pointers from client code
    const void* vertexPointer;
    const void* normalPointer;
    const void* colorPointer;
    const void* texCoordPointers[2];

    // Array sizes
    int vertexCount;
    int elementCount;
    const void* elements;

    // Array formats
    GLenum vertexType;
    GLint vertexSize;
    GLsizei vertexStride;

    GLenum colorType;
    GLint colorSize;
    GLsizei colorStride;

    GLint texCoordSize[2];
    GLsizei texCoordStride[2];

    // State tracking
    Boolean vertexArrayEnabled;
    Boolean normalArrayEnabled;
    Boolean colorArrayEnabled;
    Boolean texCoordArrayEnabled[2];

} VertexArrayState;

extern VertexArrayState gVertexArrayState;

// Replacements for client-side array functions
void CompatGL_EnableClientState(GLenum array);
void CompatGL_DisableClientState(GLenum array);
void CompatGL_VertexPointer(GLint size, GLenum type, GLsizei stride, const void* pointer);
void CompatGL_NormalPointer(GLenum type, GLsizei stride, const void* pointer);
void CompatGL_ColorPointer(GLint size, GLenum type, GLsizei stride, const void* pointer);
void CompatGL_TexCoordPointer(GLint size, GLenum type, GLsizei stride, const void* pointer);
void CompatGL_ClientActiveTexture(GLenum texture);
void CompatGL_DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices);
void CompatGL_DrawArrays(GLenum mode, GLint first, GLsizei count);
void CompatGL_InvalidateCachePtr(const void *ptr);

// Macro redirects
#define glEnableClientState CompatGL_EnableClientState
#define glDisableClientState CompatGL_DisableClientState
#define glVertexPointer CompatGL_VertexPointer
#define glNormalPointer CompatGL_NormalPointer
#define glColorPointer CompatGL_ColorPointer
#define glTexCoordPointer CompatGL_TexCoordPointer
#define glDrawElements CompatGL_DrawElements
#define glDrawArrays CompatGL_DrawArrays

// Note: glClientActiveTextureARB is already handled in OGL_Functions.c

#endif // __EMSCRIPTEN__ || __ANDROID__
