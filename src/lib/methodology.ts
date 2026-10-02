import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Loads the diagnostic methodology at request time — from METHODOLOGY_URL if set,
 * otherwise from the local ./methodology folder. Nothing here knows *what* the
 * methodology says; it only assembles it.
 */

export interface MethodologyConfig {
  version: string;
  interview: { maxQuestions: number; minQuestions: number };
  model: { id: string; questionEffort: Effort; analysisEffort: Effort };
  thinkingPhrases: { question: string[]; analysis: string[] };
}
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Methodology {
  config: MethodologyConfig;
  persona: string;
  lens: string;
  questioning: string;
  analysis: string;
}

const FILES = {
  persona: "persona.md",
  lens: "diagnostic-lens.md",
  questioning: "questioning.md",
  analysis: "analysis.md",
  config: "config.json",
} as const;

const REMOTE_TTL_MS = 60_000;
let remoteCache: { at: number; value: Methodology } | null = null;

async function readFile(name: string): Promise<string> {
  const base = process.env.METHODOLOGY_URL?.trim();
  if (base) {
    const res = await fetch(`${base.replace(/\/$/, "")}/${name}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Methodology fetch failed for ${name}: ${res.status}`);
    return res.text();
  }
  return fs.readFile(path.join(process.cwd(), "methodology", name), "utf8");
}

export async function loadMethodology(): Promise<Methodology> {
  const remote = Boolean(process.env.METHODOLOGY_URL?.trim());
  if (remote && remoteCache && Date.now() - remoteCache.at < REMOTE_TTL_MS) {
    return remoteCache.value;
  }

  const [persona, lens, questioning, analysis, config] = await Promise.all([
    readFile(FILES.persona),
    readFile(FILES.lens),
    readFile(FILES.questioning),
    readFile(FILES.analysis),
    readFile(FILES.config),
  ]);

  const value: Methodology = {
    config: JSON.parse(config) as MethodologyConfig,
    persona,
    lens,
    questioning,
    analysis,
  };
  if (remote) remoteCache = { at: Date.now(), value };
  return value;
}

/** Public, non-sensitive slice of the config the interface can use. */
export function publicConfig(m: Methodology) {
  return {
    version: m.config.version,
    maxQuestions: m.config.interview.maxQuestions,
    thinkingPhrases: m.config.thinkingPhrases,
  };
}
