# How to build Bugdom 2

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/Bugdom2
cd Bugdom2
python3 build.py
```

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems.

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Bugdom2
    cd Bugdom2
    ```
1. Download [SDL3-3.2.8.dmg](https://libsdl.org/release/SDL3-3.2.8.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/Bugdom2.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/Bugdom2.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Bugdom2
    cd Bugdom2
    ```
1. Download [SDL3-devel-3.2.8-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.8-VC.zip), extract it, and copy **SDL3-3.2.8** to the **extern** folder. Rename **SDL3-3.2.8** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/Bugdom2.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/Bugdom2.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 development library (e.g. "libsdl3-dev" on Ubuntu, "sdl3" on Arch, "SDL3-devel" on Fedora)
    - OpenGL development libraries (e.g. "libgl1-mesa-dev" on Ubuntu)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Bugdom2
    cd Bugdom2
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/Bugdom2`. Enjoy!

## How to build for WebAssembly (Emscripten)

1. Install the prerequisites:
    - [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (emsdk)
    - CMake 3.21+
    - Python 3

1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/LachlanBWWright/Bugdom2-Android
    cd Bugdom2-Android
    ```

1. Activate the Emscripten SDK:
    ```
    # Replace with your actual emsdk path
    source ~/emsdk/emsdk_env.sh
    ```

1. Build the game using `build.py`:
    ```
    python3 build.py --emscripten
    ```
    This will:
    - Download and build SDL3 from source using Emscripten
    - Configure and build the WASM bundle
    - Package it into `dist/Bugdom2-X.Y.Z-wasm.zip`

1. The WASM output (`Bugdom2.html`, `Bugdom2.js`, `Bugdom2.wasm`, `Bugdom2.data`) will be in `build/`.

    To test locally (a web server is required — browsers block WASM loading from `file://`):
    ```
    cd build
    python3 -m http.server 8080
    # Then open http://localhost:8080/Bugdom2.html
    ```

### WebAssembly level editor features

When running in the browser, the game supports these developer/editor features:

- **Jump to level**: Add `?level=N` (0–9) to the URL to skip menus and load a specific level directly.  
  Example: `http://localhost:8080/Bugdom2.html?level=3`

- **Level file override**: Before the level loads, write custom files into the virtual filesystem from JavaScript:
  ```javascript
  // Override a terrain file
  fetch('my_custom_level.ter')
    .then(r => r.arrayBuffer())
    .then(buf => Module.FS.writeFile('Data/Terrain/Level1_Garden.ter', new Uint8Array(buf)));
  ```

- **JavaScript cheat API**: The following functions are exported to JavaScript for testing/debugging:
  ```javascript
  // Disable fence collision (walk through fences)
  Module.ccall('SetFenceCollisionEnabled', null, ['number'], [0]);

  // Re-enable fence collision
  Module.ccall('SetFenceCollisionEnabled', null, ['number'], [1]);

  // Query fence collision state (returns 1=enabled, 0=disabled)
  Module.ccall('GetFenceCollisionEnabled', 'number', [], []);

  // Set the level to start at (before the game loads)
  Module.ccall('SetStartLevel', null, ['number'], [5]);

  // Player helper functions (while in-game)
  Module.ccall('SetPlayerHealth', null, ['number'], [1.0]);  // full health (0.0–1.0)
  Module.ccall('SetPlayerLives',  null, ['number'], [9]);    // set lives count
  Module.ccall('FullHeal',        null, [], []);               // max health + lives + map
  Module.ccall('WinLevel',        null, [], []);               // immediately complete the level
  ```

### Desktop level editor features

The same level-jump feature is available on desktop via command-line arguments:

```
# Jump to level 3 (Fido level) directly
./Bugdom2 --level 3

# Jump to level 0 with custom level files from a directory
# Files in the override dir replace matching files in Data/ by name
./Bugdom2 --level 0 --level-override-dir /path/to/my/custom/levels/
```
