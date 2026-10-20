"""Validate an Android landscape screenshot and crop the actual control regions."""

import argparse
from pathlib import Path
import sys

from PIL import Image


def process_screenshot(path: Path) -> int:
    with Image.open(path) as screenshot:
        screenshot.load()
        width, height = screenshot.size
        if width <= height or height < 240:
            print(f"Expected landscape gameplay, got {width}x{height}: {path}", file=sys.stderr)
            return 1
        extrema = screenshot.convert("RGB").getextrema()
        if all(high - low < 12 for low, high in extrema):
            print(f"Blank or nearly blank screenshot: {path}", file=sys.stderr)
            return 1
        screenshot.crop((0, height // 2, width, height)).save(
            path.with_name(f"{path.stem}-buttons.png")
        )
        screenshot.crop((width * 3 // 5, height // 2, width, height)).save(
            path.with_name(f"{path.stem}-actions.png")
        )
        screenshot.crop((width * 2 // 3, 0, width, height * 2 // 5)).save(
            path.with_name(f"{path.stem}-utility.png")
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("screenshot", type=Path)
    path = parser.parse_args().screenshot
    try:
        return process_screenshot(path)
    except (OSError, ValueError) as error:
        print(f"Cannot read screenshot {path}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
