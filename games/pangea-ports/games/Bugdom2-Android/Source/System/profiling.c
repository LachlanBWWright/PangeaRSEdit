#include "../Headers/profiling.h"
#include <SDL3/SDL.h> // For SDL_GetPerformanceCounter and SDL_GetPerformanceFrequency

ProfilePhase gProfilePhases[NUM_PROFILE_PHASES];
static uint64_t gPerformanceFrequency;
static ProfilePhaseType gCurrentPhase = -1;

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
    gProfilePhases[PROFILE_PHASE_UI].name = "UI";
    gProfilePhases[PROFILE_PHASE_SWAP_BUFFERS].name = "Swap Buffers";
    
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
}
