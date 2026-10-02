"use client";

import { useEffect, useRef, useState } from "react";
import type { QuestionStep, Turn } from "@/lib/schema";
import AutoTextarea from "./AutoTextarea";

interface Props {
  step: QuestionStep;
  turns: Turn[];
  maxQuestions: number;
  error?: string;
  onAnswer: (answer: string) => void;
  onFinishEarly: () => void;
}

export default function Interview({ step, turns, maxQuestions, error, onAnswer, onFinishEarly }: Props) {
  const [answer, setAnswer] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const index = turns.length; // zero-based number of this question

  useEffect(() => {
    setAnswer("");
    if (window.matchMedia("(hover: hover)").matches) ref.current?.focus({ preventScroll: true });
  }, [step.question]);

  const submit = (value = answer) => {
    if (value.trim()) onAnswer(value.trim());
  };

  return (
    <div key={step.question}>
      <div className="progress enter" aria-label={`Question ${index + 1} of up to ${maxQuestions}`}>
        {Array.from({ length: maxQuestions }).map((_, i) => (
          <span key={i} className={i < index ? "done" : i === index ? "now" : ""} />
        ))}
      </div>

      {turns.length > 0 && (
        <ul className="trail enter" aria-label="Your previous answers">
          {turns.map((t, i) => (
            <li key={i}>
              <b>{t.answer || "—"}</b>
            </li>
          ))}
        </ul>
      )}

      {step.reflection && <p className="reflection enter d1">{step.reflection}</p>}
      <h2 className="question enter d2">{step.question}</h2>

      {step.choices.length > 0 && (
        <div className="chips enter d3">
          {step.choices.map((c) => (
            <button key={c} className="chip" aria-pressed={answer === c} onClick={() => setAnswer(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="field enter d3" style={{ marginTop: step.choices.length ? 22 : 36 }}>
        <AutoTextarea
          ref={ref}
          className="textarea"
          aria-label="Your answer"
          value={answer}
          placeholder={step.placeholder || "Say it however it comes out…"}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            const touch = !window.matchMedia("(hover: hover)").matches;
            if (e.key === "Enter" && !e.shiftKey && !touch) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={2000}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions enter d4">
        <button className="btn" onClick={() => submit()} disabled={!answer.trim()}>
          Continue <span className="arrow">→</span>
        </button>
        {index >= 1 && (
          <button className="link" onClick={onFinishEarly}>
            That&rsquo;s enough — show me
          </button>
        )}
      </div>
    </div>
  );
}
