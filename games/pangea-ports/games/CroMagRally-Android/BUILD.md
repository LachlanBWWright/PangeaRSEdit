# How to build Cro-Mag Rally

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/CroMagRally
cd CroMagRally
python3 build.py
```

To build the **WebAssembly** version, install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) first, then activate it before running `build.py`:

```
source /path/to/emsdk/emsdk_env.sh
python3 build.py
```

`build.py` automatically detects `emcmake` in your PATH and switches to the Emscripten project class.

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems, plus WebAssembly.

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/CroMagRally
    cd CroMagRally
    ```
1. Download [SDL3-3.2.8.dmg](https://libsdl.org/release/SDL3-3.2.8.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/CroMagRally.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/CroMagRally.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/CroMagRally
    cd CroMagRally
    ```
1. Download [SDL3-devel-3.2.8-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.8-VC.zip), extract it, and copy **SDL3-3.2.8** to the **extern** folder. Rename **SDL3-3.2.8** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/CroMagRally.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/CroMagRally.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 development library (e.g. "libsdl3-dev" on Ubuntu, "sdl3" on Arch, "SDL3-devel" on Fedora)
    - OpenGL development libraries (e.g. "libgl1-mesa-dev" on Ubuntu)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/CroMagRally
    cd CroMagRally
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/CroMagRally`. Enjoy!

## How to build the WebAssembly version

1. Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) (version 3.1.69 or newer is recommended).
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/CroMagRally
    cd CroMagRally
    ```
1. Activate the Emscripten environment:
    ```
    source /path/to/emsdk/emsdk_env.sh
    ```
1. Configure and build:
    ```
    emcmake cmake -S . -B build-wasm -DCMAKE_BUILD_TYPE=Release -DBUILD_SDL_FROM_SOURCE=OFF
    cmake --build build-wasm --parallel
    ```
1. The output files (`CroMagRally.html`, `CroMagRally.js`, `CroMagRally.wasm`, `CroMagRally.data`) are in `build-wasm/`.
1. Serve the `build-wasm/` directory with a web server (e.g. `python3 -m http.server 8000`) and open `CroMagRally.html` in a browser.

### Level-editor URL parameters

When running the WebAssembly build in a browser, you can use URL query parameters to control the boot behaviour:

| Parameter | Example | Description |
|---|---|---|
| `track` | `?track=3` | 1-based track number to load (default: 1) |
| `car` | `?car=2` | 1-based car index (default: 1) |
| `noFenceCollision` | `?noFenceCollision=1` | Disable fence collision physics |
| `levelOverride` | `?levelOverride=:Terrain:MyLevel.ter` | Load a custom terrain file instead of the built-in one |

### JavaScript cheat/editor API

The WebAssembly build exposes a JavaScript API for controlling game state at runtime:

```javascript
// Disable / enable fence collisions
GameCheat.setFenceCollision(0);   // disable
GameCheat.setFenceCollision(1);   // enable

// Query current state
GameCheat.getFenceCollision();    // returns 0 or 1
```

The `loadLevelOverride(arrayBuffer, virtualPath)` helper (available in the page after the game loads) can be used to inject a custom `.ter` terrain file into the virtual filesystem. The game will use it on next page reload with the `?levelOverride=...` parameter.
