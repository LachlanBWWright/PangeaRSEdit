# How to build Otto Matic

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/OttoMatic
cd OttoMatic
python3 build.py
```

To build the **WebAssembly** (browser) version, install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) and run:

```
python3 build.py --wasm
```

The WASM bundle will be produced in `dist/OttoMatic-<version>-wasm.zip`. Extract and serve from a web server.

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems.

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/OttoMatic
    cd OttoMatic
    ```
1. Download [SDL3-3.2.4.dmg](https://libsdl.org/release/SDL3-3.2.4.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/OttoMatic.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/OttoMatic.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/OttoMatic
    cd OttoMatic
    ```
1. Download [SDL3-devel-3.2.4-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.4-VC.zip), extract it, and copy **SDL3-3.2.4** to the **extern** folder. Rename **SDL3-3.2.4** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/OttoMatic.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/OttoMatic.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 build dependencies (see below — SDL3 itself is downloaded automatically by `build.py`)
    - OpenGL development libraries (e.g. `libgl1-mesa-dev` on Ubuntu)

    On Ubuntu/Debian install the SDL3 build dependencies:
    ```
    sudo apt-get install libasound2-dev libpulse-dev \
      libaudio-dev libjack-dev libsndio-dev libx11-dev libxext-dev \
      libxrandr-dev libxcursor-dev libxfixes-dev libxi-dev libxss-dev \
      libxkbcommon-dev libdrm-dev libgbm-dev libgl1-mesa-dev libgles2-mesa-dev \
      libegl1-mesa-dev libdbus-1-dev libibus-1.0-dev libudev-dev \
      libpipewire-0.3-dev libwayland-dev
    ```

    > **Note:** `libsdl3-dev` is **not** available in Ubuntu/Debian apt repos yet.
    > The build script (`build.py`) automatically downloads and compiles SDL3 from source.
    > Use `--system-sdl` only if you have installed SDL3 from another source.
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/OttoMatic
    cd OttoMatic
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/OttoMatic`. Enjoy!

## How to build the WebAssembly version manually

1. Install the prerequisites:
    - [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) and activate it
    - CMake 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/OttoMatic
    cd OttoMatic
    ```
1. Download SDL3 source and unpack it into `extern/SDL3-3.2.4`:
    ```
    curl -LO https://libsdl.org/release/SDL3-3.2.4.tar.gz
    tar -xzf SDL3-3.2.4.tar.gz -C extern/
    ```
1. Configure with Emscripten (note: the build script uses `build/` as the output dir):
    ```
    emcmake cmake -S . -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SDL_FROM_SOURCE=ON \
        -DSDL_STATIC=ON \
        -DSDL3_DIR=extern/SDL3-3.2.4
    ```
1. Build:
    ```
    cmake --build build -j$(nproc)
    ```
1. The output is `build/OttoMatic.html` (plus `.js`, `.wasm`, `.data`). Serve these files from a web server to play.

## GitHub Pages (live WASM demo)

The CI/CD pipeline automatically builds and deploys the WebAssembly version to GitHub Pages whenever a commit is pushed to the `master` branch. The workflow is defined in `.github/workflows/deploy-pages.yml`.

To enable GitHub Pages in your fork:
1. Go to **Settings → Pages** in your repository.
2. Set **Source** to **GitHub Actions**.
3. Push a commit to `master` — the `Deploy to GitHub Pages` workflow will run and your game will be live at `https://<your-username>.github.io/<repo-name>/`.

The deployed page (`docs/shell.html`) provides:
- A loading screen with progress indicator
- The game canvas (WebGL)
- A **Level Editor API** panel with live controls:
  - Fence collision toggle
  - Terrain file path override
  - URL-param support: `?level=N&terrain=/Data/Terrain/Custom.ter`

## Level editor integration

The game supports direct level loading and terrain file override for integration with level editors:

### Command-line arguments (desktop and WASM via `Module.arguments`)

- `--level N` — Skip the main menu and load level N directly (0 = Farm, 1 = Blob, etc.)
- `--terrain PATH` — Override the terrain file for the current level with a custom `.ter` file

### JavaScript API (WebAssembly only)

After the WASM module is initialized, you can call these exported functions from JavaScript:

```js
// Disable fence collision detection (useful for level editing/walkthrough)
Module.ccall('OttoMatic_SetFenceCollisions', null, ['number'], [0]);

// Re-enable fence collision detection
Module.ccall('OttoMatic_SetFenceCollisions', null, ['number'], [1]);

// Override the terrain file for the current level
// (write the .ter file to the virtual filesystem first)
FS.writeFile('/Data/Terrain/custom.ter', yourTerrainData);
Module.ccall('OttoMatic_SetTerrainPath', null, ['string'], ['/Data/Terrain/custom.ter']);
```

## Known Issues (WebAssembly)

### ScriptProcessorNode Deprecation Warning

When running the WebAssembly build in modern browsers, you may see this console warning:

```
[Deprecation] The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.
```

**Cause:** This warning originates from SDL3's Emscripten audio backend, which currently uses the deprecated `ScriptProcessorNode` Web Audio API for audio playback.

**Impact:** The warning is cosmetic and does not affect gameplay. Audio continues to function normally. However, browsers may eventually remove `ScriptProcessorNode` support entirely in future versions.

**Resolution:** This requires an update to SDL3's Emscripten audio backend to use the modern `AudioWorklet` API instead. This is being addressed in the SDL3 project (see [SDL Issue #11258](https://github.com/libsdl-org/SDL/issues/11258)). Once SDL3 updates their audio backend, rebuilding with the newer SDL3 version will resolve this warning.

**Workaround:** The warning can be safely ignored for now, as audio functionality remains fully operational.

