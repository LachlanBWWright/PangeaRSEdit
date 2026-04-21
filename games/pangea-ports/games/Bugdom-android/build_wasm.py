#!/usr/bin/env python3
"""
WebAssembly/Emscripten build script for Bugdom.

Usage:
  python3 build_wasm.py [--dependencies] [--configure] [--build] [--package]
  python3 build_wasm.py --print-artifact-name

Steps:
  --dependencies  Download SDL3 source (for Emscripten build)
  --configure     Configure CMake with emcmake
  --build         Build with emmake
  --package       Package output files into dist-wasm/

Requires Emscripten SDK to be installed and activated (emsdk_env.sh sourced).
"""

import argparse
import contextlib
import hashlib
import os
import os.path
import re
import shutil
import subprocess
import sys
import urllib.request

def parse_metadata(version_dot_h):
    metadata = {}
    with open(version_dot_h) as f:
        for line in f.readlines():
            line = line.strip()
            match = re.match(r"#define\s+([A-Z_]+)\s+(.+)", line)
            if not match:
                continue
            key = match[1]
            value = match[2].removeprefix('"').removesuffix('"')
            metadata[key] = value
    return metadata

root_dir    = os.path.dirname(os.path.abspath(__file__))
src_dir     = os.path.join(root_dir, "src")
libs_dir    = os.path.join(root_dir, "extern")
dist_dir    = os.path.join(root_dir, "dist-wasm")
build_dir   = os.path.join(root_dir, "build-wasm")

game_metadata    = parse_metadata(os.path.join(src_dir, "Headers", "version.h"))
game_name        = game_metadata["GAME_NAME"]
game_ver         = game_metadata["GAME_VERSION"]

sdl_ver          = "3.2.8"
sdl_source_dir   = os.path.join(libs_dir, f"SDL3-{sdl_ver}")
sdl_build_dir    = os.path.join(sdl_source_dir, "build-wasm")
sdl_install_dir  = os.path.join(sdl_source_dir, "install-wasm")

sdl_tarball_hash = "13388fabb361de768ecdf2b65e52bb27d1054cae6ccb6942ba926e378e00db03"

import tempfile
cache_dir = os.path.join(tempfile.gettempdir(), "pangea-games-build-cache")

parser = argparse.ArgumentParser(description=f"Build {game_name} {game_ver} for WebAssembly")
parser.add_argument("--dependencies", action="store_true", help="Download and build SDL3 for Emscripten")
parser.add_argument("--configure",    action="store_true", help="Configure with emcmake")
parser.add_argument("--build",        action="store_true", help="Build with emmake")
parser.add_argument("--package",      action="store_true", help="Copy artifacts to dist-wasm/")
parser.add_argument("--print-artifact-name", action="store_true", help="Print artifact name and exit")
args = parser.parse_args()

def die(msg):
    print(f"\x1b[1;31m{msg}\x1b[0m", file=sys.stderr)
    sys.exit(1)

def log(msg):
    print(msg, file=sys.stderr)

def call(cmd, **kwargs):
    log("> " + " ".join(cmd))
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        die(f"Command failed: {' '.join(cmd)}")
    return result

def hash_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(64*1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def get_artifact_name():
    return f"{game_name}-{game_ver}-wasm.zip"

if args.print_artifact_name:
    print(get_artifact_name())
    sys.exit(0)

if not (args.dependencies or args.configure or args.build or args.package):
    log("No build steps specified, running all of them.")
    args.dependencies = True
    args.configure = True
    args.build = True
    args.package = True

os.chdir(root_dir)

# ---- STEP 1: Dependencies ----
if args.dependencies:
    log("*** Setting up SDL3 for Emscripten ***")

    # Check submodules
    if not os.path.exists("extern/Pomme/CMakeLists.txt"):
        die("Submodules appear to be missing. Run: git submodule update --init --recursive")

    # Download SDL3 source if not present
    sdl_tarball_name = f"SDL3-{sdl_ver}.tar.gz"
    sdl_tarball_path = os.path.join(cache_dir, sdl_tarball_name)

    if not os.path.exists(sdl_tarball_path):
        url = f"https://libsdl.org/release/{sdl_tarball_name}"
        log(f"Downloading SDL3 source: {url}")
        os.makedirs(cache_dir, exist_ok=True)
        urllib.request.urlretrieve(url, sdl_tarball_path)

    actual_hash = hash_file(sdl_tarball_path)
    if actual_hash != sdl_tarball_hash:
        die(f"SDL3 tarball hash mismatch: expected {sdl_tarball_hash}, got {actual_hash}")

    if not os.path.exists(sdl_source_dir):
        log(f"Extracting SDL3 source to {sdl_source_dir}")
        shutil.unpack_archive(sdl_tarball_path, libs_dir)

    # Build SDL3 with Emscripten
    if not os.path.exists(os.path.join(sdl_install_dir, "lib", "libSDL3.a")):
        os.makedirs(sdl_build_dir, exist_ok=True)
        call(["emcmake", "cmake", "-S", sdl_source_dir, "-B", sdl_build_dir,
              "-DCMAKE_BUILD_TYPE=Release",
              f"-DCMAKE_INSTALL_PREFIX={sdl_install_dir}",
              "-DSDL_TESTS=OFF",
              "-DSDL_EXAMPLES=OFF"])
        call(["emmake", "make", "-C", sdl_build_dir, "-j4"])
        call(["cmake", "--install", sdl_build_dir])
        log("SDL3 for Emscripten built and installed.")
    else:
        log("SDL3 for Emscripten already built, skipping.")

# ---- STEP 2: Configure ----
if args.configure:
    log("*** Configuring Bugdom for Emscripten ***")

    # Locate SDL3 CMake config directory
    sdl3_cmake_dir = None
    for candidate in [
        os.path.join(sdl_install_dir, "lib", "cmake", "SDL3"),
        os.path.join(sdl_install_dir, "share", "cmake", "SDL3"),
    ]:
        if os.path.exists(candidate):
            sdl3_cmake_dir = candidate
            break
    if not sdl3_cmake_dir:
        die(f"Couldn't find SDL3 CMake config in {sdl_install_dir}. Run --dependencies first.")

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir, exist_ok=True)

    call(["emcmake", "cmake", "-S", ".", "-B", build_dir,
          "-DCMAKE_BUILD_TYPE=Release",
          f"-DSDL3_DIR={sdl3_cmake_dir}"])

# ---- STEP 3: Build ----
if args.build:
    log("*** Building Bugdom for Emscripten ***")
    call(["emmake", "make", "-C", build_dir, "-j4"])

# ---- STEP 4: Package ----
if args.package:
    log("*** Packaging Bugdom WebAssembly build ***")

    os.makedirs(dist_dir, exist_ok=True)

    # Copy the output files
    output_files = []
    for ext in [".html", ".js", ".wasm", ".data"]:
        src = os.path.join(build_dir, f"{game_name}{ext}")
        if os.path.exists(src):
            dst = os.path.join(dist_dir, f"{game_name}{ext}")
            shutil.copy2(src, dst)
            output_files.append(dst)
            log(f"Copied: {dst}")
        else:
            log(f"Warning: expected output file not found: {src}")

    # Create index.html redirect to the game
    index_html = os.path.join(dist_dir, "index.html")
    if not os.path.exists(index_html):
        with open(index_html, 'w') as f:
            f.write(f'<!DOCTYPE html><html><head>'
                    f'<meta http-equiv="refresh" content="0;url={game_name}.html">'
                    f'</head><body>Redirecting to <a href="{game_name}.html">{game_name}</a>...</body></html>\n')

    # Create zip artifact
    import zipfile
    artifact_path = os.path.join(dist_dir, get_artifact_name())
    with zipfile.ZipFile(artifact_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for f in output_files:
            zf.write(f, os.path.basename(f))
        if os.path.exists(index_html):
            zf.write(index_html, "index.html")
    log(f"Packaged: {artifact_path}")
