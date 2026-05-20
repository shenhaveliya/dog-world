#!/usr/bin/env python3
"""Regenerate og-image.jpg (1200x630) for Open Graph / social sharing."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REF = Path(__file__).resolve().parent / "og-original-bbe40ef.jpg"
OUT = ROOT / "og-image.jpg"
W, H = 1200, 630

TEXT_RIGHT = 430
TEXT_LEFT = 72

# Strip with zero baked subtitle/title pixels in the text band.
DOG_CROP_X = 668
DOG_PASTE_X = 520


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
    mask = np.zeros((H, W), dtype=np.uint8)
    for y in range(H):
        for x in range(W):
            r, g, b = ref[y, x]
            if r >= 248 and g >= 248 and b >= 248:
                mask[y, x] = 255
            elif r >= 235 and 100 <= g <= 135 and b <= 35:
                mask[y, x] = 255

    for y in range(H):
        for x in range(W):
            if mask[y, x]:
                continue
            r, g, b = ref[y, x]
            if r < 90 and g < 110 and b < 130:
                for dy in range(-3, 4):
                    for dx in range(-3, 4):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx]:
                            mask[y, x] = 255
                            break

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    return cv2.dilate(mask, kernel, iterations=2)


def clean_reference(ref: Image.Image) -> Image.Image:
    rgb = np.array(ref.convert("RGB"))
    mask = build_text_mask(rgb)
    if not mask.any():
        return ref

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cleaned = cv2.inpaint(bgr, mask, inpaintRadius=5, flags=cv2.INPAINT_NS)
    return Image.fromarray(cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB))


def draw_background() -> Image.Image:
    base = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(base)
    for y in range(H):
        draw.line([(0, y), (W, y)], fill=bg_color(y))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((520, -80, 1100, 420), fill=(249, 115, 22, 36))
    gdraw.ellipse((680, 180, 1180, 680), fill=(20, 184, 166, 28))
    return Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")


def feather_mask(width: int, height: int, feather: int) -> Image.Image:
    mask = Image.new("L", (width, height), 255)
    ramp = np.linspace(0, 255, feather, dtype=np.uint8)
    px = mask.load()
    for x in range(feather):
        for y in range(height):
            px[x, y] = int(ramp[x])
    return mask


def paste_dogs(canvas: Image.Image, ref: Image.Image) -> None:
    src = ref.crop((DOG_CROP_X, 0, W, H))
    target_w = W - DOG_PASTE_X
    dogs = src.resize((target_w, H), Image.Resampling.LANCZOS)
    mask = feather_mask(target_w, H, feather=70)
    canvas.paste(dogs, (DOG_PASTE_X, 0), mask)


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
    paste_dogs(canvas, clean_reference(ref))
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
