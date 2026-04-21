# How to build Nanosaur 2

## The easy way: build.py (automated build script)

`build.py` can produce a game executable from a fresh clone of the repo in a single command. It will work on macOS, Windows and Linux, provided that your system has Python 3, CMake, and an adequate C++ compiler.

```
git clone --recurse-submodules https://github.com/jorio/Nanosaur2
cd Nanosaur2
python3 build.py
```

If you want to build the game **manually** instead, the rest of this document describes how to do just that on each of the big 3 desktop operating systems.

## How to build the game manually on macOS

1. Install the prerequisites:
    - Xcode (preferably the latest version)
    - [CMake](https://formulae.brew.sh/formula/cmake) 3.21+ (installing via Homebrew is recommended)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur2
    cd Nanosaur2
    ```
1. Download [SDL3-3.2.8.dmg](https://libsdl.org/release/SDL3-3.2.8.dmg), open it, then browse to SDL3.xcframework/macos-arm64_x86_64. In that folder, copy **SDL3.framework** to the game's **extern** folder.
1. Prep the Xcode project:
    ```
    cmake -G Xcode -S . -B build
    ```
1. Now you can open `build/Nanosaur2.xcodeproj` in Xcode, or you can just go ahead and build the game:
    ```
    cmake --build build --config RelWithDebInfo
    ```
1. The game gets built in `build/RelWithDebInfo/Nanosaur2.app`. Enjoy!

## How to build the game manually on Windows

1. Install the prerequisites:
    - Visual Studio 2022 with the C++ toolchain
    - [CMake](https://cmake.org/download/) 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur2
    cd Nanosaur2
    ```
1. Download [SDL3-devel-3.2.8-VC.zip](https://libsdl.org/release/SDL3-devel-3.2.8-VC.zip), extract it, and copy **SDL3-3.2.8** to the **extern** folder. Rename **SDL3-3.2.8** to just **SDL3**.
1. Prep the Visual Studio solution:
    ```
    cmake -G "Visual Studio 17 2022" -A x64 -S . -B build
    ```
1. Now you can open `build/Nanosaur2.sln` in Visual Studio, or you can just go ahead and build the game:
    ```
    cmake --build build --config Release
    ```
1. The game gets built in `build/Release/Nanosaur2.exe`. Enjoy!

## How to build the game manually on Linux et al.

1. Install the prerequisites from your package manager:
    - Any C++20 compiler
    - CMake 3.21+
    - SDL3 development library (e.g. "libsdl3-dev" on Ubuntu, "sdl3" on Arch, "SDL3-devel" on Fedora)
    - OpenGL development libraries (e.g. "libgl1-mesa-dev" on Ubuntu)
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur2
    cd Nanosaur2
    ```
1. Build the game:
    ```
    cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
    cmake --build build
    ```
    If you'd like to enable runtime sanitizers, append `-DSANITIZE=1` to the **first** `cmake` call above.
1. The game gets built in `build/Nanosaur2`. Enjoy!

## How to build the WebAssembly version

### The easy way: build.py

Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html), activate it, and run:

```
python3 build.py --wasm
```

The WASM bundle will be produced in `dist/Nanosaur2-<version>-wasm.zip`. Extract and serve from a web server.

### Manual build

1. Install the prerequisites:
    - [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) and activate it
    - CMake 3.21+
1. Clone the repo **recursively**:
    ```
    git clone --recurse-submodules https://github.com/jorio/Nanosaur2
    cd Nanosaur2
    ```
1. Build SDL3 for Emscripten and the game:
    ```
    python3 build.py --wasm --dependencies
    python3 build.py --wasm --configure
    python3 build.py --wasm --build
    ```
1. The output is `build-wasm/Nanosaur2.html` (plus `.js`, `.wasm`, `.data`). Serve these files from a web server to play.

## GitHub Pages (live WASM demo)

The CI/CD pipeline automatically builds and deploys the WebAssembly version to GitHub Pages whenever a commit is pushed to the `master` branch. The workflow is defined in `.github/workflows/gh-pages.yml`.

To enable GitHub Pages in your fork:
1. Go to **Settings → Pages** in your repository.
2. Set **Source** to **GitHub Actions**.
3. Push a commit to `master` — the `Deploy WebAssembly to GitHub Pages` workflow will run and your game will be live at `https://<your-username>.github.io/<repo-name>/`.

The deployed page provides:
- A loading screen with progress indicator
- The game canvas (WebGL)
- Fullscreen and mute controls
- URL-param support: `?level=N` to skip to a specific level
