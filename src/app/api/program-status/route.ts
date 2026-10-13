import { NextResponse } from "next/server";
import { programAuthority } from "@/backend/program-authority";
export async function GET() {
  const status = await programAuthority();
  return NextResponse.json(status, {
    status: status.state === "unknown" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
