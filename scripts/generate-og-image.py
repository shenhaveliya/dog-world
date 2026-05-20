#!/usr/bin/env python3
"""Regenerate og-image.jpg (1200x630) for Open Graph / social sharing."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REF = Path(__file__).resolve().parent / "og-original-bbe40ef.jpg"
OUT = ROOT / "og-image.jpg"
W, H = 1200, 630

TEXT_RIGHT = 460
TEXT_LEFT = 72

# Wipe original baked typography in this rectangle (left + overlap onto dogs).
TEXT_ZONE = (0, 228, 700, 418)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def left_bg_color(y: int) -> tuple[int, int, int]:
    """Vertical gradient sampled from the original dark left panel."""
    t = y / (H - 1)
    r = int(12 + (16 - 12) * t)
    g = int(18 + (22 - 18) * t)
    b = int(34 + (30 - 34) * t)
    return r, g, b


def clear_baked_text(canvas: Image.Image) -> None:
    """Replace the original title/subtitle band with a smooth left-to-right fade."""
    arr = np.array(canvas, dtype=np.float32)
    x0, y0, x1, y1 = TEXT_ZONE
    mid_y = (y0 + y1) / 2
    half_h = (y1 - y0) / 2

    for y in range(y0, y1 + 1):
        bg = np.array(left_bg_color(y), dtype=np.float32)
        y_weight = 1.0 - abs(y - mid_y) / half_h
        y_weight = max(0.0, min(1.0, y_weight))
        y_weight = y_weight**0.65

        for x in range(x0, x1 + 1):
            x_weight = 1.0 - (x - x0) / (x1 - x0)
            x_weight = max(0.0, min(1.0, x_weight))
            alpha = (x_weight**1.35) * y_weight
            if alpha <= 0:
                continue
            arr[y, x] = arr[y, x] * (1.0 - alpha) + bg * alpha

    canvas.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)))


def draw_text(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(68, bold=True)
    sub_font = load_font(32)

    draw.rounded_rectangle((TEXT_LEFT, 248, TEXT_LEFT + 92, 256), radius=4, fill="#f97316")
    draw.text((TEXT_RIGHT, 250), get_display("עולם הכלבים"), font=title_font, fill="#f8fafc", anchor="ra")

    sub_y = 338
    for line in ("מדריך אינטראקטיבי לבחירת", "הגזע המתאים"):
        draw.text((TEXT_RIGHT, sub_y), get_display(line), font=sub_font, fill="#f8fafc", anchor="ra")
        sub_y += 44

    dot_x = TEXT_LEFT
    for color in ("#5eead4", "#14b8a6", "#fb923c", "#f97316"):
        draw.ellipse((dot_x, 398, dot_x + 12, 410), fill=color)
        dot_x += 22


def main() -> None:
    if not REF.exists():
        raise SystemExit(f"Missing reference image: {REF}")

    canvas = Image.open(REF).convert("RGB")
    clear_baked_text(canvas)
    draw_text(canvas)
    canvas.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
