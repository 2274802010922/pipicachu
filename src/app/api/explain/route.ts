import { NextRequest } from "next/server";
import { analyze } from "@/backend/analysis";
import { explain } from "@/backend/explain";
import { apiError, callerId, json, requestJson } from "@/backend/http";
import { explainSchema } from "@/shared/schemas";
import { limit } from "@/backend/store";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { input, network, locale } = explainSchema.parse(
      await requestJson(request),
    );
    const id = callerId(request);
    await limit(`explain:${id}:${Math.floor(Date.now() / 60000)}`, 20, 120);
    return json(await explain(await analyze(input, network), locale, id));
  } catch (error) {
    return apiError(error);
  }
}
