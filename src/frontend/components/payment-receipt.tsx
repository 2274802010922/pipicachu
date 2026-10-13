"use client";
import { useEffect, useState } from "react";
import { useWallet } from "../wallet";
import { useLanguage } from "../i18n/provider";
import { Receipt } from "./feedback";
import { verifySettlementReceipt } from "@/escrow/settlement-receipt";
import type { Deal } from "@/escrow/types";
export function PaymentReceipt({
  deal,
  treasury,
  signatures,
}: {
  deal: Deal;
  treasury: string | null;
  signatures: string[];
}) {
  const { connection } = useWallet(),
    { t } = useLanguage();
  const [verified, setVerified] = useState<{
      key: string;
      signature: string;
    } | null>(null),
    [done, setDone] = useState("");
  const signatureKey = signatures.join(",");
  const key =
    deal.address + ":" + deal.state + ":" + treasury + ":" + signatureKey;
  useEffect(() => {
    if (
      done === key ||
      !treasury ||
      !["completed", "refunded"].includes(deal.state)
    )
      return;
    let active = true;
    void (async () => {
      for (const signature of signatureKey
        .split(",")
        .filter(Boolean)
        .slice(0, 10)) {
        if (!active) return;
        try {
          const tx = await connection().getParsedTransaction(signature, {
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          });
          if (verifySettlementReceipt(deal, treasury, tx) === signature) {
            if (active) {
              setVerified({ key, signature });
              setDone(key);
            }
            return;
          }
        } catch {}
      }
      if (active) setDone(key);
    })();
    return () => {
      active = false;
    };
  }, [key, connection, deal, treasury, signatureKey, done]);
  if (!["completed", "refunded"].includes(deal.state)) return null;
  return (
    <div className="notice payment-receipt" role="status">
      {verified?.key === key ? (
        <>
          <strong>
            {t(
              "Đã đối chiếu chuyển tiền finalized",
              "Finalized transfers verified",
            )}
          </strong>
          <p>
            {t(
              "Số tiền, mint, vault và token account nhận khớp bảng phân bổ của deal.",
              "Amounts, mint, vault and receiving token accounts match this deal's allocation.",
            )}
          </p>
          <Receipt signature={verified.signature} />
        </>
      ) : done === key ? (
        t(
          "Chưa đối chiếu được receipt. Bảng trên là điều kiện on-chain của deal; tải lại trạng thái để thử tiếp.",
          "Receipt not yet verified. The table shows the deal's on-chain terms; refresh state to retry.",
        )
      ) : (
        t("Đang đối chiếu receipt finalized…", "Checking finalized receipt…")
      )}
      {done === key && verified?.key !== key && (
        <button type="button" onClick={() => setDone("")}>
          {t("Đối chiếu lại", "Check receipt again")}
        </button>
      )}
    </div>
  );
}
