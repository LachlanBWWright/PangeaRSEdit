"""Read the button labels from a port's production C input profile."""

import argparse
from pathlib import Path
import re
import sys


def read_profile(root: Path, game: str) -> int:
    if not re.fullmatch(r"[A-Za-z0-9-]+", game):
        print("Invalid game directory name", file=sys.stderr)
        return 1
    candidates = ("Source/System/Input.c", "src/System/Input.c", "src/Heart/Input.c")
    for relative in candidates:
        path = root / "games" / game / relative
        if not path.is_file():
            continue
        source = path.read_text()
        profile = re.search(
            r"static const TouchControlButton kTouchButtons\[\]\s*=\s*\{(.*?)\};",
            source, re.DOTALL,
        )
        if profile is None:
            continue
        labels = re.findall(r'\{\s*"([^"]+)"\s*,', profile.group(1))
        if not 1 <= len(labels) <= 8 or not all(re.fullmatch(r"[A-Za-z ]+", label) for label in labels):
            print(f"Invalid touch profile in {path}", file=sys.stderr)
            return 1
        renderer = "sdl" if game == "MightyMike-Android" else "gles"
        print(",".join((renderer, *labels)))
        return 0
    print(f"No production touch-button profile found for {game}", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ports_root", type=Path)
    parser.add_argument("game")
    args = parser.parse_args()
    try:
        return read_profile(args.ports_root, args.game)
    except OSError as error:
        print(f"Cannot read production touch profile: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
