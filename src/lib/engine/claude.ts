import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { Effort, Methodology } from "../methodology";
import {
  AnalysisSchema,
  QuestionStepSchema,
  type Analysis,
  type QuestionStep,
  type SessionInput,
} from "../schema";
import { renderTranscript } from "./transcript";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export class EngineRefusalError extends Error {}

async function structured<T extends z.ZodType>(opts: {
  m: Methodology;
  effort: Effort;
  system: string;
  user: string;
  schema: T;
}): Promise<z.infer<T>> {
  const response = await getClient().beta.messages.parse({
    model: opts.m.config.model.id,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  if (response.stop_reason === "refusal") {
    throw new EngineRefusalError("The model declined to analyse this description.");
  }
  if (!response.parsed_output) {
    throw new Error(`Model returned no parseable output (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output as z.infer<T>;
}

function baseSystem(m: Methodology) {
  return `${m.persona}\n\n---\n\n${m.lens}`;
}

export async function nextQuestion(m: Methodology, input: SessionInput): Promise<QuestionStep> {
  const { maxQuestions, minQuestions } = m.config.interview;
  const asked = input.turns.length;

  const system = `${baseSystem(m)}\n\n---\n\n${m.questioning}`;
  const user = `${renderTranscript(input)}

<interview_state>
You have asked ${asked} of at most ${maxQuestions} questions.
${asked < minQuestions ? `Ask at least ${minQuestions - asked} more before you may set status "ready".` : `You may set status "ready" if you can already name the bottleneck with confidence.`}
</interview_state>

Decide the next step. If asking, return one question with a reflection.`;

  return structured({ m, effort: m.config.model.questionEffort, system, user, schema: QuestionStepSchema });
}

export async function analyse(m: Methodology, input: SessionInput): Promise<Analysis> {
  const system = `${baseSystem(m)}\n\n---\n\n${m.analysis}`;
  const user = `${renderTranscript(input)}

The interview is complete. Write "Here's What I See" for this person.`;

  return structured({ m, effort: m.config.model.analysisEffort, system, user, schema: AnalysisSchema });
}
