"use client";

import { useState } from "react";
import type { ActionItem, Analysis } from "@/lib/schema";
import { useReveal } from "./useReveal";

const MOVES: { key: "eliminate" | "automate" | "delegate" | "system"; n: string; label: string }[] = [
  { key: "eliminate", n: "04", label: "Eliminate" },
  { key: "automate", n: "05", label: "Automate" },
  { key: "delegate", n: "06", label: "Delegate" },
  { key: "system", n: "07", label: "Needs a system" },
];

function MoveCard({ n, label, items }: { n: string; label: string; items: ActionItem[] }) {
  return (
    <div className="move reveal">
      <h3>
        <i>{n}</i> {label}
      </h3>
      {items.map((it, i) => (
        <div className="move-item" key={i}>
          <strong>{it.what}</strong>
          <span>{it.why}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  analysis: Analysis;
  /** Print mode renders everything statically, without interaction. */
  print?: boolean;
  onShowMap?: () => void;
}

export default function Insight({ analysis: a, print, onShowMap }: Props) {
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  useReveal([a]);

  const toggle = (i: number) => setDone((d) => d.map((v, j) => (j === i ? !v : v)));

  return (
    <article className="insight">
      <header className="insight-hero">
        <p className="eyebrow enter">Here&rsquo;s what I see</p>
        <h1 className="display enter d1">{a.happening.headline}</h1>
        <p className="insight-title enter d2">{a.title}</p>
        {!print && <div className="scroll-cue enter d4">Scroll slowly</div>}
      </header>

      <section className="section reveal">
        <p className="eyebrow">
          <span className="num">01</span>What appears to be happening
        </p>
        <p className="detail" style={{ fontSize: 19, marginTop: 0 }}>
          {a.happening.detail}
        </p>
      </section>

      <section className="section bottleneck reveal">
        <p className="eyebrow">
          <span className="num">02</span>The underlying bottleneck
        </p>
        <h2 className="section-head">{a.bottleneck.headline}</h2>
        <p className="detail">{a.bottleneck.detail}</p>
      </section>

      <section className="section reveal">
        <p className="eyebrow">
          <span className="num">03</span>What&rsquo;s creating unnecessary complexity
        </p>
        <h2 className="section-head">{a.complexity.headline}</h2>
        <ul className="bullets">
          {a.complexity.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <p className="eyebrow reveal">The four moves</p>
        <h2 className="section-head reveal">What to remove, hand off and hard-wire.</h2>
        <div className="moves">
          {MOVES.map((m) => (
            <MoveCard key={m.key} n={m.n} label={m.label} items={a[m.key]} />
          ))}
        </div>
      </section>

      <section className="section" style={{ borderTop: 0 }}>
        <div className="leverage reveal">
          <p className="eyebrow">
            <span className="num" style={{ color: "inherit" }}>
              08
            </span>
            The highest-leverage intervention
          </p>
          <h2 className="section-head">{a.leverage.headline}</h2>
          <p>{a.leverage.detail}</p>
          <p className="why">{a.leverage.whyThisFirst}</p>
        </div>
      </section>

      <section className="section reveal">
        <p className="eyebrow">
          <span className="num">09</span>Your next three actions
        </p>
        <h2 className="section-head">Start here.</h2>
        <ol className="next">
          {a.nextActions.map((n, i) => (
            <li
              key={i}
              className={done[i] ? "done" : ""}
              onClick={() => !print && toggle(i)}
              role={print ? undefined : "checkbox"}
              aria-checked={print ? undefined : done[i]}
              tabIndex={print ? undefined : 0}
              onKeyDown={(e) => {
                if (!print && (e.key === " " || e.key === "Enter")) {
                  e.preventDefault();
                  toggle(i);
                }
              }}
            >
              <span className="check" aria-hidden>
                {done[i] ? "✓" : i + 1}
              </span>
              <span>
                <strong>{n.action}</strong>
                <span className="when">{n.timeframe}</span>
                <span className="how">{n.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {onShowMap && (
        <div className="finale reveal screen-only">
          <p className="eyebrow">One more view</p>
          <button className="btn" onClick={onShowMap}>
            See the Leverage Map <span className="arrow">→</span>
          </button>
        </div>
      )}
    </article>
  );
}
