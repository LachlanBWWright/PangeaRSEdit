// NANOSAUR ENTRY POINT
// (C) 2025 Iliyas Jorio
// This file is part of Nanosaur. https://github.com/jorio/nanosaur

#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>

#include "Pomme.h"
#include "PommeGraphics.h"
#include "PommeInit.h"
#include "PommeFiles.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <cstdlib>  // for free() used with EM_ASM_PTR allocations
#endif

extern "C"
{
	#include "game.h"

	SDL_Window* gSDLWindow = nullptr;
	WindowPtr gCoverWindow = nullptr;
	UInt32* gBackdropPixels = nullptr;
	FSSpec gDataSpec;
	int gCurrentAntialiasingLevel;

	void FSMakeCustomSpec(const char* hostPath, FSSpec* outSpec)
	{
		*outSpec = Pomme::Files::HostPathToFSSpec(hostPath);
	}
}

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

static void ParseCommandLineArgs(int argc, char** argv)
{
	for (int i = 1; i < argc; i++)
	{
		if (SDL_strcmp(argv[i], "--skip-menu") == 0)
		{
			gSkipToLevel = true;
		}
		else if (SDL_strcmp(argv[i], "--level") == 0 && i + 1 < argc)
		{
			i++;
			int level = SDL_atoi(argv[i]);
			// Clamp to LEVEL_NUM_0 since that's the only level currently supported
			gStartLevelNum = (level >= LEVEL_NUM_0) ? level : LEVEL_NUM_0;
			gSkipToLevel = true;
		}
		else if (SDL_strcmp(argv[i], "--terrain-file") == 0 && i + 1 < argc)
		{
			i++;
			SDL_strlcpy(gCustomTerrainFile, argv[i], sizeof(gCustomTerrainFile));
			gSkipToLevel = true;
		}
	}
}

#ifdef __EMSCRIPTEN__
static void ParseEmscriptenURLParams(void)
{
	// Read URL query parameters via JavaScript
	// E.g. index.html?level=0&skipMenu=1&terrainFile=custom.ter
	char* levelStr = (char*) EM_ASM_PTR({
		var params = new URLSearchParams(window.location.search);
		var v = params.get('level');
		if (!v) return 0;
		var len = lengthBytesUTF8(v) + 1;
		var buf = _malloc(len);
		stringToUTF8(v, buf, len);
		return buf;
	});
	if (levelStr)
	{
		int level = SDL_atoi(levelStr);
		gStartLevelNum = (level >= LEVEL_NUM_0) ? level : LEVEL_NUM_0;
		gSkipToLevel = true;
		free(levelStr);
	}

	char* terrainFileStr = (char*) EM_ASM_PTR({
		var params = new URLSearchParams(window.location.search);
		var v = params.get('terrainFile');
		if (!v) return 0;
		var len = lengthBytesUTF8(v) + 1;
		var buf = _malloc(len);
		stringToUTF8(v, buf, len);
		return buf;
	});
	if (terrainFileStr)
	{
		SDL_strlcpy(gCustomTerrainFile, terrainFileStr, sizeof(gCustomTerrainFile));
		gSkipToLevel = true;
		free(terrainFileStr);
	}

	int skipMenu = EM_ASM_INT({
		var params = new URLSearchParams(window.location.search);
		return params.has('skipMenu') ? 1 : 0;
	});
	if (skipMenu)
		gSkipToLevel = true;

}
#endif

static void Boot(int argc, char** argv)
{
	SDL_SetAppMetadata(GAME_FULL_NAME, GAME_VERSION, GAME_IDENTIFIER);
#if _DEBUG
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#else
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_INFO);
#endif

	// Parse command-line arguments for level skip / custom terrain
	ParseCommandLineArgs(argc, argv);

#ifdef __EMSCRIPTEN__
	// Also read URL query parameters in web builds
	ParseEmscriptenURLParams();
#endif

	// Start our "machine"
	Pomme::Init();

	// Find path to game data folder
	const char* executablePath = argc > 0 ? argv[0] : NULL;
	fs::path dataPath = FindGameData(executablePath);

	// Load game prefs before starting
	LoadPrefs();

retryVideo:
	// Initialize SDL video subsystem
	if (!SDL_Init(SDL_INIT_VIDEO))
	{
		throw std::runtime_error("Couldn't initialize SDL video subsystem.");
	}

	// Create window
#ifdef __EMSCRIPTEN__
	// Use GLES2 profile for WebGL2 context.  The game uses a custom gl_compat
	// layer (FULL_ES2) instead of LEGACY_GL_EMULATION.
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
#else
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_COMPATIBILITY);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
#endif

	gCurrentAntialiasingLevel = gGamePrefs.antialiasingLevel;
	if (gCurrentAntialiasingLevel != 0)
	{
		SDL_GL_SetAttribute(SDL_GL_MULTISAMPLEBUFFERS, 1);
		SDL_GL_SetAttribute(SDL_GL_MULTISAMPLESAMPLES, 1 << gCurrentAntialiasingLevel);
	}

	gSDLWindow = SDL_CreateWindow(
		GAME_FULL_NAME " " GAME_VERSION, 640, 480,
		SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);

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
	SDL_SetWindowSize(gSDLWindow, GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT);
	SDL_SyncWindow(gSDLWindow);
#endif

	// Set up globals that the game expects
	gCoverWindow = Pomme::Graphics::GetScreenPort();
	gBackdropPixels = (UInt32*) GetPixBaseAddr(GetGWorldPixMap(gCoverWindow));

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
	// SetMacLinearMouse(false);

	Pomme::Shutdown();

	if (gSDLWindow)
	{
		SDL_DestroyWindow(gSDLWindow);
		gSDLWindow = NULL;
	}

	SDL_Quit();
}

#ifdef __EMSCRIPTEN__
/****************************/
/* EMSCRIPTEN FRAME WRAPPER */
/****************************/
//
// EmscriptenGameFrameSafe is the callback registered with
// emscripten_set_main_loop_arg.  It wraps EmscriptenGameFrameImpl
// (defined in Main.c) in a C++ try/catch so that Pomme::QuitRequest
// (thrown by ExitToShell) and any other C++ exceptions are handled
// gracefully instead of aborting the WASM runtime.
//

extern "C" void EmscriptenGameFrameImpl(void* arg);

extern "C" void EmscriptenGameFrameSafe(void* arg)
{
	try
	{
		EmscriptenGameFrameImpl(arg);
	}
	catch (Pomme::QuitRequest&)
	{
		// ExitToShell() was called -- treat it as a level restart.
		// gGameOverFlag is checked each frame in EmscriptenGameFrameImpl,
		// so setting it here ensures a clean restart next frame.
		gGameOverFlag = true;
	}
	catch (std::exception& ex)
	{
		SDL_LogError(SDL_LOG_CATEGORY_APPLICATION,
			"Unhandled exception in game frame: %s", ex.what());
		emscripten_cancel_main_loop();
	}
	catch (...)
	{
		SDL_LogError(SDL_LOG_CATEGORY_APPLICATION,
			"Unknown exception in game frame");
		emscripten_cancel_main_loop();
	}
}
#endif /* __EMSCRIPTEN__ */

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
