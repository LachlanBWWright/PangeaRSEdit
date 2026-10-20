import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from build_editor_game_catalog import GAMES, build_catalog


class EditorGameCatalogTests(unittest.TestCase):
    def test_catalog_checksums_cover_runtime_and_optional_asset_packs(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            public, native, output = root / "public", root / "native", root / "output"
            for directory in (public, native, output):
                directory.mkdir()
            for game, port, asset_dir, *_ in GAMES:
                source = public / "assets" / asset_dir
                source.mkdir(parents=True)
                (source / "sample.bin").write_bytes(b"editor asset")
                for directory, suffix in ((native, "linux.AppImage"), (native, "windows.zip"), (output, "mac.zip")):
                    (directory / f"{port}-{suffix}").write_bytes(game.encode())
            sound = root / "Footstep.aiff"
            sound.write_bytes(b"animation audio")
            sound_path = "generated/pangea-ports/audio/games/OttoMatic-Android/Data/Audio/Main.sounds/Footstep.aiff"
            self.assertEqual(build_catalog(public, native, output, "v1", "source", [(sound, sound_path)]), 0)
            manifest = json.loads((output / "pangea-games.json").read_text())
            self.assertEqual(len(manifest["assets"]), 32)
            for asset in manifest["assets"]:
                artifact = output / asset["filename"]
                if not artifact.exists():
                    artifact = native / asset["filename"]
                self.assertEqual(asset["sha256"], hashlib.sha256(artifact.read_bytes()).hexdigest())
                self.assertEqual(asset["size"], artifact.stat().st_size)
            with zipfile.ZipFile(output / "OttoMatic-Android-editor-assets.zip") as archive:
                self.assertIn("assets/ottoMatic/sample.bin", archive.namelist())
                self.assertEqual(archive.read(sound_path), b"animation audio")
                self.assertFalse(any("wasm" in name for name in archive.namelist()))

    def test_missing_runtime_does_not_publish_a_catalog(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.assertEqual(build_catalog(root, root, root, "v1", "source"), 1)
            self.assertFalse((root / "pangea-games.json").exists())


if __name__ == "__main__":
    unittest.main()
