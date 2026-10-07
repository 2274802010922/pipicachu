import { readiness, keeperStatus } from "@/backend/readiness";
import packageInfo from "../../../../package.json";
import { NextResponse } from "next/server";
import deployment from "@/escrow/deployment.json";
import keeperConfig from "@/escrow/keeper-config.json";
export async function GET() {
  const [ready, service] = await Promise.all([readiness(), keeperStatus()]);
  return NextResponse.json(
    {
      app: "pipicachu",
      version: packageInfo.version,
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
      approvedPrepaidOrganizations: deployment.organizationWorkflow,
      mint: deployment.mint,
      deployed: deployment.deployed,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      mainnetWrites: false,
      serverCustody: false,
      subjectiveSlashing: false,
      keeperConfigured: keeperConfig.enabled,
      keeper: {
        configuration: keeperConfig.enabled ? "configured" : "disabled",
        intervalMinutes: keeperConfig.intervalMinutes,
        wallet: keeperConfig.wallet,
        workflowUrl: keeperConfig.workflowUrl,
        exactDeadlineGuarantee: false,
      },
      readiness: ready,
      service,
      limiter:
        ready.limiter && ready.mode !== "local-test"
          ? "shared-redis"
          : "per-instance-degraded",
      upgradeAuthority: "retained-for-devnet-demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
