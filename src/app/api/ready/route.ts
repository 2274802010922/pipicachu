import { NextResponse } from "next/server";
import { readiness } from "@/backend/readiness";
export const runtime = "nodejs";
export async function GET() {
  const status = await readiness();
  return NextResponse.json(status, {
    status: status.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
