"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Transaction, type TransactionInstruction } from "@solana/web3.js";
import {
  isUnresolved,
  type OperationMeta,
  type OperationPhase,
} from "@/escrow/operation";
import { useWallet } from "../wallet";
import { useLanguage } from "../i18n/provider";
import { Notice, Receipt } from "../components/feedback";
import { errorMessage } from "../errors";
const PHASE: Record<OperationPhase, [string, string]> = {
  checking: ["Đang kiểm tra giao dịch…", "Checking transaction…"],
  awaiting_signature: [
    "Chờ bạn ký trong ví…",
    "Waiting for your wallet signature…",
  ],
  signed: ["Đã ký, đang chuẩn bị gửi…", "Signed, preparing submission…"],
  submitted: ["Đã gửi, đang xác nhận…", "Submitted, awaiting confirmation…"],
  confirming: [
    "Mạng đã ghi nhận, chờ finalized…",
    "Recorded on-chain, awaiting finality…",
  ],
  unknown: [
    "Chưa rõ kết quả trên mạng. Kiểm tra trạng thái; không ký lại ngay.",
    "Network outcome is unknown. Check status; do not sign again yet.",
  ],
  finalized: [
    "Đã xác nhận thao tác trên Devnet.",
    "Action confirmed on Devnet.",
  ],
  failed: ["Giao dịch chưa hoàn tất.", "Transaction did not complete."],
  expired: ["Giao dịch đã hết hạn.", "Transaction expired."],
};
export function useOperation(scope?: {
  action?: string;
  dealAddress?: string;
  excludeActions?: string[];
  actions?: string[];
}) {
  const { locale, t } = useLanguage();
  const { who, send, operation, resume } = useWallet();
  const [running, setRunning] = useState(false),
    [error, setError] = useState<unknown>(null),
    [used, setUsed] = useState(false),
    [checking, setChecking] = useState(false);
  const afterRef = useRef<{ fn?: () => Promise<void>; done: boolean } | null>(
    null,
  );
  const matches =
    !!operation &&
    operation.owner === who?.toBase58() &&
    (!scope?.action || operation.action === scope.action) &&
    !scope?.excludeActions?.includes(operation.action) &&
    (!scope?.actions || scope.actions.includes(operation.action)) &&
    (!scope?.dealAddress || operation.dealAddress === scope.dealAddress);
  const active = matches && (used || !!scope) ? operation : null;
  const pending =
    !!operation &&
    operation.owner === who?.toBase58() &&
    isUnresolved(operation);
  useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
      setUsed(false);
      afterRef.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [who]);
  useEffect(() => {
    if (
      active?.phase !== "finalized" ||
      !afterRef.current ||
      afterRef.current.done
    )
      return;
    const fn = afterRef.current.fn;
    afterRef.current.done = true;
    const timer = setTimeout(() => void fn?.(), 0);
    return () => clearTimeout(timer);
  }, [active?.phase, active?.id]);
  async function run(
    build: () => Promise<TransactionInstruction[]>,
    after?: () => Promise<void>,
    meta: OperationMeta = {},
  ) {
    if (pending) {
      setUsed(true);
      return;
    }
    setRunning(true);
    setUsed(true);
    setError(null);
    afterRef.current = { fn: after, done: false };
    try {
      await send(new Transaction().add(...(await build())), {
        ...scope,
        ...meta,
      });
      if (afterRef.current && !afterRef.current.done) {
        afterRef.current.done = true;
        await after?.();
      }
    } catch (e) {
      if (!(e instanceof Error && e.message.startsWith("PENDING:")))
        setError(e);
    } finally {
      setRunning(false);
    }
  }
  const feedback = (
    <>
      {active && (
        <Notice>
          {t(...PHASE[active.phase])}{" "}
          {active.signature && <Receipt signature={active.signature} />}{" "}
          {active.phase === "unknown" && (
            <button
              type="button"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await resume();
                } finally {
                  setChecking(false);
                }
              }}
            >
              {t("Kiểm tra trạng thái", "Check status")}
            </button>
          )}{" "}
          {active.action === "create" &&
            active.dealAddress &&
            active.phase === "finalized" && (
              <Link href={`/deals/${active.dealAddress}`}>
                {t("Mở giao dịch", "Open deal")}
              </Link>
            )}
        </Notice>
      )}
      {error && <Notice error>{errorMessage(error, locale === "vi")}</Notice>}
    </>
  );
  return { busy: running || pending, run, feedback, operation: active };
}
