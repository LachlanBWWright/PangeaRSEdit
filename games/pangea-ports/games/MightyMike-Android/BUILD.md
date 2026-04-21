# How to build Mighty Mike

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/MightyMike
cd MightyMike
python3 build.py
```

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems.

## How to build the WebAssembly version

The WebAssembly (WASM) build lets you run Mighty Mike in a browser. It is primarily intended for level-editor integration and testing.

### Prerequisites

- [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) — install the **latest stable** release
- Python 3, CMake

### Building with build.py

```bash
# Activate the Emscripten toolchain (run once per shell session)
source /path/to/emsdk_env.sh

# Download SDL3 for Emscripten, configure, build, and package
python3 build.py --wasm --dependencies --configure --build --package
```

The packaged `.zip` file (e.g. `dist/MightyMike-3.0.3-wasm.zip`) contains:
- `MightyMike.js` — the JavaScript loader
- `MightyMike.wasm` — the WebAssembly binary (with game data embedded)

Serve those files alongside `docs/index.html` from a static web server to play in the browser.

### Level-editor URL parameters

When hosted on a web server, you can pass these query string parameters:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `level` | `?level=0:1` | Skip menus and boot directly to scene 0, area 1 (both 0-indexed) |
| `mapOverride` | `?mapOverride=:Maps:custom.map-1` | Use a custom packed map file instead of the built-in one |

### JavaScript cheat interface

The WASM build exposes these functions to JavaScript via `Module.ccall`:

```js
// Disable solid-tile (fence) collisions — useful for level editing
Module.ccall('Cheat_SetFenceCollision', null, ['number'], [0]);  // disable
Module.ccall('Cheat_SetFenceCollision', null, ['number'], [1]);  // re-enable

// Query current state (returns 1 = enabled, 0 = disabled)
var enabled = Module.ccall('Cheat_GetFenceCollision', 'number', [], []);
```

### Building manually with emcmake/emmake

```bash
source /path/to/emsdk_env.sh

# Build SDL3 for Emscripten first (one-time step)
mkdir -p libs/SDL3-build && cd libs/SDL3-build
emcmake cmake ../../extern/SDL -DCMAKE_BUILD_TYPE=Release -DSDL_SHARED=OFF
emmake make -j$(nproc)
cmake --install . --prefix ../../libs/SDL3-install

# Configure and build the game
cd /path/to/MightyMike
emcmake cmake -S . -B build-wasm \
    -DCMAKE_BUILD_TYPE=Release \
    -DSDL3_DIR=libs/SDL3-install/lib/cmake/SDL3
emmake cmake --build build-wasm -j$(nproc)
```

The output files (`MightyMike.js`, `MightyMike.wasm`) appear in `build-wasm/`.

---

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/MightyMike
    cd MightyMike
    ```
1. Download [SDL3-3.2.2.dmg](https://libsdl.org/release/SDL3-3.2.2.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/MightyMike.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/MightyMike.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/MightyMike
    cd MightyMike
    ```
1. Download [SDL3-devel-3.2.2-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.2-VC.zip), extract it, and copy **SDL3-3.2.2** to the **extern** folder. Rename **SDL3-3.2.2** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/MightyMike.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/MightyMike.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 development library (e.g. "libsdl3-dev" on Ubuntu, "sdl3" on Arch, "SDL3-devel" on Fedora)
    - OpenGL development libraries (e.g. "libgl1-mesa-dev" on Ubuntu)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/MightyMike
    cd MightyMike
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/MightyMike`. Enjoy!

## Command-line arguments (all platforms)

| Argument | Example | Description |
|----------|---------|-------------|
| `--level <scene>:<area>` | `--level 0:2` | Boot directly to scene 0, area 2 (skips all menus) |
| `--map-override <path>` | `--map-override :Maps:custom.map-1` | Override the map file for the next loaded area |

