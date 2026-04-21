// MIGHTY MIKE ENTRY POINT
// (C) 2025 Iliyas Jorio
// This file is part of Mighty Mike. https://github.com/jorio/mightymike

#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>

#include "Pomme.h"
#include "PommeFiles.h"
#include "PommeInit.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

extern "C"
{
	#include "externs.h"
	#include "renderdrivers.h"
	#include "framebufferfilter.h"
	#include "version.h"

	SDL_Window* gSDLWindow = nullptr;
	FSSpec gDataSpec;

	// WebAssembly / level-editor direct-boot parameters
	Boolean gSkipMenus = false;
	char gCustomMapPath[512] = "";	// if set, overrides the map file for the current area

	void GameMain(void);
}

static fs::path FindGameData(const char* executablePath)
{
	fs::path dataPath;

	int attemptNum = 0;

#if defined(__EMSCRIPTEN__)
	// In WebAssembly builds the Data folder is embedded into the WASM binary
	// at the path /Data (via --embed-file during the Emscripten link step).
	attemptNum = 2;
#elif !(__APPLE__)
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

	// Use application resource file
	auto applicationSpec = Pomme::Files::HostPathToFSSpec(dataPath / "System" / "Application");
	short resFileRefNum = FSpOpenResFile(&applicationSpec, fsRdPerm);

	if (resFileRefNum == -1)
	{
		goto tryAgain;
	}

	UseResFile(resFileRefNum);

	return dataPath;
}

static void Boot(int argc, char** argv)
{
	const char* executablePath = argc > 0 ? argv[0] : NULL;

	SDL_SetAppMetadata(GAME_FULL_NAME, GAME_VERSION, GAME_IDENTIFIER);
#if _DEBUG
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#else
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_INFO);
#endif

	// Parse command-line arguments (skip argv[0])
	for (int i = 1; i < argc; i++)
	{
		if (SDL_strcmp(argv[i], "--level") == 0 && i + 1 < argc)
		{
			i++;
			int scene = 0, area = 0;
			if (SDL_sscanf(argv[i], "%d:%d", &scene, &area) == 2)
			{
				gStartingScene = (Byte)scene;
				gStartingArea  = (Byte)area;
				gSkipMenus     = true;
				SDL_Log("Direct boot: scene=%d area=%d", scene, area);
			}
			else
			{
				SDL_LogWarn(SDL_LOG_CATEGORY_APPLICATION,
					"--level expects <scene>:<area> (e.g. --level 0:1)");
			}
		}
		else if (SDL_strcmp(argv[i], "--map-override") == 0 && i + 1 < argc)
		{
			i++;
			SDL_strlcpy(gCustomMapPath, argv[i], sizeof(gCustomMapPath));
			SDL_Log("Custom map override: %s", gCustomMapPath);
		}
	}

#ifdef __EMSCRIPTEN__
	// In WebAssembly builds, also check URL query parameters via JavaScript.
	// We read them directly in EM_ASM and write to C globals via setValue().
	EM_ASM({
		var params = new URLSearchParams(window.location.search);
		var level  = params.get('level');
		var mapOvr = params.get('mapOverride');
		if (level) {
			var parts = level.split(':');
			if (parts.length === 2) {
				var scene = parseInt(parts[0]);
				var area  = parseInt(parts[1]);
				if (!isNaN(scene) && !isNaN(area)) {
					setValue($0, scene, 'i8');    // gStartingScene
					setValue($1, area,  'i8');    // gStartingArea
					setValue($2, 1,     'i8');    // gSkipMenus (1 = true; Emscripten setValue uses numeric i8)
				}
			}
		}
		if (mapOvr) {
			// Write the string into gCustomMapPath (max 511 chars + null)
			var encoded = new TextEncoder().encode(mapOvr.substring(0, 511));
			var heap    = new Uint8Array(Module.HEAPU8.buffer, $3, 512);
			heap.set(encoded);
			heap[encoded.length] = 0;
		}
	},
		&gStartingScene,
		&gStartingArea,
		&gSkipMenus,
		gCustomMapPath
	);
#endif

	// Start our "machine"
	Pomme::Init();

	// Initialize SDL video subsystem
	if (!SDL_Init(SDL_INIT_VIDEO))
	{
		throw std::runtime_error("Couldn't initialize SDL video subsystem.");
	}

#if GLRENDER
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_COMPATIBILITY);
#endif // GLRENDER

	// Create window
	int windowFlags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
#if GLRENDER
	windowFlags |= SDL_WINDOW_OPENGL;
#endif
	gSDLWindow = SDL_CreateWindow(GAME_FULL_NAME " " GAME_VERSION, VISIBLE_WIDTH, VISIBLE_HEIGHT, windowFlags);
	if (!gSDLWindow)
		throw std::runtime_error("Couldn't create SDL window.");

#ifdef __EMSCRIPTEN__
	// SDL_GetDisplayUsableBounds() may return spuriously small values in
	// headless/CI browsers before the page layout is computed.  Force the
	// window (and therefore the WebGL canvas) to an integer-zoom size so
	// headless screenshots are taken at the correct resolution.
	{
		int zoom = GetMaxIntegerZoomForPreferredDisplay();
		if (zoom < 1) zoom = 1;
		SDL_SetWindowSize(gSDLWindow, VISIBLE_WIDTH * zoom, VISIBLE_HEIGHT * zoom);
		SDL_SyncWindow(gSDLWindow);
	}
#endif

#if GLRENDER
	GLRender_Init();
#else
	if (!SDLRender_Init())
		throw std::runtime_error("Couldn't create SDL renderer.");
#endif // GLRENDER

	// Find path to game data folder
	fs::path dataPath = FindGameData(executablePath);

	// Init joystick subsystem
	{
		SDL_Init(SDL_INIT_GAMEPAD);
		auto gamecontrollerdbPath8 = (dataPath / "System" / "gamecontrollerdb.txt").u8string();
		if (-1 == SDL_AddGamepadMappingsFromFile((const char*)gamecontrollerdbPath8.c_str()))
		{
			SDL_ShowSimpleMessageBox(SDL_MESSAGEBOX_WARNING, GAME_FULL_NAME, "Couldn't load gamecontrollerdb.txt!", gSDLWindow);
		}
	}
}

static void Shutdown()
{
	// Always restore the user's mouse acceleration before exiting.
	// SetMacLinearMouse(false);

	Pomme::Shutdown();

	if (gSDLWindow)
	{
		SDL_DestroyWindow(gSDLWindow);
		gSDLWindow = NULL;
	}

	SDL_Quit();
}

// ---------------------------------------------------------------------------
// Helpers exposed to JavaScript in WebAssembly builds
// ---------------------------------------------------------------------------

#ifdef __EMSCRIPTEN__
extern "C"
{
	// Called from JS (via EM_ASM/ccall) to set a direct-boot level
	EMSCRIPTEN_KEEPALIVE void Boot_SetDirectLevel(int scene, int area)
	{
		gStartingScene = (Byte)scene;
		gStartingArea  = (Byte)area;
		gSkipMenus     = true;
	}

	// Called from JS to set a custom map file path
	EMSCRIPTEN_KEEPALIVE void Boot_SetCustomMapPath(const char* path)
	{
		SDL_strlcpy(gCustomMapPath, path, sizeof(gCustomMapPath));
	}
}
#endif // __EMSCRIPTEN__

// ---------------------------------------------------------------------------

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
