import { NextRequest } from "next/server";
import { z } from "zod";
import { submitDemo } from "@/solana/demo";
import { apiError, callerId, json, requestJson } from "@/backend/http";
import { limit } from "@/backend/store";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const data = z
      .object({
        requestId: z.string().length(64),
        transaction: z.string().max(2200),
      })
      .strict()
      .parse(await requestJson(request));
    await limit(
      `submit:${callerId(request)}:${Math.floor(Date.now() / 60000)}`,
      10,
      120,
    );
    return json(await submitDemo(data.requestId, data.transaction));
  } catch (error) {
    return apiError(error);
  }
}
