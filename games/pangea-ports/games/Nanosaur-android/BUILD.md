# How to build Nanosaur

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/Nanosaur
cd Nanosaur
python3 build.py
```

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems.

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur
    cd Nanosaur
    ```
1. Download [SDL3-3.2.8.dmg](https://libsdl.org/release/SDL3-3.2.8.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/Nanosaur.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/Nanosaur.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur
    cd Nanosaur
    ```
1. Download [SDL3-devel-3.2.8-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.8-VC.zip), extract it, and copy **SDL3-3.2.8** to the **extern** folder. Rename **SDL3-3.2.8** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/Nanosaur.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/Nanosaur.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 development library (e.g. "libsdl3-dev" on Ubuntu, "sdl3" on Arch, "SDL3-devel" on Fedora)
    - OpenGL development libraries (e.g. "libgl1-mesa-dev" on Ubuntu)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur
    cd Nanosaur
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/Nanosaur`. Enjoy!


## How to build the WebAssembly/browser version

This build runs Nanosaur in a web browser via WebAssembly. It is intended for use with level editors or for testing purposes.

**Play the live version:** https://lachlanbwwright.github.io/Nanosaur-android/

The WebAssembly build is automatically built and deployed to GitHub Pages whenever changes are pushed to the master branch.

### Prerequisites

- [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) — latest stable release
- Python 3, CMake 3.21+

### Using build.py (automated)

```
# Install and activate Emscripten
git clone https://github.com/emscripten-core/emsdk.git
./emsdk/emsdk install latest
./emsdk/emsdk activate latest
source ./emsdk/emsdk_env.sh

# Build
python3 build.py --wasm
```

This produces a `dist/Nanosaur-*-wasm.zip` archive containing the browser-ready files.

### Manual build

1. Build SDL3 for Emscripten:
    ```
    cd /tmp
    tar -xzf SDL3-3.2.8.tar.gz && cd SDL3-3.2.8
    mkdir build-em && cd build-em
    emcmake cmake -S .. -B . -DSDL_SHARED=OFF -DSDL_STATIC=ON -DSDL_TESTS=OFF
    emmake make -j4
    cmake --install . --prefix /tmp/sdl3-em-install
    ```

1. Configure and build Nanosaur:
    ```
    emcmake cmake -S . -B build-wasm \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SDL_FROM_SOURCE=OFF \
        -DSDL_STATIC=ON \
        -DSDL3_DIR=/tmp/sdl3-em-install/lib/cmake/SDL3
    emmake cmake --build build-wasm -j4
    ```

1. Serve the output files with a local HTTP server:
    ```
    cd build-wasm
    python3 -m http.server 8080
    ```
    Then open `http://localhost:8080/Nanosaur.html` in your browser.

### WebAssembly features

#### Level editor integration

The WebAssembly build always skips title screens and starts the game directly. You can use URL query parameters for level editor workflows:

| Parameter | Description |
|-----------|-------------|
| `level=N` | Load level N directly (currently only `0` is supported) |
| `skipMenu=1` | Skip title screens (redundant in WebAssembly — always on) |
| `terrainFile=path` | Override the terrain `.ter` file path |

Example: `index.html?level=0`

#### Desktop level editor integration

On desktop, you can also skip menus with command-line arguments:

```
./Nanosaur --skip-menu
./Nanosaur --level 0
./Nanosaur --terrain-file /path/to/custom.ter
```

#### JavaScript cheat/debug API

The WebAssembly build exports the following functions callable from JavaScript:

```javascript
// Fence (background wall) collisions
Module._SetFenceCollisionsEnabled(1);   // enable (default)
Module._SetFenceCollisionsEnabled(0);   // disable (player walks through walls)
Module._GetFenceCollisionsEnabled();    // returns 1 or 0

// Cheats
Module._CheatRestoreHealth();           // restore player health to full
Module._CheatFillFuel();                // fill jetpack fuel to max
Module._CheatGetWeapons();              // give all weapons
Module._CheatGetAllEggs();              // recover all eggs

// Queries
Module._GetGameScore();                 // returns current score as uint32

// Custom terrain (for level editor: write to Emscripten VFS first, then call)
FS.writeFile('/Data/Terrain/custom.ter', uint8ArrayData);  // load file into VFS
Module.ccall('SetCustomTerrainFile', null, ['string'], ['/Data/Terrain/custom.ter']);
Module._ClearCustomTerrainFile();       // revert to default terrain
```

These are also available via the built-in cheat menu on the game page.

## How to build the Android version

The Android build uses SDL3's Android project template. Currently the Android Gradle project is not yet set up in this repository, but the steps would be:

### Prerequisites

- Android Studio (or Android SDK command-line tools)
- Android NDK r27+
- Java 17+
- Gradle 8+

### Setup (one-time)

1. Download SDL3 source and copy the `android-project/` template to `android/` in this repo.
2. Configure the Gradle project to point to our CMakeLists.txt.
3. Copy game data to `android/app/src/main/assets/`.

See the SDL3 Android documentation at https://wiki.libsdl.org/SDL3/README-android for details.

### Build

Once the Android project is set up:
```
cd android
./gradlew assembleDebug     # debug APK
./gradlew assembleRelease   # release APK (requires signing config)
```

### CI/CD

The `.github/workflows/BuildAndroid.yml` workflow will build the Android APK when the `android/` project directory is present. Currently it is set to `workflow_dispatch` only (manual trigger) since the Android project is not yet configured.
