/* Career OS content model — add new stories, writing, and chapters here. */

export const CONTENT_MAX_PX = 720;
export const GITHUB_PROFILE = "https://github.com/FOFMAKER";
export const PARKR_APP_STORE = "https://apps.apple.com/us/app/park-r/id6795870269";

/** Public path to the résumé PDF. Keep null until `public/resume.pdf` exists. */
export const RESUME_HREF: string | null = null;

export type StoryDetail = {
  problem: string;
  hypothesis: string;
  owned: string;
  stage: string;
  behind: string;
};

export type Story = {
  id: string;
  name: string;
  summary: string;
  tags: string[];
  status: string;
  detail: StoryDetail;
};

export const PARKR = {
  href: PARKR_APP_STORE,
  name: "Park'r",
  line: "Turn a parking garage into a live product.",
  problem:
    "Occupancy is usually a guess. Drivers circle. Operators don’t see the lot until someone complains.",
  shipped:
    "The iOS app is live on the App Store: scan a floor QR, tap I just parked, remember the floor, tap I am leaving. The live count updates for everyone.",
  next: "The next layer is parking intelligence: read a city block the way a driver actually reads it. If occupancy is expressed as a confidence signal instead of a number, people will trust it enough to change route.",
  loop: [
    ["Scan", "QR on the floor. Web works with no install. The iOS app opens the same code."],
    [
      "I just parked",
      "The live count updates for everyone. When the lot is full, the surface says so.",
    ],
    ["Remember the floor", "Floor, spot, optional note — so the car is findable on the way back."],
    ["I am leaving", "Count drops. The space is free for the next driver."],
  ] as [string, string][],
  owned:
    "I own the loop end to end: driver, occupancy, floor memory, and a PIN-gated admin for lots, capacity, QR, and the event log.",
  note: "Counts come from drivers and may not be exact. That’s the product, not a bug to hide.",
  tags: ["Next.js", "SwiftUI", "Supabase", "Realtime", "QR"],
};

export const STORIES: Story[] = [
  {
    id: "thats-my-fit",
    name: "That's My Fit",
    summary:
      "AI wardrobe platform: turn what someone already owns into decisions they can make fast.",
    tags: ["AI Product", "Personalization", "UX"],
    status: "in beta",
    detail: {
      problem:
        "Wardrobe tools ask people to catalogue everything before returning any value, so the work never finishes.",
      hypothesis:
        "Value first, catalogue later: if the first suggestion is useful with five items, people keep adding.",
      owned:
        "Product framing, onboarding model, personalization boundaries, and how AI output is explained to the person.",
      stage: "In beta. Case study being written.",
      behind:
        "Behind the product: where personalization stops being helpful and starts feeling like surveillance.",
    },
  },
];

export const PRINCIPLES: [string, string][] = [
  ["Solve the right problem", "Most design debt is a framing error that shipped."],
  ["Design for trust", "People adopt what they can predict, not what impresses them."],
  ["AI should remove friction", "If a model adds a step, it is decoration."],
  ["Build with empathy", "The person on the other side is usually mid-task and under pressure."],
];

export const PROCESS = ["listen", "frame", "make", "validate", "learn"];

export const JOURNEY: [string, string][] = [
  ["Apple", "Learned that support is the closest seat to the truth of a product."],
  ["IBM · Mac@IBM", "Scale changes the problem: one bad default becomes thousands of tickets."],
  [
    "Enterprise mobility and customer systems",
    "Operational workflows are the real product surface inside a company.",
  ],
  [
    "Application Development Specialty — Experienced",
    "Building it yourself changes what you are willing to propose.",
  ],
  ["Product design and product building", "Design and delivery are one loop, not a handoff."],
];

export const WRITING = [
  "Why great products often start in support",
  "Designing better enterprise experiences",
  "AI should remove friction, not create it",
  "What building products taught me about product management",
];

export type Chapter = {
  id: string;
  title: string;
  done: boolean;
  body: string[];
};

export const BOOK: Chapter[] = [
  {
    id: "start-here",
    title: "Start Here",
    done: true,
    body: [
      "This is a working notebook, not a portfolio. It holds the thinking behind the products before the products are finished.",
      "Read it in any order. Chapters marked draft are still moving.",
    ],
  },
  {
    id: "parkpulse",
    title: "Park'r",
    done: false,
    body: ["Draft chapter. Research synthesis and the occupancy confidence model go here."],
  },
  {
    id: "styleforge",
    title: "That's My Fit",
    done: false,
    body: ["Draft chapter. Onboarding-without-cataloguing and personalization limits go here."],
  },
  {
    id: "product-principles",
    title: "Product Principles",
    done: true,
    body: [
      "Solve the right problem, design for trust, let AI remove friction, build with empathy.",
      "Each principle exists because a project failed without it.",
    ],
  },
  {
    id: "lessons",
    title: "Lessons",
    done: false,
    body: ["Draft chapter. What enterprise scale teaches about defaults, patience, and proof."],
  },
];
