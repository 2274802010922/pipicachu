import { NextRequest, NextResponse } from "next/server";
import { cappedText, validateRpcRequest, upstream } from "@/backend/rpc";
import { limitRequest } from "@/backend/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  let id: unknown = 1;
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      throw Error("INVALID_ORIGIN");
    const body = validateRpcRequest(
      JSON.parse(await cappedText(req.body, 100_000)),
    );
    id = body.id;
    await limitRequest(
      body.method,
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local",
    );
    return NextResponse.json(await upstream(body.method, body.params, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "INVALID_INPUT";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: message === "RATE_LIMITED" ? -32005 : -32000, message },
      },
      {
        status: message === "RATE_LIMITED" ? 429 : 200,
        headers: {
          "Cache-Control": "no-store",
          ...(message === "RATE_LIMITED" ? { "Retry-After": "60" } : {}),
        },
      },
    );
  }
}
