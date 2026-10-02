"use client";

import { useCallback, useEffect, useState } from "react";
import { download, slug, storage, toMarkdown, type SavedSession } from "@/lib/export";
import type { Analysis, AnalysisResponse, EngineMode, QuestionResponse, QuestionStep, Turn } from "@/lib/schema";
import Insight from "./Insight";
import Interview from "./Interview";
import Landing from "./Landing";
import LeverageMap from "./LeverageMap";
import Thinking from "./Thinking";

interface Config {
  version: string;
  maxQuestions: number;
  thinkingPhrases: { question: string[]; analysis: string[] };
}

type Phase =
  | { name: "landing" }
  | { name: "thinking"; kind: "question" | "analysis" }
  | { name: "asking"; step: QuestionStep }
  | { name: "insight" }
  | { name: "map" };

// A considered pause reads as thought; an instant answer reads as a form.
const MIN_PAUSE = { question: 1100, analysis: 2800 };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Experience({ config, mode: initialMode }: { config: Config; mode: EngineMode }) {
  const [phase, setPhase] = useState<Phase>({ name: "landing" });
  const [description, setDescription] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<SavedSession | null>(null);
  const [toast, setToast] = useState<string>();

  useEffect(() => setSaved(storage.load()), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [phase.name]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(undefined), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const runAnalysis = useCallback(async (desc: string, history: Turn[]) => {
    setPhase({ name: "thinking", kind: "analysis" });
    setError(undefined);
    try {
      const [res] = await Promise.all([
        post<AnalysisResponse>("/api/analysis", { description: desc, turns: history }),
        pause(MIN_PAUSE.analysis),
      ]);
      setMode(res.mode);
      setAnalysis(res.analysis);
      const session = { description: desc, turns: history, analysis: res.analysis, savedAt: new Date().toISOString() };
      storage.save(session);
      setSaved(session);
      setPhase({ name: "insight" });
    } catch (e) {
      setError((e as Error).message);
      setPhase({ name: "landing" });
    }
  }, []);

  const askNext = useCallback(
    async (desc: string, history: Turn[], fallback: Phase) => {
      setPhase({ name: "thinking", kind: "question" });
      setError(undefined);
      try {
        const [res] = await Promise.all([
          post<QuestionResponse>("/api/question", { description: desc, turns: history }),
          pause(MIN_PAUSE.question),
        ]);
        setMode(res.mode);
        if (res.step.status === "ready") return runAnalysis(desc, history);
        setPhase({ name: "asking", step: res.step });
      } catch (e) {
        setError((e as Error).message);
        setPhase(fallback);
      }
    },
    [runAnalysis],
  );

  const start = (text: string) => {
    setDescription(text);
    setTurns([]);
    setAnalysis(null);
    askNext(text, [], { name: "landing" });
  };

  const answer = (step: QuestionStep, value: string) => {
    const next = [...turns, { question: step.question, answer: value }];
    setTurns(next);
    askNext(description, next, { name: "asking", step });
  };

  const resume = () => {
    if (!saved) return;
    setDescription(saved.description);
    setTurns(saved.turns);
    setAnalysis(saved.analysis);
    setPhase({ name: "insight" });
  };

  const restart = () => {
    setPhase({ name: "landing" });
    setDescription("");
    setTurns([]);
    setAnalysis(null);
    setError(undefined);
  };

  const session = (): SavedSession | null =>
    analysis ? { description, turns, analysis, savedAt: saved?.savedAt ?? new Date().toISOString() } : null;

  const downloadMd = () => {
    const s = session();
    if (!s) return;
    download(`heres-what-i-see-${slug(s.analysis.title)}.md`, toMarkdown(s));
    setToast("Saved as Markdown");
  };

  const copy = async () => {
    const s = session();
    if (!s) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(s));
      setToast("Copied to clipboard");
    } catch {
      setToast("Couldn't copy — try Download instead");
    }
  };

  const wide = phase.name === "insight" || phase.name === "map";

  return (
    <main className="shell">
      <div className="topbar screen-only">
        <button className="wordmark" onClick={restart} aria-label="Start over">
          Here&rsquo;s What I See
        </button>
        {mode === "demo" && (
          <span className="badge" title="No ANTHROPIC_API_KEY configured — using the offline demo engine">
            Demo mode
          </span>
        )}
      </div>

      <div className={`stage screen-only ${wide ? "wide" : ""}`}>
        {phase.name === "landing" && (
          <Landing initial={description} hasSaved={Boolean(saved)} error={error} onSubmit={start} onResume={resume} />
        )}

        {phase.name === "thinking" && <Thinking key={phase.kind} phrases={config.thinkingPhrases[phase.kind]} />}

        {phase.name === "asking" && (
          <Interview
            step={phase.step}
            turns={turns}
            maxQuestions={config.maxQuestions}
            error={error}
            onAnswer={(v) => answer(phase.step, v)}
            onFinishEarly={() => runAnalysis(description, turns)}
          />
        )}

        {phase.name === "insight" && analysis && <Insight analysis={analysis} onShowMap={() => setPhase({ name: "map" })} />}

        {phase.name === "map" && analysis && (
          <div className="map-wrap">
            <header className="map-head">
              <p className="eyebrow enter">Leverage map · {analysis.title}</p>
              <h1 className="display enter d1">From here to there.</h1>
            </header>
            <LeverageMap analysis={analysis} />
            <div className="export enter" style={{ animationDelay: "2.2s" }}>
              <button className="btn" onClick={() => window.print()}>
                Save as PDF
              </button>
              <button className="btn ghost" onClick={downloadMd}>
                Download
              </button>
              <button className="btn ghost" onClick={copy}>
                Copy
              </button>
              <span className="spacer" style={{ flex: 1 }} />
              <div className="links">
                <button className="link" onClick={() => setPhase({ name: "insight" })}>
                  ← Back to the analysis
                </button>
                <button className="link" onClick={restart}>
                  Start a new one
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The printed / PDF version is always the complete report. */}
      {analysis && (phase.name === "insight" || phase.name === "map") && (
        <div className="print-only">
          <Insight analysis={analysis} print />
          <section className="section">
            <p className="eyebrow">Leverage map</p>
            <LeverageMap analysis={analysis} animate={false} />
          </section>
        </div>
      )}

      {toast && (
        <div className="toast screen-only" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
