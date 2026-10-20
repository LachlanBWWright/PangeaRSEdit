from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class AndroidTouchLayoutTest(unittest.TestCase):
    def test_native_targets_stay_safe_and_do_not_overlap_across_screen_sizes(self):
        with tempfile.TemporaryDirectory() as temporary:
            executable = Path(temporary) / "touch-layout"
            compile_result = subprocess.run(
                ["cc", "-std=c11", "-Wall", "-Wextra", "-Werror",
                 "-I" + str(ROOT / "games/pangea-ports/shared/android"),
                 str(ROOT / "scripts/android-screenshot-harness/tests/touch-layout.c"),
                 "-o", str(executable)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(compile_result.returncode, 0, compile_result.stderr)
            result = subprocess.run([str(executable)], capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
