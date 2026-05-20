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
LEFT_PANEL_X = 480
TEXT_BAND = (175, 435)
TEXT_MASK_X = 478


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def bg_color(y: int) -> tuple[int, int, int]:
    t = y / (H - 1)
    r = int(12 + (16 - 12) * t)
    g = int(18 + (22 - 18) * t)
    b = int(34 + (30 - 34) * t)
    return r, g, b


def build_text_mask(ref: np.ndarray) -> np.ndarray:
    """Mask baked white/orange UI pixels only — no drop-shadow dilation."""
    mask = np.zeros((H, W), dtype=bool)
    y0, y1 = TEXT_BAND
    for y in range(y0, y1 + 1):
        for x in range(TEXT_MASK_X, W):
            r, g, b = ref[y, x]
            if r >= 248 and g >= 248 and b >= 248:
                mask[y, x] = True
            elif r >= 235 and 100 <= g <= 135 and b <= 35:
                mask[y, x] = True
    return mask


def sample_fur(ref: np.ndarray, mask: np.ndarray, x: int, y: int) -> tuple[int, int, int]:
    """Pick a nearby non-text pixel on the same column to replace a text pixel."""
    y0, y1 = TEXT_BAND
    for sy in range(y1 + 8, min(H, y1 + 100)):
        if not mask[sy, x]:
            return tuple(int(v) for v in ref[sy, x])
    for sy in range(y0 - 8, max(-1, y0 - 100), -1):
        if not mask[sy, x]:
            return tuple(int(v) for v in ref[sy, x])
    for dx in (1, -1, 2, -2, 3, -3):
        nx = x + dx
        if 0 <= nx < W and not mask[y, nx]:
            return tuple(int(v) for v in ref[y, nx])
    return bg_color(y)


def remove_baked_text(ref: Image.Image) -> Image.Image:
    rgb = np.array(ref.convert("RGB"))
    mask = build_text_mask(rgb)
    if not mask.any():
        return ref

    out = rgb.copy()
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        out[y, x] = sample_fur(rgb, mask, int(x), int(y))
    return Image.fromarray(out)


def paint_left_panel(canvas: Image.Image) -> None:
    px = canvas.load()
    for y in range(H):
        color = bg_color(y)
        for x in range(LEFT_PANEL_X):
            px[x, y] = color


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
    canvas = remove_baked_text(ref)
    paint_left_panel(canvas)
    return canvas


def main() -> None:
    if not REF.exists():
        raise SystemExit(f"Missing reference image: {REF}")

    canvas = build_canvas(Image.open(REF))
    draw_text(canvas)
    canvas.save(OUT, format="JPEG", quality=92, optimize=True, progressive=False)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
