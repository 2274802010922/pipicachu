import sol from "../../../../../docs/evidence/raw/sol-transfer.json";
import usdc from "../../../../../docs/evidence/raw/usdc.json";
import different from "../../../../../docs/evidence/raw/different-mint.json";
import failed from "../../../../../docs/evidence/raw/failed-transfer.json";
import jupiter from "../../../../../docs/evidence/raw/jupiter.json";
import { NextRequest } from "next/server";
import { normalizeTransaction } from "@/core/normalize";
import { json } from "@/backend/http";
import type { Network } from "@/shared/types";
const snapshots = { sol, usdc, "wrong-token": different, failed, jupiter };
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!Object.prototype.hasOwnProperty.call(snapshots, id))
    return json({ error: "INVALID_INPUT" }, 400);
  const s = snapshots[id as keyof typeof snapshots];
  return json(
    normalizeTransaction(
      s.signature,
      s.network as Network,
      s.raw,
      s.status,
      "archive",
    ),
  );
}
