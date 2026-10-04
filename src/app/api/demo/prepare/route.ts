import { NextRequest } from "next/server";
import { z } from "zod";
import { prepareDemo } from "@/solana/demo";
import { apiError, callerId, json, requestJson } from "@/backend/http";
import { limit } from "@/backend/store";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { wallet } = z
      .object({ wallet: z.string().max(100) })
      .strict()
      .parse(await requestJson(request));
    await limit(
      `demo:${callerId(request)}:${Math.floor(Date.now() / 60000)}`,
      5,
      120,
    );
    return json(await prepareDemo(wallet));
  } catch (error) {
    return apiError(error);
  }
}
