import { NextResponse } from "next/server";
import { errorResponse, parseSession } from "@/lib/api";
import { getAnalysis } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const input = await parseSession(req);
  if (input instanceof NextResponse) return input;
  try {
    return NextResponse.json(await getAnalysis(input));
  } catch (err) {
    return errorResponse(err);
  }
}
