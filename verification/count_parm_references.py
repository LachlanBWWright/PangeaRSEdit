#!/usr/bin/env python3
"""
Count `parm[` references in game source trees.

Usage:
  python verification/count_parm_references.py
  python verification/count_parm_references.py --root /path/to/repo
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


GAME_DIRS = {
    "ottomatic": "games/ottomatic",
    "bugdom": "games/bugdom",
    "bugdom2": "games/bugdom2",
    "nanosaur": "games/nanosaur",
    "nanosaur2": "games/nanosaur2",
    "cromagrally": "games/cromagrally",
    "billyfrontier": "games/billyfrontier",
    "mightymike": "games/mightymike",
}

SOURCE_EXTENSIONS = {".c", ".h", ".cpp", ".hpp", ".mm", ".m"}


def count_game_parm_references(repo_root: Path, relative_dir: str) -> tuple[int, dict[str, int]]:
    game_root = repo_root / relative_dir
    if not game_root.exists():
        return 0, {}

    counts: dict[str, int] = {}
    total = 0
    for file_path in sorted(game_root.rglob("*")):
        if not file_path.is_file() or file_path.suffix.lower() not in SOURCE_EXTENSIONS:
            continue
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        matches = text.count("parm[")
        if matches > 0:
            rel_path = str(file_path.relative_to(repo_root))
            counts[rel_path] = matches
            total += matches
    return total, counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repository root path",
    )
    args = parser.parse_args()
    repo_root = Path(args.root).resolve()

    report: dict[str, object] = {"root": str(repo_root), "games": {}}
    for game_name, game_dir in GAME_DIRS.items():
        total, by_file = count_game_parm_references(repo_root, game_dir)
        report["games"][game_name] = {
            "totalParmReferences": total,
            "filesWithReferences": by_file,
        }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
