"use client";
import { Buffer } from "buffer";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  createEvidence,
  type EvidenceEnvelope,
  type EvidenceKind,
} from "@/escrow/evidence";
import { downloadEvidence } from "../components/evidence";
import { useLanguage } from "../i18n/provider";
import { useWallet } from "../wallet";
import { useOperation } from "./use-operation";
import { useDeal } from "./use-deal";
import { useConfirmation } from "../components/confirmation";
import { dealViewModel } from "@/escrow/view-model";
import { feeBreakdown } from "@/escrow/fees";
import { bondReadiness } from "@/escrow/bond";
import {
  amount,
  act,
  bondIx,
  readDeal,
  readArbitrator,
  fundIx,
  digest,
  settleIxs,
} from "@/escrow/client";

// Coordinates signed actions and local evidence; presentation stays in DealView.
export function useDealController(id: string) {
  const { t } = useLanguage();
  const { who, connection } = useWallet();
  const confirmation = useConfirmation(`${id}:${who?.toBase58()}`);
  const op = useOperation({
    dealAddress: id,
    excludeActions: ["prepare_bond"],
  });
  const bondOp = useOperation({ action: "prepare_bond", dealAddress: id });
  const {
    deal,
    organization,
    arbitratorProfile,
    error,
    loading,
    readAt,
    fresh,
    now: networkNow,
    receipts,
    refresh,
  } = useDeal(id);
  const [files, setFiles] = useState<File[]>([]),
    [prepared, setPrepared] = useState<EvidenceEnvelope | null>(null);
  const [evidence, setEvidence] = useState(""),
    [complaintOpen, setComplaintOpen] = useState(false),
    [copy, setCopy] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setEvidence("");
      setFiles([]);
      setPrepared(null);
      setComplaintOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [who, id]);
  const organizationReady =
    !!deal &&
    (deal.workflowVersion !== 1 ||
      (!!organization?.approved &&
        organization.accepting &&
        !!arbitratorProfile &&
        arbitratorProfile.total >= organization.minimumDeposit &&
        deal.amount <= organization.maximumDeal));
  const vm = deal
    ? dealViewModel(deal, who?.toBase58() || null, networkNow, {
        fresh,
        bondReady: !!bondReadiness(deal.bond, arbitratorProfile)?.ready,
        organizationReady,
        busy: false,
      })
    : null;
  const available =
    vm?.available.filter((n) => n !== "finalize" && n !== "accept_deal") || [];
  const waitingForKeeper = vm?.waitingForKeeper || false;
  async function prepareBond(maxMissing: bigint) {
    if (!deal || !who || who.toBase58() !== deal.arbitrator) return;
    await bondOp.run(
      async () => {
        const c = connection();
        const latest = await readDeal(c, id);
        if (latest.state !== "created")
          throw new Error("ACTION_EXPIRED_OR_CHANGED");
        const profile = await readArbitrator(c, who);
        const status = bondReadiness(latest.bond, profile);
        if (!status) throw new Error("ARBITRATOR_NOT_REGISTERED");
        if (status.missing > maxMissing)
          throw new Error("ACTION_EXPIRED_OR_CHANGED");
        const ixs = [];
        if (status.missing > 0n)
          ixs.push(await bondIx("deposit_bond", who, status.missing));
        if (latest.approvals !== 1)
          ixs.push(await act("accept_deal", who, new PublicKey(id)));
        if (!ixs.length) throw new Error("ACTION_EXPIRED_OR_CHANGED");
        return ixs;
      },
      refresh,
      { action: "prepare_bond", dealAddress: id },
    );
  }
  async function commitment(kind: EvidenceKind) {
    if (!deal || !who || !evidence.trim()) throw Error("INVALID_TERMS");
    if (deal.resolutionPolicyVersion !== 1) return digest(evidence);
    const pkg = await createEvidence({
      deal: id,
      kind,
      author: who.toBase58(),
      note: evidence,
      files,
    });
    setPrepared(pkg);
    downloadEvidence(pkg);
    return Buffer.from(pkg.commitment, "hex");
  }
  async function execute(name: string) {
    if (name === "dispute" && !complaintOpen) {
      setComplaintOpen(true);
      return;
    }
    if (
      deal &&
      [
        "confirm",
        "finalize",
        "resolve_seller",
        "resolve_buyer",
        "accept_settlement",
        "cancel_deal",
      ].includes(name)
    ) {
      const refund =
        name === "resolve_buyer" ||
        (name === "accept_settlement" && deal.proposal === 2);
      const f = feeBreakdown(deal.amount, deal.fee, deal.platformFee, refund);
      const text =
        name === "cancel_deal"
          ? t("Hủy deal chưa nạp tiền?", "Cancel the unfunded deal?")
          : refund
            ? t(
                `Hoàn người mua ${amount(deal.amount)} USDC, không thu phí. Xác nhận?`,
                `Refund buyer ${amount(deal.amount)} USDC without fees. Confirm?`,
              )
            : t(
                `Trả người bán ${amount(f.sellerNet)} USDC; trọng tài ${amount(f.arbitratorFee)}, hệ thống ${amount(f.platformFee)}. Không thể hoàn tác. Xác nhận?`,
                `Pay seller ${amount(f.sellerNet)} USDC; arbitrator ${amount(f.arbitratorFee)}, platform ${amount(f.platformFee)}. Irreversible. Confirm?`,
              );
      if (!(await confirmation.ask(text))) return;
    }
    if (!deal || !who || !fresh) return;
    await op.run(
      async () => {
        const actor = who,
          d = new PublicKey(id);
        if (name === "fund") {
          if (
            !(await confirmation.ask(
              deal.resolutionPolicyVersion === 1
                ? t(
                    `Nạp ${amount(deal.amount)} USDC vào quỹ? Trọng tài được xử sau hạn SLA. Cọc không phải bảo hiểm; bỏ xử và hai bên bất đồng có thể khóa tiền.`,
                    `Deposit ${amount(deal.amount)} USDC into escrow? The arbitrator may rule past the SLA. Bond is not insurance; abandonment without mutual agreement may lock funds.`,
                  )
                : t(
                    `Nạp ${amount(deal.amount)} USDC theo điều kiện deal cũ?`,
                    `Deposit ${amount(deal.amount)} USDC under the legacy terms?`,
                  ),
            ))
          )
            throw Object.assign(Error("WALLET_REJECTED"), { code: 4001 });
          return [await fundIx(actor, deal)];
        }
        if (name === "deliver" || name === "dispute") {
          if (!evidence.trim()) throw new Error("INVALID_TERMS");
          return [
            await act(
              name,
              actor,
              d,
              await commitment(name === "deliver" ? "delivery" : "dispute"),
            ),
          ];
        }
        if (name === "resolve_seller" || name === "resolve_buyer") {
          if (!evidence.trim()) throw new Error("INVALID_TERMS");
          return settleIxs(
            "resolve",
            actor,
            deal,
            Buffer.concat([
              Buffer.from([name === "resolve_seller" ? 1 : 0]),
              await commitment("resolution"),
            ]),
            connection(),
          );
        }
        if (name.startsWith("propose_"))
          return [
            await act(
              "propose_settlement",
              actor,
              d,
              Buffer.from([name === "propose_seller" ? 1 : 0]),
            ),
          ];
        if (
          [
            "confirm",
            "finalize",
            "refund_expired",
            "accept_settlement",
          ].includes(name)
        )
          return settleIxs(name, actor, deal, undefined, connection());
        return [await act(name, actor, d)];
      },
      refresh,
      { action: name, dealAddress: id },
    );
  }
  return {
    deal,
    organizationReady,
    arbitratorProfile,
    error,
    loading,
    readAt,
    fresh,
    receipts,
    refresh,
    who,
    confirmation,
    op,
    bondOp,
    files,
    setFiles,
    prepared,
    evidence,
    setEvidence,
    complaintOpen,
    copy,
    setCopy,
    vm,
    available,
    waitingForKeeper,
    prepareBond,
    execute,
  };
}
