import { NextRequest } from "next/server";
import { demoStatus } from "@/solana/demo";
import { apiError, callerId, json } from "@/backend/http";
import { AppError } from "@/shared/errors";
import { limit } from "@/backend/store";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const requestId = request.nextUrl.searchParams.get("requestId") || "";
    if (!/^[a-f0-9]{64}$/.test(requestId)) throw new AppError("INVALID_INPUT");
    await limit(
      `status:${callerId(request)}:${Math.floor(Date.now() / 60000)}`,
      30,
      120,
    );
    return json(await demoStatus(requestId));
  } catch (error) {
    return apiError(error);
  }
}
