import { NextRequest, NextResponse } from "next/server";
import { cappedText } from "@/backend/rpc";
// Reports contain potentially private URLs; never store body, query strings or script samples.
export async function POST(req: NextRequest) {
  try {
    await cappedText(req.body, 4096);
  } catch {}
  return new NextResponse(null, { status: 204 });
}
