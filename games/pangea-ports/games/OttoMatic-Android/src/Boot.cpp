// OTTO MATIC ENTRY POINT
// (C) 2025 Iliyas Jorio
// This file is part of Otto Matic. https://github.com/jorio/ottomatic

#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#include "Pomme.h"
#include "PommeInit.h"
#include "PommeFiles.h"

extern "C"
{
	#include "game.h"

	SDL_Window* gSDLWindow = nullptr;
	FSSpec gDataSpec;
	int gCurrentAntialiasingLevel;

	// Level editor / WASM interface globals
	int  gDirectLevelNum        = -1;		// -1 = use default game flow; >=0 = load directly into this level
	char gTerrainOverridePath[512] = {0};	// optional terrain file path override for the current level
}

// Terrain override spec (populated from gTerrainOverridePath when non-empty)
static FSSpec sTerrainOverrideSpec;
static bool   sHasTerrainOverride = false;

// C-callable accessor used by File.c
extern "C" FSSpec* GetTerrainOverrideSpec(void)
{
	return sHasTerrainOverride ? &sTerrainOverrideSpec : nullptr;
}

// Build a terrain override FSSpec from gTerrainOverridePath (called after Pomme init)
static void BuildTerrainOverrideSpec(void)
{
	if (gTerrainOverridePath[0] == '\0')
		return;
	try
	{
		sTerrainOverrideSpec = Pomme::Files::HostPathToFSSpec(fs::path(gTerrainOverridePath));
		sHasTerrainOverride = true;
	}
	catch (...)
	{
		SDL_Log("Warning: couldn't resolve terrain override path: %s", gTerrainOverridePath);
	}
}

#ifdef __EMSCRIPTEN__
// Exported function: set terrain override path from JavaScript
EMSCRIPTEN_KEEPALIVE extern "C" void OttoMatic_SetTerrainPath(const char* path)
{
	SDL_strlcpy(gTerrainOverridePath, path, sizeof(gTerrainOverridePath));
	sHasTerrainOverride = false;	// will be rebuilt on next level load
}

// God-mode flag: when >0 the player cannot lose health
static int sGodMode = 0;

// Movement speed multiplier (1.0 = normal)
static float sSpeedMultiplier = 1.0f;

// Exported: toggle god mode (immortality)
EMSCRIPTEN_KEEPALIVE extern "C" void OttoMatic_SetGodMode(int enabled)
{
	sGodMode = enabled;
	SDL_Log("[LevelEditor] God mode: %s", enabled ? "ON" : "OFF");
}

// Exported: query god mode
EMSCRIPTEN_KEEPALIVE extern "C" int OttoMatic_GetGodMode(void)
{
	return sGodMode;
}

// Exported: set movement speed multiplier
EMSCRIPTEN_KEEPALIVE extern "C" void OttoMatic_SetSpeedMultiplier(float multiplier)
{
	if (multiplier < 0.1f) multiplier = 0.1f;
	if (multiplier > 10.0f) multiplier = 10.0f;
	sSpeedMultiplier = multiplier;
	SDL_Log("[LevelEditor] Speed multiplier: %.2f", multiplier);
}

// Exported: query speed multiplier
EMSCRIPTEN_KEEPALIVE extern "C" float OttoMatic_GetSpeedMultiplier(void)
{
	return sSpeedMultiplier;
}

// Exported: warp (teleport) the player to specific world coordinates
EMSCRIPTEN_KEEPALIVE extern "C" void OttoMatic_WarpToCoord(float x, float y, float z)
{
	if (gPlayerInfo.objNode)
	{
		gPlayerInfo.objNode->Coord.x = x;
		gPlayerInfo.objNode->Coord.y = y;
		gPlayerInfo.objNode->Coord.z = z;
		gPlayerInfo.coord.x = x;
		gPlayerInfo.coord.y = y;
		gPlayerInfo.coord.z = z;
		SDL_Log("[LevelEditor] Warped player to (%.1f, %.1f, %.1f)", x, y, z);
	}
}

// Exported: get player X coordinate
EMSCRIPTEN_KEEPALIVE extern "C" float OttoMatic_GetPlayerX(void) { return gPlayerInfo.coord.x; }
// Exported: get player Y coordinate
EMSCRIPTEN_KEEPALIVE extern "C" float OttoMatic_GetPlayerY(void) { return gPlayerInfo.coord.y; }
// Exported: get player Z coordinate
EMSCRIPTEN_KEEPALIVE extern "C" float OttoMatic_GetPlayerZ(void) { return gPlayerInfo.coord.z; }
// Exported: get player health (0.0–1.0)
EMSCRIPTEN_KEEPALIVE extern "C" float OttoMatic_GetPlayerHealth(void) { return gPlayerInfo.health; }
// Exported: get player remaining lives
EMSCRIPTEN_KEEPALIVE extern "C" int OttoMatic_GetPlayerLives(void) { return gPlayerInfo.lives; }

// Exported: skip to a specific level (triggers level completion then loads target)
EMSCRIPTEN_KEEPALIVE extern "C" void OttoMatic_SkipToLevel(int level)
{
	if (level < 0 || level > 9) return;
	gLevelNum = level - 1;	// PlayGame increments before loading
	gLevelCompleted = true;
	gLevelCompletedCoolDownTimer = 0;
	SDL_Log("[LevelEditor] Skipping to level %d", level);
}

// Exported: get current level number
EMSCRIPTEN_KEEPALIVE extern "C" int OttoMatic_GetCurrentLevel(void)
{
	return gLevelNum;
}

// C-callable helpers for the god mode / speed multiplier hooks
extern "C" int IsGodModeActive(void) { return sGodMode; }
extern "C" float GetSpeedMultiplier(void) { return sSpeedMultiplier; }
#endif

static fs::path FindGameData(const char* executablePath)
{
	fs::path dataPath;

	int attemptNum = 0;

#if !(__APPLE__)
	attemptNum++;		// skip macOS special case #0
#endif

	if (!executablePath)
		attemptNum = 2;

tryAgain:
	switch (attemptNum)
	{
		case 0:			// special case for macOS app bundles
			dataPath = executablePath;
			dataPath = dataPath.parent_path().parent_path() / "Resources";
			break;

		case 1:
			dataPath = executablePath;
			dataPath = dataPath.parent_path() / "Data";
			break;

		case 2:
			dataPath = "Data";
			break;

		default:
			throw std::runtime_error("Couldn't find the Data folder.");
	}

	attemptNum++;

	dataPath = dataPath.lexically_normal();

	// Set data spec -- Lets the game know where to find its asset files
	gDataSpec = Pomme::Files::HostPathToFSSpec(dataPath / "System");

	FSSpec someDataFileSpec;
	OSErr iErr = FSMakeFSSpec(gDataSpec.vRefNum, gDataSpec.parID, ":System:gamecontrollerdb.txt", &someDataFileSpec);
	if (iErr)
	{
		goto tryAgain;
	}

	return dataPath;
}

// Parse level editor / WASM command-line arguments
// --level N        : skip menus and load directly into level N (0-based)
// --terrain PATH   : override the terrain file for the specified level
static void ParseLevelEditorArgs(int argc, char** argv)
{
	for (int i = 1; i < argc; i++)
	{
		if (SDL_strcmp(argv[i], "--level") == 0 && i + 1 < argc)
		{
			gDirectLevelNum = SDL_atoi(argv[++i]);
			if (gDirectLevelNum < 0 || gDirectLevelNum >= NUM_LEVELS)
			{
				SDL_Log("Warning: --level %d is out of range (0-%d), ignoring", gDirectLevelNum, NUM_LEVELS - 1);
				gDirectLevelNum = -1;
			}
		}
		else if (SDL_strcmp(argv[i], "--terrain") == 0 && i + 1 < argc)
		{
			SDL_strlcpy(gTerrainOverridePath, argv[++i], sizeof(gTerrainOverridePath));
		}
	}
}

static void Boot(int argc, char** argv)
{
	SDL_SetAppMetadata(GAME_FULL_NAME, GAME_VERSION, GAME_IDENTIFIER);
	// Always use verbose logging on Emscripten for browser console visibility
#ifdef __EMSCRIPTEN__
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#elif _DEBUG
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#else
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_INFO);
#endif

	SDL_Log("Boot: starting...");

	// Parse level editor / WASM arguments before Pomme init
	ParseLevelEditorArgs(argc, argv);

	// Start our "machine"
	SDL_Log("Boot: Pomme::Init...");
	Pomme::Init();

	// Find path to game data folder
	const char* executablePath = argc > 0 ? argv[0] : NULL;
	SDL_Log("Boot: FindGameData...");
	fs::path dataPath = FindGameData(executablePath);

	// Build terrain override FSSpec if a path was specified
	BuildTerrainOverrideSpec();

	// Load game prefs before starting
	SDL_Log("Boot: LoadPrefs...");
	LoadPrefs();

retryVideo:
	// Initialize SDL video subsystem
	SDL_Log("Boot: SDL_Init(VIDEO)...");
	if (!SDL_Init(SDL_INIT_VIDEO))
	{
		throw std::runtime_error("Couldn't initialize SDL video subsystem.");
	}

	SDL_Log("Boot: Creating window...");
#ifdef __EMSCRIPTEN__
	// WebAssembly: use OpenGL ES 2 (maps to WebGL 1)
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
#elif defined(__ANDROID__)
	// Android: use OpenGL ES 2
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
#else
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_COMPATIBILITY);
#endif
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);

	gCurrentAntialiasingLevel = gGamePrefs.antialiasingLevel;
	if (gCurrentAntialiasingLevel != 0)
	{
		SDL_GL_SetAttribute(SDL_GL_MULTISAMPLEBUFFERS, 1);
		SDL_GL_SetAttribute(SDL_GL_MULTISAMPLESAMPLES, 1 << gCurrentAntialiasingLevel);
	}

	gSDLWindow = SDL_CreateWindow(
		GAME_FULL_NAME " " GAME_VERSION, 640, 480,
		SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);

	SDL_Log("Boot: Window created: %p", (void*)gSDLWindow);

	if (!gSDLWindow)
	{
		if (gCurrentAntialiasingLevel != 0)
		{
			SDL_Log("Couldn't create SDL window with the requested MSAA level. Retrying without MSAA...");

			// retry without MSAA
			gGamePrefs.antialiasingLevel = 0;
			SDL_QuitSubSystem(SDL_INIT_VIDEO);
			goto retryVideo;
		}
		else
		{
			throw std::runtime_error("Couldn't create SDL window.");
		}
	}

#ifdef __EMSCRIPTEN__
	// SDL_GetDisplayUsableBounds() may return spuriously small values in
	// headless/CI browsers before the page layout is computed.  Force the
	// window (and therefore the WebGL canvas) to the game's target resolution.
	{
		int emW = 640, emH = 480;
		GetDefaultWindowSize(SDL_GetDisplayForWindow(gSDLWindow), &emW, &emH);
		SDL_SetWindowSize(gSDLWindow, emW, emH);
		SDL_SyncWindow(gSDLWindow);
	}
#endif

	// Init gamepad subsystem
	SDL_Init(SDL_INIT_GAMEPAD);
	auto gamecontrollerdbPath8 = (dataPath / "System" / "gamecontrollerdb.txt").u8string();
	if (-1 == SDL_AddGamepadMappingsFromFile((const char*)gamecontrollerdbPath8.c_str()))
	{
		SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_WARNING, GAME_FULL_NAME, "Couldn't load gamecontrollerdb.txt!", gSDLWindow);
	}
}

static void Shutdown()
{
	// Always restore the user's mouse acceleration before exiting.
	SetMacLinearMouse(false);

	Pomme::Shutdown();

	if (gSDLWindow)
	{
		SDL_DestroyWindow(gSDLWindow);
		gSDLWindow = NULL;
	}

	SDL_Quit();
}

int main(int argc, char** argv)
{
	bool success = true;
	std::string uncaught = "";

	try
	{
		Boot(argc, argv);
		GameMain();
	}
	catch (Pomme::QuitRequest&)
	{
		// no-op, the game may throw this exception to shut us down cleanly
	}
#if !(_DEBUG)
	// In release builds, catch anything that might be thrown by GameMain
	// so we can show an error dialog to the user.
	catch (std::exception& ex)		// Last-resort catch
	{
		success = false;
		uncaught = ex.what();
	}
	catch (...)						// Last-resort catch
	{
		success = false;
		uncaught = "unknown";
	}
#endif

	Shutdown();

	if (!success)
	{
		SDL_LogError(SDL_LOG_CATEGORY_APPLICATION, "Uncaught exception: %s", uncaught.c_str());
		SDL_ShowSimpleMessageBox(0, GAME_FULL_NAME, uncaught.c_str(), nullptr);
	}

	return success ? 0 : 1;
}
