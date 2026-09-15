let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playTone(
  muted: boolean,
  freq: number,
  duration = 0.08,
  type: OscillatorType = "square",
  gain = 0.04,
) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playChord(muted: boolean, freqs: number[]) {
  freqs.forEach((f, i) => playTone(muted, f, 0.16, "triangle", 0.03 + i * 0.004));
}

type BeatNote = { at: number; freq: number; dur: number; type: OscillatorType; gain: number };

const STUDIO_LOOP = 1680;
const STUDIO_NOTES: BeatNote[] = [
  { at: 0, freq: 98, dur: 0.1, type: "sine", gain: 0.05 },
  { at: 0, freq: 196, dur: 0.14, type: "triangle", gain: 0.028 },
  { at: 210, freq: 880, dur: 0.04, type: "square", gain: 0.018 },
  { at: 420, freq: 147, dur: 0.1, type: "triangle", gain: 0.032 },
  { at: 420, freq: 880, dur: 0.035, type: "square", gain: 0.016 },
  { at: 630, freq: 247, dur: 0.12, type: "triangle", gain: 0.028 },
  { at: 840, freq: 110, dur: 0.09, type: "sine", gain: 0.045 },
  { at: 840, freq: 220, dur: 0.16, type: "triangle", gain: 0.03 },
  { at: 1050, freq: 880, dur: 0.035, type: "square", gain: 0.016 },
  { at: 1260, freq: 165, dur: 0.18, type: "triangle", gain: 0.03 },
];

let beatTimers: number[] = [];
let beatLoop: number | null = null;
let beatMuted = true;

function fireStudioBar() {
  for (const n of STUDIO_NOTES) {
    beatTimers.push(
      window.setTimeout(() => {
        playTone(beatMuted, n.freq, n.dur, n.type, n.gain);
      }, n.at),
    );
  }
}

export function startStudioBeat(muted: boolean) {
  beatMuted = muted;
  if (beatLoop != null) return;
  fireStudioBar();
  beatLoop = window.setInterval(fireStudioBar, STUDIO_LOOP);
}

export function setStudioBeatMuted(muted: boolean) {
  beatMuted = muted;
}

export function stopStudioBeat() {
  if (beatLoop != null) {
    window.clearInterval(beatLoop);
    beatLoop = null;
  }
  for (const id of beatTimers) window.clearTimeout(id);
  beatTimers = [];
}
