#include "../Headers/profiling.h"
#include <SDL3/SDL.h> // For SDL_GetPerformanceCounter and SDL_GetPerformanceFrequency

ProfilePhase gProfilePhases[NUM_PROFILE_PHASES];
static uint64_t gPerformanceFrequency;
static ProfilePhaseType gCurrentPhase = -1;

// Per-frame GL counters
int gDrawCallsThisFrame         = 0;
int gCacheHitsThisFrame         = 0;
int gCacheMissesThisFrame       = 0;
int gVerticesUploadedThisFrame  = 0;
int gBytesUploadedThisFrame     = 0;

// Previous-frame snapshots (stable for display)
int gDrawCallsLastFrame         = 0;
int gCacheHitsLastFrame         = 0;
int gCacheMissesLastFrame       = 0;
int gVerticesUploadedLastFrame  = 0;
int gBytesUploadedLastFrame     = 0;

void InitProfiling(void) {
    gPerformanceFrequency = SDL_GetPerformanceFrequency();
    for (int i = 0; i < NUM_PROFILE_PHASES; ++i) {
        gProfilePhases[i].start_tick = 0;
        gProfilePhases[i].total_ticks = 0;
        gProfilePhases[i].samples = 0;
        gProfilePhases[i].last_frame_ms = 0.0f;
    }
    gProfilePhases[PROFILE_PHASE_INPUT].name = "Input";
    gProfilePhases[PROFILE_PHASE_GAME_LOGIC].name = "Game Logic";
    gProfilePhases[PROFILE_PHASE_RENDERING].name = "Rendering";
    gProfilePhases[PROFILE_PHASE_CULLING].name = "Culling";
    gProfilePhases[PROFILE_PHASE_TERRAIN].name = "Terrain";
    gProfilePhases[PROFILE_PHASE_OBJECTS].name = "Objects";
    gProfilePhases[PROFILE_PHASE_SKELETONS].name = "Skeletons";
    gProfilePhases[PROFILE_PHASE_UI].name = "UI";
    gProfilePhases[PROFILE_PHASE_SWAP_BUFFERS].name = "Swap Buffers";
    gProfilePhases[PROFILE_PHASE_ASYNC_YIELD].name = "Async Yield";
    gProfilePhases[PROFILE_PHASE_GL_GEOMETRY_UPLOAD].name = "GL Geom Upload";
    gProfilePhases[PROFILE_PHASE_GL_UNIFORMS].name = "GL Uniforms";

    gCurrentPhase = -1;
}

void StartProfilePhase(ProfilePhaseType phase_type) {
    // Auto-end the current phase if one is active
    if (gCurrentPhase != -1) {
        EndProfilePhase(gCurrentPhase);
    }

    if (phase_type >= 0 && phase_type < NUM_PROFILE_PHASES) {
        gProfilePhases[phase_type].start_tick = SDL_GetPerformanceCounter();
        gCurrentPhase = phase_type;
    }
}

void EndProfilePhase(ProfilePhaseType phase_type) {
    if (phase_type >= 0 && phase_type < NUM_PROFILE_PHASES) {
        uint64_t end_tick = SDL_GetPerformanceCounter();
        if (gProfilePhases[phase_type].start_tick != 0) { // Ensure phase was started
            gProfilePhases[phase_type].total_ticks += (end_tick - gProfilePhases[phase_type].start_tick);
            gProfilePhases[phase_type].samples++;
            gProfilePhases[phase_type].start_tick = 0; // Reset for next frame
        }
        
        // If we just ended the current tracking phase, mark it as none
        if (gCurrentPhase == phase_type) {
            gCurrentPhase = -1;
        }
    }
}

float GetProfilePhaseMs(ProfilePhaseType phase_type) {
    if (phase_type >= 0 && phase_type < NUM_PROFILE_PHASES) {
        if (gProfilePhases[phase_type].samples > 0) {
            return (float)(((double)gProfilePhases[phase_type].total_ticks * 1000.0) / (double)gPerformanceFrequency);
        }
        return gProfilePhases[phase_type].last_frame_ms;
    }
    return 0.0f;
}

void ResetProfilingForFrame(void) {
    for (int i = 0; i < NUM_PROFILE_PHASES; ++i) {
        gProfilePhases[i].last_frame_ms = gProfilePhases[i].samples > 0
            ? (float)(((double)gProfilePhases[i].total_ticks * 1000.0) / (double)gPerformanceFrequency)
            : 0.0f;
        gProfilePhases[i].total_ticks = 0;
        gProfilePhases[i].samples = 0;
        gProfilePhases[i].start_tick = 0;
    }
    // GL counters are reset separately by ResetGLCounters() in OGL_DrawScene.
}

// Called at the START of each frame (from OGL_DrawScene) to snapshot the
// previous frame's GL counters into gGL*LastFrame and zero the current counters.
void ResetGLCounters(void) {
    gDrawCallsLastFrame        = gDrawCallsThisFrame;
    gCacheHitsLastFrame        = gCacheHitsThisFrame;
    gCacheMissesLastFrame      = gCacheMissesThisFrame;
    gVerticesUploadedLastFrame = gVerticesUploadedThisFrame;
    gBytesUploadedLastFrame    = gBytesUploadedThisFrame;

    gDrawCallsThisFrame        = 0;
    gCacheHitsThisFrame        = 0;
    gCacheMissesThisFrame      = 0;
    gVerticesUploadedThisFrame = 0;
    gBytesUploadedThisFrame    = 0;
}
