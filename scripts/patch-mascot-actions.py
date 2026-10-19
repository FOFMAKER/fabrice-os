#!/usr/bin/env python3
"""Append seated-typing and studio-jam frames to the existing hero sheet.

Works from public/mascot/hero.png so we do not need the original concept crop.
The That's My Fit 28 stays a separate overlay; these frames are unmarked bodies.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SHEET = Path("/workspace/public/mascot/hero.png")
PREVIEW = Path("/tmp/mascot-preview")
FRAME_W = 64
FRAME_H = 100

DENIM = (27, 54, 84, 255)
DENIM_HI = (44, 75, 113, 255)
DENIM_LO = (24, 47, 72, 255)
SHOE = (236, 232, 224, 255)
SHOE_LO = (196, 190, 180, 255)
SHOE_INK = (42, 40, 38, 255)
GLOVE = (236, 232, 226, 255)


def load_frames(path: Path) -> list[Image.Image]:
    im = Image.open(path).convert("RGBA")
    cols = im.width // FRAME_W
    return [im.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H)) for i in range(cols)]


def paste(dst: np.ndarray, src: np.ndarray, ox: int, oy: int) -> None:
    h, w = src.shape[:2]
    dh, dw = dst.shape[:2]
    for y in range(h):
        yy = y + oy
        if yy < 0 or yy >= dh:
            continue
        for x in range(w):
            xx = x + ox
            if xx < 0 or xx >= dw:
                continue
            if src[y, x, 3] > 40:
                dst[yy, xx] = src[y, x]


def shift_im(im: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (dx, dy), im)
    return out


def crop_opaque(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return im.crop(box)


def thick(arr: np.ndarray, x0: int, y0: int, x1: int, y1: int, r: int, col: tuple[int, ...]) -> None:
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    h, w = arr.shape[:2]
    for s in range(steps + 1):
        x = x0 + round((x1 - x0) * s / steps)
        y = y0 + round((y1 - y0) * s / steps)
        for yy in range(y - r, y + r + 1):
            for xx in range(x - r, x + r + 1):
                if 0 <= xx < w and 0 <= yy < h and (xx - x) ** 2 + (yy - y) ** 2 <= r * r + 1:
                    arr[yy, xx] = col


def disc(arr: np.ndarray, cx: int, cy: int, r: int, col: tuple[int, ...]) -> None:
    h, w = arr.shape[:2]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < w and 0 <= y < h and (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.8:
                arr[y, x] = col


def bib_anchor(im: Image.Image) -> tuple[int, int]:
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
    band[int(h * 0.18) : int(h * 0.55), :] = True
    mask = denim & band
    ys, xs = np.where(mask)
    if len(xs) < 8:
        ys, xs = np.where(denim)
    if len(xs) == 0:
        return w // 2, int(h * 0.34)
    return int(np.percentile(xs, 74)), int(np.percentile(ys, 38))


def glove_crop(src: np.ndarray) -> np.ndarray:
    """Tight white-glove chip; drop neighboring denim."""
    chip = src[53:62, 22:34, :].copy()
    rgb = chip[:, :, :3].astype(np.int16)
    white = (rgb[:, :, 0] > 190) & (rgb[:, :, 1] > 190) & (chip[:, :, 3] > 80)
    chip[~white] = 0
    return chip


def sleeve_crop(src: np.ndarray) -> np.ndarray:
    return src[46:54, 20:28, :].copy()


def make_sit(idle: Image.Image, reach: int, glove_dy: int, nod: int) -> Image.Image:
    """Profile sit facing right: hips on a seat, knees bent, hands on a keyboard."""
    src = np.array(idle)
    canvas = np.zeros_like(src)

    # Head/chest/bib only — cut before the hanging gloves.
    torso = src[0:53, :, :].copy()
    rgb = torso[:, :, :3].astype(np.int16)
    white = (rgb[:, :, 0] > 200) & (rgb[:, :, 1] > 200) & (torso[:, :, 3] > 80)
    torso[white] = 0
    paste(canvas, torso, reach // 2, 16 + nod)

    hip_x = 30 + reach // 2
    hip_y = 70 + nod
    # Far leg
    thick(canvas, hip_x - 3, hip_y, hip_x + 7, 81, 4, DENIM_LO)
    thick(canvas, hip_x + 7, 81, hip_x + 5, 96, 3, DENIM_LO)
    # Near thigh + shin (horizontal-ish then down)
    thick(canvas, hip_x - 1, hip_y, hip_x + 13, 79, 5, DENIM)
    thick(canvas, hip_x, hip_y + 1, hip_x + 12, 79, 3, DENIM_HI)
    thick(canvas, hip_x + 13, 79, hip_x + 15, 97, 4, DENIM)
    thick(canvas, hip_x + 14, 80, hip_x + 15, 96, 2, DENIM_HI)
    disc(canvas, hip_x + 13, 79, 3, DENIM_HI)
    disc(canvas, hip_x, hip_y - 1, 6, DENIM)
    disc(canvas, hip_x + 3, hip_y + 1, 5, DENIM_HI)
    shoe = src[88:99, 20:42, :].copy()
    paste(canvas, shoe, hip_x + 1, 88)

    glove = glove_crop(src)
    plaid_a = (196, 150, 84, 255)
    plaid_b = (168, 118, 62, 255)
    shoulder = (hip_x - 6, 56 + nod)
    # Back arm, slightly higher
    thick(canvas, shoulder[0], shoulder[1] + 2, hip_x + 8 + reach, 61 + glove_dy, 2, plaid_b)
    paste(canvas, glove, hip_x + 6 + reach, 59 + glove_dy)
    # Front arm onto the keys
    thick(canvas, shoulder[0] + 3, shoulder[1] + 4, hip_x + 14 + reach, 64 + glove_dy, 2, plaid_a)
    paste(canvas, glove, hip_x + 12 + reach, 62 + glove_dy)

    return Image.fromarray(canvas)


def shift_region(im: Image.Image, x0: int, y0: int, x1: int, y1: int, dx: int, dy: int) -> Image.Image:
    arr = np.array(im)
    h, w = arr.shape[:2]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    chunk = arr[y0:y1, x0:x1].copy()
    arr[y0:y1, x0:x1] = 0
    ny0, nx0 = y0 + dy, x0 + dx
    ch, cw = chunk.shape[:2]
    dest = arr[max(0, ny0) : min(h, ny0 + ch), max(0, nx0) : min(w, nx0 + cw)]
    src = chunk[max(0, -ny0) : max(0, -ny0) + dest.shape[0], max(0, -nx0) : max(0, -nx0) + dest.shape[1]]
    if dest.size and src.size and dest.shape[:2] == src.shape[:2]:
        mask = src[:, :, 3] > 0
        dest[mask] = src[mask]
    return Image.fromarray(arr)


def make_jam(idle: Image.Image, nod: int, hand: int) -> Image.Image:
    """Standing at a low table: slight squat, head nod, gloves on the keys."""
    w, h = idle.size
    nh = int(h * 0.97)
    small = idle.resize((w, nh), Image.Resampling.NEAREST)
    base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    base.paste(small, (2, h - nh + nod), small)
    posed = shift_region(base, 20, 50, 36, 64, 3 + hand, 9)
    arr = np.array(posed)
    # Fill the hole left by moving the gloves with nearby denim.
    for y in range(50, 64):
        for x in range(20, 36):
            if arr[y, x, 3] < 40 and arr[min(h - 1, y + 10), x, 3] > 160:
                arr[y, x] = arr[min(h - 1, y + 10), x]
    return Image.fromarray(arr)


def write_sheet(frames: list[Image.Image], path: Path) -> None:
    sheet = Image.new("RGBA", (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * FRAME_W, 0), fr)
    sheet.save(path)
    print("wrote", path, "frames", len(frames), "size", sheet.size)


def main() -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    frames = load_frames(SHEET)
    base = frames[:22]
    idle = base[0]
    sit_a = make_sit(idle, reach=4, glove_dy=0, nod=0)
    sit_b = make_sit(idle, reach=6, glove_dy=-2, nod=1)
    jam_a = make_jam(idle, nod=0, hand=0)
    jam_b = make_jam(idle, nod=-2, hand=2)
    extras = [sit_a, sit_b, jam_a, jam_b]
    names = ["sit_a", "sit_b", "jam_a", "jam_b"]
    # 0-10 stay put, col 11 is the seated pose, 12-21 tricks, then extra actions.
    out_frames = base[:11] + [sit_a] + base[12:22] + [sit_b, jam_a, jam_b]
    write_sheet(out_frames, SHEET)

    bibs = [bib_anchor(fr) for fr in out_frames]
    scaled = [(round(x * 52 / 64), round(y * 52 / 64)) for x, y in bibs]
    print("BIB_52", scaled)
    print("cols", len(out_frames))
    for name, fr in zip(names, extras):
        fr.resize((FRAME_W * 4, FRAME_H * 4), Image.Resampling.NEAREST).save(PREVIEW / f"{name}@4x.png")
        print(name, "bib", bib_anchor(fr))


if __name__ == "__main__":
    main()
