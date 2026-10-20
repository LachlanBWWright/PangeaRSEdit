import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from PIL import Image, ImageDraw


SCRIPT = Path(__file__).with_name("capture-android-buttons.sh")
FAKE_ADB = """#!/usr/bin/env bash
case "$*" in
  'shell pidof '*) [[ "$CAPTURE_TEST_STATE" != crashed ]] ;;
  'shell dumpsys activity activities')
    if [[ "$CAPTURE_TEST_STATE" == background ]]; then
      echo 'topResumedActivity: launcher'
    else
      echo 'topResumedActivity: io.jor.bugdom2/io.pangea.screenshots.ScreenshotActivity'
    fi ;;
  'logcat -d -s SDL/APP:V')
    if [[ "$CAPTURE_TEST_STATE" == alert ]]; then echo 'Game Fatal Alert: missing assets'; fi
    if [[ "$CAPTURE_TEST_STATE" == controls-ready ]]; then
      echo 'production controls renderer ready'
    fi ;;
  'logcat -d') echo 'diagnostic log' ;;
  'exec-out screencap -p') cat "$CAPTURE_TEST_IMAGE" ;;
esac
"""


class AndroidButtonCaptureTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.adb = self.root / "fake-adb"
        self.adb.write_text(FAKE_ADB)
        self.adb.chmod(0o755)
        self.apk = self.root / "game.apk"
        self.apk.write_bytes(b"test APK identity")
        self.image = self.root / "screen.png"
        image = Image.new("RGB", (960, 540), "navy")
        ImageDraw.Draw(image).rectangle((650, 350, 800, 480), fill="white")
        image.save(self.image)
        self.output = self.root / "screenshots"

    def capture(self, state, ports_root=None):
        environment = dict(os.environ)
        environment.update({
            "ANDROID_SERIAL": "emulator-5554", "ADB_BIN": str(self.adb),
            "CAPTURE_TEST_STATE": state, "CAPTURE_TEST_IMAGE": str(self.image),
        })
        arguments = ["bash", str(SCRIPT), "Bugdom2-Android", str(self.apk), str(self.output), "0"]
        if ports_root is not None:
            arguments.append(str(ports_root))
        return subprocess.run(
            arguments,
            env=environment, capture_output=True, text=True, check=False,
        )

    def test_success_keeps_screen_crops_and_build_identity(self):
        result = self.capture("running")
        self.assertEqual(result.returncode, 0, result.stderr)
        for suffix in (".png", "-buttons.png", "-actions.png", "-utility.png", "-apk.sha256", "-capture.txt"):
            self.assertTrue((self.output / f"Bugdom2-Android{suffix}").is_file())

    def test_crash_alert_and_background_do_not_publish_screenshots(self):
        for state in ("crashed", "alert", "background"):
            with self.subTest(state=state):
                self.output.mkdir(exist_ok=True)
                stale = self.output / "Bugdom2-Android.png"
                stale.write_bytes(b"stale screenshot from an earlier run")
                result = self.capture(state)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(stale.exists())
                log = self.output / "Bugdom2-Android-logcat.txt"
                self.assertIn("diagnostic log", log.read_text())

    def test_controls_preview_requires_renderer_readiness(self):
        source = self.root / "ports/games/Bugdom2-Android/Source/System/Input.c"
        source.parent.mkdir(parents=True)
        source.write_text('static const TouchControlButton kTouchButtons[] = { {"Jump", 1}, {"Cam L", 2} };')
        ports = self.root / "ports"
        failed = self.capture("running", ports)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn("did not become ready", failed.stderr)
        ready = self.capture("controls-ready", ports)
        self.assertEqual(ready.returncode, 0, ready.stderr)
        metadata = (self.output / "Bugdom2-Android-capture.txt").read_text()
        self.assertIn("arguments=gles,Jump,Cam L", metadata)
        self.assertIn("mode=controls-preview", metadata)


if __name__ == "__main__":
    unittest.main()
