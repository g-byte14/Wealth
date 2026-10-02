import { loadMethodology } from "../methodology";
import type { AnalysisResponse, EngineMode, QuestionResponse, SessionInput } from "../schema";
import * as claude from "./claude";
import { demoAnalysis, demoNextQuestion } from "./demo";

export function engineMode(): EngineMode {
  if (process.env.DEMO_MODE === "true") return "demo";
  return process.env.ANTHROPIC_API_KEY ? "live" : "demo";
}

export async function getNextQuestion(input: SessionInput): Promise<QuestionResponse> {
  const m = await loadMethodology();
  const mode = engineMode();
  const { maxQuestions } = m.config.interview;

  // Hard stop: the interface never asks more than the methodology allows.
  if (input.turns.length >= maxQuestions) {
    return { mode, step: { status: "ready", reflection: "", question: "", placeholder: "", choices: [] } };
  }

  const step = mode === "live" ? await claude.nextQuestion(m, input) : demoNextQuestion(input, maxQuestions);
  if (step.status === "ask" && !step.question.trim()) step.status = "ready";
  step.choices = step.choices.slice(0, 4);
  return { mode, step };
}

export async function getAnalysis(input: SessionInput): Promise<AnalysisResponse> {
  const m = await loadMethodology();
  const mode = engineMode();
  const analysis = mode === "live" ? await claude.analyse(m, input) : demoAnalysis(input);
  analysis.nextActions = analysis.nextActions.slice(0, 3);
  return { mode, analysis };
}
