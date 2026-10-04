import { NextRequest } from "next/server";
import { analyze } from "@/backend/analysis";
import { comparePayment } from "@/core/compare";
import { apiError, json, rateRead, requestJson } from "@/backend/http";
import { compareSchema } from "@/shared/schemas";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { input, network, expected } = compareSchema.parse(
      await requestJson(request),
    );
    await rateRead(request);
    const a = await analyze(input, network);
    return json({
      ...comparePayment(a, expected),
      observedAt: a.observedAt,
      source: a.source,
    });
  } catch (error) {
    return apiError(error);
  }
}
