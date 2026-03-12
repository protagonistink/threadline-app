#!/usr/bin/env python3
"""
Generate app icons for TimeFocus / Threadline.

Produces:
  public/icon.png      — 1024×1024 app icon (textured, for dock/launcher)
  build/icon.png       — same file (electron-builder source)
  public/icon-tray.png — 32×32 simplified template icon for macOS menu bar

The app icon keeps the paper-and-ink character of the original mark while
adding subtle native-macOS cues: squircle clipping, safe-area scaling,
quiet depth, and a restrained panel highlight.
"""

import math
import random
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter
except ImportError:
    print("PIL not found. Run: pip3 install Pillow")
    raise


CREAM = (245, 242, 235, 255)      # #F5F2EB
PAPER_LIGHT = (250, 247, 241, 255)
PAPER_DARK = (236, 229, 219, 255)
INK = (30, 30, 30, 255)           # #1E1E1E
RUST = (180, 61, 47, 255)         # #B43D2F
SHADOW = (70, 52, 42, 255)

SVG_X0, SVG_Y0 = 190, -18
SVG_W, SVG_H = 240, 240
SIZE = 1024
MASK_RADIUS = 228
INNER_INSET = 34
INNER_RADIUS = 196
MARK_SCALE = 3.38
MARK_CENTER = (512, 512)


def svg_to_px(x, y, size=SIZE):
    px = (x - SVG_X0) / SVG_W * size
    py = (y - SVG_Y0) / SVG_H * size
    return px, py


def mark_to_px(x, y, size=SIZE):
    scale = (size / SIZE) * MARK_SCALE
    cx = size / 2
    cy = size / 2
    px = cx + (x - 310) * scale
    py = cy + (y - 102) * scale
    return px, py


def cubic_bezier(p0, p1, p2, p3, t):
    u = 1 - t
    x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
    y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
    return x, y


def sample_bezier(p0, p1, p2, p3, steps=16):
    return [cubic_bezier(p0, p1, p2, p3, i / steps) for i in range(steps)]


BRACKET_SEGMENTS = [
    ((235, 45), (255, 45), (265, 65), (260, 80)),
    ((260, 80), (255, 90), (255, 98), (275, 102)),
    ((275, 102), (255, 106), (255, 114), (260, 124)),
    ((260, 124), (265, 139), (255, 159), (235, 159)),
    ((235, 159), (248, 152), (252, 142), (248, 132)),
    ((248, 132), (244, 122), (248, 112), (262, 102)),
    ((262, 102), (248, 92), (244, 82), (248, 72)),
    ((248, 72), (252, 62), (248, 52), (235, 45)),
]


DOTS_SVG = [
    (305, 102, 11),
    (338, 102, 11.5),
    (372, 102, 12),
]


TRAY_X0, TRAY_Y0 = 225, 35
TRAY_W, TRAY_H = 94, 134


def build_bracket_polygon(size=SIZE, steps=20):
    pts = []
    for seg in BRACKET_SEGMENTS:
        pts.extend(sample_bezier(*seg, steps=steps))
    return [mark_to_px(x, y, size) for x, y in pts]


def build_dots(size=SIZE):
    scale = (size / SIZE) * MARK_SCALE
    return [(mark_to_px(x, y, size), r * scale) for x, y, r in DOTS_SVG]


def tray_svg_to_px(x, y, size):
    inner_size = size * 0.78
    x_offset = (size - inner_size) / 2
    y_offset = (size - inner_size) / 2
    px = (x - TRAY_X0) / TRAY_W * inner_size + x_offset
    py = (y - TRAY_Y0) / TRAY_H * inner_size + y_offset
    return px, py


def build_tray_bracket_polygon(size, steps=20):
    pts = []
    for seg in BRACKET_SEGMENTS:
        pts.extend(sample_bezier(*seg, steps=steps))
    return [tray_svg_to_px(x, y, size) for x, y in pts]


def build_tray_dot(size):
    cx, cy = tray_svg_to_px(295, 102, size)
    r = 14 / TRAY_W * (size * 0.78)
    return (cx, cy), r


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    return mask


def add_noise(img, strength=10, seed=42):
    rng = random.Random(seed)
    pixels = img.load()
    w, h = img.size
    for yy in range(h):
        for xx in range(w):
            r, g, b, a = pixels[xx, yy]
            if a < 10:
                continue
            delta = rng.randint(-strength, strength)
            pixels[xx, yy] = (
                max(0, min(255, r + delta)),
                max(0, min(255, g + delta)),
                max(0, min(255, b + delta)),
                a,
            )
    return img


def blur_edge(img, radius=1.2):
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


def rust_texture(img, cx, cy, r, seed=0):
    rng = random.Random(seed + 100)
    pixels = img.load()
    w, h = img.size
    for yy in range(max(0, int(cy - r - 2)), min(h, int(cy + r + 2))):
        for xx in range(max(0, int(cx - r - 2)), min(w, int(cx + r + 2))):
            dist = math.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
            if dist > r + 1:
                continue
            existing = pixels[xx, yy]
            if existing[3] < 10:
                continue
            noise_factor = rng.uniform(0.72, 1.0)
            edge_fade = max(0, 1 - max(0, dist - r * 0.85) / (r * 0.15 + 1))
            alpha = int(existing[3] * noise_factor * edge_fade)
            pixels[xx, yy] = (existing[0], existing[1], existing[2], alpha)
    return img


def make_panel_background(size):
    panel = Image.new("RGBA", (size, size), CREAM)
    pixels = panel.load()
    max_axis = max(size - 1, 1)
    for yy in range(size):
        for xx in range(size):
            diagonal = (xx + yy) / (2 * max_axis)
            base = tuple(
                int(PAPER_LIGHT[i] + (PAPER_DARK[i] - PAPER_LIGHT[i]) * diagonal)
                for i in range(4)
            )
            pixels[xx, yy] = base

    # A soft editorial vignette keeps it from looking flat in the dock.
    wash = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    wp = wash.load()
    cx, cy = size * 0.33, size * 0.38
    rx, ry = size * 0.42, size * 0.36
    for yy in range(size):
        for xx in range(size):
            dx = (xx - cx) / rx
            dy = (yy - cy) / ry
            dist = math.sqrt(dx * dx + dy * dy)
            if dist >= 1:
                continue
            alpha = int((1 - dist) ** 2 * 24)
            wp[xx, yy] = (55, 55, 55, alpha)
    panel = Image.alpha_composite(panel, wash)
    return panel


def draw_icon(size=SIZE, tray=False):
    if tray:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        bracket_poly = build_tray_bracket_polygon(size)
        draw.polygon(bracket_poly, fill=INK)
        (cx, cy), r = build_tray_dot(size)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)
        return img

    base = Image.new("RGBA", (size, size), CREAM)
    outer_mask = rounded_mask(size, round(size * MASK_RADIUS / SIZE))
    panel_mask = Image.new("L", (size, size), 0)
    pd = ImageDraw.Draw(panel_mask)
    inset = round(size * INNER_INSET / SIZE)
    inner_radius = round(size * INNER_RADIUS / SIZE)
    pd.rounded_rectangle(
        [inset, inset, size - inset, size - inset],
        radius=inner_radius,
        fill=255,
    )

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_shape = Image.new("L", (size, size), 0)
    sd = ImageDraw.Draw(shadow_shape)
    sd.rounded_rectangle(
        [inset, inset, size - inset, size - inset],
        radius=inner_radius,
        fill=255,
    )
    shadow_shape = shadow_shape.filter(ImageFilter.GaussianBlur(radius=max(8, round(size * 0.02))))
    shadow_alpha = shadow_shape.point(lambda p: min(255, int(p * 0.24)))
    shadow.paste(SHADOW, (0, max(8, round(size * 0.014))), shadow_alpha)
    base = Image.alpha_composite(base, shadow)

    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    panel.paste(make_panel_background(size), (0, 0), panel_mask)
    base = Image.alpha_composite(base, panel)

    border = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(border)
    bd.rounded_rectangle(
        [inset, inset, size - inset, size - inset],
        radius=inner_radius,
        outline=(255, 255, 255, 116),
        width=max(2, round(size * 0.0035)),
    )
    base = Image.alpha_composite(base, border)

    bracket_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bracket_layer)
    bracket_poly = build_bracket_polygon(size)
    bd.polygon(bracket_poly, fill=INK)
    bracket_layer = blur_edge(bracket_layer, radius=size * 0.001)

    mark_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    msd = ImageDraw.Draw(mark_shadow)
    msd.polygon(bracket_poly, fill=(74, 58, 48, 48))
    mark_shadow = mark_shadow.filter(ImageFilter.GaussianBlur(radius=max(4, round(size * 0.01))))
    mark_shadow = ImageChops.offset(mark_shadow, 0, max(4, round(size * 0.006)))
    base = Image.alpha_composite(base, mark_shadow)
    base = Image.alpha_composite(base, bracket_layer)

    for i, ((cx, cy), r) in enumerate(build_dots(size)):
        dot_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        dd = ImageDraw.Draw(dot_layer)
        dd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RUST)
        dot_layer = rust_texture(dot_layer, cx, cy, r, seed=i)
        dot_layer = blur_edge(dot_layer, radius=size * 0.0008)
        base = Image.alpha_composite(base, dot_layer)

    base = add_noise(base, strength=8)

    clipped = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    clipped.paste(base, (0, 0), outer_mask)
    return clipped


def main():
    base = Path(__file__).parent.parent

    print("Generating app icon (1024×1024)...")
    app_icon = draw_icon(1024, tray=False)
    app_path_public = base / "public" / "icon.png"
    app_path_build = base / "build" / "icon.png"
    app_icon.save(str(app_path_public))
    app_icon.save(str(app_path_build))
    print(f"  Saved: {app_path_public}")
    print(f"  Saved: {app_path_build}")

    print("Generating tray icon (32×32)...")
    tray_icon = draw_icon(32, tray=True)
    tray_path = base / "public" / "icon-tray.png"
    tray_icon.save(str(tray_path))
    print(f"  Saved: {tray_path}")

    tray_icon_2x = draw_icon(64, tray=True)
    tray_path_2x = base / "public" / "icon-tray@2x.png"
    tray_icon_2x.save(str(tray_path_2x))
    print(f"  Saved: {tray_path_2x}")

    print("Done.")


if __name__ == "__main__":
    main()
