"use client";

import { useEffect, useRef, useState } from "react";
import AutoTextarea from "./AutoTextarea";

interface Props {
  initial: string;
  hasSaved: boolean;
  error?: string;
  onSubmit: (text: string) => void;
  onResume: () => void;
}

const MIN_CHARS = 20;

export default function Landing({ initial, hasSaved, error, onSubmit, onResume }: Props) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const ready = text.trim().length >= MIN_CHARS;

  useEffect(() => {
    // Don't pop the keyboard over the headline on phones.
    if (window.matchMedia("(hover: hover)").matches) ref.current?.focus({ preventScroll: true });
  }, []);

  const submit = () => ready && onSubmit(text.trim());

  return (
    <div>
      <h1 className="display enter">Give me the&nbsp;mess</h1>
      <p className="lede enter d1">Tell me what&rsquo;s happening. I&rsquo;ll help you see what&rsquo;s actually going on.</p>

      <div className="field enter d2">
        <label htmlFor="mess" className="eyebrow" style={{ display: "block" }}>
          What&rsquo;s going on
        </label>
        <AutoTextarea
          id="mess"
          ref={ref}
          className="textarea big"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Don't tidy it up. The deadlines, the people, the tools, the thing that keeps you up at night — just put it all here."
          maxLength={8000}
        />
        <div className="hint">
          {text.trim().length > 0 && !ready ? "A little more — even a few sentences helps." : ""}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions enter d3">
        <button className="btn" onClick={submit} disabled={!ready}>
          Show Me What You See <span className="arrow">→</span>
        </button>
        <span className="kbd">⌘ + Enter</span>
      </div>

      {hasSaved && (
        <div className="enter d4" style={{ marginTop: 28 }}>
          <button className="link" onClick={onResume}>
            Return to your last analysis
          </button>
        </div>
      )}
    </div>
  );
}
