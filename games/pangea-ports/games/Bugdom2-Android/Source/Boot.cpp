// BUGDOM 2 ENTRY POINT
// (C) 2025 Iliyas Jorio
// This file is part of Bugdom 2. https://github.com/jorio/bugdom2

#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>

#include "Pomme.h"
#include "PommeInit.h"
#include "PommeFiles.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/html5.h>
#endif

extern "C"
{
	#include "game.h"

	SDL_Window* gSDLWindow = nullptr;
	FSSpec gDataSpec;
	int gCurrentAntialiasingLevel;

	// Level editor / developer features
	int gStartLevel = -1;					// -1 = normal startup; >=0 = skip menus and load this level directly
	char gLevelOverrideDir[512] = "";		// if non-empty, files in this directory override Data/ files
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

static void Boot(int argc, char** argv)
{
	SDL_SetAppMetadata(GAME_FULL_NAME, GAME_VERSION, GAME_IDENTIFIER);
#if _DEBUG
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#else
	SDL_SetLogPriorities(SDL_LOG_PRIORITY_INFO);
#endif

	// Parse command-line arguments for level editor / developer features
	for (int i = 1; i < argc; i++)
	{
		if (SDL_strcmp(argv[i], "--level") == 0 && i + 1 < argc)
		{
			gStartLevel = SDL_atoi(argv[i + 1]);
			i++;
		}
		else if (SDL_strcmp(argv[i], "--level-override-dir") == 0 && i + 1 < argc)
		{
			SDL_strlcpy(gLevelOverrideDir, argv[i + 1], sizeof(gLevelOverrideDir));
			i++;
		}
	}

#ifdef __EMSCRIPTEN__
	// Read URL parameters for level editor features (e.g., ?level=3)
	if (gStartLevel < 0)
	{
		// Preserve any launch level already provided by argv or wrapper JS state.
		// Only fall back to the URL parameter when no higher-priority start level was set.
		gStartLevel = EM_ASM_INT({
			const urlParams = new URLSearchParams(window.location.search);
			const level = urlParams.get('level');
			return (level !== null) ? parseInt(level) : -1;
		});
	}
	if (gStartLevel < 0 || gStartLevel >= NUM_LEVELS)
		gStartLevel = -1;
#endif

	// Start our "machine"
	Pomme::Init();

	// Find path to game data folder
	const char* executablePath = argc > 0 ? argv[0] : NULL;
	fs::path dataPath = FindGameData(executablePath);

#if !defined(__EMSCRIPTEN__)
	// Apply level file overrides from --level-override-dir (desktop builds only).
	// For Emscripten, use Module.FS.writeFile('Data/...', bytes) from JavaScript instead.
	if (gLevelOverrideDir[0] != '\0')
	{
		fs::path overrideDir(gLevelOverrideDir);
		if (fs::is_directory(overrideDir))
		{
			// Walk override dir and copy each file to the matching location under dataPath/
			for (auto& entry : fs::recursive_directory_iterator(overrideDir))
			{
				if (!entry.is_regular_file())
					continue;

				// Compute relative path within override dir, then mirror it in dataPath
				auto relPath = fs::relative(entry.path(), overrideDir);
				fs::path destFile = dataPath / relPath;

				// Only override files that exist in the game data (safety check)
				if (fs::exists(destFile))
				{
					fs::copy_file(entry.path(), destFile, fs::copy_options::overwrite_existing);
					SDL_Log("Level override applied: %s", destFile.u8string().c_str());
				}
				else
				{
					SDL_Log("Level override skipped (no matching data file): %s", relPath.u8string().c_str());
				}
			}
		}
		else
		{
			SDL_LogWarn(SDL_LOG_CATEGORY_APPLICATION,
				"--level-override-dir path is not a directory: %s", gLevelOverrideDir);
		}
	}
#endif

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
	// WebGL2 requires OpenGL ES 3.0 context profile
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
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
		GAME_FULL_NAME " (" GAME_VERSION ")", 640, 480,
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
