"use client";

import type { Analysis } from "@/lib/schema";

const STEPS = [
  { key: "current", tag: "Current state", cls: "" },
  { key: "bottleneck", tag: "Bottleneck", cls: "is-bottleneck" },
  { key: "leveragePoint", tag: "Leverage point", cls: "is-leverage" },
  { key: "newSystem", tag: "New system", cls: "" },
  { key: "desired", tag: "Desired state", cls: "is-desired" },
] as const;

export default function LeverageMap({ analysis, animate = true }: { analysis: Analysis; animate?: boolean }) {
  const map = analysis.leverageMap;
  return (
    <ol className="map" aria-label="Leverage map">
      {STEPS.map((s, i) => (
        <li
          key={s.key}
          className={`node ${s.cls}`}
          style={animate ? { animationDelay: `${0.35 + i * 0.32}s` } : { animation: "none", opacity: 1 }}
        >
          <span className="dot" aria-hidden>
            {i + 1}
          </span>
          <div>
            <span className="tag">{s.tag}</span>
            <div className="card">
              <h3>{map[s.key].label}</h3>
              <p>{map[s.key].detail}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
