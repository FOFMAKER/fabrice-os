#!/usr/bin/env python3
"""Build 16-bit mascot frames from the approved concept sheet.

The That's My Fit jersey '28' is drawn as a cream bib patch with charcoal
numerals AFTER any horizontal flip, so the digits never mirror.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

CONCEPT = Path("/tmp/mascot-src/concept.jpg")
OUT_DIR = Path("/workspace/public/mascot")
PREVIEW_DIR = Path("/tmp/mascot-preview")

# Display canvas — ~100px tall, wide enough for the stride poses.
FRAME_W = 64
FRAME_H = 100
BODY_H = 96

POSES = {
    "idle": (84, 59, 233, 608),
    "walk": (299, 65, 601, 602),
    "run": (624, 71, 889, 552),
    "bend": (931, 204, 1206, 608),
}

PATCH = (0xEF, 0xE9, 0xDD, 255)
PATCH_SHADE = (0xD9, 0xD0, 0xC0, 255)
PATCH_EDGE = (0xC8, 0xBE, 0xAE, 255)
INK = (0x22, 0x25, 0x2A, 255)

# Chunky rounded athletic jersey numerals (5x7) on a small cream bib patch.
TWO = [
    "01111",
    "11011",
    "00011",
    "00110",
    "01100",
    "11000",
    "11111",
]
EIGHT = [
    "01110",
    "11011",
    "11011",
    "01110",
    "11011",
    "11011",
    "01110",
]
DIGIT_W = 5
DIGIT_H = 7
GAP = 1
PAD_X = 1
PAD_Y = 1
PATCH_W = PAD_X * 2 + DIGIT_W * 2 + GAP  # 13
PATCH_H = PAD_Y * 2 + DIGIT_H  # 9


def knockout(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    bg = np.array([255, 249, 233], dtype=np.int16)
    dist = np.abs(rgb - bg).sum(axis=2).astype(np.float32)
    alpha = np.clip((dist - 16.0) * (255.0 / 20.0), 0, 255).astype(np.uint8)
    alpha = np.where(alpha < 36, 0, np.where(alpha > 210, 255, alpha))
    arr[:, :, 3] = alpha
    return Image.fromarray(arr)


def tight_crop(im: Image.Image, pad: int = 1) -> Image.Image:
    arr = np.array(im)
    ys, xs = np.where(arr[:, :, 3] > 20)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def erase_brick(im: Image.Image) -> Image.Image:
    """Drop the gray block from the bend pose; keep the reaching glove."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    a = arr[:, :, 3]
    glove = (r > 208) & (g > 198) & (b > 175) & (a > 20)
    # Brick lives in the lower-right and is a mottled taupe, not skin/plaid/denim.
    in_corner = np.zeros((h, w), dtype=bool)
    in_corner[int(h * 0.52) :, int(w * 0.62) :] = True
    taupe = (np.abs(r.astype(int) - g) < 45) & (np.abs(g.astype(int) - b) < 45) & (r < 210) & (r > 60)
    brick = in_corner & taupe & (~glove) & (a > 10)
    # Also drop near-transparent dust around the brick.
    dust = in_corner & (~glove) & (a > 0) & (a < 200) & (r > 80) & (r < 230)
    arr[:, :, 3] = np.where(brick | dust, 0, a)
    return Image.fromarray(arr)


def pixelate(im: Image.Image, body_h: int) -> Image.Image:
    w, h = im.size
    nh = body_h
    nw = max(8, int(round(w * (nh / h))))
    small = im.resize((nw, nh), Image.Resampling.LANCZOS)
    # 16-bit: limited palette, keep alpha
    rgb = small.convert("RGB")
    pal = rgb.quantize(colors=56, method=Image.Quantize.MEDIANCUT)
    out = pal.convert("RGBA")
    alpha = small.split()[-1]
    out.putalpha(alpha.point(lambda v: 255 if v > 48 else 0))
    return out


def to_canvas(im: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    x = (FRAME_W - im.width) // 2
    y = FRAME_H - im.height - 1
    canvas.paste(im, (x, y), im)
    return canvas


def bounce(im: Image.Image, dy: int) -> Image.Image:
    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.paste(im, (0, dy), im)
    return canvas


def shift_region(
    im: Image.Image, x0: int, y0: int, x1: int, y1: int, dx: int, dy: int
) -> Image.Image:
    """Move a pixel rectangle, leaving transparency behind — for kicked legs."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 <= x0 or y1 <= y0:
        return im
    chunk = arr[y0:y1, x0:x1].copy()
    arr[y0:y1, x0:x1] = 0
    ny0, nx0 = y0 + dy, x0 + dx
    ch, cw = chunk.shape[:2]
    sy0 = max(0, -ny0)
    sx0 = max(0, -nx0)
    dy0 = min(h, ny0 + ch)
    dx1 = min(w, nx0 + cw)
    if dy0 > max(0, ny0) and dx1 > max(0, nx0):
        dest = arr[max(0, ny0) : dy0, max(0, nx0) : dx1]
        src = chunk[sy0 : sy0 + dest.shape[0], sx0 : sx0 + dest.shape[1]]
        mask = src[:, :, 3] > 0
        dest[mask] = src[mask]
    return Image.fromarray(arr)


def shear(im: Image.Image, k: float) -> Image.Image:
    """Horizontal shear from the feet. Positive k leans the head forward (right)."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    out = np.zeros_like(arr)
    for y in range(h):
        t = 1.0 - y / max(h - 1, 1)
        shift = int(round(k * t))
        if shift >= 0:
            if shift < w:
                out[y, shift:] = arr[y, : w - shift]
        else:
            s = -shift
            if s < w:
                out[y, : w - s] = arr[y, s:]
    return Image.fromarray(out)


def stitch_knee(im: Image.Image, x0: int, x1: int, y: int) -> Image.Image:
    """Clone a denim row to close the gap a lifted shin leaves at the knee."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    y = clamp_int(y, 1, h - 2)
    x0, x1 = max(0, x0), min(w, x1)
    src = arr[y]
    for yy in range(y, min(h, y + 5)):
        for x in range(x0, x1):
            if arr[yy, x, 3] < 40 and src[x, 3] > 160:
                arr[yy, x] = src[x]
    return Image.fromarray(arr)


def clamp_int(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def kick_front(im: Image.Image, up: int = 10, fwd: int = 4) -> Image.Image:
    w, h = im.size
    x0, y0 = int(w * 0.50), int(h * 0.70)
    out = shift_region(im, x0, y0, w - 1, h, fwd, -up)
    return stitch_knee(out, x0, w - 1, y0 - 1)


def kick_back(im: Image.Image, up: int = 10, back: int = -3) -> Image.Image:
    w, h = im.size
    x1, y0 = int(w * 0.52), int(h * 0.70)
    out = shift_region(im, 1, y0, x1, h, back, -up)
    return stitch_knee(out, 1, x1, y0 - 1)


def knee_up(im: Image.Image) -> Image.Image:
    w, h = im.size
    base = squat(im, 0.94)
    x0, y0 = int(w * 0.48), int(h * 0.58)
    out = shift_region(base, x0, y0, w - 2, int(h * 0.86), 2, -8)
    return stitch_knee(out, x0, w - 2, y0 - 1)


def squat(im: Image.Image, factor: float = 0.90) -> Image.Image:
    w, h = im.size
    nh = max(8, int(h * factor))
    small = im.resize((w, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(small, (0, h - nh), small)
    return canvas


def is_denim_px(r: int, g: int, b: int, a: int) -> bool:
    return a > 160 and b > r + 8 and b > g and 70 < b < 185


def bib_anchor(im: Image.Image) -> tuple[int, int]:
    """Center of the overalls bib pocket (upper denim, toward the chest)."""
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    denim = (
        (a > 180)
        & (rgb[:, :, 2] > rgb[:, :, 0] + 8)
        & (rgb[:, :, 2] > rgb[:, :, 1])
        & (rgb[:, :, 2] > 70)
        & (rgb[:, :, 2] < 185)
    )
    band = np.zeros_like(denim)
    band[int(h * 0.22) : int(h * 0.48), :] = True
    mask = denim & band
    ys, xs = np.where(mask)
    if len(xs) < 8:
        ys, xs = np.where(denim)
    if len(xs) == 0:
        return w // 2, int(h * 0.34)
    # Sit on the front of the bib (right side of the denim cluster).
    cx = int(np.percentile(xs, 74))
    cy = int(np.percentile(ys, 38))
    return cx, cy


def stamp_28(im: Image.Image, cx: int, cy: int) -> Image.Image:
    """Draw the cream TMF patch + charcoal 28, never mirrored."""
    out = im.copy()
    x0 = int(cx - PATCH_W // 2)
    y0 = int(cy - PATCH_H // 2)
    x0 = max(1, min(im.width - PATCH_W - 1, x0))
    y0 = max(1, min(im.height - PATCH_H - 1, y0))
    arr = np.array(out)
    # Paint over opaque torso so the jersey number stays complete and readable.
    for py in range(PATCH_H):
        for px in range(PATCH_W):
            x, y = x0 + px, y0 + py
            if arr[y, x, 3] < 120:
                continue
            on_right = px == PATCH_W - 1
            on_bottom = py == PATCH_H - 1
            if on_bottom or on_right:
                arr[y, x] = PATCH_SHADE if not (on_bottom and on_right) else PATCH_EDGE
            else:
                arr[y, x] = PATCH
    # Digits
    dx = x0 + PAD_X
    dy = y0 + PAD_Y
    for i, glyph in enumerate((TWO, EIGHT)):
        ox = dx + i * (DIGIT_W + GAP)
        for gy, row in enumerate(glyph):
            for gx, ch in enumerate(row):
                if ch != "1":
                    continue
                x, y = ox + gx, dy + gy
                if 0 <= x < im.width and 0 <= y < im.height and arr[y, x, 3] >= 120:
                    arr[y, x] = INK
    return Image.fromarray(arr)


def flip_body(im: Image.Image) -> Image.Image:
    return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def extract_pose(name: str, box: tuple[int, int, int, int], src: Image.Image) -> Image.Image:
    crop = src.crop(box)
    rgba = knockout(crop)
    if name == "bend":
        rgba = erase_brick(rgba)
    rgba = tight_crop(rgba)
    return pixelate(rgba, BODY_H if name != "bend" else max(72, int(BODY_H * 0.84)))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(CONCEPT).convert("RGB")

    bodies: dict[str, Image.Image] = {}
    for name, box in POSES.items():
        bodies[name] = to_canvas(extract_pose(name, box, src))
        bodies[name].save(PREVIEW_DIR / f"{name}_body.png")

    idle = bodies["idle"]
    walk = bodies["walk"]
    run = bodies["run"]
    bend = bodies["bend"]
    hop = bounce(run, -2)
    sit = squat(idle, 0.91)

    # 8-frame walk: contact / recede / passing / reach, twice.
    walk_frames = [
        bounce(walk, 1),  # 0 contact
        walk,  # 1 recede
        idle,  # 2 passing
        bounce(run, -1),  # 3 reach
        bounce(run, 1),  # 4 opposite contact
        run,  # 5 recede
        bounce(idle, -1),  # 6 passing
        bounce(walk, -1),  # 7 reach
    ]

    dribble_a = shear(walk_frames[0], 2.0)
    dribble_b = kick_front(shear(run, 1.5), up=8, fwd=4)
    juggle_l = kick_back(idle, up=13, back=-3)
    juggle_r = kick_front(idle, up=13, fwd=4)
    juggle_k = knee_up(idle)
    rainbow_wind = squat(shear(idle, -3.5), 0.92)
    rainbow_up = kick_front(bounce(run, -6), up=16, fwd=3)
    around = kick_front(shear(idle, 2.5), up=10, fwd=8)
    heel = kick_back(shear(idle, -2.0), up=16, back=-6)
    trap = kick_front(squat(idle, 0.93), up=4, fwd=6)

    names = [
        "idle",
        *[f"w{i}" for i in range(8)],
        "hop",
        "bend",
        "sit",
        "dribble_a",
        "dribble_b",
        "juggle_l",
        "juggle_r",
        "juggle_k",
        "rainbow_wind",
        "rainbow_up",
        "around",
        "heel",
        "trap",
    ]
    rights = [
        idle,
        *walk_frames,
        hop,
        bend,
        sit,
        dribble_a,
        dribble_b,
        juggle_l,
        juggle_r,
        juggle_k,
        rainbow_wind,
        rainbow_up,
        around,
        heel,
        trap,
    ]
    anchors: list[tuple[int, int]] = [bib_anchor(im) for im in rights]

    cols = len(names)
    sheet = Image.new("RGBA", (FRAME_W * cols, FRAME_H), (0, 0, 0, 0))
    for i, im in enumerate(rights):
        sheet.paste(im, (i * FRAME_W, 0), im)
        marked = stamp_28(im, *anchors[i])
        marked.save(PREVIEW_DIR / f"{names[i]}_r.png")
        marked.resize((FRAME_W * 4, FRAME_H * 4), Image.Resampling.NEAREST).save(
            PREVIEW_DIR / f"{names[i]}_r@4x.png"
        )
        left_marked = stamp_28(flip_body(im), FRAME_W - 1 - anchors[i][0], anchors[i][1])
        left_marked.resize((FRAME_W * 4, FRAME_H * 4), Image.Resampling.NEAREST).save(
            PREVIEW_DIR / f"{names[i]}_l@4x.png"
        )

    sheet.save(OUT_DIR / "hero.png")
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.Resampling.NEAREST).save(
        PREVIEW_DIR / "sheet@3x.png"
    )

    base = Image.new("RGBA", (PATCH_W, PATCH_H), PATCH)
    px = np.array(base)
    px[-1, :] = PATCH_SHADE
    px[:, -1] = PATCH_SHADE
    px[-1, -1] = PATCH_EDGE
    # Round off the four corners so it reads as a sewn patch, not a sticker.
    px[0, 0, 3] = 0
    px[0, -1, 3] = 0
    px[-1, 0, 3] = 0
    px[-1, -1, 3] = 0
    base = Image.fromarray(px)
    # Draw digits onto the cream patch.
    draw = ImageDraw.Draw(base)
    dx, dy = PAD_X, PAD_Y
    for i, glyph in enumerate((TWO, EIGHT)):
        ox = dx + i * (DIGIT_W + GAP)
        for gy, row in enumerate(glyph):
            for gx, ch in enumerate(row):
                if ch == "1":
                    draw.point((ox + gx, dy + gy), fill=INK)
    base.save(OUT_DIR / "mark-28.png")
    base.resize((PATCH_W * 8, PATCH_H * 8), Image.Resampling.NEAREST).save(
        PREVIEW_DIR / "mark-28@8x.png"
    )

    print("wrote", OUT_DIR / "hero.png", "frames", cols, "size", sheet.size)
    print("anchors", list(zip(names, anchors)))
    scaled = [(round(x * 52 / 64), round(y * 52 / 64)) for x, y in anchors]
    print("BIB_52", scaled)
    print("PATCH", PATCH_W, PATCH_H)


if __name__ == "__main__":
    main()
