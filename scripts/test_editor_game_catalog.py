import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from build_editor_game_catalog import GAMES, build_catalog


class EditorGameCatalogTests(unittest.TestCase):
    def test_catalog_checksums_cover_only_all_compatible_runtimes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            native, output = root / "native", root / "output"
            for directory in (native, output):
                directory.mkdir()
            for game, port in GAMES:
                for directory, suffix in ((native, "linux.AppImage"), (native, "windows.zip"), (output, "mac.zip")):
                    (directory / f"{port}-{suffix}").write_bytes(game.encode())
            self.assertEqual(build_catalog(native, output, "v1", "source"), 0)
            manifest = json.loads((output / "pangea-games.json").read_text())
            self.assertEqual(len(manifest["assets"]), 24)
            self.assertEqual(manifest["tag"], "v1")
            self.assertEqual(manifest["sourceRevision"], "source")
            self.assertEqual(manifest["assetRootVersion"], 2)
            self.assertEqual(manifest["scriptContractVersion"], 2)
            self.assertEqual({asset["kind"] for asset in manifest["assets"]}, {"runtime"})
            self.assertEqual(
                {(asset["game"], asset["platform"]) for asset in manifest["assets"]},
                {(game, platform) for game, _ in GAMES for platform in ("linux", "win32", "darwin")},
            )
            for asset in manifest["assets"]:
                artifact = output / asset["filename"]
                if not artifact.exists():
                    artifact = native / asset["filename"]
                self.assertEqual(asset["sha256"], hashlib.sha256(artifact.read_bytes()).hexdigest())
                self.assertEqual(asset["size"], artifact.stat().st_size)
            self.assertFalse(list(output.glob("*-editor-assets.zip")))

    def test_missing_runtime_does_not_publish_a_catalog(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.assertEqual(build_catalog(root, root, "v1", "source"), 1)
            self.assertFalse((root / "pangea-games.json").exists())

    def test_empty_runtime_does_not_publish_a_catalog(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for game, port in GAMES:
                for suffix in ("linux.AppImage", "windows.zip", "mac.zip"):
                    (root / f"{port}-{suffix}").write_bytes(game.encode())
            (root / "MightyMike-Android-windows.zip").write_bytes(b"")
            self.assertEqual(build_catalog(root, root, "v1", "source"), 1)
            self.assertFalse((root / "pangea-games.json").exists())


if __name__ == "__main__":
    unittest.main()
