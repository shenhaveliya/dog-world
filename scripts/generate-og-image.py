#!/usr/bin/env python3
"""Regenerate og-image.jpg (1200x630) for Open Graph / social sharing."""

from __future__ import annotations

from pathlib import Path

from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REF = Path(__file__).resolve().parent / "og-original-bbe40ef.jpg"
OUT = ROOT / "og-image.jpg"
W, H = 1200, 630

TEXT_RIGHT = 430
TEXT_LEFT = 72
LEFT_PANEL_X = 470

# Original baked text ends ~x667; this strip has clean dog pixels only.
DOG_STRIP_X = 670


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


def draw_background() -> Image.Image:
    base = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(base)
    for y in range(H):
        draw.line([(0, y), (W, y)], fill=bg_color(y))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((520, -80, 1120, 420), fill=(249, 115, 22, 38))
    gdraw.ellipse((680, 180, 1220, 700), fill=(20, 184, 166, 30))
    return Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")


def left_feather_mask(width: int, height: int, feather: int) -> Image.Image:
    mask = Image.new("L", (width, height), 255)
    px = mask.load()
    for x in range(min(feather, width)):
        alpha = int(255 * (x / feather) ** 0.85)
        for y in range(height):
            px[x, y] = alpha
    return mask


def paste_original_dogs(canvas: Image.Image, ref: Image.Image) -> None:
    """Paste the untouched dog photo (no baked text) at full resolution."""
    strip = ref.crop((DOG_STRIP_X, 0, W, H))
    mask = left_feather_mask(strip.width, strip.height, feather=90)
    canvas.paste(strip, (LEFT_PANEL_X, 0), mask)


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
    canvas = draw_background()
    px = canvas.load()
    for y in range(H):
        color = bg_color(y)
        for x in range(LEFT_PANEL_X):
            px[x, y] = color
    paste_original_dogs(canvas, ref)
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
