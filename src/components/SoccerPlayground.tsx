import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

import { playTone, setStudioBeatMuted, startStudioBeat, stopStudioBeat } from "@/lib/play-tone";

const SIGNATURE = "built by fabrice";
const BALL_R = 7;
const MASCOT_W = 28;
const MASCOT_H = 56;
const GROUND = 18;
const GOAL_W = 36;
const GOAL_H = 48;
const DESK_W = 78;
const STUDIO_W = 68;
const LAMP_W = 18;
const PAD = 14;
const LETTER_W = 7.1;
const CRUISE = 1.18;
const ACCEL = 0.055;

let goalLock = false;

type Letter = { ch: string; rot: number };
type Hint = "ball" | "desk" | "lamp" | "studio" | "mascot" | "soccer" | null;
type Activity = "idle" | "walk" | "desk" | "studio" | "soccer" | "fix";
type FixPass = "approach" | "sweep";

type Scene = {
  w: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  mascotX: number;
  facing: 1 | -1;
  walk: number;
  walkVel: number;
  walkPhase: number;
  idlePhase: number;
  turnT: number;
  bob: number;
  score: number;
  letters: Letter[];
  hint: Hint;
  kicking: boolean;
  heading: boolean;
  hop: number;
  hopVy: number;
  lastTouch: "foot" | "head" | null;
  skills: number;
  lampOn: boolean;
  coding: number;
  playing: number;
  speech: string;
  speechT: number;
  activity: Activity;
  pending: Activity;
  targetX: number | null;
  kickCd: number;
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

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clamp(n: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
}

function bounce(s: Scene, v: number) {
  if (s.hopVy < v) s.hopVy = v;
}

let colLeftX = PAD;

function lampX() {
  return colLeftX;
}

function deskX() {
  return lampX() + LAMP_W + 6;
}

function sitDeskX() {
  return deskX() + 48;
}

function studioGap(w: number) {
  return w >= 640 ? 84 : 56;
}

function studioX(w: number) {
  return Math.max(deskX() + DESK_W + GOAL_W + studioGap(w) + 8, w - STUDIO_W - 4);
}

function sitStudioX(w: number) {
  return studioX(w) + 16;
}

function goalX(w: number) {
  const min = deskX() + DESK_W + 20;
  const max = studioX(w) - GOAL_W - studioGap(w);
  return max >= min ? max : min;
}

function sceneLeft() {
  return lampX();
}

function sceneRight(w: number) {
  return studioX(w) + STUDIO_W;
}

function readLayout(playground: HTMLElement | null) {
  if (!playground || typeof document === "undefined") return;
  const pg = playground.getBoundingClientRect();
  const footer = document.querySelector("footer");
  if (footer) {
    const f = footer.getBoundingClientRect();
    colLeftX = clamp(f.left - pg.left, 0, Math.max(0, playground.clientWidth - 220));
  } else {
    colLeftX = PAD;
  }
}

function ballResetX(w: number) {
  return clamp(goalX(w) - 90, pitchLeft() + 20, goalX(w) - 36);
}

function pitchLeft() {
  return deskX() + DESK_W + 6;
}

function pitchRight(w: number) {
  return goalX(w) - MASCOT_W - 4;
}

function netBack(w: number) {
  return goalX(w) + GOAL_W - 1;
}

function ballMaxX(w: number) {
  return netBack(w) - BALL_R;
}

function lettersInScene(w: number) {
  const span = goalX(w) - (deskX() + DESK_W) - 24;
  return w >= 640 && span > SIGNATURE.length * LETTER_W + 8;
}

function letterStart(w: number) {
  const total = SIGNATURE.length * LETTER_W;
  const leftBound = deskX() + DESK_W + 14;
  const rightBound = goalX(w) - 14;
  return leftBound + Math.max(0, (rightBound - leftBound - total) / 2);
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
  const beforeGoal = goalX(s.w) - MASCOT_W - 10;
  return clamp(Math.min(last, beforeGoal), sceneLeft(), sceneRight(s.w) - MASCOT_W);
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
  if (next === "soccer") return 560 + Math.floor(Math.random() * 280);
  if (next === "desk") return 420 + Math.floor(Math.random() * 220);
  if (next === "studio") return 380 + Math.floor(Math.random() * 200);
  return 90;
}

function dropZone(s: Scene): Activity {
  const mx = s.mascotX + MASCOT_W / 2;
  const deskL = deskX();
  const studL = studioX(s.w);
  if (mx >= deskL - 10 && mx <= deskL + DESK_W + 10) return "desk";
  if (mx >= studL - 10 && mx <= studL + STUDIO_W + 10) return "studio";
  if (mx > pitchLeft() - 16 && mx < pitchRight(s.w) + 28) return "soccer";
  if (Math.abs(mx - s.ballX) < 40) return "soccer";
  return "idle";
}

function nearBall(s: Scene, extra = 0) {
  const mx = s.mascotX + MASCOT_W / 2;
  return Math.abs(s.ballX - mx) < 18 + extra;
}

function atHead(s: Scene) {
  const head = GROUND + MASCOT_H - 4;
  return s.ballY > head - 14 && s.ballY < head + 12;
}

function atFoot(s: Scene) {
  return s.ballY <= GROUND + 22;
}

function playContact(s: Scene, muted: boolean, towardGoal = true) {
  if (s.kickCd > 0 || !nearBall(s, 6)) return;
  const gx = goalX(s.w);
  const dir = towardGoal ? Math.sign(gx - s.ballX) || 1 : s.facing;
  const nearGoal = s.ballX > gx - 70;

  if (atHead(s)) {
    s.ballVx = dir * (2.6 + Math.random() * 0.7);
    s.ballVy = 2.1 + Math.random() * 0.6;
    s.heading = true;
    bounce(s, 3.2);
    s.kicking = false;
    s.lastTouch = "head";
    s.skills += 1;
    s.kickCd = 22;
    s.speech = "header.";
    s.speechT = 70;
    playTone(muted, 260, 0.05, "triangle", 0.04);
    return;
  }

  if (!atFoot(s)) return;

  const roll = Math.random();
  s.heading = false;
  s.kicking = true;
  s.lastTouch = "foot";
  if (!nearGoal && roll < 0.34) {
    s.ballVx = dir * (0.35 + Math.random() * 0.4);
    s.ballVy = 4.8 + Math.random() * 0.6;
    s.kickCd = 18;
    s.skills += 1;
    s.speech = "keepy-up.";
    s.speechT = 70;
    playTone(muted, 320, 0.04, "sine", 0.03);
  } else if (!nearGoal && roll < 0.55) {
    s.ballVx = dir * (1.5 + Math.random() * 0.5);
    s.ballVy = 3.6 + Math.random() * 0.5;
    s.kickCd = 20;
    s.skills += 1;
    s.speech = "flick.";
    s.speechT = 70;
    playTone(muted, 240, 0.04, "square", 0.03);
  } else if (nearGoal) {
    s.ballVx = dir * (3.1 + Math.random() * 0.9);
    s.ballVy = 2.8 + Math.random() * 0.5;
    s.kickCd = 32;
    playTone(muted, 180, 0.05, "sine", 0.05);
  } else {
    s.ballVx = dir * (1.35 + Math.random() * 0.45);
    s.ballVy = 1.2;
    s.kickCd = 16;
    playTone(muted, 210, 0.03, "sine", 0.028);
  }
}

function settle(s: Scene, next: Activity, muted: boolean) {
  s.activity = next;
  s.targetX = null;
  s.pending = next;
  s.walkVel = 0;
  s.lifeT = dwellFor(next);
  if (next === "desk") {
    s.mascotX = sitDeskX();
    s.facing = -1;
    s.coding = 80;
    s.speech = "building Park'r.";
    s.speechT = 140;
    stopStudioBeat();
    playTone(muted, 1400, 0.03, "square", 0.025);
  } else if (next === "studio") {
    s.mascotX = sitStudioX(s.w);
    s.facing = 1;
    s.playing = 80;
    s.speech = muted ? "unmute me." : "one more bar.";
    s.speechT = 140;
    startStudioBeat(muted);
  } else if (next === "soccer") {
    stopStudioBeat();
    s.speech = "let's play.";
    s.speechT = 90;
    if (nearBall(s, 16)) playContact(s, muted, true);
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

function PixelMascot({
  kicking,
  heading,
  facing,
  sit,
  walkPhase,
  speed,
  idlePhase,
  turnT,
  bob,
  reduced,
}: {
  kicking: boolean;
  heading: boolean;
  facing: 1 | -1;
  sit: boolean;
  walkPhase: number;
  speed: number;
  idlePhase: number;
  turnT: number;
  bob: number;
  reduced: boolean;
}) {
  const moving = !sit && !reduced && speed > 0.16 && !kicking && !heading;
  const turning = !reduced && turnT > 0;
  const pose = walkPose(walkPhase);
  const breath = reduced ? 0 : Math.sin(idlePhase);
  const shift = sit || moving || reduced || turning ? 0 : Math.sin(idlePhase * 0.42) * 0.9;
  const bobY = reduced ? 0 : sit ? breath * 0.3 : moving ? bob : turning ? 0.2 : breath * 0.5;
  const squash = turning ? 0.78 + 0.22 * (Math.abs(turnT - 9) / 9) : 1;

  const headY = sit ? 6 : heading ? 1 : 1 - bobY * 0.25;
  const hipY = sit ? 22 : 22 - bobY * 0.3;
  const armY = sit ? 15 : 14 - bobY * 0.4;

  const idleLeg = reduced || sit || moving ? 0 : shift * 5;
  const legLRot = sit ? 8 : kicking ? -10 : heading ? 10 : turning ? 10 : moving ? pose.l : idleLeg;
  const legRRot = sit
    ? -6
    : kicking
      ? 42
      : heading
        ? -8
        : turning
          ? -8
          : moving
            ? pose.r
            : -idleLeg * 0.35;
  const armLRot = sit
    ? 22
    : kicking
      ? 18
      : heading
        ? -32
        : turning
          ? 8
          : moving
            ? pose.al
            : 7 + breath * 3;
  const armRRot = sit
    ? -12
    : kicking
      ? -24
      : heading
        ? -24
        : turning
          ? -6
          : moving
            ? pose.ar
            : -5 - breath * 3;

  const lean = heading ? -14 : moving ? 4 : turning ? 3 : shift * 2.2;
  const sleeveH = sit ? 5.5 : 8.2;
  const pantH = sit ? 5.2 : 9.6;
  const shirt = "var(--hero-shirt)";
  const plaid = "var(--hero-plaid)";
  const kerchief = "var(--hero-kerchief)";
  const denim = "var(--hero-denim)";
  const skin = "var(--hero-skin)";
  const shade = "var(--hero-shade)";
  const shoe = "var(--hero-shoe)";
  const stripe = "var(--hero-stripe)";
  const glove = "var(--hero-glove)";
  const hair = "var(--hero-hair)";
  const button = "var(--hero-button)";

  const plaidDots = (x: number, y: number, cols: number, rows: number) => {
    const dots = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if ((r + c) % 2 === 0) {
          dots.push(
            <rect
              key={`${x}-${y}-${r}-${c}`}
              x={x + c * 1.3}
              y={y + r * 1.3}
              width="1.05"
              height="1.05"
              fill={plaid}
            />,
          );
        }
      }
    }
    return dots;
  };

  return (
    <svg
      width={MASCOT_W}
      height={MASCOT_H}
      viewBox="0 0 18 36"
      aria-hidden
      className="overflow-visible"
      style={{
        transform: `scaleX(${facing * squash}) rotate(${lean}deg)`,
        transformOrigin: "center bottom",
        shapeRendering: "crispEdges",
      }}
    >
      <g transform={`translate(${shift}, ${-bobY})`}>
        <g transform={`rotate(${armLRot} 5.4 ${armY})`}>
          <rect x="4.2" y={armY} width="2.4" height={sleeveH} fill={shirt} />
          {plaidDots(4.3, armY + 0.4, 2, sit ? 3 : 5)}
          <rect x="3.8" y={armY + sleeveH - 0.3} width="3.2" height="2.8" fill={glove} />
          <rect
            x="3.8"
            y={armY + sleeveH - 0.3}
            width="3.2"
            height="2.8"
            fill="none"
            stroke={hair}
            strokeWidth="0.3"
          />
        </g>

        <rect x="6.1" y={headY + 12} width="6.2" height={sit ? 8 : 10} fill={shirt} />
        {plaidDots(6.3, headY + 12.2, 4, 3)}
        <rect x="6.2" y={headY + 12.2} width="1.7" height="3.2" fill={denim} />
        <rect x="10.1" y={headY + 12.2} width="1.7" height="3.2" fill={denim} />
        <rect x="6.1" y={headY + 14.2} width="6.2" height={sit ? 6 : 7.2} fill={denim} />
        <rect x="7.2" y={headY + 15.6} width="1.5" height="1.5" fill={button} />
        <rect x="9.6" y={headY + 15.6} width="1.5" height="1.5" fill={button} />

        <rect x="5.3" y={headY + 3.4} width="7.8" height="8.4" fill={skin} />
        <rect x="11.6" y={headY + 6.8} width="1.6" height="4.2" fill={shade} />
        <rect x="5.8" y={headY + 1.6} width="6.8" height="2.6" fill={hair} />
        <rect x="5.2" y={headY + 2.4} width="8" height="2.8" fill={hair} />
        <rect x="4.8" y={headY + 4.2} width="1.6" height="3.6" fill={hair} />
        <rect x="12.2" y={headY + 4.4} width="1.4" height="3.2" fill={hair} />
        <rect x="5.3" y={headY + 4.8} width="7.8" height="1.15" fill={hair} />
        <rect x="7.5" y={headY + 6.5} width="1.25" height="1.5" fill={hair} />
        <rect x="10.4" y={headY + 6.5} width="1.25" height="1.5" fill={hair} />
        <rect x="12.1" y={headY + 7} width="2.6" height="2.5" rx="1.1" fill={shade} />
        <rect x="12.35" y={headY + 7.15} width="1.5" height="1.4" fill={skin} />
        <rect x="5.6" y={headY + 9} width="8.4" height="2.4" fill={hair} />
        <rect x="5" y={headY + 10} width="2.4" height="2" fill={hair} />
        <rect x="12.4" y={headY + 10} width="2.6" height="2" fill={hair} />

        <rect x="5.8" y={headY + 11.6} width="6.6" height="1.6" fill={kerchief} />
        <rect x="11.6" y={headY + 12.4} width="2.2" height="2.4" fill={kerchief} />
        <rect x="12.8" y={headY + 14.2} width="1.4" height="1.8" fill={kerchief} />

        <g transform={`rotate(${armRRot} 12.6 ${armY})`}>
          <rect x="11.4" y={armY} width="2.4" height={sleeveH} fill={shirt} />
          {plaidDots(11.5, armY + 0.4, 2, sit ? 3 : 5)}
          <rect x="11" y={armY + sleeveH - 0.3} width="3.2" height="2.8" fill={glove} />
          <rect
            x="11"
            y={armY + sleeveH - 0.3}
            width="3.2"
            height="2.8"
            fill="none"
            stroke={hair}
            strokeWidth="0.3"
          />
        </g>

        {sit ? (
          <>
            <rect x="5.8" y={hipY} width="6.6" height="2.4" fill={denim} />
            <rect x="5.6" y={hipY + 2} width="2.8" height="4.2" fill={denim} />
            <rect x="9.8" y={hipY + 2} width="2.8" height="4.2" fill={denim} />
            <rect
              x="5.3"
              y={hipY + 5.6}
              width="3.4"
              height="2.6"
              fill={shoe}
              stroke={hair}
              strokeWidth="0.3"
            />
            <rect x="5.3" y={hipY + 6.6} width="3.4" height="0.7" fill={stripe} />
            <rect
              x="9.5"
              y={hipY + 5.6}
              width="3.4"
              height="2.6"
              fill={shoe}
              stroke={hair}
              strokeWidth="0.3"
            />
            <rect x="9.5" y={hipY + 6.6} width="3.4" height="0.7" fill={stripe} />
          </>
        ) : (
          <>
            <g transform={`rotate(${legLRot} 7.4 ${hipY})`}>
              <rect x="6.1" y={hipY} width="2.8" height={pantH} fill={denim} />
              <rect
                x="5.5"
                y={hipY + pantH - 0.15}
                width="4"
                height="2.7"
                fill={shoe}
                stroke={hair}
                strokeWidth="0.3"
              />
              <rect x="5.5" y={hipY + pantH + 0.85} width="4" height="0.7" fill={stripe} />
              <rect x="5.5" y={hipY + pantH + 2.15} width="4" height="0.45" fill={hair} />
            </g>
            <g transform={`rotate(${legRRot} 11.1 ${hipY})`}>
              <rect x="9.7" y={hipY} width="2.8" height={pantH} fill={denim} />
              <rect
                x="9.1"
                y={hipY + pantH - 0.15}
                width="4"
                height="2.7"
                fill={shoe}
                stroke={hair}
                strokeWidth="0.3"
              />
              <rect x="9.1" y={hipY + pantH + 0.85} width="4" height="0.7" fill={stripe} />
              <rect x="9.1" y={hipY + pantH + 2.15} width="4" height="0.45" fill={hair} />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

function SoccerBall() {
  return (
    <svg width={BALL_R * 2} height={BALL_R * 2} viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="6.6" fill="var(--ink)" />
      <path d="M7 3.6 L9.1 5 L8.4 7.2 L5.6 7.2 L4.9 5 Z" fill="var(--paper)" />
      <path d="M2.8 8.2 L4.6 7.2 L4.9 9.4 L3.4 10.8 Z" fill="var(--paper)" />
      <path d="M11.2 8.2 L9.4 7.2 L9.1 9.4 L10.6 10.8 Z" fill="var(--paper)" />
      <circle cx="7" cy="7" r="6.6" fill="none" stroke="var(--paper)" strokeWidth="0.55" />
    </svg>
  );
}

function Lamp({ on }: { on: boolean }) {
  return (
    <svg width={LAMP_W} height={42} viewBox="0 0 18 42" aria-hidden className="overflow-visible">
      <rect x="8" y="14" width="1.6" height="22" fill="currentColor" />
      <rect x="6" y="35" width="6" height="2" fill="currentColor" />
      <path d="M5 14 L9 4 L13 14 Z" fill="currentColor" />
      {on && <ellipse cx="9" cy="16" rx="7" ry="5" fill="oklch(0.85 0.12 85)" opacity="0.28" />}
    </svg>
  );
}

function CodingDesk({ coding }: { coding: boolean }) {
  return (
    <svg width={DESK_W} height={48} viewBox="0 0 78 48" aria-hidden className="overflow-visible">
      <rect x="2" y="28" width="50" height="3" fill="currentColor" />
      <rect x="6" y="31" width="2.2" height="11" fill="currentColor" />
      <rect x="46" y="31" width="2.2" height="11" fill="currentColor" />
      <rect x="12" y="6" width="26" height="18" rx="1.5" fill="currentColor" />
      <rect x="14" y="8" width="22" height="14" fill="var(--paper)" />
      <rect
        x="16"
        y="11"
        width="10"
        height="1.2"
        fill="var(--action)"
        opacity={coding ? 0.95 : 0.55}
      />
      <rect x="16" y="14" width="14" height="1.2" fill="currentColor" opacity="0.45" />
      <rect x="16" y="17" width="7" height="1.2" fill="currentColor" opacity="0.35" />
      {coding && <rect x="24" y="17" width="0.9" height="1.4" fill="var(--action)" />}
      <rect x="18" y="26" width="18" height="2" fill="currentColor" opacity="0.7" />
      <rect x="8" y="25" width="4" height="3" rx="0.6" fill="currentColor" opacity="0.85" />
      <rect x="54" y="22" width="16" height="3" rx="0.5" fill="currentColor" />
      <rect x="67" y="10" width="3" height="15" fill="currentColor" />
      <rect x="56" y="25" width="2" height="17" fill="currentColor" />
      <rect x="66" y="25" width="2" height="17" fill="currentColor" />
    </svg>
  );
}

function MusicStudio({ playing }: { playing: boolean }) {
  return (
    <svg width={STUDIO_W} height={48} viewBox="0 0 68 48" aria-hidden className="overflow-visible">
      <rect x="22" y="30" width="26" height="6" rx="1" fill="currentColor" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect
          key={i}
          x={24 + i * 2.8}
          y="31.4"
          width="2"
          height="3.4"
          fill="var(--paper)"
          opacity={playing && i % 2 === 0 ? 0.4 : 1}
        />
      ))}
      <rect x="8" y="18" width="10" height="16" rx="1" fill="currentColor" />
      <rect x="10" y="20" width="6" height="6" fill="var(--paper)" />
      <rect x="52" y="18" width="10" height="16" rx="1" fill="currentColor" />
      <rect x="54" y="20" width="6" height="6" fill="var(--paper)" />
      {playing && (
        <>
          <rect x="32" y="10" width="1.4" height={8} fill="var(--action)" opacity="0.7" />
          <rect x="36" y="6" width="1.4" height={12} fill="var(--action)" opacity="0.85" />
          <rect x="40" y="12" width="1.4" height={6} fill="var(--action)" opacity="0.6" />
        </>
      )}
      <path d="M16 12 Q22 8 26 14" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="24" y="12" width="6" height="4" rx="1" fill="currentColor" />
      <rect x="2" y="24" width="12" height="3" rx="0.5" fill="currentColor" />
      <rect x="3" y="27" width="2" height="15" fill="currentColor" />
      <rect x="11" y="27" width="2" height="15" fill="currentColor" />
    </svg>
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

function initialScene(light: boolean): Scene {
  return {
    w: 720,
    ballX: 320,
    ballY: GROUND + BALL_R,
    ballVx: 0,
    ballVy: 0,
    mascotX: sitDeskX(),
    facing: -1,
    walk: 0,
    walkVel: 0,
    walkPhase: 0,
    idlePhase: 0,
    turnT: 0,
    bob: 0,
    score: 0,
    letters: stillLetters(),
    hint: null,
    kicking: false,
    heading: false,
    hop: 0,
    hopVy: 0,
    lastTouch: null,
    skills: 0,
    lampOn: !light,
    coding: 80,
    playing: 0,
    speech: "building Park'r.",
    speechT: 140,
    activity: "desk",
    pending: "desk",
    targetX: null,
    kickCd: 0,
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
      if (sc && mq.matches) {
        sc.letters = stillLetters();
        sc.walkVel = 0;
        sc.bob = 0;
      }
    };
    mq.addEventListener("change", onMq);

    const measure = () => {
      const w = el.clientWidth || 720;
      readLayout(el);
      const s = scene.current;
      if (s) {
        s.w = w;
        if (drag.current == null && s.targetX == null) {
          if (s.activity === "desk") s.mascotX = sitDeskX();
          else if (s.activity === "studio") s.mascotX = sitStudioX(w);
        }
      } else {
        const next = initialScene(light);
        next.w = w;
        next.ballX = ballResetX(w);
        next.mascotX = sitDeskX();
        if (reducedMotion) next.letters = stillLetters();
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
        s.letters = stillLetters();
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

  const kickBall = (s: Scene, towardGoal = false) => {
    playContact(s, mutedRef.current, towardGoal);
  };

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
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = scene.current;
    const kind = drag.current;
    if (!s || !kind) return;
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = rect.height - (e.clientY - rect.top);
    const now = performance.now();
    const dt = Math.max(8, now - last.current.t);
    if (Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y) > 5) tap.current = false;
    if (kind === "ball") {
      const prevY = rect.height - (last.current.y - rect.top);
      s.ballVx = ((x - (last.current.x - rect.left)) / dt) * 16;
      s.ballVy = ((y - prevY) / dt) * 16;
      s.ballX = clamp(x, sceneLeft() + BALL_R, ballMaxX(s.w));
      s.ballY = clamp(y, GROUND + BALL_R, 118);
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
      if (nearBall(s, 8)) playContact(s, mutedRef.current, true);
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
        if (s.activity === "desk" || s.activity === "studio") {
          s.speech = pickLine("mascot");
          s.speechT = 100;
        } else {
          s.speech = pickLine("mascot");
          s.speechT = 120;
          playTone(mutedRef.current, 240, 0.05, "square", 0.03);
          if (nearBall(s, 20)) kickBall(s, true);
        }
      } else {
        const zone = dropZone(s);
        if (zone === "idle") {
          const inPitch = s.mascotX > pitchLeft() - 20 && s.mascotX < pitchRight(s.w) + 20;
          settle(s, inPitch ? "soccer" : "idle", mutedRef.current);
        } else {
          settle(s, zone, mutedRef.current);
        }
      }
    }
  };

  const onGroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    const s = scene.current;
    const rect = root.current?.getBoundingClientRect();
    if (!s || !rect) return;
    sendTo(s, e.clientX - rect.left - MASCOT_W / 2, "idle");
  };

  const s = frame;
  const gx = goalX(s.w);
  const dx = deskX();
  const sx = studioX(s.w);
  const sit = s.activity === "desk" || s.activity === "studio";
  const inSceneLetters = lettersInScene(s.w);
  const place =
    s.activity === "desk"
      ? "he's at the desk."
      : s.activity === "studio"
        ? "he's in the studio."
        : s.activity === "soccer"
          ? "he's on the pitch."
          : s.activity === "fix" || s.pending === "fix"
            ? "he's setting type."
            : "he's around.";

  return (
    <>
      <div className="relative mt-4 w-full overflow-x-clip">
        <div
          ref={root}
          className="relative h-48 w-full select-none touch-none"
          aria-label="Playground. He stays at a station until you grab him or click a spot. Tap the signature to straighten the letters."
          onPointerDown={onGroundPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="bg-line absolute h-px"
            style={{
              left: sceneLeft(),
              width: Math.max(120, sceneRight(s.w) - sceneLeft()),
              bottom: GROUND,
            }}
          />

          <button
            type="button"
            className="text-ink absolute cursor-crosshair"
            style={{ left: lampX(), bottom: GROUND, width: LAMP_W, height: 42 }}
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
            <Lamp on={s.lampOn} />
          </button>
          {s.lampOn && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                left: lampX() - 10,
                bottom: GROUND + 8,
                width: 48,
                height: 48,
                background: "radial-gradient(circle, oklch(0.85 0.12 85 / 0.38), transparent 70%)",
              }}
            />
          )}

          <button
            type="button"
            className="text-ink absolute cursor-crosshair"
            style={{ left: dx, bottom: GROUND, width: DESK_W, height: 48 }}
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
            <CodingDesk coding={s.activity === "desk" || s.coding > 0} />
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
              left: s.mascotX - 12,
              bottom: GROUND + s.lift + s.hop + (sit ? 0 : s.bob * 0.2),
              width: MASCOT_W + 24,
              height: MASCOT_H + 10,
              cursor: s.lift > 0 ? "grabbing" : "grab",
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
                className="border-ink/50 pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
              />
            )}
            <PixelMascot
              kicking={s.kicking}
              heading={s.heading}
              facing={s.facing}
              sit={sit && s.lift === 0}
              walkPhase={s.walkPhase}
              speed={Math.abs(s.walkVel)}
              idlePhase={s.idlePhase}
              turnT={s.turnT}
              bob={s.bob}
              reduced={reduced}
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
              left: s.ballX - 14,
              bottom: s.ballY - BALL_R,
              width: 28,
              height: 28,
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
              <SoccerBall />
            </div>
          </div>

          <button
            type="button"
            className="text-ink absolute z-0 cursor-crosshair"
            style={{ left: gx, bottom: GROUND, width: GOAL_W, height: GOAL_H }}
            aria-label="Walk to the goal"
            onClick={() => {
              const sc = scene.current;
              if (!sc) return;
              sendTo(sc, Math.min(sc.ballX - MASCOT_W / 2, gx - MASCOT_W - 4), "soccer");
              if (nearBall(sc, 24)) kickBall(sc, true);
            }}
            onPointerEnter={() => {
              if (scene.current) scene.current.hint = "soccer";
            }}
            onPointerLeave={() => {
              if (scene.current && !drag.current) scene.current.hint = null;
            }}
          >
            <svg width={GOAL_W} height={GOAL_H} viewBox="0 0 36 48" className="overflow-visible">
              <path d="M2 48 V6 H34 V48" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 6 H34" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M7 8 V46 M13 8 V46 M19 8 V46 M25 8 V46 M31 8 V46 M2 18 H34 M2 28 H34 M2 38 H34"
                stroke="currentColor"
                strokeWidth="0.45"
                opacity="0.32"
              />
            </svg>
            {s.score > 0 && (
              <span
                className="text-ink absolute left-1/2 -translate-x-1/2 font-mono text-[11px] tabular-nums"
                style={{ top: -14 }}
              >
                {s.score}
              </span>
            )}
            {s.skills > 0 && (
              <span
                className="text-muted-ink pointer-events-none absolute left-1/2 -translate-x-1/2 font-mono text-[9px] tabular-nums"
                style={{ top: -26 }}
              >
                {s.skills} skill{s.skills === 1 ? "" : "s"}
              </span>
            )}
          </button>

          <button
            type="button"
            className="text-ink absolute cursor-crosshair"
            style={{ left: sx, bottom: GROUND, width: STUDIO_W, height: 48 }}
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
            <MusicStudio playing={s.activity === "studio" || s.playing > 0} />
          </button>

          {ready && (
            <>
              <HintChip
                text="grab."
                x={s.mascotX + MASCOT_W / 2}
                y={GROUND + MASCOT_H + 10}
                show={s.hoverMascot && s.lift === 0 && !s.speech}
              />
              <HintChip
                text="light."
                x={lampX() + LAMP_W / 2}
                y={GROUND + 48}
                show={s.hint === "lamp"}
              />
              <HintChip
                text="the work."
                x={dx + DESK_W / 2}
                y={GROUND + 52}
                show={s.hint === "desk" && s.lift === 0}
              />
              <HintChip
                text="drop to code."
                x={dx + DESK_W / 2}
                y={GROUND + 52}
                show={s.hint === "desk" && s.lift > 0}
              />
              <HintChip
                text="the pitch."
                x={gx + GOAL_W / 2}
                y={GROUND + GOAL_H + 8}
                show={s.hint === "soccer" && s.lift === 0}
              />
              <HintChip
                text="drop to play."
                x={gx + GOAL_W / 2}
                y={GROUND + GOAL_H + 8}
                show={s.hint === "soccer" && s.lift > 0}
              />
              <HintChip
                text="flick the ball."
                x={s.ballX}
                y={s.ballY + 14}
                show={s.hint === "ball"}
              />
              <HintChip
                text="after hours."
                x={sx + STUDIO_W / 2}
                y={GROUND + 52}
                show={s.hint === "studio" && s.lift === 0}
              />
              <HintChip
                text="drop to make music."
                x={sx + STUDIO_W / 2}
                y={GROUND + 52}
                show={s.hint === "studio" && s.lift > 0}
              />
            </>
          )}
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

function pickLine(kind: "mascot" | "goal") {
  const mascot = ["make it obvious.", "one more pass.", "ship it.", "trust the scan."];
  const goal = ["that's in.", "keep it simple.", "again."];
  const pool = kind === "goal" ? goal : mascot;
  return pool[Math.floor(Math.random() * pool.length)] ?? "ship it.";
}

function step(s: Scene, dragging: "ball" | "mascot" | null, muted: boolean, reduced = false) {
  const gx = goalX(s.w);
  const groundY = GROUND + BALL_R;
  const sitting = s.activity === "desk" || s.activity === "studio";
  const fixing = s.activity === "fix" || s.pending === "fix";

  if (s.speechT > 0) s.speechT -= 1;
  else s.speech = "";
  if (s.playing > 0) s.playing -= 1;
  if (s.coding > 0) s.coding -= 1;
  if (s.kickCd > 0) s.kickCd -= 1;
  if (sitting) {
    s.hop = 0;
    s.hopVy = 0;
  } else if (s.hop > 0 || s.hopVy !== 0) {
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
    s.walkVel = 0;
    s.bob = 0;
    s.turnT = 0;
    s.hop = 0;
    s.hopVy = 0;
    if (s.pending === "fix" || s.activity === "fix") {
      s.letters = stillLetters();
      s.pending = "desk";
      s.activity = "desk";
      s.targetX = null;
      s.mascotX = sitDeskX();
    } else if (s.targetX != null) {
      s.mascotX = s.targetX;
      settle(s, s.pending, muted);
    }
  } else if (dragging === "mascot") {
    s.walk += 0.16;
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
          s.pending = "desk";
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
    else sendTo(s, sitDeskX(), "desk");
  } else if (s.activity === "soccer" && !reduced) {
    const left = pitchLeft();
    const right = pitchRight(s.w);
    const behind = Math.sign(gx - s.ballX) || 1;
    const high = s.ballY > GROUND + 20;
    const want = clamp(s.ballX - MASCOT_W / 2 - (high ? 0 : 10) * behind, left, right);
    if (Math.abs(want - s.mascotX) > 1.1) moveToward(s, want, 1.55);
    else s.walkVel *= 0.8;
  } else if (sitting) {
    s.lifeT += 1;
    s.walkVel = 0;
    s.bob = 0;
    if (s.activity === "desk" && s.lifeT % 42 === 0) playTone(muted, 1400, 0.02, "square", 0.012);
    if (s.activity === "desk" && s.lifeT % 520 === 0 && s.speechT <= 0) {
      s.speech = Math.random() < 0.55 ? "building Park'r." : pickLine("mascot");
      s.speechT = 130;
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

  if (dragging !== "ball" && !sitting && !fixing && s.letterGuard <= 0) {
    playContact(s, muted, true);
  }
  if (s.kickCd <= 10) s.kicking = false;
  if (s.kickCd <= 8) s.heading = false;

  if (dragging !== "ball") {
    s.ballVy -= 0.42;
    s.ballX += s.ballVx;
    s.ballY += s.ballVy;
    s.ballVx *= 0.992;

    if (s.ballY <= groundY) {
      s.ballY = groundY;
      if (s.ballVy < 0) s.ballVy *= -0.58;
      s.ballVx *= 0.94;
      if (Math.abs(s.ballVy) < 0.35) s.ballVy = 0;
    }
    const minX = sceneLeft() + BALL_R;
    if (s.ballX < minX) {
      s.ballX = minX;
      s.ballVx *= -0.7;
    }
    const maxX = ballMaxX(s.w);
    if (s.ballX > maxX) {
      s.ballX = maxX;
      if (s.ballVx > 0) s.ballVx *= -0.4;
    }
    if (s.ballY > 118) {
      s.ballY = 118;
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
        Math.abs(s.ballX - lx) < 8 &&
        s.ballY < GROUND + 18 &&
        Math.abs(s.ballVx) > 0.7;
      const hitMascot = lettersInScene(s.w) && Math.abs(mx - lx) < 9 && Math.abs(s.walkVel) > 0.45;
      if (hitBall || hitMascot) {
        const dir = (hitBall ? s.ballX < lx : mx < lx) ? 1 : -1;
        return { ...l, rot: dir * (76 + Math.min(18, Math.abs(s.ballVx) * 4)) };
      }
      return l;
    });
  }

  const inGoal =
    s.ballX > gx + 6 &&
    s.ballX <= ballMaxX(s.w) + 0.5 &&
    s.ballY > GROUND + BALL_R - 1 &&
    s.ballY < GROUND + GOAL_H - 4;

  if (inGoal && !goalLock) {
    goalLock = true;
    s.score += 1;
    s.speech = s.lastTouch === "head" ? "header." : pickLine("goal");
    s.speechT = 130;
    playTone(muted, 520, 0.08, "square", 0.05);
    playTone(muted, 780, 0.1, "square", 0.04);
    window.setTimeout(() => {
      s.ballX = ballResetX(s.w);
      s.ballY = GROUND + BALL_R;
      s.ballVx = 0;
      s.ballVy = 0;
      s.lastTouch = null;
      goalLock = false;
    }, 700);
  }

  if (!inGoal && s.ballX < gx - 4) goalLock = false;
}
