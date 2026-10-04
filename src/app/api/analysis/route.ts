import { NextRequest } from "next/server";
import { analyze } from "@/backend/analysis";
import { apiError, json, rateRead, requestJson } from "@/backend/http";
import { analysisSchema } from "@/shared/schemas";
import { validBase58 } from "@/core/input";
import { AppError } from "@/shared/errors";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { input, network, focus } = analysisSchema.parse(
      await requestJson(request),
    );
    if (focus && !validBase58(focus, 32))
      throw new AppError("INVALID_RECIPIENT");
    await rateRead(request);
    return json(await analyze(input, network));
  } catch (error) {
    return apiError(error);
  }
}
