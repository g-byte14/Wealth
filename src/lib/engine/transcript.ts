import type { SessionInput } from "../schema";

/** Renders the conversation so far as a tagged transcript for the model. */
export function renderTranscript({ description, turns }: SessionInput): string {
  const parts = [`<their_description>\n${description.trim()}\n</their_description>`];
  turns.forEach((t, i) => {
    parts.push(
      `<exchange n="${i + 1}">\n<you_asked>${t.question}</you_asked>\n<they_answered>${t.answer.trim() || "(skipped)"}</they_answered>\n</exchange>`,
    );
  });
  return parts.join("\n\n");
}
