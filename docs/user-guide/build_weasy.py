#!/usr/bin/env python3
"""Build the Samtal Client User Guide PDF with WeasyPrint (sample layout).

Images are scaled with contain (max-width / max-height only) — never cropped.
"""

from __future__ import annotations

from pathlib import Path

from weasyprint import HTML

ROOT = Path(__file__).resolve().parent
SHOT = ROOT / "screenshots"
OUT = ROOT.parent / "Samtal-Client-User-Guide.pdf"
HTML_PATH = ROOT / "guide.html"


def shot(name: str) -> str:
    path = SHOT / name
    if not path.exists():
        raise FileNotFoundError(path)
    return path.as_uri()


def main() -> None:
    html = HTML_PATH.read_text(encoding="utf-8")
    # Resolve {{shot:filename}} placeholders to file:// URIs
    while True:
        start = html.find("{{shot:")
        if start < 0:
            break
        end = html.find("}}", start)
        name = html[start + 7 : end]
        html = html[:start] + shot(name) + html[end + 2 :]

    HTML(string=html, base_url=str(ROOT)).write_pdf(OUT)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
