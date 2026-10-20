#include <jni.h>
#include <SDL3/SDL.h>
#include <GLES3/gl3.h>
#define PANGEA_TOUCH_IMPLEMENTATION
#include "TouchControls.h"
#include "TouchControlsDraw.h"

static TouchControlProfile make_profile(TouchControlButton* buttons, int count)
{
    return (TouchControlProfile){
        .upNeed = 0, .downNeed = 1, .leftNeed = 2, .rightNeed = 3,
        .uiUpNeed = 0, .uiDownNeed = 1, .uiLeftNeed = 2, .uiRightNeed = 3,
        .confirmNeed = 100, .backNeed = 101, .pauseNeed = 102,
        .buttons = buttons, .buttonCount = count,
    };
}

static bool verify_action_targets(const TouchControlProfile* profile)
{
    const TouchLayout* layout = TouchControls_GetLayout();
    if (!layout) return false;
    for (int i = 0; i < layout->actionCount; i++)
    {
        SDL_Event event = {0};
        event.type = SDL_EVENT_FINGER_DOWN;
        event.tfinger.touchID = 1;
        event.tfinger.fingerID = 1;
        event.tfinger.x = layout->actions[i].x / layout->width;
        event.tfinger.y = layout->actions[i].y / layout->height;
        bool captured = TouchControls_HandleEvent(&event);
        bool pressed = TouchControls_NeedPressed(profile->buttons[i].need);
        event.type = SDL_EVENT_FINGER_UP;
        TouchControls_HandleEvent(&event);
        if (!captured || !pressed || TouchControls_NeedPressed(profile->buttons[i].need))
        {
            SDL_Log("Touch target verification failed: %s", profile->buttons[i].label);
            return false;
        }
    }
    TouchControls_Reset();
    SDL_Log("Touch targets verified: %d original action bindings", layout->actionCount);
    return true;
}

JNIEXPORT int PangeaScreenshotControlsMain(int argc, char** argv)
{
    if (argc < 3 || argc > 10) return 1;
    SDL_SetHint(SDL_HINT_ORIENTATIONS, "LandscapeLeft LandscapeRight");
    if (!SDL_Init(SDL_INIT_VIDEO)) return 1;
    bool useSDL = SDL_strcmp(argv[1], "sdl") == 0;
    SDL_Window* window = NULL;
    SDL_Renderer* renderer = NULL;
    SDL_GLContext context = NULL;
    if (useSDL)
    {
        if (!SDL_CreateWindowAndRenderer("Touch controls", 2400, 1080,
            SDL_WINDOW_FULLSCREEN, &window, &renderer)) return 1;
    }
    else
    {
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
        window = SDL_CreateWindow("Touch controls", 2400, 1080,
            SDL_WINDOW_OPENGL | SDL_WINDOW_FULLSCREEN);
        if (!window) return 1;
        context = SDL_GL_CreateContext(window);
        if (!context) { SDL_DestroyWindow(window); return 1; }
    }

    TouchControlButton buttons[8];
    for (int i = 2; i < argc; i++)
        buttons[i - 2] = (TouchControlButton){argv[i], i + 2};
    TouchControlProfile profile = make_profile(buttons, argc - 2);
    TouchControls_BeginFrame(window, &profile);
    if (!verify_action_targets(&profile)) return 1;
    SDL_Log("Pangea screenshot: production controls renderer ready (%s)", argv[1]);
    bool running = true;
    float loggedWidth = 0, loggedHeight = 0, loggedStickX = 0;
    while (running)
    {
        TouchControls_BeginFrame(window, &profile);
        const TouchLayout* layout = TouchControls_GetLayout();
        if (layout && (layout->width != loggedWidth || layout->height != loggedHeight || layout->stick.x != loggedStickX))
        {
            SDL_Log("Touch layout: %.0fx%.0f, stick x=%.1f radius=%.1f, menu x=%.1f y=%.1f",
                layout->width,layout->height,layout->stick.x,layout->stick.radius,layout->utility[0].x,layout->utility[0].y);
            loggedWidth = layout->width; loggedHeight = layout->height; loggedStickX = layout->stick.x;
        }
        SDL_Event event;
        while (SDL_PollEvent(&event))
        {
            if (event.type == SDL_EVENT_QUIT) running = false;
            TouchControls_HandleEvent(&event);
        }
        if (useSDL)
        {
            SDL_SetRenderDrawColor(renderer, 39, 48, 58, 255);
            SDL_RenderClear(renderer);
            TouchControls_DrawSDL(renderer);
            SDL_RenderPresent(renderer);
        }
        else
        {
            glClearColor(39.0f / 255, 48.0f / 255, 58.0f / 255, 1);
            glClear(GL_COLOR_BUFFER_BIT);
            TouchControls_DrawGL(window);
            SDL_GL_SwapWindow(window);
        }
        SDL_Delay(16);
    }
    if (renderer) SDL_DestroyRenderer(renderer);
    if (context) SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
