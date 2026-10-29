"""Publish a compatible native-runtime checksum catalog alongside game releases."""
import hashlib
import json
import os
from pathlib import Path
import sys

GAMES = [
    ("OttoMatic", "OttoMatic-Android"),
    ("Bugdom", "Bugdom-android"),
    ("Bugdom2", "Bugdom2-Android"),
    ("Nanosaur", "Nanosaur-android"),
    ("Nanosaur2", "Nanosaur2-Android"),
    ("CroMagRally", "CroMagRally-Android"),
    ("BillyFrontier", "BillyFrontier-Android"),
    ("MightyMike", "MightyMike-Android"),
]


def describe(game: str, filename: Path, platform: str, arch: str, kind: str, archive_format: str) -> dict:
    digest = hashlib.sha256()
    with filename.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return {"game": game, "filename": filename.name, "platform": platform,
            "arch": arch, "kind": kind, "format": archive_format,
            "size": filename.stat().st_size, "sha256": digest.hexdigest()}


def build_catalog(native: Path, output: Path, tag: str, revision: str) -> int:
    assets = []
    for game, port in GAMES:
        for directory, suffix in [(native, "linux.AppImage"), (native, "windows.zip"), (output, "mac.zip")]:
            artifact = directory / f"{port}-{suffix}"
            if not artifact.is_file() or artifact.stat().st_size == 0:
                print(f"Missing required game package: {artifact}", file=sys.stderr)
                return 1
    for game, port in GAMES:
        for directory, suffix, platform, arch, archive_format in [
            (native, "linux.AppImage", "linux", "x64", "appimage"),
            (native, "windows.zip", "win32", "x64", "zip"),
            (output, "mac.zip", "darwin", "universal", "zip"),
        ]:
            assets.append(describe(game, directory / f"{port}-{suffix}", platform, arch, "runtime", archive_format))
    manifest = {"version": 1, "tag": tag, "sourceRevision": revision,
                "assetRootVersion": 2, "scriptContractVersion": 2, "assets": assets}
    (output / "pangea-games.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return 0


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: build_editor_game_catalog.py NATIVE_DIR OUTPUT_DIR", file=sys.stderr)
        return 2
    try:
        return build_catalog(Path(sys.argv[1]), Path(sys.argv[2]),
                             os.environ.get("RELEASE_TAG", "development"), os.environ.get("GITHUB_SHA", "development"))
    except OSError as error:
        print(f"Could not create game catalog: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
