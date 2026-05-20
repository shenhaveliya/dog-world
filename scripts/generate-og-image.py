#!/usr/bin/env python3
"""Regenerate og-image.jpg (1200x630) for Open Graph / social sharing.

Builds a clean banner from dog.ceo photos (no baked-in text).
Source photos are cached in scripts/og-dogs/.
"""

from __future__ import annotations

import io
import urllib.request
from pathlib import Path

from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(__file__).resolve().parent / "og-dogs"
OUT = ROOT / "og-image.jpg"
W, H = 1200, 630

TEXT_RIGHT = 430
TEXT_LEFT = 72

# Pinned dog.ceo photos (front-facing, landscape-friendly).
DOG_SOURCES = {
    "golden": "https://images.dog.ceo/breeds/retriever-golden/n02099601_831.jpg",
    "beagle": "https://images.dog.ceo/breeds/beagle/n02088364_4473.jpg",
    "spaniel": "https://images.dog.ceo/breeds/spaniel-blenheim/n02086646_4045.jpg",
}
DOG_FILES = {key: ASSETS / f"{key}.jpg" for key in DOG_SOURCES}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fetch_url(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "dog-world-og-generator/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def load_dog(key: str) -> Image.Image:
    path = DOG_FILES[key]
    if not path.exists():
        ASSETS.mkdir(exist_ok=True)
        path.write_bytes(fetch_url(DOG_SOURCES[key]))
    return Image.open(path).convert("RGBA")


def fit_cover(img: Image.Image, tw: int, th: int, *, focus_x: float = 0.5, focus_y: float = 0.18) -> Image.Image:
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, min(nw - tw, int((nw - tw) * focus_x)))
    top = max(0, min(nh - th, int((nh - th) * focus_y)))
    return resized.crop((left, top, left + tw, top + th))


def oval_mask(width: int, height: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    pad_x, pad_y = int(width * 0.06), int(height * 0.04)
    draw.ellipse((pad_x, pad_y, width - pad_x, height - pad_y), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(radius=10))


def draw_background() -> Image.Image:
    base = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(base)
    for y in range(H):
        t = y / (H - 1)
        r = int(12 + (16 - 12) * t)
        g = int(18 + (22 - 18) * t)
        b = int(34 + (30 - 34) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((520, -80, 1120, 420), fill=(249, 115, 22, 38))
    gdraw.ellipse((680, 180, 1220, 700), fill=(20, 184, 166, 30))
    return Image.alpha_composite(base.convert("RGBA"), glow)


def paste_dog(
    canvas: Image.Image,
    key: str,
    box: tuple[int, int, int, int],
    *,
    focus_x: float = 0.5,
    focus_y: float = 0.18,
) -> None:
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    dog = fit_cover(load_dog(key), tw, th, focus_x=focus_x, focus_y=focus_y)
    canvas.paste(dog, (x0, y0), oval_mask(tw, th))


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


def main() -> None:
    canvas = draw_background()

    # Back → front
    paste_dog(canvas, "golden", (770, 70, 1190, 610), focus_x=0.52, focus_y=0.12)
    paste_dog(canvas, "beagle", (600, 210, 960, 610), focus_x=0.5, focus_y=0.08)
    paste_dog(canvas, "spaniel", (480, 330, 730, 610), focus_x=0.48, focus_y=0.1)

    draw_text(canvas)
    canvas.convert("RGB").save(OUT, format="JPEG", quality=92, optimize=True, progressive=False)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
