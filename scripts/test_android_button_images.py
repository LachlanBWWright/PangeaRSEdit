from pathlib import Path
import subprocess
import tempfile
import unittest

from PIL import Image, ImageDraw


SCRIPT = Path(__file__).with_name("android_button_images.py")


class AndroidButtonImagesTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.path = Path(temporary.name) / "game.png"

    def run_processor(self):
        return subprocess.run(
            ["python3", str(SCRIPT), str(self.path)],
            capture_output=True, text=True, check=False,
        )

    def test_crops_keep_actual_pixels_from_control_regions(self):
        image = Image.new("RGB", (960, 540), "navy")
        draw = ImageDraw.Draw(image)
        draw.rectangle((600, 300, 940, 520), fill="white")
        draw.rectangle((680, 20, 900, 100), fill="cyan")
        draw.rectangle((680, 180, 900, 210), fill="orange")
        image.save(self.path)
        result = self.run_processor()
        self.assertEqual(result.returncode, 0, result.stderr)
        with Image.open(self.path.with_name("game-buttons.png")) as buttons:
            self.assertEqual(buttons.size, (960, 270))
            self.assertEqual(buttons.getpixel((700, 100)), (255, 255, 255))
        with Image.open(self.path.with_name("game-utility.png")) as utility:
            self.assertEqual(utility.size, (320, 216))
            self.assertEqual(utility.getpixel((50, 50)), (0, 255, 255))
            self.assertEqual(utility.getpixel((50, 200)), (255, 165, 0))
        with Image.open(self.path.with_name("game-actions.png")) as actions:
            self.assertEqual(actions.size, (384, 270))
            self.assertEqual(actions.getpixel((124, 100)), (255, 255, 255))

    def test_blank_capture_is_rejected(self):
        Image.new("RGB", (960, 540), "black").save(self.path)
        result = self.run_processor()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("blank", result.stderr)
        self.assertFalse(self.path.with_name("game-buttons.png").exists())

    def test_portrait_capture_is_rejected(self):
        Image.new("RGB", (540, 960), "navy").save(self.path)
        result = self.run_processor()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("landscape", result.stderr)

    def test_corrupt_capture_is_rejected_without_traceback(self):
        self.path.write_bytes(b"adb did not return an image")
        result = self.run_processor()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Cannot read screenshot", result.stderr)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
