// render_stats_stub.c
// Stub definitions for OttoMatic-derived render statistics counters.
// modern_gl.c and vertex_array_compat.c increment these; BillyFrontier
// doesn't use them.
#if defined(__EMSCRIPTEN__) || defined(__ANDROID__)
int gDrawCallsThisFrame = 0;
int gVerticesThisFrame = 0;
int gBufferUploadsThisFrame = 0;
#endif
