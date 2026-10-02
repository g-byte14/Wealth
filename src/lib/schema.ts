import { z } from "zod";

/**
 * The contract between the methodology (what the strategist thinks) and the
 * interface (how it is shown). Change the methodology freely; change this file
 * only when the shape of what's shown needs to change.
 */

export const TurnSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type Turn = z.infer<typeof TurnSchema>;

export const SessionInputSchema = z.object({
  description: z.string().trim().min(1).max(8000),
  turns: z.array(TurnSchema).max(10),
});
export type SessionInput = z.infer<typeof SessionInputSchema>;

export const QuestionStepSchema = z.object({
  status: z.enum(["ask", "ready"]).describe('"ask" to ask another question, "ready" when enough is known'),
  reflection: z.string().describe("One perceptive sentence reflecting something specific the person said"),
  question: z.string().describe("The single next question. Empty when status is ready"),
  placeholder: z.string().describe("A short example answer hint for the input box"),
  choices: z.array(z.string()).describe("0-4 short tap-able answers, or empty"),
});
export type QuestionStep = z.infer<typeof QuestionStepSchema>;

const Item = z.object({
  what: z.string(),
  why: z.string(),
});
export type ActionItem = z.infer<typeof Item>;

const MapNode = z.object({
  label: z.string(),
  detail: z.string(),
});
export type MapNode = z.infer<typeof MapNode>;

export const AnalysisSchema = z.object({
  title: z.string(),
  happening: z.object({ headline: z.string(), detail: z.string() }),
  bottleneck: z.object({ headline: z.string(), detail: z.string() }),
  complexity: z.object({ headline: z.string(), items: z.array(z.string()) }),
  eliminate: z.array(Item),
  automate: z.array(Item),
  delegate: z.array(Item),
  system: z.array(Item),
  leverage: z.object({ headline: z.string(), detail: z.string(), whyThisFirst: z.string() }),
  nextActions: z.array(z.object({ action: z.string(), detail: z.string(), timeframe: z.string() })),
  leverageMap: z.object({
    current: MapNode,
    bottleneck: MapNode,
    leveragePoint: MapNode,
    newSystem: MapNode,
    desired: MapNode,
  }),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export type EngineMode = "live" | "demo";

export interface QuestionResponse {
  step: QuestionStep;
  mode: EngineMode;
}

export interface AnalysisResponse {
  analysis: Analysis;
  mode: EngineMode;
}
