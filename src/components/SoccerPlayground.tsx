import { useEffect, useRef, useState, type RefObject } from "react";

import { CONTENT_MAX_PX } from "@/lib/career-os";
import { playTone, setStudioBeatMuted, startStudioBeat, stopStudioBeat } from "@/lib/play-tone";

const SIGNATURE = "built by fabrice";
const BALL_R = 7;
const MASCOT_W = 26;
const MASCOT_H = 44;
const GROUND = 18;
const GOAL_W = 36;
const GOAL_H = 48;
const DESK_W = 78;
const STUDIO_W = 68;
const LAMP_W = 18;
const PAD = 14;

let goalLock = false;

type Letter = { ch: string; rot: number };
type Hint = "ball" | "desk" | "lamp" | "studio" | "mascot" | "soccer" | null;
type Activity = "idle" | "walk" | "desk" | "studio" | "soccer";

type Scene = {
  w: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  mascotX: number;
  facing: 1 | -1;
  walk: number;
  score: number;
  letters: Letter[];
  hint: Hint;
  kicking: boolean;
  heading: boolean;
  hop: number;
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
};

const stillLetters = (): Letter[] => SIGNATURE.split("").map((ch) => ({ ch, rot: 0 }));

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clamp(n: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
}

let mailAlignX: number | null = null;
let colLeftX = PAD;

function estimateColLeft() {
  if (typeof window === "undefined") return PAD;
  const vw = window.innerWidth;
  const col = Math.min(CONTENT_MAX_PX, vw);
  const pgPad = vw >= 640 ? 32 : 16;
  return Math.max(PAD, (vw - col) / 2 - pgPad);
}

colLeftX = estimateColLeft();

function lampX() {
  return colLeftX;
}

function deskX() {
  return lampX() + LAMP_W + 6;
}

function sitDeskX() {
  return deskX() + 48;
}

function goalX(w: number) {
  const min = deskX() + DESK_W + 16;
  const max = w - STUDIO_W - GOAL_W - 10;
  if (mailAlignX != null) {
    return clamp(mailAlignX - GOAL_W / 2, min, max);
  }
  return clamp(w * 0.58, min, max);
}

function studioX(w: number) {
  return clamp(goalX(w) + GOAL_W + 12, deskX() + DESK_W + GOAL_W + 20, w - STUDIO_W - 4);
}

function sitStudioX(w: number) {
  return studioX(w) + 16;
}

function sceneLeft() {
  return lampX();
}

function sceneRight(w: number) {
  return studioX(w) + STUDIO_W;
}

function readLayout(playground: HTMLElement | null, mailEl?: HTMLElement | null) {
  if (!playground || typeof document === "undefined") return;
  const pg = playground.getBoundingClientRect();
  const footer = document.querySelector("footer");
  if (footer) {
    const f = footer.getBoundingClientRect();
    colLeftX = clamp(f.left - pg.left, 0, Math.max(0, playground.clientWidth - 220));
  } else {
    colLeftX = estimateColLeft();
  }
  const mail = mailEl ?? document.querySelector<HTMLElement>('footer a[aria-label="Email"]');
  if (mail) {
    const a = mail.getBoundingClientRect();
    mailAlignX = a.left + a.width / 2 - pg.left;
    return;
  }
  const vw = window.innerWidth;
  const col = Math.min(CONTENT_MAX_PX, vw);
  const pad = vw >= 640 ? 24 : 20;
  const mailCenter = (vw - col) / 2 + col - pad - 14 - 12 - 7;
  mailAlignX = mailCenter - pg.left;
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

function sendTo(s: Scene, x: number, next: Activity) {
  s.targetX = clamp(x, sceneLeft(), sceneRight(s.w) - MASCOT_W);
  s.pending = next;
  s.activity = "walk";
  s.facing = s.targetX >= s.mascotX ? 1 : -1;
  if (next !== "studio") stopStudioBeat();
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
    s.hop = 7;
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
  } else {
    stopStudioBeat();
  }
}

function PixelMascot({
  kicking,
  heading,
  facing,
  sit,
  walk,
}: {
  kicking: boolean;
  heading: boolean;
  facing: 1 | -1;
  sit: boolean;
  walk: number;
}) {
  const step = Math.floor(walk) % 2;
  const headY = sit ? 5 : heading ? 0 : 1;
  const bodyY = sit ? 12 : heading ? 7 : 8;
  const bodyH = sit ? 6 : heading ? 8 : 9;
  const armY = sit ? 13 : 10;
  const legY = sit ? 18 : 17;
  const legL = sit ? 4 : kicking ? 6 : step ? 8 : 9;
  const legR = sit ? 4 : kicking ? 7 : step ? 9 : 8;
  return (
    <svg
      width={MASCOT_W}
      height={MASCOT_H}
      viewBox="0 0 16 28"
      aria-hidden
      className="overflow-visible"
      style={{ transform: `scaleX(${facing}) ${heading ? "rotate(-12deg)" : ""}` }}
    >
      <rect x="4.5" y={headY - 1.5} width="7" height="3" rx="0.6" fill="currentColor" />
      <rect x="5" y={headY} width="6" height="6" rx="1" fill="currentColor" />
      <rect x="6.2" y={headY + 2.2} width="1.3" height="1.3" fill="var(--paper)" />
      <rect x="9" y={headY + 2.2} width="1.3" height="1.3" fill="var(--paper)" />
      <rect x="5.4" y={bodyY} width="5.2" height={bodyH} fill="currentColor" />
      <rect x="3.4" y={armY} width="2.2" height={sit ? 5 : 6} fill="currentColor" />
      <rect
        x="10.4"
        y={sit ? armY + 1 : armY}
        width="2.2"
        height={sit ? 4 : 6}
        fill="currentColor"
      />
      {sit ? (
        <>
          <rect x="5" y={legY} width="6" height="2.2" fill="currentColor" />
          <rect x="5" y={legY + 2} width="2.3" height={legL} fill="currentColor" />
          <rect x="8.7" y={legY + 2} width="2.3" height={legR} fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="5" y={legY} width="2.4" height={legL} fill="currentColor" />
          <rect
            x="8.6"
            y={kicking ? legY + 2 : legY}
            width="2.4"
            height={legR}
            fill="currentColor"
          />
        </>
      )}
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

export function SoccerPlayground({
  muted,
  light,
  onTheme,
  goalAnchor,
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

  useEffect(() => {
    setStudioBeatMuted(muted);
  }, [muted]);

  const [frame, setFrame] = useState<Scene>({
    w: 720,
    ballX: 320,
    ballY: GROUND + BALL_R,
    ballVx: 0,
    ballVy: 0,
    mascotX: sitDeskX(),
    facing: -1,
    walk: 0,
    score: 0,
    letters: stillLetters(),
    hint: null,
    kicking: false,
    heading: false,
    hop: 0,
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
    lookT: 180,
    lifeT: 0,
    lift: 0,
    hoverMascot: false,
  });
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduced = prefersReducedMotion();
    const measure = () => {
      const w = el.clientWidth || 720;
      readLayout(el, goalAnchor?.current);
      const s = scene.current;
      if (s) {
        s.w = w;
        if (drag.current == null && s.targetX == null) {
          if (s.activity === "desk") s.mascotX = sitDeskX();
          else if (s.activity === "studio") s.mascotX = sitStudioX(w);
        }
      } else {
        scene.current = {
          w,
          ballX: ballResetX(w),
          ballY: GROUND + BALL_R,
          ballVx: 0,
          ballVy: 0,
          mascotX: sitDeskX(),
          facing: -1,
          walk: 0,
          score: 0,
          letters: stillLetters(),
          hint: null,
          kicking: false,
          heading: false,
          hop: 0,
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
          lookT: 180,
          lifeT: 0,
          lift: 0,
          hoverMascot: false,
        };
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const align = () => readLayout(root.current, goalAnchor?.current);
    align();
    const alignRo = new ResizeObserver(align);
    alignRo.observe(el);
    window.addEventListener("resize", align);

    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry?.isIntersecting ?? false;
    });
    io.observe(el);

    let raf = 0;
    const tick = () => {
      const s = scene.current;
      if (s && visible.current) {
        readLayout(root.current, goalAnchor?.current);
        step(s, drag.current, mutedRef.current, reduced);
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
      s.mascotX = clamp(x - MASCOT_W / 2, sceneLeft(), sceneRight(s.w) - MASCOT_W);
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
  const place =
    s.activity === "desk"
      ? "he's at the desk."
      : s.activity === "studio"
        ? "he's in the studio."
        : s.activity === "soccer"
          ? "he's on the pitch."
          : "he's around.";

  return (
    <>
      <div className="relative mt-4 w-full overflow-x-clip">
        <div
          ref={root}
          className="relative h-48 w-full select-none touch-none"
          aria-label="Playground. He stays at a station until you grab him or click a spot."
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
          {s.w >= 640 && (
            <p
              aria-hidden
              className="text-muted-ink absolute left-1/2 -translate-x-1/2 font-mono text-[11px] whitespace-pre"
              style={{ bottom: GROUND }}
            >
              {s.letters.map((l, i) => (
                <span
                  key={`${l.ch}-${i}`}
                  className="inline-block"
                  style={{
                    transformOrigin: "left bottom",
                    transform: `rotate(${l.rot}deg)`,
                    transition: "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  {l.ch === " " ? "\u00A0" : l.ch}
                </span>
              ))}
            </p>
          )}

          <div
            className="text-ink absolute z-10 flex touch-none items-end justify-center"
            style={{
              left: s.mascotX - 12,
              bottom: GROUND + s.lift + s.hop,
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
              walk={s.walk}
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
          <HintChip text="flick the ball." x={s.ballX} y={s.ballY + 14} show={s.hint === "ball"} />
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
        </div>
      </div>
      {(captionClock || s.w < 640) && (
        <p className="text-muted-ink mt-2 text-center font-mono text-[11px] lowercase">
          {s.w < 640 && (
            <>
              <span aria-hidden className="normal-case">
                {SIGNATURE}
              </span>
              <span aria-hidden> · </span>
            </>
          )}
          {captionClock ? `${captionClock} ${place}` : place}
        </p>
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

  if (s.speechT > 0) s.speechT -= 1;
  else s.speech = "";
  if (s.playing > 0) s.playing -= 1;
  if (s.coding > 0) s.coding -= 1;
  if (s.kickCd > 0) s.kickCd -= 1;
  if (s.hop > 0) s.hop = Math.max(0, s.hop - 0.45);

  if (s.activity === "desk") s.coding = Math.max(s.coding, 4);
  if (s.activity === "studio") s.playing = Math.max(s.playing, 4);

  if (dragging === "mascot") {
    s.walk += 0.16;
  } else if (s.targetX != null) {
    s.activity = "walk";
    s.walk += 0.18;
    const dir: 1 | -1 = s.targetX >= s.mascotX ? 1 : -1;
    s.facing = dir;
    const speed = 1.55;
    if (Math.abs(s.mascotX - s.targetX) <= speed) {
      s.mascotX = s.targetX;
      settle(s, s.pending, muted);
    } else {
      s.mascotX += speed * dir;
    }
  } else if (s.activity === "soccer" && !reduced) {
    const left = pitchLeft();
    const right = pitchRight(s.w);
    const behind = Math.sign(gx - s.ballX) || 1;
    const high = s.ballY > GROUND + 20;
    const want = clamp(s.ballX - MASCOT_W / 2 - (high ? 0 : 10) * behind, left, right);
    const d = want - s.mascotX;
    if (Math.abs(d) > 1.1) {
      s.walk += 0.24;
      s.facing = d > 0 ? 1 : -1;
      s.mascotX = clamp(s.mascotX + Math.sign(d) * 1.7, left, right);
    }
  } else if (sitting) {
    s.lifeT += 1;
    if (s.activity === "desk" && s.lifeT % 42 === 0) playTone(muted, 1400, 0.02, "square", 0.012);
    if (s.activity === "desk" && s.lifeT % 520 === 0 && s.speechT <= 0) {
      s.speech = Math.random() < 0.55 ? "building Park'r." : pickLine("mascot");
      s.speechT = 130;
    }
  } else {
    s.lookT -= 1;
    if (s.lookT <= 0) {
      s.facing = s.facing === 1 ? -1 : 1;
      s.lookT = 140 + Math.floor(Math.random() * 180);
    }
  }

  if (dragging !== "ball" && !sitting) {
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

  const mx = s.mascotX + MASCOT_W / 2;
  const mid = s.w / 2;
  const letterW = 6.2;
  const start = mid - (SIGNATURE.length * letterW) / 2;
  s.letters = s.letters.map((l, i) => {
    if (l.ch === " ") return l;
    const lx = start + i * letterW;
    const hitBall = Math.abs(s.ballX - lx) < 8 && s.ballY < GROUND + 18 && Math.abs(s.ballVx) > 0.6;
    const hitMascot = Math.abs(mx - lx) < 10;
    if (hitBall || hitMascot) {
      const dir = (s.ballX < lx ? 1 : -1) * (48 + Math.min(40, Math.abs(s.ballVx) * 8));
      return { ...l, rot: clamp(dir, -100, 100) };
    }
    return { ...l, rot: l.rot * 0.86 };
  });

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
