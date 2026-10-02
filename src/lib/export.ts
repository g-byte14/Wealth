import type { Analysis, Turn } from "./schema";

export interface SavedSession {
  description: string;
  turns: Turn[];
  analysis: Analysis;
  savedAt: string;
}

const items = (xs: { what: string; why: string }[]) => xs.map((x) => `- **${x.what}** — ${x.why}`).join("\n");

export function toMarkdown(s: SavedSession): string {
  const a = s.analysis;
  const m = a.leverageMap;
  const date = new Date(s.savedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return `# Here's What I See
_${a.title}_ · ${date}

## 1. What appears to be happening
**${a.happening.headline}**

${a.happening.detail}

## 2. The underlying bottleneck
**${a.bottleneck.headline}**

${a.bottleneck.detail}

## 3. What is creating unnecessary complexity
**${a.complexity.headline}**

${a.complexity.items.map((i) => `- ${i}`).join("\n")}

## 4. Eliminate
${items(a.eliminate)}

## 5. Automate
${items(a.automate)}

## 6. Delegate
${items(a.delegate)}

## 7. Needs a system
${items(a.system)}

## 8. The highest-leverage intervention
**${a.leverage.headline}**

${a.leverage.detail}

_Why this first:_ ${a.leverage.whyThisFirst}

## 9. Your next three actions
${a.nextActions.map((n, i) => `${i + 1}. **${n.action}** (${n.timeframe}) — ${n.detail}`).join("\n")}

---

## Leverage Map

| Current state | Bottleneck | Leverage point | New system | Desired state |
|---|---|---|---|---|
| **${m.current.label}** | **${m.bottleneck.label}** | **${m.leveragePoint.label}** | **${m.newSystem.label}** | **${m.desired.label}** |
| ${m.current.detail} | ${m.bottleneck.detail} | ${m.leveragePoint.detail} | ${m.newSystem.detail} | ${m.desired.detail} |

---

## What you told me
> ${s.description.trim().replace(/\n/g, "\n> ")}

${s.turns.map((t) => `**${t.question}**\n${t.answer || "_(skipped)_"}`).join("\n\n")}
`;
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "analysis";
}

export function download(filename: string, content: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const KEY = "hwis:last";
export const storage = {
  load(): SavedSession | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as SavedSession) : null;
    } catch {
      return null;
    }
  },
  save(s: SavedSession) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable — the session still works, it just isn't remembered */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
