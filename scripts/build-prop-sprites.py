#!/usr/bin/env python3
"""16-bit playground props, sized for a ~100px mascot.

Warm restrained palette that reads on the cream site and in dark theme.
Each material uses 2–3 shade levels. Contact shadows are baked in.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path("/workspace/public/mascot")
PREVIEW = Path("/tmp/prop-preview")

# Warm folio palette
WOOD_HI = (214, 178, 120, 255)
WOOD = (176, 138, 84, 255)
WOOD_LO = (122, 86, 48, 255)
WOOD_DK = (82, 56, 32, 255)

CREAM_HI = (246, 240, 226, 255)
CREAM = (232, 220, 198, 255)
CREAM_LO = (198, 182, 156, 255)
CREAM_DK = (156, 140, 116, 255)

INK = (44, 40, 36, 255)
INK_MID = (78, 72, 66, 255)
INK_HI = (112, 104, 96, 255)

BRASS_HI = (222, 184, 96, 255)
BRASS = (186, 142, 60, 255)
BRASS_LO = (132, 96, 38, 255)

SCREEN = (24, 32, 36, 255)
SCREEN_HI = (36, 48, 52, 255)
CODE_A = (92, 166, 148, 255)
CODE_B = (198, 154, 92, 255)
CODE_C = (132, 148, 168, 255)
CURSOR = (236, 214, 150, 255)

NET = (174, 166, 152, 255)
NET_DK = (128, 120, 108, 255)

GOAL_HI = (242, 236, 222, 255)
GOAL = (214, 204, 186, 255)
GOAL_LO = (164, 152, 132, 255)
GOAL_DK = (92, 84, 72, 255)

BALL_W = (244, 238, 226, 255)
BALL_G = (210, 204, 192, 255)
BALL_K = (38, 36, 34, 255)
BALL_M = (86, 80, 74, 255)

SHADE = (42, 34, 26, 40)
SHADE2 = (42, 34, 26, 72)

METAL = (96, 92, 86, 255)
METAL_HI = (148, 142, 134, 255)
METAL_LO = (58, 54, 50, 255)

RED_LO = (148, 64, 52, 255)
RED = (176, 82, 64, 255)


class C:
    def __init__(self, w: int, h: int):
        self.w = w
        self.h = h
        self.a = np.zeros((h, w, 4), dtype=np.uint8)

    def put(self, x: int, y: int, c: tuple[int, ...]) -> None:
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = c

    def fill(self, x: int, y: int, w: int, h: int, c: tuple[int, ...]) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.put(xx, yy, c)

    def hline(self, x: int, y: int, w: int, c: tuple[int, ...]) -> None:
        self.fill(x, y, w, 1, c)

    def vline(self, x: int, y: int, h: int, c: tuple[int, ...]) -> None:
        self.fill(x, y, 1, h, c)

    def ellipse(self, cx: int, cy: int, rx: int, ry: int, c: tuple[int, ...]) -> None:
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                if ((x - cx) / max(rx, 0.5)) ** 2 + ((y - cy) / max(ry, 0.5)) ** 2 <= 1.05:
                    self.put(x, y, c)

    def shadow(self, cx: int, cy: int, rx: int, ry: int = 2) -> None:
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                nx = (x - cx) / max(rx, 0.5)
                ny = (y - cy) / max(ry, 0.5)
                d = nx * nx + ny * ny
                if d <= 1.05:
                    a = int(78 * (1 - d * 0.65))
                    if 0 <= x < self.w and 0 <= y < self.h:
                        prev = self.a[y, x]
                        if prev[3] == 0:
                            self.a[y, x] = (42, 34, 26, min(90, a))

    def image(self) -> Image.Image:
        return Image.fromarray(self.a, "RGBA")


def lamp(on: bool) -> Image.Image:
    c = C(26, 96)
    c.shadow(13, 93, 9, 2)
    # base
    c.fill(7, 90, 12, 3, WOOD_LO)
    c.fill(8, 89, 10, 1, WOOD)
    c.fill(9, 91, 8, 2, WOOD_DK)
    c.hline(8, 90, 10, BRASS_LO)
    # pole
    c.vline(12, 26, 64, METAL)
    c.vline(13, 26, 64, METAL_HI)
    c.vline(14, 26, 64, METAL_LO)
    # brass joints
    c.fill(11, 54, 5, 3, BRASS)
    c.hline(11, 54, 5, BRASS_HI)
    c.fill(11, 28, 5, 3, BRASS)
    c.hline(11, 28, 5, BRASS_HI)
    # shade (trapezoid)
    for i, y in enumerate(range(6, 26)):
        t = i / 19
        half = int(10 - t * 3)
        x0 = 13 - half
        w = half * 2 + 1
        col = CREAM_HI if on else CREAM
        lo = CREAM if on else CREAM_LO
        c.hline(x0, y, w, col if i < 3 else lo)
        c.put(x0, y, CREAM_DK)
        c.put(x0 + w - 1, y, CREAM_LO)
        if on and 9 < y < 22:
            inner = max(2, half - 3)
            c.hline(13 - inner, y, inner * 2 + 1, (236, 206, 120, 255) if y % 2 == 0 else (222, 180, 88, 255))
    c.hline(4, 6, 19, BRASS)
    c.hline(5, 5, 17, BRASS_HI)
    if on:
        c.fill(12, 24, 3, 3, (255, 228, 150, 255))
        # warm pixel cone under the shade
        for i, y in enumerate(range(26, 58)):
            t = i / 32
            half = int(5 + t * 9)
            fade = 1 - t
            for x in range(13 - half, 13 + half + 1):
                fall = 1 - abs(x - 13) / max(half, 1) * 0.55
                a = int(88 * fade * fall)
                if a < 10:
                    continue
                prev = c.a[y, x] if 0 <= x < c.w and 0 <= y < c.h else (0, 0, 0, 0)
                if prev[3] == 0:
                    c.put(x, y, (236, 196, 96, min(110, a)))
    else:
        c.fill(12, 24, 3, 2, INK)
    return c.image()


def monitor(c: C, x: int, y: int, coding: bool) -> None:
    # bezel
    c.fill(x, y, 40, 30, INK)
    c.fill(x + 1, y + 1, 38, 28, INK_MID)
    c.fill(x + 3, y + 3, 34, 22, SCREEN)
    c.hline(x + 3, y + 3, 34, SCREEN_HI)
    # code
    rows = [
        (4, 8, CODE_A),
        (6, 16, CODE_B),
        (4, 12, CODE_C),
        (5, 10, CODE_A),
        (8, 14, CODE_B),
        (4, 7, CODE_C),
    ]
    for i, (ox, w, col) in enumerate(rows):
        yy = y + 6 + i * 3
        c.hline(x + 5 + ox, yy, w, col)
        if coding and i == 3:
            c.vline(x + 5 + ox + w + 1, yy - 1, 3, CURSOR)
    # stand
    c.fill(x + 17, y + 29, 6, 4, INK_MID)
    c.fill(x + 12, y + 32, 16, 3, INK)
    c.hline(x + 12, y + 32, 16, INK_HI)


def desk(coding: bool) -> Image.Image:
    c = C(156, 84)
    c.shadow(58, 81, 48, 2)
    c.shadow(128, 81, 16, 2)
    # legs
    for x in (10, 96):
        c.fill(x, 46, 5, 35, WOOD_LO)
        c.vline(x, 46, 35, WOOD)
        c.vline(x + 4, 46, 35, WOOD_DK)
        c.fill(x - 1, 78, 7, 3, WOOD_DK)
    # top
    c.fill(6, 42, 108, 6, WOOD)
    c.hline(6, 42, 108, WOOD_HI)
    c.hline(6, 47, 108, WOOD_LO)
    c.fill(7, 43, 106, 3, WOOD)
    # front apron
    c.fill(8, 48, 104, 4, WOOD_LO)
    # keyboard
    c.fill(28, 40, 36, 4, INK)
    c.hline(29, 41, 34, CREAM)
    for i in range(8):
        c.put(31 + i * 4, 41, CREAM_HI if i % 2 == 0 else CREAM_LO)
    # mug
    c.fill(72, 36, 6, 7, CREAM_LO)
    c.fill(73, 37, 4, 5, CREAM)
    c.hline(73, 37, 4, CREAM_HI)
    c.put(78, 38, WOOD_LO)
    c.put(79, 39, WOOD_LO)
    # monitor
    monitor(c, 22, 8, coding)
    # chair
    cx = 118
    c.fill(cx + 4, 58, 4, 23, WOOD_LO)
    c.fill(cx + 18, 58, 4, 23, WOOD_LO)
    c.vline(cx + 4, 58, 23, WOOD)
    c.vline(cx + 21, 58, 23, WOOD_DK)
    c.fill(cx + 2, 54, 24, 6, WOOD)
    c.hline(cx + 2, 54, 24, WOOD_HI)
    c.fill(cx + 4, 55, 20, 4, CREAM)
    c.hline(cx + 4, 55, 20, CREAM_HI)
    # back — up toward lower chest on a 100px mascot
    c.fill(cx + 19, 10, 8, 46, WOOD)
    c.vline(cx + 19, 10, 46, WOOD_HI)
    c.vline(cx + 26, 10, 46, WOOD_LO)
    c.fill(cx + 17, 8, 12, 5, WOOD_HI)
    c.fill(cx + 6, 68, 16, 2, WOOD_LO)
    return c.image()


def studio(playing: bool) -> Image.Image:
    """Speaker, keyboard, headphones — no extra stands."""
    c = C(108, 72)
    c.shadow(54, 69, 40, 2)
    for x in (12, 86):
        c.fill(x, 42, 5, 26, WOOD_LO)
        c.vline(x, 42, 26, WOOD)
        c.vline(x + 4, 42, 26, WOOD_DK)
        c.fill(x - 1, 65, 7, 3, WOOD_DK)
    c.fill(8, 38, 92, 6, WOOD)
    c.hline(8, 38, 92, WOOD_HI)
    c.hline(8, 43, 92, WOOD_LO)
    c.fill(10, 44, 88, 3, WOOD_LO)
    # speaker
    c.fill(14, 16, 16, 22, INK)
    c.fill(15, 17, 14, 20, INK_MID)
    c.ellipse(22, 28, 4, 4, INK)
    c.ellipse(22, 28, 2, 2, CREAM_LO)
    c.fill(18, 19, 8, 2, RED if playing else INK_HI)
    # keys
    c.fill(34, 32, 40, 7, INK)
    c.hline(34, 32, 40, INK_HI)
    for i in range(9):
        x = 36 + i * 4
        key = CREAM_HI if not (playing and i % 3 == 1) else CREAM_LO
        c.fill(x, 34, 3, 4, key)
        if i in (1, 3, 6, 8):
            c.fill(x + 1, 34, 2, 2, INK)
    # headphones resting on the desk
    c.fill(80, 20, 6, 10, INK)
    c.fill(94, 20, 6, 10, INK)
    c.fill(81, 21, 4, 8, INK_MID)
    c.fill(95, 21, 4, 8, INK_MID)
    for i, y in enumerate(range(14, 22)):
        c.put(84 + i // 2, y, INK_HI)
        c.put(95 - i // 2, y, INK_HI)
    c.hline(86, 20, 8, INK_HI)
    if playing:
        for i, h in enumerate((5, 9, 4, 8)):
            c.fill(38 + i * 5, 28 - h, 3, h, CODE_A if i % 2 == 0 else CODE_B)
    return c.image()


def goal() -> Image.Image:
    """Lower, narrower goal — about mascot height."""
    c = C(56, 88)
    c.shadow(28, 85, 22, 2)

    def post(x: int, y0: int, h: int) -> None:
        c.fill(x, y0, 3, h, GOAL)
        c.vline(x, y0, h, GOAL_HI)
        c.vline(x + 2, y0, h, GOAL_LO)

    post(3, 6, 80)
    post(50, 6, 80)
    c.fill(3, 4, 50, 3, GOAL)
    c.hline(3, 4, 50, GOAL_HI)
    c.hline(3, 6, 50, GOAL_LO)
    c.vline(8, 9, 74, GOAL_LO)
    c.vline(47, 9, 74, GOAL_LO)
    c.hline(8, 9, 40, GOAL_LO)
    for x in range(10, 48, 10):
        for y in range(11, 84):
            if c.a[y, x, 3] == 0:
                c.put(x, y, (*NET[:3], 90))
    for y in range(14, 84, 10):
        for x in range(8, 49):
            if c.a[y, x, 3] == 0:
                c.put(x, y, (*NET_DK[:3], 75))
    c.fill(2, 84, 52, 2, GOAL_DK)
    return c.image()


def ball() -> Image.Image:
    c = C(24, 24)
    cx, cy, r = 12, 11, 11
    for y in range(24):
        for x in range(24):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if d2 <= r * r:
                nx = (x - (cx - 3)) / r
                ny = (y - (cy - 3)) / r
                lit = nx * nx + ny * ny
                if lit < 0.35:
                    col = BALL_W
                elif lit < 0.85:
                    col = BALL_G
                else:
                    col = BALL_M
                c.put(x, y, col)
            elif d2 <= (r + 1.2) ** 2:
                c.put(x, y, BALL_K)
    # classic stitched patches
    def seam(points: list[tuple[int, int]]) -> None:
        for i in range(len(points) - 1):
            x0, y0 = points[i]
            x1, y1 = points[i + 1]
            steps = max(abs(x1 - x0), abs(y1 - y0), 1)
            for s in range(steps + 1):
                c.put(x0 + round((x1 - x0) * s / steps), y0 + round((y1 - y0) * s / steps), BALL_K)

    c.ellipse(12, 8, 2, 2, BALL_K)
    seam([(10, 8), (7, 12), (9, 16)])
    seam([(14, 8), (17, 12), (15, 16)])
    seam([(9, 16), (12, 18), (15, 16)])
    seam([(7, 12), (12, 11), (17, 12)])
    c.shadow(12, 22, 7, 1)
    return c.image()


def sheet_pair(a: Image.Image, b: Image.Image) -> Image.Image:
    img = Image.new("RGBA", (a.width * 2, a.height), (0, 0, 0, 0))
    img.paste(a, (0, 0), a)
    img.paste(b, (a.width, 0), b)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)

    lamp_off = lamp(False)
    lamp_on = lamp(True)
    desk_idle = desk(False)
    desk_code = desk(True)
    studio_idle = studio(False)
    studio_play = studio(True)
    goal_im = goal()
    ball_im = ball()

    sheet_pair(lamp_off, lamp_on).save(OUT / "prop-lamp.png")
    sheet_pair(desk_idle, desk_code).save(OUT / "prop-desk.png")
    sheet_pair(studio_idle, studio_play).save(OUT / "prop-studio.png")
    goal_im.save(OUT / "prop-goal.png")
    ball_im.save(OUT / "prop-ball.png")

    for name, im in {
        "lamp_off": lamp_off,
        "lamp_on": lamp_on,
        "desk_idle": desk_idle,
        "desk_code": desk_code,
        "studio_idle": studio_idle,
        "studio_play": studio_play,
        "goal": goal_im,
        "ball": ball_im,
    }.items():
        im.resize((im.width * 3, im.height * 3), Image.Resampling.NEAREST).save(
            PREVIEW / f"{name}@3x.png"
        )
        print(name, im.size)


if __name__ == "__main__":
    main()
