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

# Keep all typography inside the dark left panel (dogs begin ~x520).
TEXT_RIGHT = 430
TEXT_LEFT = 72
SOLID_WIPE_X = 520

# Cover the original baked title/subtitle (spans x≈87–667 on the photo).
TEXT_ZONE = (0, 215, 780, 425)


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
            if x < SOLID_WIPE_X:
                alpha = y_weight
            else:
                x_weight = 1.0 - (x - SOLID_WIPE_X) / (x1 - SOLID_WIPE_X)
                x_weight = max(0.0, min(1.0, x_weight))
                alpha = (x_weight**1.2) * y_weight
            if alpha <= 0:
                continue
            arr[y, x] = arr[y, x] * (1.0 - alpha) + bg * alpha

    canvas.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)))


def draw_text(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(62, bold=True)
    sub_font = load_font(30)

    # Vertically center the text block in the banner.
    bar_top = 238
    draw.rounded_rectangle((TEXT_LEFT, bar_top, TEXT_LEFT + 92, bar_top + 8), radius=4, fill="#f97316")
    draw.text((TEXT_RIGHT, bar_top + 18), get_display("עולם הכלבים"), font=title_font, fill="#f8fafc", anchor="ra")

    sub_y = bar_top + 100
    for line in ("מדריך אינטראקטיבי לבחירת", "הגזע המתאים"):
        draw.text((TEXT_RIGHT, sub_y), get_display(line), font=sub_font, fill="#f8fafc", anchor="ra")
        sub_y += 40

    dot_x = TEXT_LEFT
    dot_y = sub_y + 10
    for color in ("#5eead4", "#14b8a6", "#fb923c", "#f97316"):
        draw.ellipse((dot_x, dot_y, dot_x + 12, dot_y + 12), fill=color)
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
