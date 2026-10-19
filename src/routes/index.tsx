import { createFileRoute } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  Github,
  Mail,
  ArrowDownToLine,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  SquareTerminal,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SoccerPlayground } from "@/components/SoccerPlayground";
import {
  BOOK,
  CONTENT_MAX_PX,
  GITHUB_PROFILE,
  JOURNEY,
  PARKR,
  PRINCIPLES,
  PROCESS,
  RESUME_HREF,
  STORIES,
  WRITING,
} from "@/lib/career-os";

const BRAND =
  "I design enterprise experiences that transform complex technology into intuitive products people enjoy using.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fabrice Fidel — Product Designer" },
      { name: "description", content: BRAND },
      { property: "og:title", content: "Fabrice Fidel — Product Designer" },
      { property: "og:description", content: BRAND },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function chicagoStamp(d = new Date()) {
  const t = d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const zone =
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "CST";
  return {
    footer: `${t} ${zone} in Chicago`,
    caption: `it's ${t.toLowerCase()} in chicago.`,
  };
}

function AnimatedName({ text }: { text: string }) {
  return (
    <h1
      aria-label={text}
      className="group text-[18px] font-semibold leading-none tracking-[-0.02em]"
    >
      <span aria-hidden="true" className="flex">
        {text.split("").map((ch, i) => (
          <span key={i} className="relative block h-[20px] overflow-hidden">
            <span
              className="block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full"
              style={{ transitionDelay: `${i * 18}ms` }}
            >
              <span className="block h-[20px] leading-[20px]">{ch === " " ? "\u00A0" : ch}</span>
              <span className="block h-[20px] leading-[20px]">{ch === " " ? "\u00A0" : ch}</span>
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}

function SectionLabel({ label, id }: { label: string; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-16 pt-14">
      <span className="font-mono text-[12px] tracking-[0.08em] text-muted-ink">## {label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function AppStoreBadge({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-block"
      aria-label="Download on the App Store"
    >
      <img
        src="/badges/download-on-the-app-store.svg"
        alt="Download on the App Store"
        width={120}
        height={40}
        className="h-10 w-auto"
      />
    </a>
  );
}

const WORK = [
  {
    date: "2025 — now",
    company: "IBM",
    rows: [
      ["Designing enterprise experiences that make complex systems feel obvious", "Product · UX"],
      ["Turning operational workflows into products people actually finish", "Enterprise"],
      ["Pairing AI into real customer problems, not demos", "AI · HCD"],
    ],
  },
  {
    date: "2025 — now",
    company: "Park'r",
    rows: [
      ["QR occupancy product: I just parked / I am leaving, live count", "Product"],
      ["Floor + spot memory so drivers can find the car", "iOS · UX"],
      ["Admin surface for lots, capacity, and event log", "Systems"],
    ],
  },
];

const COMMANDS = [
  { cmd: "whoami", out: "Fabrice Fidel — Product Designer, Product Builder", target: null },
  { cmd: "work", out: "→ 2 roles · IBM, Park'r", target: "work" },
  { cmd: "now", out: "→ Park'r is live on the App Store", target: "now" },
  { cmd: "parkr", out: "→ scan → parked → find the car", target: "product" },
  { cmd: "stories", out: "→ Park'r shipped · That's My Fit in beta", target: "stories" },
  { cmd: "thinking", out: "→ listen → frame → make → validate → learn", target: "thinking" },
  { cmd: "journey", out: "→ Apple → IBM → product design and product building", target: "journey" },
  { cmd: "writing", out: "→ 4 drafts in progress", target: "writing" },
  { cmd: "book", out: "→ Product Book · 5 chapters", target: "book" },
  { cmd: "about", out: "→ positioning + evidence", target: "about" },
  { cmd: "contact", out: "github.com/FOFMAKER · febreazy@gmail.com", target: "footer" },
  { cmd: "theme", out: "→ toggling theme", target: null },
] as const;

const PALETTE_JUMPS: [string, string][] = [
  ["Jump to work", "work"],
  ["Jump to Park'r", "product"],
  ["Jump to product stories", "stories"],
  ["Jump to product thinking", "thinking"],
  ["Jump to career journey", "journey"],
  ["Jump to writing", "writing"],
  ["Jump to product book", "book"],
  ["Jump to about", "about"],
];

function Index() {
  const [light, setLight] = useState(false);
  const [muted, setMuted] = useState(true);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string>("whoami");
  const [output, setOutput] = useState<string>(COMMANDS[0]?.out ?? "");
  const [stamp, setStamp] = useState({ footer: "", caption: "" });
  const [active, setActive] = useState<string>("whoami");
  const [openStory, setOpenStory] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string>(BOOK[0]?.id ?? "start-here");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("folio-theme") : null;
    if (stored === "light") setLight(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("folio-theme", light ? "light" : "dark");
  }, [light]);

  useEffect(() => {
    const tick = () => setStamp(chicagoStamp());
    tick();
    const i = setInterval(tick, 1000 * 20);
    return () => clearInterval(i);
  }, []);

  const run = useCallback((cmd: string) => {
    const entry = COMMANDS.find((c) => c.cmd === cmd);
    if (!entry) return;
    setActive(cmd);
    if (timer.current) clearInterval(timer.current);
    setTyped("");
    setOutput("");
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setTyped(cmd.slice(0, i));
      if (i >= cmd.length) {
        if (timer.current) clearInterval(timer.current);
        setOutput(entry.out);
        if (cmd === "theme") setLight((v) => !v);
        if (entry.target) {
          setTimeout(() => {
            document.getElementById(entry.target!)?.scrollIntoView({ behavior: "smooth" });
          }, 220);
        }
      }
    }, 45);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jump = (id: string) => {
    setOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const mailRef = useRef<HTMLAnchorElement>(null);
  const currentChapter = BOOK.find((c) => c.id === chapter) ?? BOOK[0]!;

  return (
    <main
      className="mx-auto w-full min-w-0 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12 sm:px-8 sm:pt-24"
      style={{ maxWidth: CONTENT_MAX_PX }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface">
            <div className="h-4 w-4 rounded-[3px] border border-ink/70">
              <div className="m-[3px] h-1.5 w-1.5 rounded-[1px] bg-ink/80" />
            </div>
          </div>
          <div className="min-w-0">
            <AnimatedName text="Fabrice Fidel" />
            <p className="mt-1.5 text-[13px] leading-[18px] text-muted-ink">
              Product Designer · Product Builder · Technical Innovator
            </p>
            <p className="mt-1.5 font-mono text-[12px] leading-none text-muted-ink">
              Updated Sep 2026
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {RESUME_HREF && (
            <a
              href={RESUME_HREF}
              aria-label="Download résumé"
              className="icon-btn hidden items-center gap-1 rounded-md bg-surface px-2 py-1.5 font-mono text-[12px] sm:flex"
            >
              résumé <ArrowDownToLine size={11} />
            </a>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open command menu"
            className="icon-btn rounded-md bg-surface px-2.5 py-1.5 font-mono text-[12px]"
          >
            <SquareTerminal size={14} className="hidden coarse:inline" aria-hidden="true" />
            <span className="coarse:hidden">⌘K</span>
          </button>
          <button
            onClick={() => setMuted((v) => !v)}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className="icon-btn rounded-md p-1.5 aria-pressed:text-muted-ink"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => setLight((v) => !v)}
            aria-label="Toggle theme"
            className="icon-btn rounded-md p-1.5"
          >
            {light ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <section className="mt-12 space-y-5 text-[15px] leading-6">
        <p>{BRAND}</p>
        <p className="text-muted-ink">
          Combining enterprise technology, AI, and human-centered design to solve real customer
          problems.
        </p>
        <p className="text-muted-ink">
          In the open I’m shipping{" "}
          <a href="#product" className="link-underline">
            Park'r
          </a>
          , a live parking product that turns a QR scan into occupancy, floor memory, and a way back
          to your car. Say hi on{" "}
          <a href={GITHUB_PROFILE} target="_blank" rel="noreferrer" className="link-underline">
            GitHub
          </a>{" "}
          or{" "}
          <a href="mailto:febreazy@gmail.com" className="link-underline">
            email
          </a>
          .
        </p>
      </section>

      <section className="mt-12 overflow-hidden rounded-xl border border-line bg-surface/60">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-2 font-mono text-[12px] text-muted-ink">fabrice@folio ~</span>
        </div>
        <div className="min-h-[92px] space-y-3 px-4 py-4 font-mono text-[13px] leading-[18px]">
          <p>
            <span className="text-action">~ %</span> <span className="text-ink">{typed}</span>
            <span className="ml-0.5 inline-block h-[13px] w-[6px] translate-y-[2px] animate-pulse bg-ink/70" />
          </p>
          {output && <p className="text-muted-ink">{output}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <span className="w-full font-mono text-[12px] text-muted-ink">click a command ↓</span>
          {COMMANDS.map((c) => (
            <button
              key={c.cmd}
              onClick={() => run(c.cmd)}
              aria-label={`Run ${c.cmd}`}
              className={`chip ${active === c.cmd ? "border-ink/40 text-ink" : ""}`}
            >
              {c.cmd}
            </button>
          ))}
        </div>
      </section>

      <SectionLabel label="NOW" id="now" />
      <div className="mt-5 text-[15px] leading-6 text-muted-ink">
        <span className="text-ink">Park'r is live on the App Store.</span> Scan → parked → find the
        car. Next: occupancy as a confidence signal, and updates to the live occupancy surface.
      </div>

      <SectionLabel label="WORK" id="work" />
      <div className="mt-6 space-y-8">
        {WORK.map((job, idx) => (
          <div key={job.company} className={idx > 0 ? "dotted-rule pt-8" : ""}>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <span className="w-auto shrink-0 font-mono text-[12px] leading-6 text-muted-ink sm:w-[88px]">
                {job.date}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="grow-underline inline-block cursor-default text-[15px] font-medium leading-6">
                  {job.company}
                </h3>
                <ul className="mt-4 space-y-3">
                  {job.rows.map(([text, tag]) => (
                    <li
                      key={text}
                      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <span className="text-[15px] leading-6 sm:flex-1">{text}</span>
                      <span className="font-mono text-[12px] text-muted-ink sm:shrink-0">
                        {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel label="PRODUCT" id="product" />
      <div className="mt-6">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[15px] font-medium">{PARKR.name}</h3>
          <a
            href={PARKR.href}
            target="_blank"
            rel="noreferrer"
            className="link-underline font-mono text-[12px]"
          >
            live ↗
          </a>
        </div>
        <p className="mt-3 text-[15px] leading-6">{PARKR.line}</p>
        <p className="mt-3 text-[15px] leading-6 text-muted-ink">{PARKR.problem}</p>

        <p className="mt-6 font-mono text-[11px] tracking-[0.08em] text-muted-ink">WHAT SHIPPED</p>
        <p className="mt-2 text-[15px] leading-6">{PARKR.shipped}</p>

        <ol className="mt-6 space-y-4">
          {PARKR.loop.map(([step, line], i) => (
            <li key={step} className="flex gap-4">
              <span className="w-[18px] shrink-0 font-mono text-[12px] leading-6 text-muted-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium leading-6">{step}</p>
                <p className="mt-1 text-[15px] leading-6 text-muted-ink">{line}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface/50 px-3 py-3">
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-ink">DRIVER</p>
            <p className="mt-2 text-[13px] text-muted-ink">estimated occupancy</p>
            <div className="mt-2 h-px bg-line">
              <div className="h-px w-2/3 bg-ink/70" />
            </div>
            <p className="mt-3 font-mono text-[12px]">I Just Parked</p>
            <p className="mt-1 font-mono text-[12px] text-muted-ink">I Am Leaving</p>
          </div>
          <div className="rounded-lg border border-line bg-surface/50 px-3 py-3">
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-ink">MEMORY</p>
            <p className="mt-2 text-[13px]">Floor · spot · note</p>
            <p className="mt-3 font-mono text-[12px]">Find my floor</p>
            <p className="mt-1 font-mono text-[12px] text-muted-ink">recalled on return</p>
          </div>
        </div>

        <p className="mt-5 text-[15px] leading-6">{PARKR.owned}</p>
        <AppStoreBadge href={PARKR.href} />

        <p className="mt-8 font-mono text-[11px] tracking-[0.08em] text-muted-ink">WHAT'S NEXT</p>
        <p className="mt-2 text-[15px] leading-6 text-muted-ink">{PARKR.next}</p>
        <p className="mt-3 text-[14px] leading-[22px] text-muted-ink">{PARKR.note}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PARKR.tags.map((t) => (
            <span key={t} className="chip cursor-default">
              {t}
            </span>
          ))}
        </div>
      </div>

      <SectionLabel label="PRODUCT STORIES" id="stories" />
      <div className="mt-6 space-y-6">
        {STORIES.map((s, idx) => {
          const isOpen = openStory === s.id;
          return (
            <div key={s.id} className={idx > 0 ? "dotted-rule pt-6" : ""}>
              <button
                onClick={() => setOpenStory(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                aria-controls={`story-${s.id}`}
                className="flex w-full items-baseline gap-4 text-left"
              >
                <span className="flex-1 text-[15px] font-medium leading-6">{s.name}</span>
                <span className="shrink-0 font-mono text-[12px] text-muted-ink">
                  {isOpen ? "− close" : "+ open"}
                </span>
              </button>
              <p className="mt-2 text-[15px] leading-6 text-muted-ink">{s.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s.tags.map((t) => (
                  <span key={t} className="chip cursor-default">
                    {t}
                  </span>
                ))}
                <span className="font-mono text-[12px] text-muted-ink">{s.status}</span>
              </div>
              {isOpen && (
                <dl
                  id={`story-${s.id}`}
                  className="mt-5 space-y-4 rounded-lg border border-line bg-surface/50 px-4 py-4"
                >
                  {(
                    [
                      ["Problem", s.detail.problem],
                      ["Product hypothesis", s.detail.hypothesis],
                      ["What I owned", s.detail.owned],
                      ["Current stage", s.detail.stage],
                      ["Behind the product", s.detail.behind],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-ink">
                        {k.toUpperCase()}
                      </dt>
                      <dd className="mt-1.5 text-[14px] leading-[22px]">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      <SectionLabel label="PRODUCT THINKING" id="thinking" />
      <ul className="mt-6 space-y-4">
        {PRINCIPLES.map(([title, line]) => (
          <li key={title} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-[172px] shrink-0 text-[15px] font-medium leading-6">{title}</span>
            <span className="flex-1 text-[15px] leading-6 text-muted-ink">{line}</span>
          </li>
        ))}
      </ul>
      <p className="dotted-rule mt-6 flex flex-wrap items-center gap-2 pt-5 font-mono text-[12px] text-muted-ink">
        {PROCESS.map((p, i) => (
          <span key={p} className="flex items-center gap-2">
            {i > 0 && <span className="text-line">→</span>}
            <span>{p}</span>
          </span>
        ))}
      </p>

      <SectionLabel label="CAREER JOURNEY" id="journey" />
      <ol className="mt-6 space-y-5">
        {JOURNEY.map(([step, lesson], i) => (
          <li key={step} className="flex gap-4">
            <span className="w-[18px] shrink-0 font-mono text-[12px] leading-6 text-muted-ink">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-6">{step}</p>
              <p className="mt-1 text-[15px] leading-6 text-muted-ink">{lesson}</p>
            </div>
          </li>
        ))}
      </ol>

      <SectionLabel label="WRITING" id="writing" />
      <ul className="mt-6 space-y-3">
        {WRITING.map((n) => (
          <li
            key={n}
            className="flex flex-col gap-0.5 text-muted-ink sm:flex-row sm:items-baseline sm:gap-4"
          >
            <span className="text-[15px] leading-6 sm:flex-1">{n}</span>
            <span className="font-mono text-[12px] sm:shrink-0">draft</span>
          </li>
        ))}
      </ul>

      <SectionLabel label="PRODUCT BOOK" id="book" />
      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface/50">
        <div
          role="tablist"
          aria-label="Product Book chapters"
          className="flex flex-wrap gap-2 border-b border-line px-4 py-3"
        >
          {BOOK.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={chapter === c.id}
              onClick={() => setChapter(c.id)}
              className={`chip ${chapter === c.id ? "border-ink/40 text-ink" : ""}`}
            >
              {c.title}
              {!c.done && <span className="ml-1.5 text-muted-ink">·draft</span>}
            </button>
          ))}
        </div>
        <div className="px-4 py-4" role="tabpanel" aria-label={currentChapter.title}>
          <div className="flex items-baseline gap-3">
            <h3 className="text-[15px] font-medium">{currentChapter.title}</h3>
            <span className="font-mono text-[12px] text-muted-ink">
              {currentChapter.done ? "ready to read" : "unfinished chapter"}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {currentChapter.body.map((p) => (
              <p key={p} className="text-[15px] leading-6 text-muted-ink">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>

      <SectionLabel label="ABOUT" id="about" />
      <div className="mt-6 space-y-4 text-[15px] leading-6">
        <p>
          Fabrice Fidel is a product designer, technical product builder, and enterprise
          problem-solver working at the intersection of customer insight, application development,
          AI, and human-centered design.
        </p>
        <p className="text-muted-ink">
          Evidence: IBM Application Development Specialty — Experienced. Park'r is live on the App
          Store. That's My Fit is in beta.
        </p>
      </div>

      <footer id="footer" className="dotted-rule mt-20 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 font-mono text-[12px] text-muted-ink">
            {stamp.footer || "—"}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="icon-btn"
            >
              <Github size={14} />
            </a>
            <a
              href="mailto:febreazy@gmail.com"
              aria-label="Email"
              className="icon-btn"
              ref={mailRef}
            >
              <Mail size={14} />
            </a>
            {RESUME_HREF && (
              <a href={RESUME_HREF} aria-label="Download résumé" className="icon-btn">
                <ArrowDownToLine size={14} />
              </a>
            )}
          </div>
        </div>
        <SoccerPlayground
          muted={muted}
          light={light}
          onTheme={setLight}
          goalAnchor={mailRef}
          captionClock={stamp.caption}
        />
      </footer>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        className="fixed inset-0 z-50"
      >
        <div
          className="absolute inset-0 bg-paper/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <div className="absolute left-1/2 top-[20%] w-[min(440px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface">
          <Command.Input
            placeholder="Type a command…"
            aria-label="Search commands"
            className="w-full border-b border-line bg-transparent px-4 py-3 font-mono text-[13px] text-ink outline-none placeholder:text-muted-ink"
          />
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="px-2 py-3 font-mono text-[12px] text-muted-ink">
              no matches
            </Command.Empty>
            <Command.Group
              heading="run"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-ink"
            >
              {COMMANDS.map((c) => (
                <Command.Item
                  key={c.cmd}
                  value={c.cmd}
                  onSelect={() => {
                    setOpen(false);
                    run(c.cmd);
                  }}
                  className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
                >
                  {c.cmd}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group
              heading="jump"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-ink"
            >
              {PALETTE_JUMPS.map(([label, id]) => (
                <Command.Item
                  key={id}
                  value={label}
                  onSelect={() => jump(id)}
                  className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
                >
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group
              heading="book"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-ink"
            >
              {BOOK.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`Open chapter ${c.title}`}
                  onSelect={() => {
                    setChapter(c.id);
                    jump("book");
                  }}
                  className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
                >
                  Open chapter · {c.title}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group
              heading="actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-ink"
            >
              {STORIES.map((s) => (
                <Command.Item
                  key={s.id}
                  value={`Open story ${s.name}`}
                  onSelect={() => {
                    setOpenStory(s.id);
                    jump("stories");
                  }}
                  className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
                >
                  Open story · {s.name}
                </Command.Item>
              ))}
              <Command.Item
                value="Toggle theme"
                onSelect={() => {
                  setOpen(false);
                  setLight((v) => !v);
                }}
                className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
              >
                Toggle theme
              </Command.Item>
              <Command.Item
                value="Copy email"
                onSelect={() => {
                  navigator.clipboard?.writeText("febreazy@gmail.com");
                  setOpen(false);
                }}
                className="cursor-pointer rounded-md px-2 py-2 font-mono text-[13px] text-muted-ink data-[selected=true]:bg-paper/60 data-[selected=true]:text-ink"
              >
                Copy email
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>
    </main>
  );
}
