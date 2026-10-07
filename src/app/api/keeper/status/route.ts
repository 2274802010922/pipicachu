import { NextResponse } from "next/server";
import { keeperStatus } from "@/backend/readiness";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json(await keeperStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
