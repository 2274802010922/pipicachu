import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";
import { limit, offlineTest } from "./store";
export async function requestJson(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    origin !== process.env.NEXT_PUBLIC_SITE_URL
  )
    throw new AppError("INVALID_ORIGIN", 403);
  if (Number(request.headers.get("content-length")) > 20000)
    throw new AppError("INVALID_INPUT", 413);
  const text = await request.text();
  if (text.length > 20000) throw new AppError("INVALID_INPUT", 413);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
export function callerId(request: NextRequest) {
  // Edge-derived only on Vercel. No address, signature or raw IP is logged.
  const ip = offlineTest()
    ? request.headers.get("x-pipicachu-test-client") || "test"
    : process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for") || "shared"
      : "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}
export async function rateRead(request: NextRequest) {
  const id = callerId(request);
  await limit(`read:${id}:${Math.floor(Date.now() / 60000)}`, 20, 120);
  return id;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function apiError(error: unknown) {
  if (error instanceof ZodError) return json({ error: "INVALID_INPUT" }, 400);
  if (error instanceof AppError)
    return json({ error: error.code }, error.status);
  return json({ error: "INTERNAL_ERROR" }, 500);
}
