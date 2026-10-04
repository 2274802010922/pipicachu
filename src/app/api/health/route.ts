import { NextResponse } from "next/server";
import deployment from "@/escrow/deployment.json";
import keeperConfig from "@/escrow/keeper-config.json";
export async function GET() {
  return NextResponse.json(
    {
      app: "pipicachu",
      version: "0.4.0",
      product: "escrow",
      cluster: "devnet",
      programId: deployment.programId,
      schemaVersion: deployment.schemaVersion,
      feeVersion: deployment.feeVersion,
      platformTreasury: deployment.platformTreasury,
      fees: {
        arbitratorBps: deployment.arbitratorFeeBps,
        platformBps: deployment.platformFeeBps,
        refundBps: 0,
      },
      arbitratorCount: deployment.arbitratorCount,
      mint: deployment.mint,
      deployed: deployment.deployed,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      mainnetWrites: false,
      serverCustody: false,
      subjectiveSlashing: false,
      automaticKeeper: keeperConfig.enabled,
      keeper: {
        configuration: keeperConfig.enabled ? "configured" : "disabled",
        intervalMinutes: keeperConfig.intervalMinutes,
        wallet: keeperConfig.wallet,
        workflowUrl: keeperConfig.workflowUrl,
        exactDeadlineGuarantee: false,
      },
      limiter: "per-instance-best-effort",
      upgradeAuthority: "retained-for-devnet-demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
