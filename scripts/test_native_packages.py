import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts/validate-native-packages.sh"
SUFFIXES = ("linux.AppImage", "mac.dmg", "windows.zip", "android.apk")


class NativePackagesTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.packages = self.root / "release packages"
        self.packages.mkdir()
        matrix = subprocess.run(
            ["python3", str(ROOT / "games/pangea-ports/scripts/ports.py"),
             "matrix", "native"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(matrix.returncode, 0, matrix.stderr)
        self.games = json.loads(matrix.stdout)["include"]
        self.assertEqual(len(self.games), 8)
        for game in self.games:
            for suffix in SUFFIXES:
                (self.packages / f"{game['name']}-{suffix}").write_bytes(b"package")

    def validate(self, *arguments):
        return subprocess.run(
            ["bash", str(VALIDATOR), str(self.packages), *map(str, arguments)],
            capture_output=True, text=True, check=False, cwd=self.root,
        )

    def test_stages_every_game_and_platform_with_download_filenames(self):
        downloads = self.root / "site downloads"
        result = self.validate(downloads)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(list(downloads.glob("*/*"))), 32)
        for game in self.games:
            for suffix in SUFFIXES:
                package = downloads / game["name"] / f"{game['name']}-{suffix}"
                self.assertEqual(package.read_bytes(), b"package")

    def test_missing_platform_blocks_publication_before_staging(self):
        for suffix in SUFFIXES:
            with self.subTest(suffix=suffix):
                package = self.packages / f"{self.games[0]['name']}-{suffix}"
                package.unlink()
                downloads = self.root / "downloads"
                result = self.validate(downloads)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(package.name, result.stderr)
                self.assertFalse(downloads.exists())
                package.write_bytes(b"package")

    def test_empty_package_blocks_publication(self):
        package = next(self.packages.iterdir())
        package.write_bytes(b"")
        result = self.validate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(package.name, result.stderr)

    def test_unexpected_artifacts_block_publication(self):
        (self.packages / "unexpected-wasm.zip").write_bytes(b"wasm")
        result = self.validate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("exactly 32", result.stderr)


if __name__ == "__main__":
    unittest.main()
