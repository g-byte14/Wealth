# Here's What I See

> **Give me the mess.** Tell me what's happening. I'll help you see what's actually going on.

An interactive diagnostic experience. It isn't a website to read. Someone overwhelmed by a messy business, workflow, project or problem describes it. The app asks up to five adaptive questions, then shows them:

1. **Here's What I See**: what's happening, the bottleneck underneath it, what's adding complexity, what to eliminate, automate, delegate and systematise, the highest-leverage intervention, and three next actions.
2. **The Leverage Map**: `CURRENT STATE → BOTTLENECK → LEVERAGE POINT → NEW SYSTEM → DESIRED STATE`. It can be saved as a PDF, downloaded as Markdown or copied.

## Quick start

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for real analysis
npm run dev                  # http://localhost:3000
```

**Without an API key** the app runs in **demo mode** (marked with a badge in the corner). A small offline keyword-and-template engine stands in for the model, so you can try the whole flow. It is a placeholder, not the product.

## Architecture

```
methodology/            ← THE BRAIN: plain Markdown + JSON, editable without touching code
  persona.md              voice & stance of the strategist
  diagnostic-lens.md      frameworks used to see the problem
  questioning.md          how the next question is chosen
  analysis.md             how each output section is written
  config.json             question limits, model, effort, loading phrases

src/lib/
  schema.ts             ← THE CONTRACT: zod shapes for a question turn and an analysis
  methodology.ts          loads methodology/ (or METHODOLOGY_URL) at request time
  engine/
    claude.ts             live engine: methodology → system prompt, schema → structured output
    demo.ts               offline stand-in used when no API key is set
    index.ts              picks the engine, enforces the question limit
  export.ts               Markdown export + local "last analysis" storage

src/app/
  api/question/route.ts   POST {description, turns} → next question or "ready"
  api/analysis/route.ts   POST {description, turns} → full analysis + leverage map
  page.tsx                server entry, passes public config to the client

src/components/         ← THE INTERFACE: knows the schema, nothing about the method
  Experience.tsx          state machine: landing → thinking → asking → insight → map
  Landing / Interview / Thinking / Insight / LeverageMap
```

### Methodology and interface are kept apart

The UI only knows the **shape** of the output (`src/lib/schema.ts`). Everything about *how* the strategist thinks lives in `methodology/`. The server reads those files on every request and hands them to Claude as instructions, and Claude must answer in the schema's shape (structured outputs).

- Change how questions are chosen, the voice, the frameworks, or the question limit: **edit `methodology/`**. No code changes, no rebuild when running `npm run dev` or `npm start`.
- Ship methodology changes **without redeploying**: set `METHODOLOGY_URL` to a folder URL that serves the same file names, e.g. `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/methodology`. It is re-fetched at most every 60 seconds.
- Add a new section to the output: extend the schema, add one UI block and describe it in `analysis.md`.

See [`methodology/README.md`](methodology/README.md).

### Model

Live mode calls Claude through the official Anthropic SDK (`@anthropic-ai/sdk`). The model and effort level are set in `methodology/config.json`. The default is `claude-opus-5-5`, with `medium` effort for questions and `high` for the final analysis. Server-side refusal fallbacks (`fallbacks: "default"`) are on, so a request a safety classifier declines is retried on a suitable model rather than failing.

## Design notes

- Mobile-first: one idea per screen, large tap targets, safe-area insets, and Enter doesn't submit on touch keyboards.
- Warm paper and ink palette with one ember accent. Fraunces (serif) for the voice, Inter for the interface. Full dark mode.
- Progressive disclosure: questions arrive one at a time, analysis sections appear as you scroll, and the leverage map draws itself node by node.
- `prefers-reduced-motion` is respected.
- Print / "Save as PDF" always renders the complete report and map.
- The last analysis is remembered in the browser only (localStorage). Nothing is stored on the server.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |

## Deploying

Works on any Node 20+ host. On Vercel: import the repo and set `ANTHROPIC_API_KEY` (and optionally `METHODOLOGY_URL`). The analysis route allows up to 300s (`maxDuration`).

## Roadmap ideas

- Stream the analysis so sections appear as they're written
- Shareable read-only links (server-side persistence)
- Methodology versioning, plus an eval set of real "messes" to measure changes against
- Image export of the leverage map
