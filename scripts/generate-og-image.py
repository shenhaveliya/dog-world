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

TEXT_RIGHT = 430
TEXT_LEFT = 72

# Original baked UI spans y≈184 (orange bar) through y≈430 (subtitle/dots).
TEXT_BAND = (175, 435)
# Replace the entire dark left column so nothing from the source photo bleeds through.
LEFT_PANEL_X = 480
# Fade the text-band wipe back into the dog photo on the right edge.
TEXT_FADE_X = (540, 920)


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


def paint_left_panel(canvas: Image.Image) -> None:
    """Solid dark panel on the left — removes all original typography there."""
    arr = np.array(canvas, dtype=np.float32)
    for y in range(H):
        bg = np.array(left_bg_color(y), dtype=np.float32)
        arr[y, :LEFT_PANEL_X] = bg
    canvas.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)))


def clear_text_band(canvas: Image.Image) -> None:
    """Fully cover the original title/subtitle/orange bar over the dogs."""
    arr = np.array(canvas, dtype=np.float32)
    y0, y1 = TEXT_BAND
    fade_start, fade_end = TEXT_FADE_X

    for y in range(y0, y1 + 1):
        bg = np.array(left_bg_color(y), dtype=np.float32)
        for x in range(LEFT_PANEL_X, fade_end + 1):
            if x <= fade_start:
                alpha = 1.0
            else:
                t = (x - fade_start) / (fade_end - fade_start)
                alpha = max(0.0, 1.0 - t**0.75)
            if alpha <= 0:
                continue
            arr[y, x] = arr[y, x] * (1.0 - alpha) + bg * alpha

    canvas.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)))


def draw_text(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(62, bold=True)
    sub_font = load_font(30)

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


def build_canvas(ref: Image.Image) -> Image.Image:
    canvas = ref.convert("RGB").copy()
    paint_left_panel(canvas)
    clear_text_band(canvas)
    return canvas


def main() -> None:
    if not REF.exists():
        raise SystemExit(f"Missing reference image: {REF}")

    canvas = build_canvas(Image.open(REF))
    draw_text(canvas)
    canvas.save(OUT, format="JPEG", quality=90, optimize=True, progressive=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
