import type { Analysis, QuestionStep, SessionInput } from "../schema";

/**
 * Offline demo engine. Used when no ANTHROPIC_API_KEY is configured so the
 * experience can be explored end-to-end. It is a deliberately simple
 * keyword-and-template stand-in for the real methodology — not the product.
 */

type Archetype = "founder" | "intake" | "fragmentation" | "handoff" | "rework" | "custom";

const SIGNALS: Record<Archetype, RegExp[]> = {
  founder: [/\b(through|by|on) me\b/i, /\bonly i\b/i, /\bmyself\b/i, /\bapprov/i, /\bin my head\b/i, /\bwait(s|ing)? (on|for) me\b/i, /\bi have to\b/i, /\bi do everything\b/i, /\bsign-?off\b/i, /^\s*me\b/im, /\bgoes through me\b/i],
  intake: [/\burgent/i, /\bpriorit/i, /\beverything\b/i, /\btoo many\b/i, /\boverwhelm/i, /\binterrupt/i, /\brequests?\b/i, /\bfires?\b/i],
  fragmentation: [/\bslack\b/i, /\bemail/i, /\bspreadsheet/i, /\bnotion\b/i, /\basana\b/i, /\btrello\b/i, /\btools?\b/i, /\bapps?\b/i, /\bcrm\b/i, /\bscattered\b/i],
  handoff: [/\bteam\b/i, /\bstaff\b/i, /\bhandoff|hand off|hand-off/i, /\bfalls? through\b/i, /\bnobody\b/i, /\bwho owns\b/i, /\bdropp?ed\b/i, /\bmiscommunicat/i],
  rework: [/\bredo\b/i, /\bmistakes?\b/i, /\berrors?\b/i, /\brevisions?\b/i, /\brework\b/i, /\bagain\b/i, /\bfix(ing)?\b/i],
  custom: [/\bevery (client|customer|project) is different\b/i, /\bcustom/i, /\bbespoke\b/i, /\bone-off\b/i, /\bscope creep\b/i, /\bclients?\b/i],
};

function score(text: string): Record<Archetype, number> {
  const out = {} as Record<Archetype, number>;
  for (const [k, patterns] of Object.entries(SIGNALS) as [Archetype, RegExp[]][]) {
    out[k] = patterns.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  }
  return out;
}

function primary(text: string): Archetype {
  const s = score(text);
  // Founder bottlenecks hide behind everything else, so they win ties.
  const order: Archetype[] = ["founder", "intake", "handoff", "rework", "fragmentation", "custom"];
  return order.reduce((best, k) => (s[k] > s[best] ? k : best), order[0]);
}

function allText(input: SessionInput) {
  return [input.description, ...input.turns.map((t) => t.answer)].join("\n");
}

function snippet(text: string, max = 70): string {
  const first = text.trim().split(/(?<=[.!?])\s+|\n/)[0] ?? text;
  const clean = first.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s\S*$/, "")}…` : clean;
}

/** The sentence carrying the most problem signal — the one worth quoting back. */
function symptom(text: string, max = 70): string {
  const sentences = text.trim().split(/(?<=[.!?])\s+|\n/).filter(Boolean);
  const all = Object.values(SIGNALS).flat();
  const best = sentences.reduce(
    (b, s) => {
      const n = all.reduce((k, re) => k + (re.test(s) ? 1 : 0), 0);
      return n > b.n ? { s, n } : b;
    },
    { s: sentences[0] ?? text, n: -1 },
  );
  return snippet(best.s, max).replace(/[.!?]$/, "");
}

// ---------------------------------------------------------------------------
// Questions

interface Q {
  id: string;
  question: string;
  placeholder: string;
  choices?: string[];
  reflection: (input: SessionInput) => string;
  /** Higher = more relevant now. Return -1 to skip. */
  relevance: (input: SessionInput, a: Archetype) => number;
}

const QUESTIONS: Q[] = [
  {
    id: "stuck",
    question: "When something important stalls, what is it usually waiting on?",
    placeholder: "e.g. my sign-off, a client reply, someone finding the file…",
    choices: ["Me", "Someone on the team", "A client", "Information I can't find"],
    reflection: (i) => `“${symptom(i.description, 60)}” — that's the symptom. I want to find the mechanism.`,
    relevance: () => 100,
  },
  {
    id: "founder",
    question: "Which decisions still need you that someone else could make 80% as well?",
    placeholder: "e.g. pricing small jobs, approving copy, scheduling…",
    reflection: () => "A lot of what you're describing seems to route through you.",
    relevance: (_, a) => (a === "founder" ? 90 : 20),
  },
  {
    id: "intake",
    question: "How does new work arrive — and who decides what gets done first?",
    placeholder: "e.g. DMs, email, walk-ups; nobody really decides…",
    reflection: () => "It sounds like everything arrives with the same urgency.",
    relevance: (_, a) => (a === "intake" ? 90 : 30),
  },
  {
    id: "tools",
    question: "If I asked where a single project's status lives, how many places would you check?",
    placeholder: "e.g. three — Slack, a spreadsheet and my inbox",
    choices: ["One", "Two or three", "Four or more", "It lives in my head"],
    reflection: () => "You've mentioned more than one place where the work lives.",
    relevance: (_, a) => (a === "fragmentation" ? 90 : 25),
  },
  {
    id: "handoff",
    question: "Where does work most often get dropped between people?",
    placeholder: "e.g. between sales and delivery, after the kickoff call…",
    reflection: () => "The work itself sounds doable. The gaps between people sound expensive.",
    relevance: (_, a) => (a === "handoff" ? 90 : 25),
  },
  {
    id: "rework",
    question: "What gets done twice most often, and why does the first version miss?",
    placeholder: "e.g. proposals, because the brief changes after we start",
    reflection: () => "Some of the effort you describe sounds like doing things twice.",
    relevance: (_, a) => (a === "rework" || a === "custom" ? 85 : 20),
  },
  {
    id: "repeat",
    question: "What do you find yourself doing every single week that feels identical each time?",
    placeholder: "e.g. chasing invoices, writing the same update email…",
    reflection: () => "Underneath the chaos there's usually a pattern that repeats.",
    relevance: () => 50,
  },
  {
    id: "stop",
    question: "If you could stop one recurring task tomorrow with no consequences, which would it be?",
    placeholder: "e.g. the Monday status meeting",
    reflection: () => "Some of this work may not need to exist at all.",
    relevance: () => 45,
  },
  {
    id: "desired",
    question: "Ninety days from now, what would tell you this is fixed?",
    placeholder: "e.g. I take a week off and nothing breaks",
    reflection: () => "I think I can see the shape of it. One last thing.",
    relevance: () => 10,
  },
];

const DEMO_QUESTION_COUNT = 4;

export function demoNextQuestion(input: SessionInput, maxQuestions: number): QuestionStep {
  const limit = Math.min(DEMO_QUESTION_COUNT, maxQuestions);
  if (input.turns.length >= limit) {
    return { status: "ready", reflection: "I've got what I need.", question: "", placeholder: "", choices: [] };
  }

  const asked = new Set(input.turns.map((t) => t.question));
  const a = primary(allText(input));
  const remaining = QUESTIONS.filter((q) => !asked.has(q.question));

  // Always close on the desired-state question.
  const isLast = input.turns.length === limit - 1;
  const pick = isLast
    ? remaining.find((q) => q.id === "desired")!
    : remaining.filter((q) => q.id !== "desired").sort((x, y) => y.relevance(input, a) - x.relevance(input, a))[0];

  return {
    status: "ask",
    reflection: pick.reflection(input),
    question: pick.question,
    placeholder: pick.placeholder,
    choices: pick.choices ?? [],
  };
}

// ---------------------------------------------------------------------------
// Analysis

function answerFor(input: SessionInput, id: string): string | undefined {
  const q = QUESTIONS.find((x) => x.id === id);
  const a = input.turns.find((t) => t.question === q?.question)?.answer.trim();
  return a ? a : undefined;
}

const TEMPLATES: Record<Archetype, Omit<Analysis, "leverageMap"> & { map: Analysis["leverageMap"] }> = {
  founder: {
    title: "The Founder Funnel",
    happening: {
      headline: "Your business can only move as fast as you can decide.",
      detail: "The delays, the noise and the exhaustion are the same problem showing up in different places: too many decisions are waiting in one queue, and that queue is you.",
    },
    bottleneck: {
      headline: "Decisions and knowledge route through one person.",
      detail: "Because the rules live in your head, every exception — and most routine calls — has to come back to you. The team waits, you context-switch, and both sides feel slow.",
    },
    complexity: {
      headline: "Unwritten rules turn routine work into judgement calls.",
      items: ["Approvals that add a delay but rarely change the outcome", "Answers you give repeatedly because they aren't written down", "Work that pauses while waiting for your availability"],
    },
    eliminate: [{ what: "Approvals on low-risk, reversible work", why: "If you'd approve it 9 times out of 10, the approval is just a queue." }],
    automate: [{ what: "Status chasing and reminders", why: "Nobody should need to ask you where things are." }],
    delegate: [{ what: "Decisions under a set threshold (money, time or risk)", why: "Someone else can make them 80% as well, 100% faster." }],
    system: [{ what: "A one-page decision guide", why: "Write down how you decide, once, so others can decide the same way." }],
    leverage: {
      headline: "Write your decision rules down and give them away.",
      detail: "List the ten decisions you make most often. For each, write the rule you actually use and a threshold under which someone else decides without asking.",
      whyThisFirst: "Every other fix still routes through you. This one removes you from the critical path.",
    },
    nextActions: [],
    map: {
      current: { label: "Everything waits on you", detail: "Work queues behind your availability." },
      bottleneck: { label: "Decisions live in one head", detail: "The rules aren't written, so they can't be shared." },
      leveragePoint: { label: "Decision rules, written down", detail: "Capture how you decide and set clear thresholds." },
      newSystem: { label: "Delegated decision rights", detail: "Others decide within the rules; you handle real exceptions." },
      desired: { label: "A business that moves without you", detail: "You spend your time on the few calls only you can make." },
    },
  },
  intake: {
    title: "Urgent Everything",
    happening: {
      headline: "You're not short on effort — you're short on a filter.",
      detail: "Work arrives from every direction with the same urgency, so the loudest thing wins. The important work keeps getting pushed by the immediate work.",
    },
    bottleneck: {
      headline: "There is no single front door for new work.",
      detail: "Without one place where requests land and get prioritised, every interruption is a negotiation, and nothing is ever finished before something else lands.",
    },
    complexity: {
      headline: "Every request is handled as a one-off.",
      items: ["Requests arriving through several channels", "No shared definition of what 'urgent' means", "Starting new work before finishing current work"],
    },
    eliminate: [{ what: "Saying yes on the spot", why: "Instant yeses are how the queue becomes infinite." }],
    automate: [{ what: "Request capture from email and messages into one list", why: "Collection shouldn't depend on memory." }],
    delegate: [{ what: "First-pass triage of incoming requests", why: "Sorting doesn't need the person doing the deep work." }],
    system: [{ what: "A weekly priority-setting ritual", why: "Decide once a week what matters, then protect it." }],
    leverage: {
      headline: "Create one front door and one weekly priority list.",
      detail: "All new work goes to a single place. Once a week, choose the top three. Anything else waits unless it meets a written definition of urgent.",
      whyThisFirst: "Until intake is controlled, every other improvement gets swamped by the next wave of requests.",
    },
    nextActions: [],
    map: {
      current: { label: "Everything is urgent", detail: "Work arrives everywhere and the loudest thing wins." },
      bottleneck: { label: "No front door", detail: "Requests aren't captured or prioritised in one place." },
      leveragePoint: { label: "One intake, one list", detail: "Route all requests to a single queue." },
      newSystem: { label: "Weekly top-three", detail: "A short ritual decides what gets done and what waits." },
      desired: { label: "Calm, chosen focus", detail: "You finish the important work before the next wave lands." },
    },
  },
  fragmentation: {
    title: "Scattered Signal",
    happening: {
      headline: "The work isn't the hard part. Finding it is.",
      detail: "Information is spread across tools, threads and memory, so a surprising share of the day goes to reconstructing context rather than doing the work.",
    },
    bottleneck: {
      headline: "There's no single source of truth.",
      detail: "When status lives in several places, nobody trusts any of them. People ask instead of look, and every question becomes an interruption.",
    },
    complexity: {
      headline: "Tools were added, but never subtracted.",
      items: ["The same work tracked in more than one place", "Updates happening in chat instead of where the work lives", "Status that only exists in someone's head"],
    },
    eliminate: [{ what: "Duplicate trackers and side-spreadsheets", why: "Two sources of truth means zero." }],
    automate: [{ what: "Pushing updates from where work happens into one view", why: "Status should update itself, not be reported." }],
    delegate: [{ what: "Keeping the tracker tidy", why: "Ownership of the system shouldn't sit with the busiest person." }],
    system: [{ what: "A rule: if it isn't in the tracker, it isn't happening", why: "A habit makes the tool work, not the other way round." }],
    leverage: {
      headline: "Pick one home for the work and retire the rest.",
      detail: "Choose the tool you already use most. Move active work there, archive the alternatives, and agree that status questions are answered by pointing to it.",
      whyThisFirst: "It removes the hidden tax on every other task: the time spent finding things.",
    },
    nextActions: [],
    map: {
      current: { label: "Context everywhere", detail: "Work is spread across tools, threads and memory." },
      bottleneck: { label: "No single source of truth", detail: "People ask instead of look." },
      leveragePoint: { label: "One home for the work", detail: "Consolidate into the tool you already use most." },
      newSystem: { label: "Status that updates itself", detail: "Simple rules and automations keep it current." },
      desired: { label: "Look, don't ask", detail: "Anyone can see where anything stands in seconds." },
    },
  },
  handoff: {
    title: "The Gaps Between",
    happening: {
      headline: "Your people are capable. The spaces between them aren't owned.",
      detail: "Work moves well inside each person's lane and stalls at the edges — where it's unclear who picks it up, when, and what 'ready' means.",
    },
    bottleneck: {
      headline: "Handoffs have no owner and no definition of done.",
      detail: "When nobody owns the transition, everyone assumes someone else has it. Things get dropped quietly and discovered loudly.",
    },
    complexity: {
      headline: "Coordination is happening in meetings instead of in the process.",
      items: ["Check-ins that exist to catch dropped work", "Unclear criteria for when work is ready to pass on", "The same context re-explained at every step"],
    },
    eliminate: [{ what: "Status meetings that exist only to find dropped balls", why: "Fix the handoff and the meeting becomes unnecessary." }],
    automate: [{ what: "Notifications when work changes hands", why: "The next person should know without being told." }],
    delegate: [{ what: "Ownership of each stage, by name", why: "Every stage needs one person who's accountable for it." }],
    system: [{ what: "A handoff checklist for each transition", why: "'Ready' should mean the same thing to everyone." }],
    leverage: {
      headline: "Name an owner and a 'ready' checklist for your worst handoff.",
      detail: "Pick the transition where work most often gets dropped. Assign one owner and write a short checklist that defines when it's ready to move.",
      whyThisFirst: "Fixing the leakiest handoff recovers more time than improving any single person's work.",
    },
    nextActions: [],
    map: {
      current: { label: "Work dropped between people", detail: "Each lane works; the gaps don't." },
      bottleneck: { label: "Unowned handoffs", detail: "No owner and no shared definition of ready." },
      leveragePoint: { label: "Owner + checklist", detail: "Start with the single leakiest transition." },
      newSystem: { label: "Defined stages", detail: "Each stage has an owner, criteria and a signal." },
      desired: { label: "Work that flows", detail: "Things move forward without chasing." },
    },
  },
  rework: {
    title: "Doing It Twice",
    happening: {
      headline: "A quiet share of your effort is spent redoing work.",
      detail: "The first version keeps missing — not because people are careless, but because the target moves or was never fully defined before work began.",
    },
    bottleneck: {
      headline: "Work starts before 'done' is defined.",
      detail: "Without clear inputs and acceptance criteria up front, every piece of work becomes a draft, and revisions eat the capacity you thought you had.",
    },
    complexity: {
      headline: "Ambiguity at the start creates rework at the end.",
      items: ["Briefs that change after work begins", "Feedback that arrives late and all at once", "No examples of what 'good' looks like"],
    },
    eliminate: [{ what: "Starting work on an incomplete brief", why: "An hour of clarity saves a day of revisions." }],
    automate: [{ what: "A required intake form before work begins", why: "Missing information gets caught before it costs anything." }],
    delegate: [{ what: "Brief review and sign-off", why: "Someone other than the doer should confirm the target is clear." }],
    system: [{ what: "A definition-of-done for your most common deliverable", why: "Shared criteria turn subjective feedback into a checklist." }],
    leverage: {
      headline: "Define 'done' before anything starts.",
      detail: "For your most-reworked deliverable, write the five criteria it must meet and require them to be agreed before work begins.",
      whyThisFirst: "Every hour of rework you remove is capacity you get back without hiring.",
    },
    nextActions: [],
    map: {
      current: { label: "Work done twice", detail: "First versions keep missing the target." },
      bottleneck: { label: "Undefined 'done'", detail: "Work begins before the target is clear." },
      leveragePoint: { label: "Criteria up front", detail: "Agree what good looks like before starting." },
      newSystem: { label: "Brief → build → check", detail: "A simple gate catches gaps early." },
      desired: { label: "Right the first time", detail: "Capacity returns as revisions disappear." },
    },
  },
  custom: {
    title: "Every Job Is the First Job",
    happening: {
      headline: "You're rebuilding the wheel for every client.",
      detail: "Each piece of work is treated as unique, so nothing compounds. Pricing, scoping and delivery are reinvented every time, and the business can't get easier as it grows.",
    },
    bottleneck: {
      headline: "There's no standard offer to say yes to.",
      detail: "Without a defined package, every engagement starts with negotiation and ends with scope creep. Expertise is spent on reinvention instead of results.",
    },
    complexity: {
      headline: "Exceptions are being treated as the rule.",
      items: ["Custom scope and pricing for similar work", "Unbounded revisions and add-ons", "Templates that are recreated rather than reused"],
    },
    eliminate: [{ what: "Fully bespoke proposals", why: "Most clients need one of a few things." }],
    automate: [{ what: "Proposals and onboarding from templates", why: "Standard work should start from a standard file." }],
    delegate: [{ what: "Delivery of the standard package", why: "A defined offer can be delivered by someone other than you." }],
    system: [{ what: "A productised core offer with clear boundaries", why: "Boundaries make scope creep visible and billable." }],
    leverage: {
      headline: "Turn your most common job into a standard package.",
      detail: "Look at your last ten engagements. Define the one that recurs most as a fixed-scope offer with a set price, timeline and deliverables.",
      whyThisFirst: "Standardising the core makes everything else — delegation, automation, pricing — possible.",
    },
    nextActions: [],
    map: {
      current: { label: "Every job from scratch", detail: "Nothing compounds from one client to the next." },
      bottleneck: { label: "No standard offer", detail: "Each engagement is negotiated and scoped anew." },
      leveragePoint: { label: "Productise the common job", detail: "Define a fixed-scope core package." },
      newSystem: { label: "Templates & boundaries", detail: "Standard proposals, onboarding and delivery." },
      desired: { label: "Work that gets easier", detail: "Each client builds on the last." },
    },
  },
};

export function demoAnalysis(input: SessionInput): Analysis {
  const a = primary(allText(input));
  const t = TEMPLATES[a];
  const desired = answerFor(input, "desired");
  const repeat = answerFor(input, "repeat");
  const stop = answerFor(input, "stop");
  const founderAns = answerFor(input, "founder");

  const automate = repeat ? [{ what: snippet(repeat, 80), why: "You said it repeats every week — repeatable, predictable work is the first thing to automate." }, ...t.automate] : t.automate;
  const eliminate = stop ? [{ what: snippet(stop, 80), why: "You named this yourself. Test removing it for two weeks and see what actually breaks." }, ...t.eliminate] : t.eliminate;
  const delegate = founderAns ? [{ what: snippet(founderAns, 80), why: "You already believe someone else could do this well enough. Believe yourself." }, ...t.delegate] : t.delegate;

  return {
    title: t.title,
    happening: { ...t.happening, detail: `You described it as “${symptom(input.description)}.” ${t.happening.detail}` },
    bottleneck: t.bottleneck,
    complexity: t.complexity,
    eliminate,
    automate,
    delegate,
    system: t.system,
    leverage: t.leverage,
    nextActions: [
      { action: "Block 45 minutes and write down the leverage move in your own words", detail: t.leverage.detail, timeframe: "Today" },
      { action: `Start with one: ${eliminate[0].what.replace(/\.$/, "")}`, detail: "Remove it for two weeks. Note what — if anything — actually breaks.", timeframe: "This week" },
      { action: "Share this map with one person who'll be affected", detail: "Agree on the first change together, and a date to look at whether it worked.", timeframe: "By Friday" },
    ],
    leverageMap: desired ? { ...t.map, desired: { label: t.map.desired.label, detail: snippet(desired, 110) } } : t.map,
  };
}
