"""Publish optional editor assets and a checksum catalog alongside native releases."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import zipfile

GAMES = [
    ("OttoMatic", "OttoMatic-Android", "ottoMatic", "ottomatic", "otto-matic", "OttoMatic"),
    ("Bugdom", "Bugdom-android", "bugdom", "bugdom1", "bugdom", "Bugdom1"),
    ("Bugdom2", "Bugdom2-Android", "bugdom2", "bugdom2", "bugdom-2", "Bugdom2"),
    ("Nanosaur", "Nanosaur-android", "nanosaur", "nanosaur1", "nanosaur", "Nanosaur1"),
    ("Nanosaur2", "Nanosaur2-Android", "nanosaur2", "nanosaur2", "nanosaur-2", "Nanosaur2"),
    ("CroMagRally", "CroMagRally-Android", "croMag", "cromagrally", "cro-mag-rally", "CroMag"),
    ("BillyFrontier", "BillyFrontier-Android", "billyFrontier", "billyfrontier", "billy-frontier", "BillyFrontier"),
    ("MightyMike", "MightyMike-Android", "mightyMike", "mightymike", "mighty-mike", "MightyMike"),
]


def describe(game: str, filename: Path, platform: str, arch: str, kind: str, archive_format: str) -> dict:
    digest = hashlib.sha256()
    with filename.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return {"game": game, "filename": filename.name, "platform": platform,
            "arch": arch, "kind": kind, "format": archive_format,
            "size": filename.stat().st_size, "sha256": digest.hexdigest()}


def animation_sounds(repo: Path) -> list[tuple[Path, str]]:
    source = repo / "frontend/src/components/AnimationViewer/animationSoundAssets.ts"
    paths = sorted(set(re.findall(r'"(games/[^"\n]+/Data/Audio/[^"\n]+)"', source.read_text(encoding="utf-8"))))
    return [(repo / "games/pangea-ports" / item, f"generated/pangea-ports/audio/{item}") for item in paths]


def build_catalog(public: Path, native: Path, output: Path, tag: str, revision: str,
                  sounds: list[tuple[Path, str]] | None = None) -> int:
    assets = []
    for game, port, *_ in GAMES:
        for directory, suffix in [(native, "linux.AppImage"), (native, "windows.zip"), (output, "mac.zip")]:
            artifact = directory / f"{port}-{suffix}"
            if not artifact.is_file() or artifact.stat().st_size == 0:
                print(f"Missing required game package: {artifact}", file=sys.stderr)
                return 1
    for game, port, asset_dir, game_dir, screenshot_dir, model in GAMES:
        archive = output / f"{port}-editor-assets.zip"
        sources = [public / "assets" / asset_dir, public / "assets" / "liquids",
                   public / "games" / game_dir, public / "item-screenshots" / screenshot_dir,
                   public / "glbModels" / f"{model}.glb"]
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zipped:
            for source in sources:
                paths = sorted(source.rglob("*")) if source.is_dir() else [source]
                for item in paths:
                    if item.is_file() and not item.is_symlink() and not any(part.startswith(".") for part in item.relative_to(public).parts):
                        zipped.write(item, item.relative_to(public).as_posix())
            for source, destination in sounds or []:
                if destination.startswith(f"generated/pangea-ports/audio/games/{port}/"):
                    zipped.write(source, destination)
        assets.append(describe(game, archive, "web", "wasm", "editor-assets", "zip"))
        for directory, suffix, platform, arch, archive_format in [
            (native, "linux.AppImage", "linux", "x64", "appimage"),
            (native, "windows.zip", "win32", "x64", "zip"),
            (output, "mac.zip", "darwin", "universal", "zip"),
        ]:
            assets.append(describe(game, directory / f"{port}-{suffix}", platform, arch, "runtime", archive_format))
    manifest = {"version": 1, "tag": tag, "sourceRevision": revision,
                "assetRootVersion": 1, "scriptContractVersion": 1, "assets": assets}
    (output / "pangea-games.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return 0


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: build_editor_game_catalog.py PUBLIC_DIR NATIVE_DIR OUTPUT_DIR", file=sys.stderr)
        return 2
    try:
        return build_catalog(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]),
                             os.environ.get("RELEASE_TAG", "development"), os.environ.get("GITHUB_SHA", "development"),
                             animation_sounds(Path(__file__).resolve().parent.parent))
    except (OSError, zipfile.BadZipFile) as error:
        print(f"Could not create game catalog: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
