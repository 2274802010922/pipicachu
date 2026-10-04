"use client";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "../i18n/provider";
import { amount, type Arbitrator, type Deal } from "@/escrow/client";
import { bondReadiness } from "@/escrow/bond";
export function BondStep({
  deal,
  profile,
  wallet,
  busy,
  fresh,
  onPrepare,
  feedback,
}: {
  deal: Deal;
  profile: Arbitrator | null | undefined;
  wallet: string | null;
  busy: boolean;
  fresh: boolean;
  onPrepare: (missing: bigint) => Promise<void>;
  feedback: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const readiness = fresh ? bondReadiness(deal.bond, profile) : null;
  const isArbitrator = wallet === deal.arbitrator;
  const done = readiness?.ready && deal.approvals === 1;
  return (
    <section className="panel bond-step" aria-labelledby="bond-step-title">
      <span className="eyebrow">02 / 05</span>
      <h2 id="bond-step-title">
        {t(
          "Trọng tài nạp cọc và nhận deal",
          "Arbitrator deposits bond and accepts the deal",
        )}
      </h2>
      <p>
        {t(
          "Sau khi người bán tạo link, gửi link này cho trọng tài. Người mua chỉ nạp tiền khi trọng tài đã đủ cọc và chấp thuận nhận deal.",
          "After the seller creates the link, share it with the arbitrator. The buyer funds only after the arbitrator has enough bond and accepts the deal.",
        )}
      </p>
      <div className="grid three">
        <div>
          <p className="muted">
            {t("Cọc cần cho deal này", "Bond required for this deal")}
          </p>
          <p className="amount">{amount(deal.bond)} USDC</p>
        </div>
        <div>
          <p className="muted">
            {t("Cọc khả dụng hiện có", "Current available bond")}
          </p>
          <p className="amount">
            {readiness ? `${amount(readiness.available)} USDC` : "—"}
          </p>
        </div>
        <div>
          <p className="muted">
            {t("Cần nạp thêm", "Additional deposit needed")}
          </p>
          <p className="amount">
            {readiness ? `${amount(readiness.missing)} USDC` : "—"}
          </p>
        </div>
      </div>
      <p className="small">
        {t(
          "Cọc nạp vào quỹ trọng tài; chỉ phần cần cho deal này bị khóa khi người mua nạp tiền. Nếu đã đủ cọc khả dụng, không cần nạp lại. Người bán không nạp cọc.",
          "Bond is deposited into the arbitrator pool; this deal’s required portion is reserved when the buyer funds. Existing available bond can be reused. The seller does not deposit bond.",
        )}
      </p>
      <p>
        <strong>
          {done
            ? t(
                "Đã đủ cọc và nhận deal · chờ người mua nạp",
                "Bond ready and deal accepted · waiting for buyer funding",
              )
            : readiness?.ready
              ? t(
                  "Đã đủ cọc · chờ trọng tài nhận deal",
                  "Bond sufficient · waiting for acceptance",
                )
              : readiness
                ? t(
                    "Chưa đủ cọc · chờ trọng tài nạp bổ sung",
                    "Insufficient bond · awaiting arbitrator deposit",
                  )
                : t(
                    "Chưa xác minh được cọc · chưa cho nạp tiền",
                    "Bond not verified · buyer funding unavailable",
                  )}
        </strong>
      </p>
      {isArbitrator && !done && readiness && fresh ? (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              {t(
                "Tôi nhận trách nhiệm trọng tài và đồng ý khoản cọc ở trên. USDC Devnet dùng làm cọc; SOL Devnet trả phí ký giao dịch.",
                "I accept the arbitration role and the bond amount above. Devnet USDC funds the bond; Devnet SOL pays transaction fees.",
              )}
            </span>
          </label>
          <div className="actions">
            <button
              className="primary"
              disabled={!accepted || busy}
              onClick={async () => {
                await onPrepare(readiness.missing);
                setAccepted(false);
              }}
            >
              {readiness.missing > 0n
                ? deal.approvals === 1
                  ? t(
                      `Nạp thêm ${amount(readiness.missing)} USDC cọc`,
                      `Deposit ${amount(readiness.missing)} USDC bond`,
                    )
                  : t(
                      `Nạp ${amount(readiness.missing)} USDC cọc và nhận deal`,
                      `Deposit ${amount(readiness.missing)} USDC bond and accept`,
                    )
                : t(
                    "Dùng cọc hiện có và nhận deal",
                    "Use existing bond and accept",
                  )}
            </button>
          </div>
        </>
      ) : !done ? (
        <p>
          {t(
            "Chỉ ví trọng tài bên dưới thực hiện bước này. Gửi link cho chủ ví, hoặc kết nối đúng ví trọng tài nếu bạn đang chạy demo.",
            "Only the arbitrator wallet below can complete this step. Share the link with its owner, or connect that wallet for a demo.",
          )}
        </p>
      ) : null}
      <code className="address">{deal.arbitrator}</code>
      <Link href="/admin" target="_blank" rel="noreferrer">
        {t("Quản lý quỹ cọc trọng tài", "Manage arbitrator bond pool")} ↗
      </Link>
      {feedback}
    </section>
  );
}
