import { NextResponse } from "next/server";
import { errorResponse, parseSession } from "@/lib/api";
import { getNextQuestion } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const input = await parseSession(req);
  if (input instanceof NextResponse) return input;
  try {
    return NextResponse.json(await getNextQuestion(input));
  } catch (err) {
    return errorResponse(err);
  }
}
