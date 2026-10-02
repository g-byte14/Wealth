"use client";

import { useEffect, useState } from "react";

export default function Thinking({ phrases }: { phrases: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (phrases.length < 2) return;
    const id = setInterval(() => setI((n) => Math.min(n + 1, phrases.length - 1)), 2600);
    return () => clearInterval(id);
  }, [phrases]);

  return (
    <div className="thinking" role="status" aria-live="polite">
      <div className="orb enter" aria-hidden />
      <p key={i} className="phrase fade-swap">
        {phrases[i] ?? "Thinking"}…
      </p>
    </div>
  );
}
