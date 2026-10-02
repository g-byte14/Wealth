import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { SessionInputSchema, type SessionInput } from "./schema";
import { EngineRefusalError } from "./engine/claude";

export async function parseSession(req: Request): Promise<SessionInput | NextResponse> {
  const body = await req.json().catch(() => null);
  const parsed = SessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tell me a little about what's happening first." }, { status: 400 });
  }
  return parsed.data;
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof EngineRefusalError) {
    return NextResponse.json({ error: "I can't help with this one. Try describing the operational side of the problem." }, { status: 422 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "A lot of people are thinking out loud right now. Try again in a moment." }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${err.status}:`, err.message);
    return NextResponse.json({ error: "I lost my train of thought. Please try again." }, { status: 502 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
