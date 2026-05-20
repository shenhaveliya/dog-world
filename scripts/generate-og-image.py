#!/usr/bin/env python3
"""Regenerate og-image.jpg (1200x630) for Open Graph / social sharing."""

from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path

from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "og-image.jpg"
W, H = 1200, 630

# Keep all typography left of this x so it never crosses the dogs.
TEXT_RIGHT = 580
TEXT_LEFT = 72

# Breed API paths (dog.ceo uses slashes, not hyphens).
DOG_BREEDS = ("pekinese", "beagle", "retriever/golden")


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fetch_image(url: str) -> Image.Image:
    req = urllib.request.Request(url, headers={"User-Agent": "dog-world-og-generator/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return Image.open(io.BytesIO(resp.read())).convert("RGBA")


def fetch_breed_image(breed: str) -> Image.Image:
    api = f"https://dog.ceo/api/breed/{breed}/images/random"
    req = urllib.request.Request(api, headers={"User-Agent": "dog-world-og-generator/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        url = json.load(resp)["message"]
    return fetch_image(url)


def fit_cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, img.width, img.height), radius=radius, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def draw_gradient_bg() -> Image.Image:
    base = Image.new("RGB", (W, H), "#0f172a")
    draw = ImageDraw.Draw(base)
    for y in range(H):
        t = y / H
        r = int(15 + (17 - 15) * t)
        g = int(23 + (24 - 23) * t)
        b = int(42 + (36 - 42) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse((720, -120, 1280, 420), fill=(249, 115, 22, 42))
    odraw.ellipse((860, 220, 1260, 700), fill=(20, 184, 166, 36))
    for x in range(TEXT_RIGHT - 40, TEXT_RIGHT + 120):
        alpha = int(180 * max(0, min(1, (x - (TEXT_RIGHT - 40)) / 120)))
        odraw.line([(x, 0), (x, H)], fill=(15, 23, 42, alpha), width=1)
    return Image.alpha_composite(base.convert("RGBA"), overlay)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def paste_dog(canvas: Image.Image, breed: str, box: tuple[int, int, int, int], radius: int = 28) -> None:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    dog = fit_cover(fetch_breed_image(breed), tw, th)
    dog = rounded(dog, radius)
    shadow = Image.new("RGBA", (tw + 24, th + 24), (0, 0, 0, 0))
    sh = Image.new("RGBA", (tw, th), (0, 0, 0, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    shadow.paste(sh, (12, 16), sh)
    canvas.alpha_composite(shadow, (x0 - 8, y0 - 4))
    canvas.alpha_composite(dog, (x0, y0))


def main() -> None:
    canvas = draw_gradient_bg()
    draw = ImageDraw.Draw(canvas)

    title = "עולם הכלבים"

    title_font = load_font(74, bold=True)
    sub_font = load_font(34)

    draw.rounded_rectangle((TEXT_LEFT, 118, TEXT_LEFT + 88, 126), radius=4, fill="#f97316")
    dot_colors = ("#5eead4", "#14b8a6", "#fb923c", "#f97316")
    dot_x = TEXT_LEFT
    for color in dot_colors:
        draw.ellipse((dot_x, 548, dot_x + 12, 560), fill=color)
        dot_x += 22

    draw.text((TEXT_RIGHT, 150), get_display(title), font=title_font, fill="#f8fafc", anchor="ra")

    subtitle_lines = ["מדריך אינטראקטיבי לבחירת", "הגזע המתאים"]
    sub_y = 248
    for line in subtitle_lines:
        draw.text((TEXT_RIGHT, sub_y), get_display(line), font=sub_font, fill="#cbd5e1", anchor="ra")
        sub_y += 46

    large, medium, small = DOG_BREEDS[2], DOG_BREEDS[1], DOG_BREEDS[0]
    paste_dog(canvas, large, (760, 88, 1140, 560), radius=32)
    paste_dog(canvas, medium, (650, 310, 870, 560), radius=24)
    paste_dog(canvas, small, (980, 380, 1130, 560), radius=20)

    rgb = canvas.convert("RGB")
    rgb.save(OUT, format="JPEG", quality=88, optimize=True, progressive=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
