#ifndef PROFILING_H
#define PROFILING_H

#include <stdint.h> // For uint64_t, uint32_t

// Enum for profiling phases
typedef enum {
    PROFILE_PHASE_INPUT = 0,
    PROFILE_PHASE_GAME_LOGIC,
    PROFILE_PHASE_RENDERING,
    PROFILE_PHASE_CULLING,
    PROFILE_PHASE_TERRAIN,
    PROFILE_PHASE_OBJECTS,
    PROFILE_PHASE_SKELETONS,
    PROFILE_PHASE_UI,
    PROFILE_PHASE_SWAP_BUFFERS,
    PROFILE_PHASE_ASYNC_YIELD,
    // Fine-grained GL phases (measured within the rendering phase)
    PROFILE_PHASE_GL_GEOMETRY_UPLOAD,   // time spent in glBufferData (vertex+index upload)
    PROFILE_PHASE_GL_UNIFORMS,          // time spent uploading uniforms to the shader
    NUM_PROFILE_PHASES
} ProfilePhaseType;

// Struct to hold profiling data for a single phase
typedef struct {
    uint64_t start_tick;      // Start time of the current measurement
    uint64_t total_ticks;     // Accumulated ticks for this phase
    uint32_t samples;         // Number of samples taken
    float last_frame_ms;      // Total milliseconds measured in the previous frame
    const char* name;         // Name of the phase
} ProfilePhase;

// Global array of profiling phases
extern ProfilePhase gProfilePhases[NUM_PROFILE_PHASES];

// ── Per-frame GL counters ────────────────────────────────────────────────────
// These are reset by ResetGLCounters() at the START of each frame in OGL_DrawScene.
// Previous-frame snapshots are kept in gGL*LastFrame variables for display.
extern int gDrawCallsThisFrame;         // total glDrawElements/glDrawArrays calls
extern int gCacheHitsThisFrame;         // draw cache hits (geometry reused from VBO cache)
extern int gCacheMissesThisFrame;       // draw cache misses (geometry re-uploaded)
extern int gVerticesUploadedThisFrame;  // total vertex count uploaded to GPU
extern int gBytesUploadedThisFrame;     // total bytes sent via glBufferData

// Previous-frame snapshots (stable values for display)
extern int gDrawCallsLastFrame;
extern int gCacheHitsLastFrame;
extern int gCacheMissesLastFrame;
extern int gVerticesUploadedLastFrame;
extern int gBytesUploadedLastFrame;

// Initialize all profiling phases
void InitProfiling(void);

// Start timing a specific phase
void StartProfilePhase(ProfilePhaseType phase_type);

// End timing a specific phase
void EndProfilePhase(ProfilePhaseType phase_type);

// Get the measured millisecond cost of a phase for this frame (or the previous frame if not measured yet)
float GetProfilePhaseMs(ProfilePhaseType phase_type);

// Call this at the end of each frame to snapshot profiling totals and reset accumulators.
void ResetProfilingForFrame(void);

// Reset per-frame GL counters (call at the START of each frame, before drawing).
// Also snapshots current values → gGL*LastFrame for the debug overlay.
void ResetGLCounters(void);

#endif // PROFILING_H
