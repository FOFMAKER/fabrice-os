import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

import { playTone, setStudioBeatMuted, startStudioBeat, stopStudioBeat } from "@/lib/play-tone";

const SIGNATURE = "built by fabrice";
const BALL_R = 13;
const BALL_FRAMES = 4;
const MASCOT_W = 30;
const MASCOT_H = 82;
const SPRITE_W = 52;
const SPRITE_H = 82;
const SPRITE_COLS = 25;
const MARK_W = 11;
const MARK_H = 7;
const GROUND = 18;
const DESK_W = 98;
const DESK_H = 69;
const CHAIR_W = 30;
const CHAIR_H = 46;
const STUDIO_W = 108;
const STUDIO_H = 64;
const LAMP_W = 24;
const LAMP_H = 84;
const LAMP_HIT_W = 44;
const SCENE_H = 168;
const PAD = 10;
const LETTER_W = 7.1;
const CRUISE = 1.35;
const ACCEL = 0.06;
const HERO_SRC = "/mascot/hero.png";
const MARK_SRC = "/mascot/mark-28.png";
const PROP_LAMP = "/mascot/prop-lamp.png";
const PROP_DESK = "/mascot/prop-desk.png";
const PROP_CHAIR = "/mascot/prop-chair.png";
const PROP_STUDIO = "/mascot/prop-studio.png";
const PROP_BALL = "/mascot/prop-ball.png";
const COL_IDLE = 0;
const COL_HOP = 9;
const COL_BEND = 10;
const COL_SIT = 11;
const COL_SIT_B = 22;
const COL_JAM_A = 23;
const COL_JAM_B = 24;
const COL_DRIB_A = 12;
const COL_DRIB_B = 13;
const COL_JUG_L = 14;
const COL_JUG_R = 15;
const COL_JUG_K = 16;
const COL_RAIN_W = 17;
const COL_RAIN_U = 18;
const COL_AROUND = 19;
const COL_HEEL = 20;
const COL_TRAP = 21;
/** Bib-center per sheet column so the cream 28 can be drawn un-mirrored. */
const BIB = [
  { x: 28, y: 32 },
  { x: 28, y: 34 },
  { x: 28, y: 34 },
  { x: 28, y: 32 },
  { x: 31, y: 34 },
  { x: 31, y: 35 },
  { x: 31, y: 35 },
  { x: 28, y: 32 },
  { x: 28, y: 34 },
  { x: 31, y: 34 },
  { x: 16, y: 35 },
  { x: 31, y: 39 },
  { x: 29, y: 34 },
  { x: 32, y: 35 },
  { x: 28, y: 32 },
  { x: 28, y: 32 },
  { x: 29, y: 35 },
  { x: 27, y: 35 },
  { x: 32, y: 33 },
  { x: 30, y: 32 },
  { x: 28, y: 33 },
  { x: 28, y: 35 },
  { x: 32, y: 38 },
  { x: 30, y: 33 },
  { x: 30, y: 32 },
] as const;

type Letter = { ch: string; rot: number };
type Hint = "ball" | "desk" | "lamp" | "studio" | "mascot" | "soccer" | null;
type Activity = "idle" | "walk" | "desk" | "studio" | "soccer" | "fix";
type FixPass = "approach" | "sweep";
type TrickId = "dribble" | "juggle" | "rainbow" | "around";

const TRICK_ORDER: TrickId[] = ["dribble", "juggle", "rainbow", "dribble", "around"];
const TRICK_DUR: Record<TrickId, number> = {
  dribble: 200,
  juggle: 216,
  rainbow: 160,
  around: 150,
};

type Scene = {
  w: number;
  scale: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  ballSpin: number;
  mascotX: number;
  facing: 1 | -1;
  walk: number;
  walkVel: number;
  walkPhase: number;
  idlePhase: number;
  turnT: number;
  bob: number;
  letters: Letter[];
  hint: Hint;
  kicking: boolean;
  hop: number;
  hopVy: number;
  lampOn: boolean;
  coding: number;
  playing: number;
  speech: string;
  speechT: number;
  activity: Activity;
  pending: Activity;
  targetX: number | null;
  lookT: number;
  lifeT: number;
  lift: number;
  hoverMascot: boolean;
  fixIndex: number;
  fixHold: number;
  fixPlayed: boolean;
  lastFixIndex: number;
  fixPass: FixPass;
  letterGuard: number;
  trick: TrickId | null;
  trickT: number;
  trickDur: number;
  trickFromX: number;
  trickCol: number;
  pauseT: number;
  juggleN: number;
  trickI: number;
  queuedTrick: TrickId | null;
};

function knockedLetters(): Letter[] {
  return SIGNATURE.split("").map((ch, i) => ({
    ch,
    rot: ch === " " ? 0 : (i % 2 === 0 ? -1 : 1) * (86 + ((i * 11) % 14)),
  }));
}

function stillLetters(): Letter[] {
  return SIGNATURE.split("").map((ch) => ({ ch, rot: 0 }));
}

function clamp(n: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

function parabola(u: number, h: number) {
  const t = clamp(u, 0, 1);
  return h * 4 * t * (1 - t);
}

function bounce(s: Scene, v: number) {
  if (s.hopVy < v) s.hopVy = v;
}

let colLeftX = PAD;
let sceneScale = 1;

function compactScene(w: number) {
  return w < 520;
}

function showStudio(w: number) {
  return !compactScene(w);
}

function lampX() {
  return colLeftX;
}

function deskX() {
  return lampX() + LAMP_W + 10;
}

function chairX() {
  return deskX() + 42;
}

function sitDeskX() {
  return chairX() - 8;
}

function studioX(w: number) {
  return Math.max(deskX() + DESK_W + 140, w - STUDIO_W - PAD);
}

function sitStudioX(w: number) {
  return studioX(w) + 36;
}

function sceneLeft() {
  return lampX();
}

function sceneRight(w: number) {
  return showStudio(w) ? studioX(w) + STUDIO_W : w - PAD;
}

function pitchLeft() {
  return sitDeskX() + MASCOT_W + 10;
}

function pitchRight(w: number) {
  return (showStudio(w) ? studioX(w) : w - PAD) - MASCOT_W - 8;
}

function lettersInScene(w: number) {
  return !compactScene(w) && pitchRight(w) - pitchLeft() > 200;
}

function letterStart(w: number) {
  return pitchLeft() + 4;
}

function playLeft(w: number) {
  if (lettersInScene(w)) return letterStart(w) + SIGNATURE.length * LETTER_W + 16;
  return pitchLeft();
}

function playRight(w: number) {
  return (showStudio(w) ? studioX(w) : w - PAD) - 44;
}

function pitchHome(w: number) {
  const left = playLeft(w);
  const right = playRight(w) - MASCOT_W;
  return clamp((left + right) / 2, left, right);
}

function ballMaxX(w: number) {
  return playRight(w) - BALL_R;
}

function ballMinX() {
  return sceneLeft() + BALL_R;
}

function footBallX(s: Scene) {
  return s.mascotX + MASCOT_W / 2 + s.facing * (MASCOT_W * 0.38 + 4);
}

function readLayout(playground: HTMLElement | null) {
  if (!playground || typeof document === "undefined") return;
  const pg = playground.getBoundingClientRect();
  const footer = document.querySelector("footer");
  if (footer && !compactScene(playground.clientWidth || 0)) {
    const f = footer.getBoundingClientRect();
    colLeftX = clamp(f.left - pg.left, 0, Math.max(0, playground.clientWidth - 220));
  } else {
    colLeftX = PAD;
  }
}

function letterX(s: Scene, i: number) {
  if (lettersInScene(s.w)) return letterStart(s.w) + i * LETTER_W;
  const left = pitchLeft();
  const right = Math.max(left + 48, pitchRight(s.w));
  const t = SIGNATURE.length <= 1 ? 0 : i / (SIGNATURE.length - 1);
  return left + t * (right - left);
}

function lettersNeedFix(s: Scene) {
  return s.letters.some((l) => l.ch !== " " && Math.abs(l.rot) > 6);
}

function nextFixIndex(s: Scene, from: number) {
  let i = from;
  while (i < s.letters.length && (s.letters[i]!.ch === " " || Math.abs(s.letters[i]!.rot) <= 6)) {
    i += 1;
  }
  return i;
}

function letterEndX(s: Scene) {
  const last = letterX(s, s.letters.length - 1) + 12;
  const beforePlay = playLeft(s.w) - 8;
  return clamp(
    Math.min(last, beforePlay, pitchRight(s.w)),
    sceneLeft(),
    sceneRight(s.w) - MASCOT_W,
  );
}

function letterStartX(s: Scene) {
  return clamp(letterX(s, 0) - MASCOT_W * 0.75, sceneLeft(), sceneRight(s.w) - MASCOT_W);
}

function rightPassedLetters(s: Scene, muted: boolean) {
  if (s.fixPass !== "sweep") return false;
  if (s.fixHold > 0) {
    s.fixHold -= 1;
    s.walkVel *= 0.55;
    return true;
  }
  const i = nextFixIndex(s, s.lastFixIndex);
  if (i >= s.letters.length) return false;
  const hand = s.mascotX + (s.facing === 1 ? MASCOT_W * 0.72 : MASCOT_W * 0.28);
  const lx = letterX(s, i);
  const reached = s.facing === 1 ? hand >= lx - 2 : hand <= lx + 2;
  if (!reached) return false;
  const cur = s.letters[i]!;
  s.letters[i] = { ...cur, rot: 0 };
  s.lastFixIndex = i + 1;
  s.fixIndex = i + 1;
  s.fixHold = 8;
  playTone(muted, 360 + i * 14, 0.03, "square", 0.018);
  if (nextFixIndex(s, s.lastFixIndex) >= s.letters.length) bounce(s, 3.5);
  return true;
}

function sendTo(s: Scene, x: number, next: Activity) {
  if (next === "studio" && !showStudio(s.w)) next = "soccer";
  stopTrick(s);
  s.targetX = clamp(x, sceneLeft(), sceneRight(s.w) - MASCOT_W);
  s.pending = next;
  s.activity = "walk";
  if (next !== "studio") stopStudioBeat();
  if (next !== "fix") {
    s.coding = 0;
    s.playing = 0;
  }
}

function beginFix(s: Scene, replay: boolean, reduced = false) {
  if (reduced) {
    s.letters = stillLetters();
    s.fixPlayed = true;
    return;
  }
  if ((s.activity === "fix" || s.pending === "fix") && !replay) return;
  if (replay || !lettersNeedFix(s)) s.letters = knockedLetters();
  stopTrick(s);
  s.fixIndex = 0;
  s.lastFixIndex = 0;
  s.fixHold = 0;
  s.fixPass = "approach";
  s.pending = "fix";
  s.activity = "walk";
  s.targetX = letterStartX(s);
  s.coding = 0;
  s.playing = 0;
  s.speech = "one sec.";
  s.speechT = 90;
  stopStudioBeat();
}

function dwellFor(next: Activity) {
  if (next === "soccer") return 80;
  if (next === "desk") return 360 + Math.floor(Math.random() * 160);
  if (next === "studio") return 320 + Math.floor(Math.random() * 140);
  return 90;
}

function dropZone(s: Scene): Activity {
  const mx = s.mascotX + MASCOT_W / 2;
  const deskL = deskX();
  const studL = studioX(s.w);
  if (mx >= deskL - 10 && mx <= deskL + DESK_W + 16) return "desk";
  if (showStudio(s.w) && mx >= studL - 10 && mx <= studL + STUDIO_W + 16) return "studio";
  if (mx > playLeft(s.w) - 20 && mx < playRight(s.w) + 12) return "soccer";
  return "idle";
}

function stopTrick(s: Scene) {
  s.trick = null;
  s.trickCol = -1;
  s.kicking = false;
  s.trickT = 0;
}

function parkBall(s: Scene) {
  s.ballVx = 0;
  s.ballVy = 0;
  s.ballX = clamp(footBallX(s), ballMinX(), ballMaxX(s.w));
  s.ballY = GROUND + BALL_R;
}

function startTrick(s: Scene, id: TrickId, muted: boolean) {
  const left = playLeft(s.w);
  const right = playRight(s.w) - MASCOT_W;
  s.mascotX = clamp(s.mascotX, left, right);
  if (id === "dribble") {
    const roomR = right - s.mascotX;
    const roomL = s.mascotX - left;
    if (s.facing === 1 && roomR < 36 && roomL > roomR) s.facing = -1;
    if (s.facing === -1 && roomL < 36 && roomR > roomL) s.facing = 1;
  }
  s.activity = "soccer";
  s.pending = "soccer";
  s.targetX = null;
  s.trick = id;
  s.trickT = 0;
  s.trickDur = TRICK_DUR[id];
  s.trickFromX = s.mascotX;
  s.pauseT = 0;
  s.queuedTrick = null;
  s.coding = 0;
  s.playing = 0;
  s.juggleN = 0;
  s.letterGuard = Math.max(s.letterGuard, 40);
  stopStudioBeat();
  if (id === "dribble") {
    s.speech = "on the ball.";
    s.speechT = 70;
  } else if (id === "rainbow") {
    s.speech = "rainbow.";
    s.speechT = 130;
  } else if (id === "around") {
    s.speech = "around.";
    s.speechT = 80;
  } else {
    s.speech = "";
  }
  playTone(muted, id === "juggle" ? 280 : 220, 0.04, "sine", 0.03);
}

function requestTrick(s: Scene, muted: boolean, prefer?: TrickId) {
  const id = prefer ?? TRICK_ORDER[s.trickI % TRICK_ORDER.length]!;
  if (prefer == null) s.trickI += 1;
  if (s.activity === "desk" || s.activity === "studio" || s.activity === "fix") {
    s.queuedTrick = id;
    sendTo(s, pitchHome(s.w), "soccer");
    return;
  }
  if (s.pending === "fix") return;
  startTrick(s, id, muted);
}

function settle(s: Scene, next: Activity, muted: boolean) {
  s.activity = next;
  s.targetX = null;
  s.pending = next;
  s.walkVel = 0;
  s.lifeT = 0;
  if (next === "desk") {
    stopTrick(s);
    s.mascotX = sitDeskX();
    s.facing = -1;
    s.coding = 80;
    s.speech = "building Park'r.";
    s.speechT = 140;
    stopStudioBeat();
    playTone(muted, 1400, 0.03, "square", 0.025);
  } else if (next === "studio") {
    if (!showStudio(s.w)) {
      s.activity = "soccer";
      s.pending = "soccer";
      s.pauseT = 50;
      stopStudioBeat();
      return;
    }
    stopTrick(s);
    s.mascotX = sitStudioX(s.w);
    s.facing = -1;
    s.playing = 80;
    s.speech = muted ? "unmute me." : "one more bar.";
    s.speechT = 140;
    startStudioBeat(muted);
  } else if (next === "soccer") {
    stopStudioBeat();
    s.pauseT = 36;
    if (s.queuedTrick) {
      const id = s.queuedTrick;
      s.queuedTrick = null;
      startTrick(s, id, muted);
    }
  } else if (next === "fix") {
    s.activity = "fix";
  } else {
    stopStudioBeat();
  }
}

function finishTurn(s: Scene, dir: 1 | -1) {
  if (s.facing === dir && s.turnT <= 0) return true;
  if (s.facing !== dir && s.turnT <= 0) s.turnT = 18;
  s.turnT -= 1;
  if (s.turnT === 9) s.facing = dir;
  if (s.turnT <= 0) {
    s.turnT = 0;
    s.facing = dir;
    return true;
  }
  return false;
}

function easeOutCubic(t: number) {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) ** 3;
}

function moveToward(s: Scene, x: number, cruise = CRUISE) {
  const dist = x - s.mascotX;
  const dir: 1 | -1 = dist >= 0 ? 1 : -1;
  if (!finishTurn(s, dir)) {
    s.walkVel *= 0.72;
    s.bob *= 0.86;
    return false;
  }
  if (Math.abs(dist) < 0.7 && Math.abs(s.walkVel) < 0.26) {
    s.mascotX = x;
    s.walkVel = 0;
    s.bob *= 0.72;
    const rest = Math.round(s.walkPhase);
    s.walkPhase += (rest - s.walkPhase) * 0.28;
    return true;
  }
  const abs = Math.abs(dist);
  const slow = abs < 52 ? easeOutCubic(abs / 52) : 1;
  const cap = Math.max(0.18, cruise * slow);
  const speedNow = Math.abs(s.walkVel);
  const easeIn = 0.42 + 0.58 * Math.min(1, speedNow / Math.max(0.2, cruise) + 0.18);
  s.walkVel += ACCEL * dir * easeIn;
  s.walkVel = clamp(s.walkVel, -cap, cap);
  s.mascotX += s.walkVel;
  const spd = Math.abs(s.walkVel) / Math.max(0.2, cruise);
  s.walkPhase += 0.029 * Math.max(0.28, spd);
  const pose = walkPose(s.walkPhase);
  s.bob = pose.bob * Math.min(1, spd);
  return false;
}

type WalkPose = { l: number; r: number; al: number; ar: number; bob: number };

function walkPose(phase: number): WalkPose {
  const frames: WalkPose[] = [
    { l: 34, r: -24, al: -30, ar: 28, bob: 0.35 },
    { l: 24, r: -10, al: -20, ar: 18, bob: 2.1 },
    { l: 8, r: 5, al: -6, ar: 8, bob: 0.7 },
    { l: -10, r: 22, al: 16, ar: -12, bob: 0.2 },
    { l: -24, r: 34, al: 28, ar: -30, bob: 0.35 },
    { l: -10, r: 24, al: 18, ar: -20, bob: 2.1 },
    { l: 5, r: 8, al: 8, ar: -6, bob: 0.7 },
    { l: 22, r: -10, al: -12, ar: 16, bob: 0.2 },
  ];
  const n = frames.length;
  const p = ((phase % 1) + 1) % 1;
  return frames[Math.floor(p * n) % n]!;
}

function spriteCol({
  sit,
  jam,
  typing,
  bending,
  kicking,
  hop,
  moving,
  walkPhase,
  trickCol,
}: {
  sit: boolean;
  jam: boolean;
  typing: boolean;
  bending: boolean;
  kicking: boolean;
  hop: number;
  moving: boolean;
  walkPhase: number;
  trickCol: number;
}) {
  if (trickCol >= 0) return trickCol;
  if (jam) return typing ? COL_JAM_B : COL_JAM_A;
  if (sit) return typing ? COL_SIT_B : COL_SIT;
  if (bending) return COL_BEND;
  if (kicking || hop > 5) return COL_HOP;
  if (moving) {
    const p = ((walkPhase % 1) + 1) % 1;
    return 1 + (Math.floor(p * 8) % 8);
  }
  return COL_IDLE;
}

function PixelMascot({
  kicking,
  facing,
  sit,
  jam,
  bending,
  hop,
  walkPhase,
  speed,
  idlePhase,
  turnT,
  bob,
  reduced,
  trickCol,
}: {
  kicking: boolean;
  facing: 1 | -1;
  sit: boolean;
  jam: boolean;
  bending: boolean;
  hop: number;
  walkPhase: number;
  speed: number;
  idlePhase: number;
  turnT: number;
  bob: number;
  reduced: boolean;
  trickCol: number;
}) {
  const moving = !sit && !jam && !reduced && speed > 0.16 && !kicking && !bending && trickCol < 0;
  const turning = !reduced && turnT > 0;
  const breath = reduced ? 0 : Math.sin(idlePhase);
  const typing = !reduced && Math.sin(idlePhase * 3.1) > 0;
  const bobY = reduced
    ? 0
    : sit || jam
      ? breath * (jam ? 1.4 : 0.35)
      : moving
        ? bob
        : turning
          ? 0.2
          : breath * 0.55;
  const squash = turning ? 0.84 + 0.16 * (Math.abs(turnT - 9) / 9) : 1;
  const lean = moving ? 3 : turning ? 2 : jam ? 2 : 0;
  const col = spriteCol({ sit, jam, typing, bending, kicking, hop, moving, walkPhase, trickCol });
  const bib = BIB[col] ?? BIB[0]!;
  const markLeft =
    facing === 1 ? bib.x - Math.floor(MARK_W / 2) : SPRITE_W - bib.x - Math.ceil(MARK_W / 2);

  return (
    <div
      aria-hidden
      className="relative overflow-visible"
      style={{
        width: SPRITE_W,
        height: SPRITE_H,
        transform: `translateY(${-bobY}px) scaleX(${squash}) scaleY(${1 + breath * (sit ? 0.008 : 0.012)}) rotate(${lean}deg)`,
        transformOrigin: "center bottom",
      }}
    >
      <div
        style={{
          width: SPRITE_W,
          height: SPRITE_H,
          backgroundImage: `url(${HERO_SRC})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${SPRITE_W * SPRITE_COLS}px ${SPRITE_H}px`,
          backgroundPosition: `${-col * SPRITE_W}px 0px`,
          imageRendering: "pixelated",
          transform: `scaleX(${facing})`,
          transformOrigin: "center bottom",
        }}
      />
      <img
        src={MARK_SRC}
        alt=""
        width={MARK_W}
        height={MARK_H}
        draggable={false}
        className="pointer-events-none absolute"
        style={{
          left: markLeft,
          top: bib.y - Math.floor(MARK_H / 2),
          width: MARK_W,
          height: MARK_H,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

function PixelProp({
  src,
  width,
  height,
  frame = 0,
  frames = 1,
}: {
  src: string;
  width: number;
  height: number;
  frame?: number;
  frames?: number;
}) {
  return (
    <div
      aria-hidden
      className="pixel-prop pointer-events-none"
      style={{
        width,
        height,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${width * frames}px ${height}px`,
        backgroundPosition: `${-frame * width}px 0px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function ContactShadow({
  x,
  y,
  rx,
  opacity = 0.2,
}: {
  x: number;
  y: number;
  rx: number;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        left: x - rx,
        bottom: y - 2,
        width: rx * 2,
        height: 5,
        background: `oklch(0.2 0.02 70 / ${opacity})`,
      }}
    />
  );
}

function MusicNotes({ x, y, t, show }: { x: number; y: number; t: number; show: boolean }) {
  if (!show) return null;
  const notes = [
    { g: "♪", dx: 8, sp: 0.8 },
    { g: "♫", dx: 18, sp: 1.15 },
    { g: "♪", dx: -2, sp: 0.95 },
  ];
  return (
    <>
      {notes.map((n, i) => {
        const phase = (t * n.sp + i * 14) % 54;
        return (
          <span
            key={i}
            aria-hidden
            className="text-ink pointer-events-none absolute z-[12] font-mono text-[11px]"
            style={{
              left: x + n.dx,
              bottom: y + 10 + phase * 0.65,
              opacity: Math.max(0, 1 - phase / 54),
            }}
          >
            {n.g}
          </span>
        );
      })}
    </>
  );
}

function HintChip({ text, x, y, show }: { text: string; x: number; y: number; show: boolean }) {
  return (
    <div
      className="border-line bg-surface text-muted-ink pointer-events-none absolute z-10 rounded-md border px-2 py-1 font-mono text-[10px] whitespace-nowrap lowercase"
      style={{
        left: x,
        bottom: y,
        opacity: show ? 1 : 0,
        transform: "translateX(-50%)",
        transition: "opacity 180ms",
      }}
    >
      {text}
    </div>
  );
}

function SignatureRow({
  letters,
  onActivate,
  onHover,
  className,
  style,
  letterWidth,
}: {
  letters: Letter[];
  onActivate: () => void;
  onHover?: () => void;
  className?: string;
  style?: CSSProperties;
  letterWidth?: number;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="built by fabrice. Activate to straighten the letters."
      className={className}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onPointerEnter={() => onHover?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {letters.map((l, i) => (
        <span
          key={`${l.ch}-${i}`}
          className="inline-block"
          style={{
            width: letterWidth,
            transformOrigin: "center bottom",
            transform: `rotate(${l.rot}deg)`,
            transition: "transform 280ms cubic-bezier(0.2, 0.9, 0.32, 1)",
          }}
        >
          {l.ch === " " ? "\u00A0" : l.ch}
        </span>
      ))}
    </span>
  );
}

function applyTrick(s: Scene, muted: boolean) {
  const id = s.trick;
  if (!id) return;
  s.trickT += 1;
  const t = s.trickT / s.trickDur;
  if (t >= 1) {
    parkBall(s);
    s.trick = null;
    s.trickCol = COL_TRAP;
    s.kicking = false;
    s.pauseT = 70 + Math.floor(Math.random() * 40);
    s.hop = 0;
    s.walkVel = 0;
    if (s.juggleN > 0) {
      s.speech = `${s.juggleN}.`;
      s.speechT = 80;
    }
    return;
  }

  const cx = s.mascotX + MASCOT_W / 2;
  const floor = GROUND + BALL_R;
  const prevX = s.ballX;
  const prevY = s.ballY;

  if (id === "dribble") {
    const dest =
      s.facing === 1
        ? Math.min(s.trickFromX + 56, playRight(s.w) - MASCOT_W)
        : Math.max(s.trickFromX - 56, playLeft(s.w));
    s.mascotX = lerp(s.trickFromX, dest, easeInOut(t));
    s.walkVel = s.mascotX - s.trickFromX > 0 ? 0.8 : -0.8;
    s.walkPhase += 0.028;
    const n = 5;
    const u = t * n;
    const f = u - Math.floor(u);
    const lift = parabola(f, f < 0.5 ? 12 : 7);
    s.ballX = cx + s.facing * (12 + 5 * Math.sin(t * Math.PI * n));
    s.ballY = floor + lift;
    s.kicking = lift > 5;
    s.trickCol = lift > 6 ? COL_DRIB_B : COL_DRIB_A;
    s.hop = 0;
    if (f < 0.08 && lift > 4) playTone(muted, 240, 0.025, "sine", 0.018);
  } else if (id === "juggle") {
    const hits = [
      { h: 38, col: COL_JUG_R },
      { h: 36, col: COL_JUG_L },
      { h: 40, col: COL_JUG_R },
      { h: 36, col: COL_JUG_L },
      { h: 54, col: COL_JUG_K },
      { h: 34, col: COL_JUG_R },
    ];
    const seg = t * hits.length;
    const i = Math.min(hits.length - 1, Math.floor(seg));
    const f = seg - Math.floor(seg);
    const hit = hits[i]!;
    const last = i === hits.length - 1 && f > 0.72;
    s.ballX = cx + s.facing * (last ? lerp(14, 12, (f - 0.72) / 0.28) : 15);
    s.ballY = last
      ? lerp(floor + parabola(0.72, hit.h), floor, (f - 0.72) / 0.28)
      : floor + parabola(f, hit.h);
    s.trickCol = last ? COL_TRAP : hit.col;
    s.kicking = !last && (f < 0.18 || f > 0.82);
    s.hop = !last && f < 0.2 ? 2.2 : 0;
    s.walkVel = 0;
    if (f < 0.06 && s.juggleN === i) {
      s.juggleN = i + 1;
      s.speech = `${s.juggleN}.`;
      s.speechT = 40;
      playTone(muted, 300 + i * 24, 0.03, "sine", 0.022);
    }
  } else if (id === "rainbow") {
    if (t < 0.2) {
      const u = t / 0.2;
      s.trickCol = COL_RAIN_W;
      s.ballX = cx + s.facing * lerp(12, -14, easeInOut(u));
      s.ballY = floor + parabola(u, 8);
      s.kicking = false;
      s.hop = 0;
    } else if (t < 0.78) {
      const u = (t - 0.2) / 0.58;
      s.trickCol = u < 0.35 ? COL_RAIN_U : u < 0.7 ? COL_HEEL : COL_IDLE;
      s.kicking = u < 0.4;
      s.hop = u < 0.45 ? 6 : 0;
      s.ballX = cx + s.facing * lerp(-14, 18, easeInOut(u));
      s.ballY = floor + parabola(u, MASCOT_H + 16);
    } else {
      const u = (t - 0.78) / 0.22;
      s.trickCol = COL_TRAP;
      s.kicking = false;
      s.hop = 0;
      s.ballX = cx + s.facing * lerp(16, 12, u);
      s.ballY = lerp(floor + 8, floor, easeInOut(u));
    }
    s.walkVel = 0;
  } else {
    if (t < 0.82) {
      const a = easeInOut(t / 0.82) * Math.PI * 2;
      s.trickCol = a < 1.2 ? COL_AROUND : a < 3.4 ? COL_HEEL : COL_JUG_R;
      s.kicking = true;
      s.hop = Math.sin(a) > 0.4 ? 2 : 0;
      s.ballX = cx + s.facing * (13 * Math.cos(a));
      s.ballY = floor + 8 + 20 * Math.max(0, Math.sin(a));
    } else {
      const u = (t - 0.82) / 0.18;
      s.trickCol = COL_TRAP;
      s.kicking = false;
      s.hop = 0;
      s.ballX = lerp(s.ballX, cx + s.facing * 12, u);
      s.ballY = lerp(s.ballY, floor, easeInOut(u));
    }
    s.walkVel = 0;
  }

  s.ballX = clamp(s.ballX, ballMinX(), ballMaxX(s.w));
  s.ballY = Math.max(floor, s.ballY);
  s.ballSpin += Math.hypot(s.ballX - prevX, s.ballY - prevY) * 7;
}

function poseForReduced(s: Scene) {
  s.walkVel = 0;
  s.bob = 0;
  s.turnT = 0;
  s.hop = 0;
  s.hopVy = 0;
  stopTrick(s);
  s.activity = "soccer";
  s.pending = "soccer";
  s.targetX = null;
  s.mascotX = pitchHome(s.w);
  s.facing = 1;
  parkBall(s);
  s.letters = stillLetters();
}

function initialScene(light: boolean): Scene {
  return {
    w: 720,
    scale: 1,
    ballX: 320,
    ballY: GROUND + BALL_R,
    ballVx: 0,
    ballVy: 0,
    ballSpin: 0,
    mascotX: sitDeskX(),
    facing: -1,
    walk: 0,
    walkVel: 0,
    walkPhase: 0,
    idlePhase: 0,
    turnT: 0,
    bob: 0,
    letters: stillLetters(),
    hint: null,
    kicking: false,
    hop: 0,
    hopVy: 0,
    lampOn: !light,
    coding: 80,
    playing: 0,
    speech: "building Park'r.",
    speechT: 140,
    activity: "desk",
    pending: "desk",
    targetX: null,
    lookT: 220,
    lifeT: 0,
    lift: 0,
    hoverMascot: false,
    fixIndex: 0,
    fixHold: 0,
    fixPlayed: false,
    lastFixIndex: 0,
    fixPass: "approach",
    letterGuard: 0,
    trick: null,
    trickT: 0,
    trickDur: 0,
    trickFromX: 0,
    trickCol: -1,
    pauseT: 0,
    juggleN: 0,
    trickI: 0,
    queuedTrick: null,
  };
}

export function SoccerPlayground({
  muted,
  light,
  onTheme,
  captionClock,
}: {
  muted: boolean;
  light: boolean;
  onTheme: (light: boolean) => void;
  goalAnchor?: RefObject<HTMLAnchorElement | null>;
  captionClock?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const drag = useRef<"ball" | "mascot" | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const visible = useRef(true);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const reducedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setStudioBeatMuted(muted);
  }, [muted]);

  const [frame, setFrame] = useState<Scene>(() => initialScene(light));

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = mq.matches;
    reducedRef.current = reducedMotion;
    setReduced(reducedMotion);
    const onMq = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      const sc = scene.current;
      if (sc && mq.matches) poseForReduced(sc);
    };
    mq.addEventListener("change", onMq);

    const measure = () => {
      const clientW = el.clientWidth || 720;
      sceneScale = 1;
      const w = clientW;
      readLayout(el);
      const s = scene.current;
      if (s) {
        s.w = w;
        s.scale = sceneScale;
        if (s.activity === "studio" && !showStudio(w)) {
          s.activity = "soccer";
          s.pending = "soccer";
          s.playing = 0;
          stopStudioBeat();
        }
        if (drag.current == null && s.targetX == null && !s.trick) {
          if (s.activity === "desk") s.mascotX = sitDeskX();
          else if (s.activity === "studio") s.mascotX = sitStudioX(w);
        }
        if (drag.current !== "ball" && s.ballY < GROUND + BALL_R) s.ballY = GROUND + BALL_R;
      } else {
        const next = initialScene(light);
        next.w = w;
        next.scale = sceneScale;
        next.mascotX = sitDeskX();
        next.ballX = pitchHome(w) + MASCOT_W;
        next.ballY = GROUND + BALL_R;
        if (reducedMotion) poseForReduced(next);
        scene.current = next;
      }
    };
    measure();
    setReady(true);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const align = () => readLayout(root.current);
    align();
    const alignRo = new ResizeObserver(align);
    alignRo.observe(el);
    window.addEventListener("resize", align);

    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry?.isIntersecting ?? false;
      const s = scene.current;
      if (!s || !entry?.isIntersecting) return;
      if (reducedRef.current) {
        poseForReduced(s);
        s.fixPlayed = true;
        return;
      }
      if (!s.fixPlayed) {
        s.fixPlayed = true;
        beginFix(s, false, reducedRef.current);
      }
    });
    io.observe(el);

    let raf = 0;
    const tick = () => {
      const s = scene.current;
      if (s && visible.current) {
        readLayout(root.current);
        step(s, drag.current, mutedRef.current, reducedRef.current);
        setFrame({ ...s, letters: s.letters.map((l) => ({ ...l })) });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      alignRo.disconnect();
      window.removeEventListener("resize", align);
      mq.removeEventListener("change", onMq);
      io.disconnect();
      stopStudioBeat();
    };
  }, []);

  useEffect(() => {
    if (scene.current) scene.current.lampOn = !light;
  }, [light]);

  const tap = useRef(true);

  const replayLetters = () => {
    const s = scene.current;
    if (!s) return;
    if (reducedRef.current) {
      s.letters = stillLetters();
      return;
    }
    beginFix(s, true, reducedRef.current);
  };

  const hoverLetters = () => {
    const s = scene.current;
    if (!s || reducedRef.current) return;
    if (lettersNeedFix(s)) beginFix(s, false, false);
  };

  const onPointerDown = (kind: "ball" | "mascot") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = kind;
    tap.current = true;
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    const s = scene.current;
    if (!s) return;
    s.hint = null;
    s.lift = kind === "mascot" ? 10 : 0;
    s.targetX = null;
    if (kind === "mascot") stopTrick(s);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = scene.current;
    const kind = drag.current;
    if (!s || !kind) return;
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    const sc = s.scale || 1;
    const x = (e.clientX - rect.left) / sc;
    const y = (rect.height - (e.clientY - rect.top)) / sc;
    const now = performance.now();
    if (Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y) > 5) tap.current = false;
    if (kind === "ball") {
      s.ballX = clamp(x, ballMinX(), ballMaxX(s.w));
      s.ballY = clamp(y, GROUND + BALL_R, GROUND + MASCOT_H + 24);
      s.ballVx = 0;
      s.ballVy = 0;
      stopTrick(s);
    } else {
      const prevX = s.mascotX;
      s.mascotX = clamp(x - MASCOT_W / 2, sceneLeft(), sceneRight(s.w) - MASCOT_W);
      s.walkVel = s.mascotX - prevX;
      s.walkPhase += 0.08 * Math.min(1.4, Math.abs(s.walkVel) / CRUISE);
      s.facing = e.clientX >= last.current.x ? 1 : -1;
      s.activity = "walk";
      s.targetX = null;
      s.lift = 10;
      stopStudioBeat();
      const zone = dropZone(s);
      s.hint =
        zone === "desk"
          ? "desk"
          : zone === "studio"
            ? "studio"
            : zone === "soccer"
              ? "soccer"
              : null;
    }
    last.current = { x: e.clientX, y: e.clientY, t: now };
  };

  const onPointerUp = () => {
    const s = scene.current;
    const kind = drag.current;
    drag.current = null;
    if (!s) return;
    if (kind === "mascot") {
      s.lift = 0;
      s.hint = null;
      s.walkVel = 0;
      if (tap.current) {
        if (reducedRef.current) {
          s.speech = pickLine();
          s.speechT = 100;
        } else {
          requestTrick(s, mutedRef.current);
        }
      } else {
        const zone = dropZone(s);
        if (zone === "idle") {
          const inPitch = s.mascotX > playLeft(s.w) - 20 && s.mascotX < playRight(s.w) + 20;
          settle(s, inPitch ? "soccer" : "idle", mutedRef.current);
        } else {
          settle(s, zone, mutedRef.current);
        }
      }
    } else if (kind === "ball") {
      if (tap.current && !reducedRef.current) {
        const pick: TrickId = s.trickI % 2 === 0 ? "juggle" : "rainbow";
        s.trickI += 1;
        requestTrick(s, mutedRef.current, pick);
      } else {
        s.ballY = Math.max(s.ballY, GROUND + BALL_R);
      }
    }
  };

  const onGroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    const s = scene.current;
    const rect = root.current?.getBoundingClientRect();
    if (!s || !rect) return;
    const x = (e.clientX - rect.left) / s.scale - MASCOT_W / 2;
    const mid = x + MASCOT_W / 2;
    const next: Activity =
      mid > playLeft(s.w) - 10 && mid < playRight(s.w) + 10 ? "soccer" : "idle";
    sendTo(s, x, next);
  };

  const s = frame;
  const dx = deskX();
  const sx = studioX(s.w);
  const sit = s.activity === "desk" || s.activity === "studio";
  const inSceneLetters = lettersInScene(s.w);
  const studioVisible = showStudio(s.w);
  const lampCX = lampX() + LAMP_W / 2;
  const deskCX = dx + DESK_W / 2;
  const studioCX = sx + STUDIO_W / 2;
  const mascotCX = s.mascotX + MASCOT_W / 2;
  const ballH = Math.max(0, s.ballY - (GROUND + BALL_R));
  const ballShadow = clamp(1 - ballH / 86, 0.32, 1);
  const place =
    s.activity === "desk"
      ? "he's at the desk."
      : s.activity === "studio"
        ? "he's in the studio."
        : s.activity === "soccer" || s.trick
          ? "he's on the pitch."
          : s.activity === "fix" || s.pending === "fix"
            ? "he's setting type."
            : "he's around.";

  const sc = s.scale || 1;

  return (
    <>
      <div className="relative mt-4 w-full overflow-x-clip">
        <div
          ref={root}
          className="relative w-full overflow-hidden"
          style={{ height: SCENE_H * sc }}
        >
          <div
            className="relative select-none touch-none"
            style={{
              width: s.w,
              height: SCENE_H,
              transform: `scale(${sc})`,
              transformOrigin: "top left",
            }}
            aria-label="Playground. He juggles in the open floor. Grab him or click a spot. Tap the signature to straighten the letters."
            onPointerDown={onGroundPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: sceneLeft() - 6,
                width: Math.max(140, sceneRight(s.w) - sceneLeft() + 12),
                bottom: GROUND - 4,
                height: 6,
              }}
            >
              <div className="bg-ink/25 h-px w-full" />
              <div className="bg-ink/12 h-px w-full" />
              <div className="bg-ink/[0.07] h-[3px] w-full" />
            </div>
            <ContactShadow x={lampCX} y={GROUND} rx={10} />
            <ContactShadow x={deskCX} y={GROUND} rx={24} />
            <ContactShadow x={chairX() + CHAIR_W / 2} y={GROUND} rx={10} />
            {studioVisible && <ContactShadow x={studioCX} y={GROUND} rx={22} />}
            <ContactShadow x={mascotCX} y={GROUND} rx={12} />
            <ContactShadow
              x={s.ballX}
              y={GROUND}
              rx={BALL_R * 0.72 * ballShadow}
              opacity={0.08 + 0.22 * ballShadow}
            />

            <button
              type="button"
              className="absolute z-[6] cursor-crosshair"
              style={{
                left: lampX() - (LAMP_HIT_W - LAMP_W) / 2,
                bottom: GROUND,
                width: LAMP_HIT_W,
                height: LAMP_H,
              }}
              aria-label={light ? "Turn lamp on, dark mode" : "Turn lamp off, light mode"}
              onClick={() => {
                if (!scene.current) return;
                const nextOn = !scene.current.lampOn;
                scene.current.lampOn = nextOn;
                scene.current.facing = -1;
                scene.current.speech = nextOn ? "dark." : "light.";
                scene.current.speechT = 80;
                onTheme(!nextOn);
                playTone(muted, nextOn ? 880 : 420, 0.06, "sine", 0.035);
              }}
              onPointerEnter={() => {
                if (scene.current) scene.current.hint = "lamp";
              }}
              onPointerLeave={() => {
                if (scene.current) scene.current.hint = null;
              }}
            >
              <div className="flex h-full items-end justify-center">
                <PixelProp
                  src={PROP_LAMP}
                  width={LAMP_W}
                  height={LAMP_H}
                  frames={2}
                  frame={s.lampOn ? 1 : 0}
                />
              </div>
            </button>
            {s.lampOn && (
              <div
                aria-hidden
                className="pointer-events-none absolute z-[5]"
                style={{
                  left: lampX() - 16,
                  bottom: GROUND + 18,
                  width: 56,
                  height: 64,
                  background:
                    "radial-gradient(ellipse at 50% 18%, oklch(0.86 0.14 85 / 0.42), oklch(0.82 0.1 80 / 0.12) 48%, transparent 72%)",
                  clipPath: "polygon(36% 8%, 64% 8%, 92% 100%, 8% 100%)",
                }}
              />
            )}

            <div
              aria-hidden
              className="pointer-events-none absolute z-[8]"
              style={{ left: chairX(), bottom: GROUND, width: CHAIR_W, height: CHAIR_H }}
            >
              <PixelProp src={PROP_CHAIR} width={CHAIR_W} height={CHAIR_H} />
            </div>
            <button
              type="button"
              className="absolute z-[4] cursor-crosshair"
              style={{ left: dx, bottom: GROUND, width: DESK_W, height: DESK_H }}
              aria-label="Coding desk"
              onClick={() => {
                if (!scene.current) return;
                sendTo(scene.current, sitDeskX(), "desk");
                playTone(muted, 1400, 0.03, "square", 0.025);
              }}
              onPointerEnter={() => {
                if (scene.current) scene.current.hint = "desk";
              }}
              onPointerLeave={() => {
                if (scene.current) scene.current.hint = null;
              }}
            >
              <PixelProp
                src={PROP_DESK}
                width={DESK_W}
                height={DESK_H}
                frames={2}
                frame={s.activity === "desk" && Math.floor(s.idlePhase * 7) % 6 !== 0 ? 1 : 0}
              />
            </button>

            <span className="sr-only">{SIGNATURE}</span>
            {inSceneLetters && (
              <SignatureRow
                letters={s.letters}
                onActivate={replayLetters}
                onHover={hoverLetters}
                letterWidth={LETTER_W}
                className="text-muted-ink absolute z-[5] cursor-pointer font-mono text-[11px] whitespace-pre"
                style={{ left: letterStart(s.w), bottom: GROUND }}
              />
            )}

            <div
              className="text-ink absolute z-10 flex touch-none items-end justify-center"
              style={{
                left: s.mascotX - (SPRITE_W - MASCOT_W) / 2,
                bottom: GROUND + s.lift + s.hop + (sit ? 0 : s.bob * 0.2),
                width: SPRITE_W,
                height: MASCOT_H + 10,
                cursor: s.lift > 0 ? "grabbing" : "grab",
                zIndex: 10,
              }}
              onPointerDown={onPointerDown("mascot")}
              onPointerEnter={() => {
                if (scene.current) scene.current.hoverMascot = true;
              }}
              onPointerLeave={() => {
                if (scene.current) scene.current.hoverMascot = false;
              }}
            >
              {(s.hoverMascot || s.lift > 0) && (
                <span
                  aria-hidden
                  className="border-ink/50 pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
                />
              )}
              <PixelMascot
                kicking={s.kicking}
                facing={s.facing}
                sit={s.activity === "desk" && s.lift === 0}
                jam={s.activity === "studio" && s.lift === 0}
                bending={
                  (s.activity === "fix" || s.pending === "fix") &&
                  s.fixPass === "sweep" &&
                  s.fixHold > 0
                }
                hop={s.hop}
                walkPhase={s.walkPhase}
                speed={Math.abs(s.walkVel)}
                idlePhase={s.idlePhase}
                turnT={s.turnT}
                bob={s.bob}
                reduced={reduced}
                trickCol={s.trickCol}
              />
              {s.speech && (
                <span
                  className="border-line bg-surface text-ink pointer-events-none absolute left-1/2 z-10 rounded-md border px-2 py-1 font-mono text-[10px] whitespace-nowrap lowercase"
                  style={{ bottom: MASCOT_H + 14, transform: "translateX(-50%)" }}
                >
                  {s.speech}
                </span>
              )}
            </div>

            <div
              className="text-ink absolute z-20 touch-none"
              style={{
                left: s.ballX - BALL_R - 5,
                bottom: s.ballY - BALL_R,
                width: BALL_R * 2 + 10,
                height: BALL_R * 2 + 10,
                cursor: "grab",
              }}
              onPointerDown={onPointerDown("ball")}
              onPointerEnter={() => {
                if (scene.current) scene.current.hint = "ball";
              }}
              onPointerLeave={() => {
                if (scene.current && !drag.current) scene.current.hint = null;
              }}
            >
              <div className="pointer-events-none flex h-full items-end justify-center">
                <PixelProp
                  src={PROP_BALL}
                  width={BALL_R * 2}
                  height={BALL_R * 2}
                  frames={BALL_FRAMES}
                  frame={
                    Math.floor((((s.ballSpin % 360) + 360) % 360) / (360 / BALL_FRAMES)) %
                    BALL_FRAMES
                  }
                />
              </div>
            </div>

            {studioVisible && (
              <button
                type="button"
                className="text-ink absolute z-[4] cursor-crosshair"
                style={{ left: sx, bottom: GROUND, width: STUDIO_W, height: STUDIO_H }}
                aria-label="Music studio"
                onClick={() => {
                  if (!scene.current) return;
                  sendTo(scene.current, sitStudioX(scene.current.w), "studio");
                }}
                onPointerEnter={() => {
                  if (scene.current) scene.current.hint = "studio";
                }}
                onPointerLeave={() => {
                  if (scene.current) scene.current.hint = null;
                }}
              >
                <PixelProp
                  src={PROP_STUDIO}
                  width={STUDIO_W}
                  height={STUDIO_H}
                  frames={2}
                  frame={s.activity === "studio" || s.playing > 0 ? 1 : 0}
                />
              </button>
            )}
            <MusicNotes
              x={mascotCX + 8}
              y={GROUND + MASCOT_H - 8}
              t={s.lifeT}
              show={s.activity === "studio" && s.lift === 0 && !reduced}
            />

            {ready && (
              <>
                <HintChip
                  text="grab."
                  x={mascotCX}
                  y={GROUND + MASCOT_H + 10}
                  show={s.hoverMascot && s.lift === 0 && !s.speech}
                />
                <HintChip
                  text="light."
                  x={lampCX}
                  y={GROUND + LAMP_H + 8}
                  show={s.hint === "lamp"}
                />
                <HintChip
                  text="the work."
                  x={deskCX}
                  y={GROUND + DESK_H + 8}
                  show={s.hint === "desk" && s.lift === 0}
                />
                <HintChip
                  text="drop to code."
                  x={deskCX}
                  y={GROUND + DESK_H + 8}
                  show={s.hint === "desk" && s.lift > 0}
                />
                <HintChip
                  text="try a trick."
                  x={s.ballX}
                  y={s.ballY + 14}
                  show={s.hint === "ball"}
                />
                <HintChip
                  text="drop to play."
                  x={mascotCX}
                  y={GROUND + MASCOT_H + 8}
                  show={s.hint === "soccer" && s.lift > 0}
                />
                {studioVisible && (
                  <>
                    <HintChip
                      text="after hours."
                      x={studioCX}
                      y={GROUND + STUDIO_H + 8}
                      show={s.hint === "studio" && s.lift === 0}
                    />
                    <HintChip
                      text="drop to make music."
                      x={studioCX}
                      y={GROUND + STUDIO_H + 8}
                      show={s.hint === "studio" && s.lift > 0}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {(captionClock || !inSceneLetters) && (
        <div className="mt-2 text-center">
          {!inSceneLetters && (
            <SignatureRow
              letters={s.letters}
              onActivate={replayLetters}
              onHover={hoverLetters}
              letterWidth={7.4}
              className="text-muted-ink mb-2 flex h-10 w-full cursor-pointer items-end justify-center overflow-visible font-mono text-[11px] leading-none whitespace-nowrap"
            />
          )}
          <p className="text-muted-ink font-mono text-[11px] lowercase">
            {captionClock ? `${captionClock} ${place}` : place}
          </p>
        </div>
      )}
    </>
  );
}

function pickLine() {
  const mascot = ["make it obvious.", "one more touch.", "ship it.", "trust the scan."];
  return mascot[Math.floor(Math.random() * mascot.length)] ?? "ship it.";
}

function step(s: Scene, dragging: "ball" | "mascot" | null, muted: boolean, reduced = false) {
  const sitting = s.activity === "desk" || s.activity === "studio";
  const fixing = s.activity === "fix" || s.pending === "fix";

  if (s.speechT > 0) s.speechT -= 1;
  else s.speech = "";
  if (s.playing > 0) s.playing -= 1;
  if (s.coding > 0) s.coding -= 1;
  if (s.trickCol === COL_TRAP && !s.trick) {
    s.pauseT = Math.max(s.pauseT, 1);
    if (s.pauseT === 1) s.trickCol = -1;
  }
  if (sitting) {
    s.hop = 0;
    s.hopVy = 0;
  } else if (!s.trick && (s.hop > 0 || s.hopVy !== 0)) {
    s.hop += s.hopVy;
    s.hopVy -= 0.4;
    if (s.hop <= 0) {
      s.hop = 0;
      s.hopVy = 0;
    }
  }
  s.idlePhase += reduced ? 0 : 0.04;

  if (s.activity === "desk") s.coding = Math.max(s.coding, 4);
  if (s.activity === "studio") s.playing = Math.max(s.playing, 4);

  if (reduced) {
    poseForReduced(s);
  } else if (dragging === "mascot") {
    s.walk += 0.16;
  } else if (s.trick) {
    applyTrick(s, muted);
  } else if (s.targetX != null) {
    s.activity = "walk";
    const pushing = fixing ? rightPassedLetters(s, muted) : false;
    const arrived = moveToward(s, s.targetX, pushing ? 0.22 : fixing ? 1.05 : CRUISE);
    if (arrived) {
      if (s.pending === "fix") {
        if (s.fixPass === "approach") {
          s.fixPass = "sweep";
          s.targetX = letterEndX(s);
          bounce(s, 2.6);
        } else {
          s.letters = s.letters.map((l) => (l.ch === " " ? l : { ...l, rot: 0 }));
          s.speech = "there.";
          s.speechT = 100;
          s.fixPass = "approach";
          s.fixHold = 42;
          s.activity = "fix";
          s.pending = "soccer";
          s.targetX = null;
          s.walkVel = 0;
          s.letterGuard = 200;
          bounce(s, 3.6);
        }
      } else {
        settle(s, s.pending, muted);
      }
    }
  } else if (s.activity === "fix" && s.targetX == null) {
    s.walkVel *= 0.78;
    s.bob *= 0.85;
    if (s.fixHold > 0) s.fixHold -= 1;
    else sendTo(s, pitchHome(s.w), "soccer");
  } else if (s.activity === "soccer" && !reduced) {
    if (s.pauseT > 0) {
      s.pauseT -= 1;
      s.walkVel *= 0.8;
      s.bob *= 0.86;
      s.trickCol = s.pauseT > 12 ? COL_TRAP : -1;
      parkBall(s);
    } else {
      startTrick(s, TRICK_ORDER[s.trickI % TRICK_ORDER.length]!, muted);
      s.trickI += 1;
    }
  } else if (sitting) {
    s.lifeT += 1;
    s.walkVel = 0;
    s.bob = 0;
    if (s.activity === "desk" && s.lifeT % 42 === 0) playTone(muted, 1400, 0.02, "square", 0.012);
    if (s.activity === "desk" && s.lifeT % 520 === 0 && s.speechT <= 0) {
      s.speech = Math.random() < 0.55 ? "building Park'r." : pickLine();
      s.speechT = 130;
    }
    if (s.lifeT > dwellFor(s.activity) && s.targetX == null) {
      sendTo(s, pitchHome(s.w), "soccer");
    }
  } else {
    s.walkVel *= 0.84;
    s.bob *= 0.9;
    s.lookT -= 1;
    if (s.lookT <= 0) {
      finishTurn(s, s.facing === 1 ? -1 : 1);
      if (s.turnT <= 0) s.lookT = 220 + Math.floor(Math.random() * 240);
    }
  }

  if (!s.trick) s.kicking = false;

  if (dragging !== "ball" && !s.trick) {
    s.ballVy -= 0.42;
    s.ballX += s.ballVx;
    s.ballY += s.ballVy;
    s.ballVx *= 0.988;
    s.ballSpin += s.ballVx * 6;
    const floor = GROUND + BALL_R;
    if (s.ballY <= floor) {
      s.ballY = floor;
      if (s.ballVy < 0) s.ballVy *= -0.52;
      s.ballVx *= 0.9;
      if (Math.abs(s.ballVy) < 0.32) s.ballVy = 0;
    }
    if (s.ballX < ballMinX()) {
      s.ballX = ballMinX();
      s.ballVx *= -0.65;
    }
    if (s.ballX > ballMaxX(s.w)) {
      s.ballX = ballMaxX(s.w);
      s.ballVx *= -0.65;
    }
    if (s.ballY > GROUND + MASCOT_H + 28) {
      s.ballY = GROUND + MASCOT_H + 28;
      s.ballVy *= -0.4;
    }
  }

  if (s.letterGuard > 0) s.letterGuard -= 1;
  if (!fixing && !reduced && s.letterGuard <= 0) {
    const mx = s.mascotX + MASCOT_W / 2;
    const start = lettersInScene(s.w) ? letterStart(s.w) : -9999;
    s.letters = s.letters.map((l, i) => {
      if (l.ch === " " || Math.abs(l.rot) > 6) return l;
      const lx = start + i * LETTER_W;
      const hitBall =
        lettersInScene(s.w) &&
        Math.abs(s.ballX - lx) < 7 &&
        s.ballY < GROUND + BALL_R + 8 &&
        Math.abs(s.ballVx) > 0.9;
      const hitMascot =
        lettersInScene(s.w) &&
        !sitting &&
        !s.trick &&
        Math.abs(mx - lx) < 8 &&
        Math.abs(s.walkVel) > 0.55;
      if (hitBall || hitMascot) {
        const dir = (hitBall ? s.ballX < lx : mx < lx) ? 1 : -1;
        return { ...l, rot: dir * (76 + Math.min(18, Math.abs(s.ballVx) * 4)) };
      }
      return l;
    });
  }
}
