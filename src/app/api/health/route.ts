import { NextResponse } from "next/server";
import deployment from "@/escrow/deployment.json";
export async function GET() {
  return NextResponse.json(
    {
      app: "pipicachu",
      version: "0.2.0",
      product: "escrow",
      cluster: "devnet",
      programId: deployment.programId,
      mint: deployment.mint,
      deployed: deployment.deployed,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      mainnetWrites: false,
      serverCustody: false,
      subjectiveSlashing: false,
      automaticKeeper: false,
      limiter: "per-instance-best-effort",
      upgradeAuthority: "retained-for-devnet-demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
