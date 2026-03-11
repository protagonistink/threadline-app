#!/usr/bin/env python3
"""
Generate app icons for TimeFocus / Threadline.

Produces:
  public/icon.png      — 1024×1024 app icon (textured, for dock/launcher)
  build/icon.png       — same file (electron-builder source)
  public/icon-tray.png — 32×32 simplified template icon for macOS menu bar

The app icon uses the full mark: cream background, ink bracket, three rust dots.
The tray icon is a simplified monochrome glyph: bracket plus one dot.
Filters are approximated with PIL since SVG filter rendering is unavailable.
"""

import math
import os
import random
import struct
import zlib
from pathlib import Path

# ── Dependencies ────────────────────────────────────────────────
try:
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
except ImportError:
    print("PIL not found. Run: pip3 install Pillow")
    raise

# ── Brand colors ────────────────────────────────────────────────
CREAM  = (245, 242, 235, 255)   # #F5F2EB
INK    = (30,  30,  30,  255)   # #1E1E1E
RUST   = (180, 61,  47,  255)   # #B43D2F

# ── SVG coordinate space (viewBox "190 -18 240 240") ────────────
# viewBox origin: x=190, y=-18; size: 240×240
# We'll map this to a 1024×1024 canvas.

SVG_X0, SVG_Y0 = 190, -18
SVG_W,  SVG_H  = 240, 240
SIZE = 1024

def svg_to_px(x, y, size=SIZE):
    """Map SVG coordinates to pixel coordinates."""
    px = (x - SVG_X0) / SVG_W * size
    py = (y - SVG_Y0) / SVG_H * size
    return px, py

# ── Bracket path (approximated as a filled polygon) ─────────────
# Original SVG cubic bezier path:
# M 235 45 C 255 45, 265 65, 260 80
#            C 255 90, 255 98, 275 102
#            C 255 106, 255 114, 260 124
#            C 265 139, 255 159, 235 159
#            C 248 152, 252 142, 248 132
#            C 244 122, 248 112, 262 102
#            C 248 92, 244 82, 248 72
#            C 252 62, 248 52, 235 45 Z
# We sample enough points along the bezier to form a convincing polygon.

def cubic_bezier(p0, p1, p2, p3, t):
    """Evaluate a cubic bezier at t."""
    u = 1 - t
    x = u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0]
    y = u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1]
    return x, y

def sample_bezier(p0, p1, p2, p3, steps=16):
    return [cubic_bezier(p0, p1, p2, p3, i/steps) for i in range(steps)]

# All the bezier segments that form the bracket
bracket_segments = [
    # outer curve (right side)
    ((235,45),  (255,45),  (265,65),  (260,80)),
    ((260,80),  (255,90),  (255,98),  (275,102)),
    ((275,102), (255,106), (255,114), (260,124)),
    ((260,124), (265,139), (255,159), (235,159)),
    # inner return (left side, closing the shape)
    ((235,159), (248,152), (252,142), (248,132)),
    ((248,132), (244,122), (248,112), (262,102)),
    ((262,102), (248,92),  (244,82),  (248,72)),
    ((248,72),  (252,62),  (248,52),  (235,45)),
]

def build_bracket_polygon(size=SIZE, steps=20):
    pts = []
    for seg in bracket_segments:
        pts.extend(sample_bezier(*seg, steps=steps))
    return [svg_to_px(x, y, size) for x, y in pts]

# ── Dot positions ────────────────────────────────────────────────
DOTS_SVG = [
    (305, 102, 11),
    (338, 102, 11.5),
    (372, 102, 12),
]

TRAY_X0, TRAY_Y0 = 225, 35
TRAY_W, TRAY_H = 94, 134

def build_dots(size=SIZE):
    return [(svg_to_px(x, y, size), r / SVG_W * size) for x, y, r in DOTS_SVG]


def tray_svg_to_px(x, y, size):
    inner_size = size * 0.78
    x_offset = (size - inner_size) / 2
    y_offset = (size - inner_size) / 2
    px = (x - TRAY_X0) / TRAY_W * inner_size + x_offset
    py = (y - TRAY_Y0) / TRAY_H * inner_size + y_offset
    return px, py


def build_tray_bracket_polygon(size, steps=20):
    pts = []
    for seg in bracket_segments:
        pts.extend(sample_bezier(*seg, steps=steps))
    return [tray_svg_to_px(x, y, size) for x, y in pts]


def build_tray_dot(size):
    cx, cy = tray_svg_to_px(295, 102, size)
    r = 14 / TRAY_W * (size * 0.78)
    return (cx, cy), r

# ── Noise / texture helpers ──────────────────────────────────────
def add_noise(img, strength=12, seed=42):
    """Add subtle monochrome noise to approximate ink/stamp texture."""
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
    """Slight blur to soften/spread the ink edges (ink-bleed effect)."""
    return img.filter(ImageFilter.GaussianBlur(radius=radius))

def rust_texture(img, cx, cy, r, seed=0):
    """Add irregular opacity variation to rust dots (stamp-texture effect)."""
    rng = random.Random(seed + 100)
    pixels = img.load()
    w, h = img.size
    for yy in range(max(0, int(cy-r-2)), min(h, int(cy+r+2))):
        for xx in range(max(0, int(cx-r-2)), min(w, int(cx+r+2))):
            dist = math.sqrt((xx - cx)**2 + (yy - cy)**2)
            if dist > r + 1:
                continue
            existing = pixels[xx, yy]
            if existing[3] < 10:
                continue
            # Vary opacity and add noise to simulate letterpress
            noise_factor = rng.uniform(0.72, 1.0)
            edge_fade = max(0, 1 - max(0, dist - r * 0.85) / (r * 0.15 + 1))
            alpha = int(existing[3] * noise_factor * edge_fade)
            pixels[xx, yy] = (existing[0], existing[1], existing[2], alpha)
    return img

# ── Draw the icon ────────────────────────────────────────────────
def draw_icon(size=SIZE, tray=False):
    if tray:
        # Simplified template mark for the menu bar: transparent background,
        # bracket plus a single dot. macOS will tint this from alpha.
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        bracket_poly = build_tray_bracket_polygon(size)
        draw.polygon(bracket_poly, fill=INK)
        (cx, cy), r = build_tray_dot(size)
        bbox = [cx-r, cy-r, cx+r, cy+r]
        draw.ellipse(bbox, fill=INK)
        return img

    # Background
    img = Image.new('RGBA', (size, size), CREAM)
    draw = ImageDraw.Draw(img)

    # ── Textured app icon ────────────────────────────────────────
    # 1. Draw bracket on a separate layer, then blur for ink-bleed
    bracket_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bracket_layer)
    bracket_poly = build_bracket_polygon(size)
    bd.polygon(bracket_poly, fill=INK)
    bracket_layer = blur_edge(bracket_layer, radius=size * 0.001)  # ~1px at 1024

    # 2. Composite bracket onto bg
    img = Image.alpha_composite(img, bracket_layer)

    # 3. Draw rust dots on separate layers with stamp texture
    for i, ((cx, cy), r) in enumerate(build_dots(size)):
        dot_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        dd = ImageDraw.Draw(dot_layer)
        bbox = [cx-r, cy-r, cx+r, cy+r]
        dd.ellipse(bbox, fill=RUST)
        dot_layer = rust_texture(dot_layer, cx, cy, r, seed=i)
        dot_layer = blur_edge(dot_layer, radius=size * 0.0008)
        img = Image.alpha_composite(img, dot_layer)

    # 4. Add overall noise for paper/ink feel
    img = add_noise(img, strength=8)

    return img

# ── Main ─────────────────────────────────────────────────────────
def main():
    base = Path(__file__).parent.parent

    # App icon: 1024×1024
    print("Generating app icon (1024×1024)...")
    app_icon = draw_icon(1024, tray=False)
    # Convert to RGB for PNG (PIL RGBA is fine for PNG)
    app_path_public = base / "public" / "icon.png"
    app_path_build  = base / "build" / "icon.png"
    app_icon.save(str(app_path_public))
    app_icon.save(str(app_path_build))
    print(f"  Saved: {app_path_public}")
    print(f"  Saved: {app_path_build}")

    # Tray icon: 32×32 simplified template image for the menu bar
    print("Generating tray icon (32×32)...")
    tray_icon = draw_icon(32, tray=True)
    tray_path = base / "public" / "icon-tray.png"
    tray_icon.save(str(tray_path))
    print(f"  Saved: {tray_path}")

    # Also save a @2x version for retina
    tray_icon_2x = draw_icon(64, tray=True)
    tray_path_2x = base / "public" / "icon-tray@2x.png"
    tray_icon_2x.save(str(tray_path_2x))
    print(f"  Saved: {tray_path_2x}")

    print("Done.")

if __name__ == "__main__":
    main()
