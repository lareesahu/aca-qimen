#!/usr/bin/env python3
"""Rebuild the self-hosted font subsets from the actual page sources.

Run this after ANY copy change (index.html, assets/jiepan.js, manifest):

    python tools/build-fonts.py

Why: the page ships subsetted Noto Serif SC / Sans SC instead of the full
CJK fonts (a full variable CJK face is 10-20 MB). A subset only contains the
characters that existed when it was built, so new copy silently falls back to
a system font and the page looks broken mid-sentence. Rebuilding is the fix —
never hand-edit the woff2 files.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT
OUT = SITE / "assets" / "fonts"
SOURCES = [SITE / "index.html", SITE / "assets" / "jiepan.js", SITE / "manifest.webmanifest"]

FONTS = [
    ("NotoSerifSC-VF.ttf", OUT / "NotoSerifSC-VF-sub.woff2"),
    ("NotoSansSC-VF.ttf", OUT / "NotoSansSC-VF-sub.woff2"),
]

EXTRA = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "，。、；：？！“”‘’（）《》〔〕【】—…·／～　"
    "○●□■△▲◇◆☆★←→↑↓✓✗"
    "①②③④⑤⑥⑦⑧⑨⑩"
)


def collect_chars() -> tuple[str, int]:
    chars: set[str] = set(EXTRA)
    for path in SOURCES:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        # strip code blocks that never render, so we do not pay for them
        text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
        for ch in text:
            if ord(ch) > 0x7F:
                chars.add(ch)
    return "".join(sorted(chars)), len(chars)


def main() -> int:
    text, n = collect_chars()
    chars_file = ROOT / "chars.txt"
    chars_file.write_text(text, encoding="utf-8")
    print(f"characters in use: {n} -> {chars_file}")

    for src_name, dst in FONTS:
        candidates = [
            SITE / src_name,                              # next to the page
            SITE.parent / src_name,                       # project root
            pathlib.Path(r"C:/Users/hunin/AppData/Local/hermes/cache/scratch/qimen") / src_name,
        ]
        src = next((c for c in candidates if c.exists()), None)
        if src is None:
            print(f"MISSING source font: {src_name} — put it in {SITE.parent}", file=sys.stderr)
            return 1
        cmd = [
            sys.executable, "-m", "fontTools.subset", str(src),
            f"--text-file={chars_file}",
            f"--output-file={dst}",
            "--flavor=woff2",
            "--layout-features=*",
            "--no-hinting",
            "--desubroutinize",
        ]
        subprocess.run(cmd, check=True)
        print(f"{dst.name}: {dst.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
