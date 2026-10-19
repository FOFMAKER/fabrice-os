#!/usr/bin/env python3
"""16-bit playground props, sized for a ~100px mascot.

Warm restrained palette that reads on the cream site and in dark theme.
Each material uses 2–3 shade levels. Contact shadows are baked in.
"""

from __future__ import annotations

import math
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

BALL_W = (248, 244, 236, 255)
BALL_W2 = (226, 220, 208, 255)
BALL_W3 = (186, 178, 164, 255)
BALL_K = (28, 26, 24, 255)
BALL_K2 = (48, 44, 40, 255)
BALL_SEAM = (22, 20, 18, 255)
BALL_HI = (255, 252, 246, 255)

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
    """Monitor + keyboard desk. Chair is a separate prop so the mascot can sit on it."""
    c = C(120, 84)
    c.shadow(52, 81, 42, 2)
    for x in (10, 84):
        c.fill(x, 46, 5, 35, WOOD_LO)
        c.vline(x, 46, 35, WOOD)
        c.vline(x + 4, 46, 35, WOOD_DK)
        c.fill(x - 1, 78, 7, 3, WOOD_DK)
    c.fill(6, 42, 96, 6, WOOD)
    c.hline(6, 42, 96, WOOD_HI)
    c.hline(6, 47, 96, WOOD_LO)
    c.fill(7, 43, 94, 3, WOOD)
    c.fill(8, 48, 92, 4, WOOD_LO)
    c.fill(28, 40, 36, 4, INK)
    c.hline(29, 41, 34, CREAM)
    for i in range(8):
        key = CREAM_HI if not (coding and i % 2 == 0) else CREAM
        c.put(31 + i * 4, 41, key)
        c.put(32 + i * 4, 41, key)
    c.fill(72, 36, 6, 7, CREAM_LO)
    c.fill(73, 37, 4, 5, CREAM)
    c.hline(73, 37, 4, CREAM_HI)
    c.put(78, 38, WOOD_LO)
    c.put(79, 39, WOOD_LO)
    monitor(c, 20, 8, coding)
    return c.image()


def chair() -> Image.Image:
    """Mascot-scaled wood chair: seat ~knee-to-hip, back to mid-torso."""
    c = C(36, 56)
    c.shadow(18, 54, 14, 2)
    # front legs
    c.fill(6, 30, 4, 24, WOOD_LO)
    c.vline(6, 30, 24, WOOD)
    c.vline(9, 30, 24, WOOD_DK)
    c.fill(26, 30, 4, 24, WOOD_LO)
    c.vline(26, 30, 24, WOOD)
    c.vline(29, 30, 24, WOOD_DK)
    c.fill(5, 51, 6, 3, WOOD_DK)
    c.fill(25, 51, 6, 3, WOOD_DK)
    # seat
    c.fill(4, 26, 28, 6, WOOD)
    c.hline(4, 26, 28, WOOD_HI)
    c.hline(4, 31, 28, WOOD_LO)
    c.fill(6, 27, 24, 4, CREAM)
    c.hline(6, 27, 24, CREAM_HI)
    c.fill(7, 28, 22, 2, CREAM_LO)
    # back legs / posts
    c.fill(5, 6, 5, 22, WOOD)
    c.vline(5, 6, 22, WOOD_HI)
    c.vline(9, 6, 22, WOOD_LO)
    c.fill(26, 6, 5, 22, WOOD)
    c.vline(26, 6, 22, WOOD_HI)
    c.vline(30, 6, 22, WOOD_DK)
    # back slats
    c.fill(6, 6, 24, 4, WOOD_HI)
    c.hline(6, 6, 24, CREAM_LO)
    for y in (12, 18):
        c.fill(8, y, 20, 3, WOOD)
        c.hline(8, y, 20, WOOD_HI)
        c.hline(8, y + 2, 20, WOOD_LO)
    return c.image()


def studio(playing: bool) -> Image.Image:
    """Open booth: speaker left, keys in the middle, headphones right.

    Low table so a standing mascot in front stays fully readable.
    """
    c = C(108, 64)
    c.shadow(54, 61, 40, 2)
    for x in (10, 88):
        c.fill(x, 38, 5, 22, WOOD_LO)
        c.vline(x, 38, 22, WOOD)
        c.vline(x + 4, 38, 22, WOOD_DK)
        c.fill(x - 1, 57, 7, 3, WOOD_DK)
    c.fill(6, 34, 96, 6, WOOD)
    c.hline(6, 34, 96, WOOD_HI)
    c.hline(6, 39, 96, WOOD_LO)
    c.fill(8, 40, 92, 3, WOOD_LO)
    # speaker
    c.fill(12, 12, 16, 22, INK)
    c.fill(13, 13, 14, 20, INK_MID)
    c.ellipse(20, 24, 4, 4, INK)
    c.ellipse(20, 24, 2, 2, CREAM_LO)
    c.fill(16, 15, 8, 2, RED if playing else INK_HI)
    # keys / MPC
    c.fill(32, 28, 42, 7, INK)
    c.hline(32, 28, 42, INK_HI)
    for i in range(9):
        x = 34 + i * 4
        key = CREAM_HI if not (playing and i % 3 == 1) else CREAM_LO
        c.fill(x, 30, 3, 4, key)
        if i in (1, 3, 6, 8):
            c.fill(x + 1, 30, 2, 2, INK)
    # headphones on the right
    c.fill(80, 16, 6, 10, INK)
    c.fill(94, 16, 6, 10, INK)
    c.fill(81, 17, 4, 8, INK_MID)
    c.fill(95, 17, 4, 8, INK_MID)
    for i, y in enumerate(range(10, 18)):
        c.put(84 + i // 2, y, INK_HI)
        c.put(95 - i // 2, y, INK_HI)
    c.hline(86, 16, 8, INK_HI)
    if playing:
        for i, h in enumerate((5, 9, 4, 8)):
            c.fill(36 + i * 5, 24 - h, 3, h, CODE_A if i % 2 == 0 else CODE_B)
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


def _norm(v: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = v
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    return (x / n, y / n, z / n)


def _dot(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _rot(v: tuple[float, float, float], axis: tuple[float, float, float], ang: float) -> tuple[float, float, float]:
    ax = _norm(axis)
    c, s = math.cos(ang), math.sin(ang)
    d = _dot(ax, v)
    cr = _cross(ax, v)
    return (
        v[0] * c + cr[0] * s + ax[0] * d * (1 - c),
        v[1] * c + cr[1] * s + ax[1] * d * (1 - c),
        v[2] * c + cr[2] * s + ax[2] * d * (1 - c),
    )


def _soccer_faces() -> list[tuple[tuple[float, float, float], bool]]:
    """Pentagon (True) and hexagon (False) face centers of a truncated icosahedron."""
    phi = (1 + math.sqrt(5)) / 2
    verts: list[tuple[float, float, float]] = []
    for s1 in (-1.0, 1.0):
        for s2 in (-1.0, 1.0):
            verts.append(_norm((0.0, s1, s2 * phi)))
            verts.append(_norm((s1, s2 * phi, 0.0)))
            verts.append(_norm((s1 * phi, 0.0, s2)))
    dists: list[tuple[float, int, int]] = []
    for i in range(len(verts)):
        for j in range(i + 1, len(verts)):
            dx = verts[i][0] - verts[j][0]
            dy = verts[i][1] - verts[j][1]
            dz = verts[i][2] - verts[j][2]
            dists.append((math.sqrt(dx * dx + dy * dy + dz * dz), i, j))
    edge_len = min(d for d, _, _ in dists)
    edges: set[tuple[int, int]] = set()
    adj: list[set[int]] = [set() for _ in verts]
    for d, i, j in dists:
        if d < edge_len * 1.15:
            edges.add((i, j))
            adj[i].add(j)
            adj[j].add(i)
    faces: list[tuple[tuple[float, float, float], bool]] = [(v, True) for v in verts]
    seen: set[tuple[int, int, int]] = set()
    for i, j in edges:
        for k in adj[i] & adj[j]:
            tri = tuple(sorted((i, j, k)))
            if tri in seen:
                continue
            seen.add(tri)
            cx = verts[i][0] + verts[j][0] + verts[k][0]
            cy = verts[i][1] + verts[j][1] + verts[k][1]
            cz = verts[i][2] + verts[j][2] + verts[k][2]
            faces.append((_norm((cx, cy, cz)), False))
    # Aim a pentagon at the camera, slightly above center.
    pent = max((c for c, pent in faces if pent), key=lambda c: c[2])
    aim = _norm((0.08, 0.22, 1.0))
    axis = _cross(pent, aim)
    if math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2) > 1e-6:
        ang = math.acos(max(-1.0, min(1.0, _dot(pent, aim))))
        faces = [(_rot(c, axis, ang), p) for c, p in faces]
    return faces


_SOCCER_FACES = _soccer_faces()


def ball_frame(tumble: float) -> Image.Image:
    """Classic Telstar ball. Lighting is fixed; only the panels rotate."""
    size = 32
    c = C(size, size)
    cx = cy = (size - 1) / 2
    r = size / 2 - 1.15
    light = _norm((-0.52, 0.62, 0.48))  # top-left, toward camera (y up)
    axis = _norm((0.35, 0.92, 0.18))
    faces = [(_rot(cen, axis, tumble), pent) for cen, pent in _SOCCER_FACES]
    for y in range(size):
        for x in range(size):
            # image y down → 3D y up
            nx = (x - cx) / r
            ny = -(y - cy) / r
            rr = nx * nx + ny * ny
            if rr > 1.02:
                continue
            if rr > 1.0:
                c.put(x, y, BALL_K)
                continue
            nz = math.sqrt(max(0.0, 1.0 - min(rr, 1.0)))
            p = _norm((nx, ny, nz))
            best_i = 0
            best_d = -2.0
            second = -2.0
            for i, (cen, _) in enumerate(faces):
                d = _dot(p, cen)
                if d > best_d:
                    second = best_d
                    best_d = d
                    best_i = i
                elif d > second:
                    second = d
            pent = faces[best_i][1]
            seam = best_d - second < 0.072
            ndot = max(0.0, _dot(p, light))
            if pent:
                shade = 0.38 + 0.62 * ndot
                col = tuple(min(255, int(BALL_K2[i] * shade + BALL_K[i] * (1 - shade) * 0.25)) for i in range(3)) + (255,)
            else:
                if ndot > 0.82:
                    base = BALL_HI
                elif ndot > 0.55:
                    base = BALL_W
                elif ndot > 0.28:
                    base = BALL_W2
                else:
                    base = BALL_W3
                col = base
            if seam:
                mix = 0.72
                col = tuple(int(col[i] * (1 - mix) + BALL_SEAM[i] * mix) for i in range(3)) + (255,)
            # rim
            if rr > 0.90:
                t = (rr - 0.90) / 0.10
                col = tuple(int(col[i] * (1 - t) + BALL_K[i] * t) for i in range(3)) + (255,)
            # soft highlight disc, top-left — not rotated with the panels
            hx, hy = nx + 0.38, ny - 0.42
            spec = hx * hx + hy * hy
            if spec < 0.045 and not pent:
                col = BALL_HI
            elif spec < 0.10 and not pent:
                col = tuple(min(255, int(col[i] * 0.45 + BALL_HI[i] * 0.55)) for i in range(3)) + (255,)
            c.put(x, y, col)
    return c.image()


def ball_sheet() -> Image.Image:
    frames = [ball_frame(i * math.pi / 8) for i in range(4)]
    img = Image.new("RGBA", (frames[0].width * 4, frames[0].height), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        img.paste(fr, (i * fr.width, 0), fr)
    return img


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
    chair_im = chair()
    studio_idle = studio(False)
    studio_play = studio(True)
    goal_im = goal()
    ball_im = ball_sheet()

    sheet_pair(lamp_off, lamp_on).save(OUT / "prop-lamp.png")
    sheet_pair(desk_idle, desk_code).save(OUT / "prop-desk.png")
    chair_im.save(OUT / "prop-chair.png")
    sheet_pair(studio_idle, studio_play).save(OUT / "prop-studio.png")
    goal_im.save(OUT / "prop-goal.png")
    ball_im.save(OUT / "prop-ball.png")

    for name, im in {
        "lamp_off": lamp_off,
        "lamp_on": lamp_on,
        "desk_idle": desk_idle,
        "desk_code": desk_code,
        "chair": chair_im,
        "studio_idle": studio_idle,
        "studio_play": studio_play,
        "goal": goal_im,
        "ball0": ball_im.crop((0, 0, 32, 32)),
    }.items():
        im.resize((im.width * 3, im.height * 3), Image.Resampling.NEAREST).save(
            PREVIEW / f"{name}@3x.png"
        )
        print(name, im.size)


if __name__ == "__main__":
    main()
